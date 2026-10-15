let api = isChrome() ? chrome : isFirefox() ? browser : undefined;

// const ONE_HOUR_MS = 60 * 60 * 1000;

api.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Allow persistent stats to sync on repo link
    api.storage.local.set({ sync_stats: true});
  }
});

api.runtime.onMessage.addListener(handleMessage);

const GITHUB_CLIENT_ID = '0114dd35b156d4729fac';
const GITHUB_CLIENT_SECRET = 'cfc3301d9745530bf1b31e92528ad9c31fd3f995';

let isExchangingOAuth = false;

async function exchangeOAuthCode(code, tabId) {
  if (!code || isExchangingOAuth) return;
  isExchangingOAuth = true;

  try {
    // Request OAuth access token directly from GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData || !tokenData.access_token) {
      console.error('Failed to get GitHub access token:', tokenData);
      isExchangingOAuth = false;
      return;
    }

    const token = tokenData.access_token;

    // Fetch user profile from GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    let username = '';
    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData.login || '';
    }

    await api.storage.local.set({
      leethub_token: token,
      leethub_username: username,
      pipe_leethub: false
    });

    // Close the GitHub auth tab
    if (tabId) {
      try { api.tabs.remove(tabId); } catch (e) {}
    } else {
      api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
          try { api.tabs.remove(tabs[0].id); } catch (e) {}
        }
      });
    }

    // Open onboarding welcome page to create/link repository
    const urlOnboarding = api.runtime.getURL('welcome.html');
    api.tabs.create({ url: urlOnboarding, active: true });
  } catch (err) {
    console.error('Error during GitHub OAuth exchange:', err);
  } finally {
    isExchangingOAuth = false;
  }
}

function checkAndExchangeNavUrl(url, tabId) {
  if (!url || !url.includes('github.com')) return;
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) {
      exchangeOAuthCode(code, tabId);
    }
  } catch (e) {
    const match = url.match(/[?&]code=([\w\/\-]+)/);
    if (match && match[1]) {
      exchangeOAuthCode(match[1], tabId);
    }
  }
}

// Automatically intercept GitHub OAuth redirect before page load
if (api.webNavigation) {
  if (api.webNavigation.onBeforeNavigate) {
    api.webNavigation.onBeforeNavigate.addListener((details) => {
      checkAndExchangeNavUrl(details.url, details.tabId);
    }, { url: [{ hostSuffix: 'github.com' }] });
  }
  if (api.webNavigation.onCommitted) {
    api.webNavigation.onCommitted.addListener((details) => {
      checkAndExchangeNavUrl(details.url, details.tabId);
    }, { url: [{ hostSuffix: 'github.com' }] });
  }
}

function handleMessage(request, sender, sendResponse) {
  if (request && request.type === 'GITHUB_AUTH_CODE') {
    const tabId = (sender && sender.tab && sender.tab.id) || null;
    exchangeOAuthCode(request.code, tabId);
    return true;
  } else if (request && request.closeWebPage === true && request.isSuccess === true) {
    /* Set username */
    api.storage.local.set({ leethub_username: request.username });

    /* Set token */
    api.storage.local.set({ leethub_token: request.token });

    /* Close pipe */
    api.storage.local.set({ pipe_leethub: false });

    const tabId = (sender && sender.tab && sender.tab.id) || null;
    if (tabId) {
      try { api.tabs.remove(tabId); } catch (e) {}
    } else {
      api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        if (tabs && tabs[0]) api.tabs.remove(tabs[0].id);
      });
    }

    /* Go to onboarding for UX */
    const urlOnboarding = api.runtime.getURL('welcome.html');
    api.tabs.create({ url: urlOnboarding, active: true });
  } else if (request && request.closeWebPage === true && request.isSuccess === false) {
    console.error('Authentication attempt unsuccessful.');
    const tabId = (sender && sender.tab && sender.tab.id) || null;
    if (tabId) {
      try { api.tabs.remove(tabId); } catch (e) {}
    } else {
      api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        if (tabs && tabs[0]) api.tabs.remove(tabs[0].id);
      });
    }
  } else if (request.type === 'LEETCODE_SUBMISSION') {
    api.webNavigation.onHistoryStateUpdated.addListener(
      (e = function (details) {
        const match = details.url.match(/\/submissions\/(?:detail\/)?(\d+)/);
        if (match) {
          const submissionId = match[1];
          sendResponse({ submissionId });
          api.webNavigation.onHistoryStateUpdated.removeListener(e);
        }
      }),
      { url: [{ hostSuffix: 'leetcode.com' }, { pathContains: 'submissions' }] }
    );
  } else if (request && request.isStriver === true) {
    // ========================================================================
    // STRIVER A2Z HANDLER — Category-based saves, README question, full repo scan
    // ========================================================================
    (async () => {
      try {
        const { leethub_token, leethub_hook } = await api.storage.local.get(['leethub_token', 'leethub_hook']);
        if (!leethub_token || !leethub_hook) {
          sendResponse({ success: false, error: 'Not authenticated or no repo linked. Open the LeetHub popup to set up.' });
          return;
        }

        const STRIVER_ROOT = '0000-Strivers-A2Z-DSA-Sheet';
        const METADATA_PATH = `${STRIVER_ROOT}/.metadata.json`;

        // --- Shared helpers ---------------------------------------------------

        const b64Encode = (str) => {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
        };

        const b64Decode = (data) => decodeURIComponent(escape(atob(data)));

        const sanitizeName = (name) => {
          if (!name) return 'Problem';
          return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        };

        const stripProblemNumber = (str) => {
          if (!str) return '';
          return str.replace(/^\s*\d+[\.\-\:\s_]+\s*/, '').trim();
        };

        const normalizeSlug = (str) => {
          if (!str) return '';
          return str
            .toLowerCase()
            .replace(/^\s*\d+[\.\-\:\s_]+/, '')
            .replace(/[^a-z0-9]/g, '');
        };

        const slugToTitle = (slug) => {
          if (!slug) return 'Unknown Problem';
          const clean = stripProblemNumber(slug);
          return clean
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        };

        const langExtMap = {
          'cpp': '.cpp', 'c++': '.cpp', 'java': '.java', 'python': '.py',
          'py': '.py', 'python3': '.py', 'javascript': '.js', 'js': '.js',
          'c': '.c', 'csharp': '.cs', 'cs': '.cs', 'typescript': '.ts',
          'ts': '.ts', 'go': '.go', 'rust': '.rs', 'rs': '.rs',
          'dart': '.dart', 'kotlin': '.kt', 'swift': '.swift', 'ruby': '.rb',
          'scala': '.scala', 'php': '.php'
        };

        const codeExtensions = new Set(Object.values(langExtMap));

        const ghHeaders = {
          Authorization: `token ${leethub_token}`,
          Accept: 'application/vnd.github.v3+json'
        };

        /** GET a file from GitHub. Returns {content, sha} or null. */
        const ghGet = async (filePath) => {
          const url = `https://api.github.com/repos/${leethub_hook}/contents/${filePath}`;
          try {
            const res = await fetch(url, { headers: ghHeaders });
            if (res.status === 200) {
              const data = await res.json();
              return { content: b64Decode(data.content), sha: data.sha };
            }
          } catch (e) { /* file doesn't exist */ }
          return null;
        };

        /** PUT (create or update) a file on GitHub. */
        const ghPut = async (filePath, content, commitMsg) => {
          const url = `https://api.github.com/repos/${leethub_hook}/contents/${filePath}`;
          let sha = null;
          try {
            const res = await fetch(url, { headers: ghHeaders });
            if (res.status === 200) {
              const data = await res.json();
              sha = data.sha;
            }
          } catch (e) {}
          const body = { message: commitMsg, content: b64Encode(content) };
          if (sha) body.sha = sha;
          const putRes = await fetch(url, {
            method: 'PUT',
            headers: { ...ghHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!putRes.ok) {
            const errBody = await putRes.text();
            throw new Error(`GitHub API ${putRes.status}: ${errBody}`);
          }
          return putRes;
        };

        /** DELETE a single file on GitHub. */
        const ghDelete = async (filePath, sha, commitMsg) => {
          const url = `https://api.github.com/repos/${leethub_hook}/contents/${filePath}`;
          let fileSha = sha;
          if (!fileSha) {
            try {
              const getRes = await fetch(url, { headers: ghHeaders });
              if (getRes.ok) {
                const data = await getRes.json();
                fileSha = data.sha;
              }
            } catch (e) {}
          }
          if (!fileSha) return;

          try {
            await fetch(url, {
              method: 'DELETE',
              headers: { ...ghHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: commitMsg || `Delete ${filePath}`, sha: fileSha })
            });
          } catch (e) {
            console.error(`Failed to delete ${filePath}:`, e);
          }
        };

        /** DELETE all files inside a folder on GitHub recursively. */
        const ghDeleteFolder = async (folderPath, commitMsg) => {
          if (!folderPath || folderPath === STRIVER_ROOT || folderPath === '.' || folderPath === '/') return;
          try {
            const res = await fetch(`https://api.github.com/repos/${leethub_hook}/contents/${folderPath}`, { headers: ghHeaders });
            if (res.ok) {
              const items = await res.json();
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item.type === 'file') {
                    await ghDelete(item.path, item.sha, commitMsg || `Clean up old location: ${item.path}`);
                  } else if (item.type === 'dir') {
                    await ghDeleteFolder(item.path, commitMsg);
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Failed to delete folder ${folderPath}:`, e);
          }
        };

        /** Fetch default repository branch. */
        const getDefaultBranch = async () => {
          try {
            const repoRes = await fetch(`https://api.github.com/repos/${leethub_hook}`, { headers: ghHeaders });
            if (repoRes.ok) {
              const repoData = await repoRes.json();
              return repoData.default_branch || 'main';
            }
          } catch (e) {}
          return 'main';
        };

        /** Fetch entire Git Tree recursively for full repo visibility. */
        const ghGetTree = async (branch = 'main') => {
          try {
            const treeRes = await fetch(
              `https://api.github.com/repos/${leethub_hook}/git/trees/${branch}?recursive=1`,
              { headers: ghHeaders }
            );
            if (treeRes.ok) {
              const data = await treeRes.json();
              return data.tree || [];
            }
          } catch (e) {}
          return [];
        };

        // --- Read / Write metadata --------------------------------------------

        const getMetadata = async () => {
          const file = await ghGet(METADATA_PATH);
          if (file) {
            try { return JSON.parse(file.content); } catch (e) {}
          }
          return { problems: {} };
        };

        const saveMetadata = async (metadata) => {
          await ghPut(METADATA_PATH, JSON.stringify(metadata, null, 2), 'Update Striver A2Z metadata');
        };

        // --- Master Repository Problem Scanner --------------------------------
        // Scans the ENTIRE repository folder (0000-Strivers-A2Z-DSA-Sheet)
        // and merges with .metadata.json so ALL historical & current problems appear.
        const getAllRepoProblems = async () => {
          const defaultBranch = await getDefaultBranch();
          const [treeItems, metadata, rootReadme] = await Promise.all([
            ghGetTree(defaultBranch),
            getMetadata(),
            ghGet('README.md')
          ]);

          const problemsMap = new Map();
          const categoriesSet = new Set();
          const striverCategoriesSet = new Set();
          const leetcodeCategoriesSet = new Set();

          // Parse LeetCode topics from root README.md
          const leetcodeTopicsMap = new Map(); // problemSlug (lowercase) -> topic
          if (rootReadme && rootReadme.content) {
            const readmeText = rootReadme.content;
            const lcStart = readmeText.indexOf('<!---LeetCode Topics Start-->');
            const lcEnd = readmeText.indexOf('<!---LeetCode Topics End-->');
            if (lcStart !== -1 && lcEnd !== -1) {
              const lcSection = readmeText.substring(lcStart, lcEnd);
              const topicSections = lcSection.split('## ');
              for (let i = 1; i < topicSections.length; i++) {
                const lines = topicSections[i].split('\n');
                const topicName = lines[0].trim();
                const probMatches = topicSections[i].matchAll(/\|\s*\[([^\]]+)\]/g);
                for (const m of probMatches) {
                  const prob = m[1].trim();
                  leetcodeTopicsMap.set(prob.toLowerCase(), topicName);
                }
              }
            }
          }

          // 1. Scan treeItems
          for (const item of treeItems) {
            if (item.type !== 'blob') continue;
            if (item.path === METADATA_PATH || item.path === 'README.md' || item.path === `${STRIVER_ROOT}/README.md`) continue;
            if (item.path.startsWith('dist/') || item.path.startsWith('assets/') || item.path.startsWith('scripts/') || item.path.startsWith('css/') || item.path.startsWith('spec/')) continue;

            const parts = item.path.split('/');
            const fileName = parts[parts.length - 1];
            const ext = '.' + fileName.split('.').pop();
            const isCodeFile = codeExtensions.has(ext);

            if (!isCodeFile) continue;

            // Striver Sheet problems
            if (item.path.startsWith(`${STRIVER_ROOT}/`)) {
              const relPath = item.path.substring(STRIVER_ROOT.length + 1);
              const sParts = relPath.split('/');
              let category = 'General';
              let subcategory = '';
              let problemSlug = '';
              let folderPath = '';

              if (sParts.length === 2) {
                if (sParts[1].startsWith('solution.') || isCodeFile) {
                  problemSlug = sParts[0];
                  folderPath = `${STRIVER_ROOT}/${sParts[0]}`;
                } else {
                  category = sParts[0];
                  problemSlug = sParts[1].replace(/\.[^.]+$/, '');
                  folderPath = `${STRIVER_ROOT}/${sParts[0]}`;
                }
              } else if (sParts.length === 3) {
                category = sParts[0];
                problemSlug = sParts[1];
                folderPath = `${STRIVER_ROOT}/${sParts[0]}/${sParts[1]}`;
              } else if (sParts.length >= 4) {
                category = sParts[0];
                subcategory = sParts[1];
                problemSlug = sParts[2];
                folderPath = `${STRIVER_ROOT}/${sParts[0]}/${sParts[1]}/${sParts[2]}`;
              }

              if (category && category.includes('/')) {
                const cParts = category.split('/');
                category = cParts[0].trim();
                if (!subcategory && cParts[1]) subcategory = cParts[1].trim();
              }

              if (category) {
                categoriesSet.add(category);
                striverCategoriesSet.add(category);
              }

              const cleanSlug = stripProblemNumber(problemSlug) || problemSlug;
              const normKey = 'striver:' + (normalizeSlug(problemSlug) || cleanSlug.toLowerCase());
              problemsMap.set(normKey, {
                platform: 'striver',
                problemSlug: cleanSlug,
                problemName: slugToTitle(cleanSlug),
                category,
                subcategory,
                language: ext.replace('.', ''),
                githubPath: item.path,
                folderPath: folderPath || `${STRIVER_ROOT}/${cleanSlug}`,
                githubUrl: `https://github.com/${leethub_hook}/blob/${defaultBranch}/${item.path}`,
                lastUpdated: null,
                url: '',
                sha: item.sha
              });
            } else {
              // LeetCode problems
              // Pattern 1: 0001-two-sum/0001-two-sum.cpp (flat)
              // Pattern 2: Array/0001-two-sum/0001-two-sum.cpp (categorized)
              let isLeetCode = false;
              let lcSlug = '';
              let lcCat = 'General';
              let lcFolder = '';

              for (let i = 0; i < parts.length - 1; i++) {
                if (/^\d{4}-/.test(parts[i]) || leetcodeTopicsMap.has(parts[i].toLowerCase())) {
                  isLeetCode = true;
                  lcSlug = parts[i];
                  lcFolder = parts.slice(0, i + 1).join('/');
                  if (i > 0) {
                    lcCat = parts[0];
                  }
                  break;
                }
              }

              if (isLeetCode && lcSlug) {
                if (leetcodeTopicsMap.has(lcSlug.toLowerCase())) {
                  lcCat = leetcodeTopicsMap.get(lcSlug.toLowerCase());
                }
                if (lcCat) {
                  categoriesSet.add(lcCat);
                  leetcodeCategoriesSet.add(lcCat);
                }

                const normKey = 'leetcode:' + lcSlug.toLowerCase();
                problemsMap.set(normKey, {
                  platform: 'leetcode',
                  problemSlug: lcSlug,
                  problemName: lcSlug, // KEEPS NUMBER AS USER REQUESTED!
                  category: lcCat,
                  subcategory: '',
                  language: ext.replace('.', ''),
                  githubPath: item.path,
                  folderPath: lcFolder,
                  githubUrl: `https://github.com/${leethub_hook}/blob/${defaultBranch}/${item.path}`,
                  lastUpdated: null,
                  url: `https://leetcode.com/problems/${lcSlug.replace(/^\d{4}-/, '')}/`,
                  sha: item.sha
                });
              }
            }
          }

          // 2. Merge with rich metadata
          if (metadata && metadata.problems) {
            for (const mKey in metadata.problems) {
              const meta = metadata.problems[mKey];
              const isLc = meta.platform === 'leetcode';
              const pKey = isLc
                ? 'leetcode:' + (meta.problemSlug || sanitizeName(meta.problemName)).toLowerCase()
                : 'striver:' + sanitizeName(meta.problemName).toLowerCase();
              const existing = problemsMap.get(pKey);

              let metaCat = meta.category || '';
              let metaSubcat = meta.subcategory || '';
              if (!isLc && metaCat && metaCat.includes('/')) {
                const cParts = metaCat.split('/');
                metaCat = cParts[0].trim();
                if (!metaSubcat && cParts[1]) metaSubcat = cParts[1].trim();
              }

              if (metaCat) {
                categoriesSet.add(metaCat);
                if (isLc) leetcodeCategoriesSet.add(metaCat);
                else striverCategoriesSet.add(metaCat);
              }

              if (existing) {
                existing.problemName = isLc ? (meta.problemName || existing.problemName) : (meta.problemName || existing.problemName);
                existing.category = isLc ? (meta.category || existing.category) : (metaCat || existing.category);
                existing.subcategory = metaSubcat || existing.subcategory;
                existing.language = meta.language || existing.language;
                existing.url = meta.url || existing.url;
                existing.lastUpdated = meta.lastUpdated || existing.lastUpdated;
                existing.commitMsg = meta.commitMsg || existing.commitMsg;
                if (meta.githubPath) {
                  existing.githubPath = meta.githubPath;
                  existing.githubUrl = `https://github.com/${leethub_hook}/blob/${defaultBranch}/${meta.githubPath}`;
                }
              } else {
                problemsMap.set(pKey, {
                  platform: isLc ? 'leetcode' : 'striver',
                  problemSlug: meta.problemSlug || sanitizeName(meta.problemName),
                  problemName: meta.problemName,
                  category: isLc ? (meta.category || 'General') : (metaCat || 'General'),
                  subcategory: metaSubcat || '',
                  language: meta.language || 'cpp',
                  githubPath: meta.githubPath || '',
                  folderPath: meta.folderPath || (isLc ? meta.problemName : `${STRIVER_ROOT}/${sanitizeName(meta.problemName)}`),
                  githubUrl: meta.githubPath ? `https://github.com/${leethub_hook}/blob/${defaultBranch}/${meta.githubPath}` : '',
                  lastUpdated: meta.lastUpdated || new Date().toISOString(),
                  url: meta.url || '',
                  commitMsg: meta.commitMsg || '',
                  sha: null
                });
              }
            }
          }

          const problemsList = Array.from(problemsMap.values());
          // Sort newest first
          problemsList.sort((a, b) => {
            if (a.lastUpdated && b.lastUpdated) {
              return new Date(b.lastUpdated) - new Date(a.lastUpdated);
            }
            if (a.lastUpdated) return -1;
            if (b.lastUpdated) return 1;
            return a.problemName.localeCompare(b.problemName);
          });

          return {
            problems: problemsList,
            categories: Array.from(categoriesSet).filter(Boolean).sort(),
            striverCategories: Array.from(striverCategoriesSet).filter(Boolean).sort(),
            leetcodeCategories: Array.from(leetcodeCategoriesSet).filter(Boolean).sort(),
            striverCount: problemsList.filter(p => p.platform === 'striver').length,
            leetcodeCount: problemsList.filter(p => p.platform === 'leetcode').length,
            hook: leethub_hook,
            branch: defaultBranch
          };
        };

        // --- Action Router ----------------------------------------------------

        const action = request.action || 'striver_save';

        // ===== ACTION: striver_check_existing =================================
        // Checks if problem exists BEFORE opening/submitting the form to prefill category & avoid duplicates
        if (action === 'striver_check_existing') {
          const reqTitle = (request.title || '').trim();
          const reqUrl = (request.url || '').trim();
          const reqNorm = normalizeSlug(reqTitle);
          const reqClean = stripProblemNumber(reqTitle).toLowerCase();

          const { problems, categories, hook, branch } = await getAllRepoProblems();

          let found = null;

          // Check by URL exact match first
          if (reqUrl) {
            found = problems.find(p => p.url && p.url.split('?')[0].replace(/\/+$/, '') === reqUrl.split('?')[0].replace(/\/+$/, ''));
          }

          // Check by normalized title or slug (matches with or without numbers, e.g. "745. Check..." vs "Check...")
          if (!found && reqTitle) {
            found = problems.find(p =>
              (reqNorm && normalizeSlug(p.problemSlug) === reqNorm) ||
              (reqNorm && normalizeSlug(p.problemName) === reqNorm) ||
              p.problemSlug.toLowerCase() === reqClean ||
              p.problemName.toLowerCase() === reqClean ||
              p.problemName.toLowerCase() === reqTitle.toLowerCase()
            );
          }

          if (found) {
            let existingCode = '';
            if (found.githubPath) {
              const codeFile = await ghGet(found.githubPath);
              if (codeFile && codeFile.content) {
                existingCode = codeFile.content;
              }
            }
            sendResponse({
              success: true,
              exists: true,
              problem: found,
              code: existingCode,
              categories,
              hook,
              branch
            });
          } else {
            sendResponse({
              success: true,
              exists: false,
              categories,
              hook,
              branch
            });
          }

        // ===== ACTION: striver_get_categories =================================
        } else if (action === 'striver_get_categories') {
          const { categories } = await getAllRepoProblems();
          sendResponse({ success: true, categories });

        // ===== ACTION: striver_save ===========================================
        } else if (action === 'striver_save') {
          const title = request.title || 'Unknown-Problem';
          const rawCode = request.code || '';
          const lang = (request.language || 'cpp').toLowerCase();
          const category = request.category || '';
          const subcategory = request.subcategory || '';
          const problemUrl = request.url || '';
          const statement = request.statement || '';
          const examples = request.examples || '';
          const difficulty = request.difficulty || 'Medium';

          const oldFolderPath = request.oldFolderPath || null;
          const oldGithubPath = request.oldGithubPath || null;

          if (!rawCode.trim()) {
            sendResponse({ success: false, error: 'Code cannot be empty.' });
            return;
          }
          if (!category.trim()) {
            sendResponse({ success: false, error: 'Category is required.' });
            return;
          }

          const ext = langExtMap[lang] || '.cpp';
          // Ensure folder and problem name have NO leading numbers (matches user's historical folder convention)
          const cleanTitle = stripProblemNumber(title) || title.trim();
          const safeTitle = sanitizeName(cleanTitle);
          const safeCat = sanitizeName(category);
          const safeSubcat = subcategory.trim() ? sanitizeName(subcategory) : '';

          // Target folder: 0000-Strivers-A2Z-DSA-Sheet/Category/[Subcategory/]safeTitle
          let newFolderPath = `${STRIVER_ROOT}/${safeCat}`;
          if (safeSubcat) newFolderPath += `/${safeSubcat}`;
          newFolderPath += `/${safeTitle}`;

          // File name is always solution.ext (e.g. solution.cpp, solution.py, etc.)
          const solutionFileName = `solution${ext}`;
          const solutionPath = `${newFolderPath}/${solutionFileName}`;
          const readmePath = `${newFolderPath}/README.md`;

          const isUpdate = !!(oldFolderPath || oldGithubPath);

          // 1. Clean up old location if category/subcategory changed
          if (oldFolderPath && oldFolderPath !== newFolderPath) {
            await ghDeleteFolder(oldFolderPath);
            if (oldGithubPath && !oldGithubPath.startsWith(oldFolderPath)) {
              await ghDelete(oldGithubPath, null, `Remove old solution ${oldGithubPath}`);
            }
          } else if (oldGithubPath && oldGithubPath !== solutionPath) {
            // Same folder, but old file had a different name (e.g. Problem-Name.cpp -> solution.cpp)
            await ghDelete(oldGithubPath, null, `Replace old solution file with ${solutionFileName}`);
          }

          // 2. Upload Question README.md
          let fullReadme = `<h2><a href="${problemUrl || 'https://takeuforward.org/'}">${title}</a></h2><h3>${difficulty}</h3><hr>`;
          if (statement) {
            fullReadme += `\n${statement}\n`;
          }
          if (examples) {
            fullReadme += `<br><br>\n${examples}\n`;
          }
          if (!statement && !examples) {
            fullReadme += `<p>Problem statement from <a href="${problemUrl || 'https://takeuforward.org/'}">${title}</a> on TakeUForward.</p>`;
          }

          await ghPut(readmePath, fullReadme, `${isUpdate ? 'Update' : 'Add'} README for ${title}`);

          // 3. Upload solution code file
          await ghPut(solutionPath, rawCode, `${isUpdate ? 'Update' : 'Add'} solution for ${title} [${category}]`);

          // 4. Update master README.md table
          const masterReadmePath = `${STRIVER_ROOT}/README.md`;
          const masterFile = await ghGet(masterReadmePath);
          let masterContent = '';
          if (masterFile) {
            masterContent = masterFile.content;
          }
          if (!masterContent.includes('Strivers A2Z DSA Sheet Solutions')) {
            masterContent = '# Strivers A2Z DSA Sheet Solutions\n\n| Problem | Category | Solution |\n| :--- | :--- | :--- |\n';
          }

          const catLabel = safeSubcat ? `${category}/${subcategory}` : category;
          const relativeSolPath = solutionPath.replace(STRIVER_ROOT + '/', '');
          const newRow = `| [${title}](${problemUrl || '#'}) | ${catLabel} | [${solutionFileName}](${relativeSolPath}) |\n`;

          // Replace row if already exists, else append
          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rowRegex = new RegExp(`\\|\\s*\\[${escapedTitle}\\]\\([^)]*\\)[^\\n]*\\n`, 'g');
          if (masterContent.match(rowRegex)) {
            masterContent = masterContent.replace(rowRegex, newRow);
          } else {
            masterContent += newRow;
          }
          await ghPut(masterReadmePath, masterContent, `Update Master README with ${title}`);

          // 5. Update .metadata.json
          const metadata = await getMetadata();
          const problemKey = problemUrl || safeTitle;

          // If old key was different, clean it up
          if (request.oldKey && request.oldKey !== problemKey && metadata.problems[request.oldKey]) {
            delete metadata.problems[request.oldKey];
          }

          metadata.problems[problemKey] = {
            problemName: cleanTitle,
            category: category,
            subcategory: subcategory || '',
            language: lang,
            extension: ext,
            githubPath: solutionPath,
            folderPath: newFolderPath,
            url: problemUrl,
            lastUpdated: new Date().toISOString()
          };
          await saveMetadata(metadata);

          sendResponse({
            success: true,
            message: `Successfully ${isUpdate ? 'updated' : 'saved'} "${title}" in ${catLabel}!`
          });

        // ===== ACTION: leetcode_save ==========================================
        } else if (action === 'leetcode_save') {
          const problemName = (request.problemName || request.title || '0001-unknown').trim();
          const rawCode = request.code || '';
          const lang = (request.language || 'cpp').toLowerCase();
          const category = (request.category || '').trim();
          const subcategory = (request.subcategory || '').trim();
          const problemUrl = request.url || '';
          const statement = request.statement || '';
          const difficulty = request.difficulty || 'Easy';
          const commitMsg = request.commitMsg || `Update solution for ${problemName} - LeetHub`;
          const oldFolderPath = request.oldFolderPath || null;
          const oldGithubPath = request.oldGithubPath || null;

          if (!rawCode.trim()) {
            sendResponse({ success: false, error: 'Code cannot be empty.' });
            return;
          }

          const ext = langExtMap[lang] || '.cpp';
          const filename = `${problemName}${ext}`;
          const safeCat = category ? sanitizeName(category) : '';
          const newFolderPath = safeCat ? `${safeCat}/${problemName}` : problemName;
          const solutionPath = `${newFolderPath}/${filename}`;
          const readmePath = `${newFolderPath}/README.md`;

          // 1. Clean up old location if moved
          if (oldFolderPath && oldFolderPath !== newFolderPath) {
            await ghDeleteFolder(oldFolderPath);
          } else if (oldGithubPath && oldGithubPath !== solutionPath) {
            await ghDelete(oldGithubPath, null, `Replace old file ${oldGithubPath}`);
          }

          // 2. Upload solution file
          await ghPut(solutionPath, rawCode, commitMsg);

          // 3. Upload README.md if statement exists
          if (statement) {
            const fullReadme = `<h2><a href="${problemUrl || '#'}">${problemName}</a></h2><h3>${difficulty}</h3><hr>\n${statement}`;
            await ghPut(readmePath, fullReadme, `Create README for ${problemName}`);
          }

          // 4. Update root README.md topics
          if (category) {
            const rootFile = await ghGet('README.md');
            if (rootFile) {
              let rootContent = rootFile.content;
              const topicHeader = `## ${category}`;
              const topicTableHeader = `\n${topicHeader}\n|  |\n| ------- |\n`;
              const probRow = `| [${problemName}](https://github.com/${leethub_hook}/tree/${defaultBranch}/${newFolderPath}) |`;

              const lcStart = '<!---LeetCode Topics Start-->';
              const lcEnd = '<!---LeetCode Topics End-->';
              if (!rootContent.includes(lcStart)) {
                rootContent += `\n\n${lcStart}\n# LeetCode Topics\n${lcEnd}`;
              }

              if (!rootContent.includes(topicHeader)) {
                rootContent = rootContent.replace(lcEnd, `${topicTableHeader}${lcEnd}`);
              }

              if (!rootContent.includes(`[${problemName}]`)) {
                rootContent = rootContent.replace(topicHeader + '\n|  |\n| ------- |', `${topicHeader}\n|  |\n| ------- |\n${probRow}`);
              }
              await ghPut('README.md', rootContent, `Update LeetCode topics: ${problemName} in ${category}`);
            }
          }

          // 5. Update .metadata.json
          const metadata = await getMetadata();
          metadata.problems[problemName] = {
            problemName: problemName,
            platform: 'leetcode',
            category: category || 'General',
            subcategory: subcategory || '',
            language: lang,
            extension: ext,
            githubPath: solutionPath,
            folderPath: newFolderPath,
            commitMsg: commitMsg,
            url: problemUrl,
            lastUpdated: new Date().toISOString()
          };
          await saveMetadata(metadata);

          sendResponse({
            success: true,
            message: `Successfully saved "${problemName}"${category ? ' in ' + category : ''}!`
          });

        // ===== ACTION: leetcode_record_metadata ================================
        } else if (action === 'leetcode_record_metadata') {
          const metadata = await getMetadata();
          const problemName = request.problemName;
          if (problemName) {
            metadata.problems[problemName] = {
              problemName: problemName,
              platform: 'leetcode',
              category: request.category || 'General',
              subcategory: request.subcategory || '',
              language: request.language || 'cpp',
              githubPath: request.githubPath,
              folderPath: request.folderPath,
              commitMsg: request.commitMsg || '',
              url: request.url || '',
              lastUpdated: new Date().toISOString()
            };
            await saveMetadata(metadata);
          }
          sendResponse({ success: true });

        // ===== ACTION: striver_get_code =======================================
        } else if (action === 'striver_get_code') {
          let githubPath = request.githubPath || '';
          let found = null;

          if (!githubPath) {
            const searchUrl = request.url || '';
            const searchTitle = request.title || '';
            const { problems } = await getAllRepoProblems();

            if (searchUrl) {
              found = problems.find(p => p.url && p.url.split('?')[0].replace(/\/+$/, '') === searchUrl.split('?')[0].replace(/\/+$/, ''));
            }
            if (!found && searchTitle) {
              const safe = sanitizeName(searchTitle).toLowerCase();
              found = problems.find(p =>
                p.problemSlug.toLowerCase() === safe ||
                sanitizeName(p.problemName).toLowerCase() === safe ||
                p.problemName.toLowerCase() === searchTitle.toLowerCase()
              );
            }
            if (found) {
              githubPath = found.githubPath;
            }
          }

          if (!githubPath) {
            sendResponse({ success: false, notFound: true, error: 'Problem not solved yet.' });
            return;
          }

          const codeFile = await ghGet(githubPath);
          if (!codeFile) {
            sendResponse({ success: false, error: 'Code file not found in repository.' });
            return;
          }

          sendResponse({
            success: true,
            problemName: (found && found.problemName) || request.problemName || request.title || '',
            category: found ? found.category : '',
            subcategory: found ? found.subcategory : '',
            language: found ? found.language : '',
            filePath: githubPath,
            lastUpdated: found ? found.lastUpdated : null,
            code: codeFile.content
          });

        // ===== ACTION: striver_get_all_problems / striver_get_all_metadata =====
        } else if (action === 'striver_get_all_problems' || action === 'striver_get_all_metadata') {
          const { problems, categories, hook, branch } = await getAllRepoProblems();
          sendResponse({
            success: true,
            problems,
            categories,
            hook,
            branch
          });

        // ===== ACTION: striver_get_problem_details ============================
        // Fetches both Question (README.md) and Solution (code) for a problem
        } else if (action === 'striver_get_problem_details') {
          let githubPath = request.githubPath || '';
          let folderPath = request.folderPath || '';
          const problemName = request.problemName || request.title || '';
          const defaultBranch = await getDefaultBranch();

          if (!githubPath || !folderPath) {
            const { problems } = await getAllRepoProblems();
            let found = null;
            if (request.url) {
              found = problems.find(p => p.url && p.url.split('?')[0].replace(/\/+$/, '') === request.url.split('?')[0].replace(/\/+$/, ''));
            }
            if (!found && problemName) {
              const safe = sanitizeName(problemName).toLowerCase();
              found = problems.find(p =>
                p.problemSlug.toLowerCase() === safe ||
                sanitizeName(p.problemName).toLowerCase() === safe ||
                p.problemName.toLowerCase() === problemName.toLowerCase()
              );
            }
            if (found) {
              githubPath = githubPath || found.githubPath;
              folderPath = folderPath || found.folderPath;
            }
          }

          let code = '';
          let readme = '';

          // 1. Fetch solution code
          if (githubPath) {
            const codeFile = await ghGet(githubPath);
            if (codeFile) code = codeFile.content;
          }

          // 2. Fetch question README
          if (folderPath) {
            const readmeFile = await ghGet(`${folderPath}/README.md`);
            if (readmeFile) {
              readme = readmeFile.content;
            } else {
              // Try listing folder to see if README has different casing
              try {
                const itemsRes = await fetch(`https://api.github.com/repos/${leethub_hook}/contents/${folderPath}`, { headers: ghHeaders });
                if (itemsRes.ok) {
                  const items = await itemsRes.json();
                  const rItem = items.find(i => i.name.toLowerCase() === 'readme.md');
                  if (rItem) {
                    const rFile = await ghGet(rItem.path);
                    if (rFile) readme = rFile.content;
                  }
                }
              } catch (e) {}
            }
          }

          const githubUrl = githubPath
            ? `https://github.com/${leethub_hook}/blob/${defaultBranch}/${githubPath}`
            : (folderPath ? `https://github.com/${leethub_hook}/tree/${defaultBranch}/${folderPath}` : '');

          sendResponse({
            success: true,
            problemName,
            code,
            readme,
            githubPath,
            folderPath,
            githubUrl,
            branch: defaultBranch,
            hook: leethub_hook
          });

        // ===== ACTION: striver_move_problem ===================================
        // Moves problem files to a new category/subcategory folder and/or renames problem folder
        } else if (action === 'striver_move_problem') {
          const originalTitle = (request.problemName || request.title || '').trim();
          const newProblemName = (request.newProblemName || originalTitle).trim();
          const problemUrl = (request.url || '').trim();
          const oldFolderPath = request.oldFolderPath || '';
          const oldGithubPath = request.oldGithubPath || '';
          const newCategory = (request.newCategory || request.category || '').trim();
          const newSubcategory = (request.newSubcategory || request.subcategory || '').trim();
          const platform = request.platform || (oldFolderPath.startsWith(STRIVER_ROOT) ? 'striver' : 'leetcode');
          const isLeetCode = platform === 'leetcode';

          if (!originalTitle && !newProblemName) {
            sendResponse({ success: false, error: 'Problem name is required to move.' });
            return;
          }
          if (!newCategory) {
            sendResponse({ success: false, error: 'Category is required to move problem.' });
            return;
          }

          // LeetCode: STRICTLY preserve problem number (e.g. 0001-two-sum). Striver: strip leading number
          const cleanTitle = isLeetCode ? newProblemName : (stripProblemNumber(newProblemName) || newProblemName);
          const safeTitle = isLeetCode ? cleanTitle : sanitizeName(cleanTitle);
          const safeCat = sanitizeName(newCategory);
          const safeSubcat = newSubcategory ? sanitizeName(newSubcategory) : '';

          let newFolderPath = '';
          if (isLeetCode) {
            newFolderPath = safeCat;
            if (safeSubcat) newFolderPath += `/${safeSubcat}`;
            newFolderPath += `/${safeTitle}`;
          } else {
            newFolderPath = `${STRIVER_ROOT}/${safeCat}`;
            if (safeSubcat) newFolderPath += `/${safeSubcat}`;
            newFolderPath += `/${safeTitle}`;
          }

          if (oldFolderPath === newFolderPath && cleanTitle.toLowerCase() === originalTitle.toLowerCase()) {
            sendResponse({
              success: true,
              message: `Problem and folder are already up-to-date in ${newCategory}${newSubcategory ? ' > ' + newSubcategory : ''}.`,
              newFolderPath,
              newGithubPath: oldGithubPath
            });
            return;
          }

          // 1. Move all files from old folder to new folder
          let movedSolutionPath = '';
          let foundFiles = [];

          if (oldFolderPath) {
            try {
              const res = await fetch(`https://api.github.com/repos/${leethub_hook}/contents/${oldFolderPath}`, { headers: ghHeaders });
              if (res.ok) {
                const items = await res.json();
                if (Array.isArray(items)) {
                  foundFiles = items;
                }
              }
            } catch (e) {}
          }

          if (foundFiles.length > 0) {
            for (const file of foundFiles) {
              if (file.type === 'file') {
                const fileData = await ghGet(file.path);
                if (fileData) {
                  const destPath = `${newFolderPath}/${file.name}`;
                  await ghPut(destPath, fileData.content, `Move ${file.name} to ${newCategory}${safeSubcat ? '/' + safeSubcat : ''}`);
                  if (file.name.toLowerCase() !== 'readme.md' && !movedSolutionPath) {
                    movedSolutionPath = destPath;
                  }
                }
              }
            }
            // Delete old files from previous folder
            await ghDeleteFolder(oldFolderPath);
            if (oldGithubPath && !oldGithubPath.startsWith(oldFolderPath)) {
              await ghDelete(oldGithubPath, null, `Clean up old file ${oldGithubPath}`);
            }
          } else if (oldGithubPath) {
            // Standalone code file
            const fileData = await ghGet(oldGithubPath);
            if (fileData) {
              const fileName = oldGithubPath.split('/').pop();
              const destPath = `${newFolderPath}/${fileName}`;
              await ghPut(destPath, fileData.content, `Move ${fileName} to ${newCategory}`);
              movedSolutionPath = destPath;
              await ghDelete(oldGithubPath, fileData.sha, `Remove old file ${oldGithubPath}`);
            }
          }

          if (!movedSolutionPath && oldGithubPath) {
            const fileName = oldGithubPath.split('/').pop();
            movedSolutionPath = `${newFolderPath}/${fileName}`;
          }

          // 2. Update master README.md table
          if (isLeetCode) {
            // Update root README.md
            const rootFile = await ghGet('README.md');
            if (rootFile) {
              let rootContent = rootFile.content;
              const topicHeader = `## ${newCategory}`;
              const topicTableHeader = `\n${topicHeader}\n|  |\n| ------- |\n`;
              const probRow = `| [${cleanTitle}](https://github.com/${leethub_hook}/tree/${defaultBranch}/${newFolderPath}) |`;

              // Remove from old topic table if present
              const escapedClean = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const escapedOrig = (originalTitle || cleanTitle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const oldRowRegex = new RegExp(`\\|\\s*\\[(${escapedClean}|${escapedOrig})\\]\\([^)]*\\)[^\\n]*\\n?`, 'g');
              rootContent = rootContent.replace(oldRowRegex, '');

              const lcStart = '<!---LeetCode Topics Start-->';
              const lcEnd = '<!---LeetCode Topics End-->';
              if (!rootContent.includes(lcStart)) {
                rootContent += `\n\n${lcStart}\n# LeetCode Topics\n${lcEnd}`;
              }
              if (!rootContent.includes(topicHeader)) {
                rootContent = rootContent.replace(lcEnd, `${topicTableHeader}${lcEnd}`);
              }
              rootContent = rootContent.replace(topicHeader + '\n|  |\n| ------- |', `${topicHeader}\n|  |\n| ------- |\n${probRow}`);
              await ghPut('README.md', rootContent, `Update LeetCode topics: ${cleanTitle} in ${newCategory}`);
            }
          } else {
            // Update Striver Master README
            const masterReadmePath = `${STRIVER_ROOT}/README.md`;
            const masterFile = await ghGet(masterReadmePath);
            if (masterFile) {
              let masterContent = masterFile.content;
              const catLabel = safeSubcat ? `${newCategory}/${newSubcategory}` : newCategory;
              const solutionFileName = movedSolutionPath ? movedSolutionPath.split('/').pop() : `${safeTitle}.cpp`;
              const relativeSolPath = movedSolutionPath
                ? movedSolutionPath.replace(STRIVER_ROOT + '/', '')
                : `${safeCat}/${safeSubcat ? safeSubcat + '/' : ''}${safeTitle}/${solutionFileName}`;
              const newRow = `| [${cleanTitle}](${problemUrl || '#'}) | ${catLabel} | [${solutionFileName}](${relativeSolPath}) |\n`;

              const escapedOrig = (originalTitle || cleanTitle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const escapedClean = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const rowRegex = new RegExp(`\\|\\s*\\[(${escapedOrig}|${escapedClean})\\]\\([^)]*\\)[^\\n]*\\n`, 'g');
              if (masterContent.match(rowRegex)) {
                masterContent = masterContent.replace(rowRegex, newRow);
              } else {
                masterContent += newRow;
              }
              await ghPut(masterReadmePath, masterContent, `Update Master README: ${cleanTitle} in ${catLabel}`);
            }
          }

          // 3. Update .metadata.json
          const metadata = await getMetadata();
          const searchKey = isLeetCode ? cleanTitle : (problemUrl || safeTitle);
          let targetMeta = null;
          let targetKey = null;

          if (metadata.problems[searchKey]) {
            targetMeta = metadata.problems[searchKey];
            targetKey = searchKey;
          } else {
            for (const k in metadata.problems) {
              const p = metadata.problems[k];
              if (p.problemName === originalTitle || p.problemName === cleanTitle || sanitizeName(p.problemName).toLowerCase() === safeTitle.toLowerCase()) {
                targetMeta = p;
                targetKey = k;
                break;
              }
            }
          }

          if (!targetMeta) {
            targetKey = searchKey;
            targetMeta = {
              problemName: cleanTitle,
              platform: isLeetCode ? 'leetcode' : 'striver',
              url: problemUrl,
              language: 'cpp'
            };
          }

          targetMeta.problemName = cleanTitle;
          targetMeta.platform = isLeetCode ? 'leetcode' : 'striver';
          targetMeta.category = newCategory;
          targetMeta.subcategory = newSubcategory;
          targetMeta.folderPath = newFolderPath;
          if (movedSolutionPath) targetMeta.githubPath = movedSolutionPath;
          targetMeta.lastUpdated = new Date().toISOString();

          metadata.problems[targetKey] = targetMeta;
          await saveMetadata(metadata);

          sendResponse({
            success: true,
            message: `Updated "${cleanTitle}" in ${newCategory}${newSubcategory ? ' > ' + newSubcategory : ''}!`,
            newFolderPath,
            newGithubPath: movedSolutionPath
          });

        // ===== ACTION: striver_rename_category ===============================
        // Renames an entire category folder across all problems in it on GitHub
        } else if (action === 'striver_rename_category') {
          const oldCategory = (request.oldCategory || '').trim();
          const newCategory = (request.newCategory || '').trim();

          if (!oldCategory || !newCategory) {
            sendResponse({ success: false, error: 'Both old and new category names are required.' });
            return;
          }
          if (oldCategory.toLowerCase() === newCategory.toLowerCase()) {
            sendResponse({ success: true, message: 'Category name is already the same.' });
            return;
          }

          const safeOldCat = sanitizeName(oldCategory);
          const safeNewCat = sanitizeName(newCategory);
          const { problems } = await getAllRepoProblems();
          const matchingProblems = problems.filter(p => p.category && p.category.toLowerCase() === oldCategory.toLowerCase());

          if (matchingProblems.length === 0) {
            sendResponse({ success: false, error: `No problems found in category "${oldCategory}".` });
            return;
          }

          const oldCatPrefix = `${STRIVER_ROOT}/${safeOldCat}`;
          const newCatPrefix = `${STRIVER_ROOT}/${safeNewCat}`;
          const metadata = await getMetadata();

          let movedCount = 0;
          let hasLeetCode = false;
          let hasStriver = false;

          for (const prob of matchingProblems) {
            const oldFolder = prob.folderPath || '';
            if (!oldFolder) continue;

            const isLc = prob.platform === 'leetcode';
            if (isLc) hasLeetCode = true;
            else hasStriver = true;

            let newFolder = '';
            if (isLc) {
              if (oldFolder.startsWith(safeOldCat + '/')) {
                newFolder = oldFolder.replace(safeOldCat + '/', safeNewCat + '/');
              } else if (oldFolder === safeOldCat) {
                newFolder = safeNewCat;
              } else {
                newFolder = `${safeNewCat}/${prob.problemName}`;
              }
            } else {
              newFolder = oldFolder.startsWith(oldCatPrefix)
                ? oldFolder.replace(oldCatPrefix, newCatPrefix)
                : `${newCatPrefix}/${prob.subcategory ? sanitizeName(prob.subcategory) + '/' : ''}${sanitizeName(stripProblemNumber(prob.problemName))}`;
            }

            // Get all files in oldFolder
            let foundFiles = [];
            try {
              const res = await fetch(`https://api.github.com/repos/${leethub_hook}/contents/${oldFolder}`, { headers: ghHeaders });
              if (res.ok) {
                const items = await res.json();
                if (Array.isArray(items)) foundFiles = items;
              }
            } catch (e) {}

            let newSolPath = '';
            if (foundFiles.length > 0) {
              for (const file of foundFiles) {
                if (file.type === 'file') {
                  const fileData = await ghGet(file.path);
                  if (fileData) {
                    const destPath = `${newFolder}/${file.name}`;
                    await ghPut(destPath, fileData.content, `Rename category ${oldCategory} -> ${newCategory}`);
                    if (file.name.toLowerCase() !== 'readme.md' && !newSolPath) {
                      newSolPath = destPath;
                    }
                  }
                }
              }
              await ghDeleteFolder(oldFolder);
            }

            // Update metadata
            const probKey = isLc ? prob.problemName : (prob.url || prob.problemSlug);
            let targetMeta = metadata.problems[probKey];
            if (!targetMeta) {
              for (const k in metadata.problems) {
                if (metadata.problems[k].problemName === prob.problemName) {
                  targetMeta = metadata.problems[k];
                  break;
                }
              }
            }
            if (targetMeta) {
              targetMeta.category = newCategory;
              targetMeta.folderPath = newFolder;
              if (newSolPath) targetMeta.githubPath = newSolPath;
              targetMeta.lastUpdated = new Date().toISOString();
            }
            movedCount++;
          }

          await saveMetadata(metadata);

          // Update root README.md if LeetCode problems were moved
          if (hasLeetCode) {
            const rootFile = await ghGet('README.md');
            if (rootFile) {
              let rootContent = rootFile.content;
              const escapedOld = oldCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const topicRegex = new RegExp(`## ${escapedOld}\\b`, 'g');
              rootContent = rootContent.replace(topicRegex, `## ${newCategory}`);
              rootContent = rootContent.replace(new RegExp(`/${safeOldCat}/`, 'g'), `/${safeNewCat}/`);
              await ghPut('README.md', rootContent, `Rename LeetCode category ${oldCategory} to ${newCategory}`);
            }
          }

          // Update master Striver README.md table if Striver problems were moved
          if (hasStriver) {
            const masterReadmePath = `${STRIVER_ROOT}/README.md`;
            const masterFile = await ghGet(masterReadmePath);
            if (masterFile) {
              let masterContent = masterFile.content;
              const escapedOld = oldCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const catRegex = new RegExp(`(\\|\\s*[^|]+\\|\\s*)${escapedOld}(\\b|/|\\s*\\|)`, 'g');
              masterContent = masterContent.replace(catRegex, `$1${newCategory}$2`);
              await ghPut(masterReadmePath, masterContent, `Rename category ${oldCategory} to ${newCategory}`);
            }
          }

          sendResponse({
            success: true,
            count: movedCount,
            message: `Successfully renamed category "${oldCategory}" to "${newCategory}" (${movedCount} problems updated)!`
          });

        // ===== ACTION: striver_delete_problem ===============================
        // Permanently deletes problem folder from GitHub, cleans README, metadata & stats
        } else if (action === 'striver_delete_problem') {
          const problemName = (request.problemName || request.title || '').trim();
          const folderPath = (request.folderPath || '').trim();
          const githubPath = (request.githubPath || '').trim();
          const platform = request.platform || (folderPath.startsWith(STRIVER_ROOT) ? 'striver' : 'leetcode');
          const isLeetCode = platform === 'leetcode';
          const defaultBranch = await getDefaultBranch();

          if (!problemName && !folderPath && !githubPath) {
            sendResponse({ success: false, error: 'Problem information is required to delete.' });
            return;
          }

          // 1. Delete problem folder & files from GitHub
          if (folderPath && folderPath !== STRIVER_ROOT && folderPath !== '.' && folderPath !== '/') {
            await ghDeleteFolder(folderPath, `Delete problem ${problemName}`);
          }
          if (githubPath && (!folderPath || !githubPath.startsWith(folderPath + '/'))) {
            await ghDelete(githubPath, null, `Delete ${githubPath}`);
          }

          // 2. Remove problem from README.md
          if (isLeetCode) {
            const rootFile = await ghGet('README.md');
            if (rootFile && rootFile.content) {
              let rootContent = rootFile.content;
              const escapedProb = problemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const cleanProb = stripProblemNumber(problemName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const rowRegex = new RegExp(`\\|\\s*\\[(?:[^\\]]*${escapedProb}[^\\]]*|[^\\]]*${cleanProb}[^\\]]*)\\]\\([^)]*\\)[^\\n]*\\n?`, 'gi');
              const updatedContent = rootContent.replace(rowRegex, '');
              if (updatedContent !== rootContent) {
                await ghPut('README.md', updatedContent, `Delete LeetCode problem ${problemName}`);
              }
            }
          } else {
            const masterReadmePath = `${STRIVER_ROOT}/README.md`;
            const masterFile = await ghGet(masterReadmePath);
            if (masterFile && masterFile.content) {
              let masterContent = masterFile.content;
              const escapedProb = problemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const cleanProb = stripProblemNumber(problemName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const rowRegex = new RegExp(`\\|\\s*\\[(?:[^\\]]*${escapedProb}[^\\]]*|[^\\]]*${cleanProb}[^\\]]*)\\]\\([^)]*\\)[^\\n]*\\n?`, 'gi');
              const updatedContent = masterContent.replace(rowRegex, '');
              if (updatedContent !== masterContent) {
                await ghPut(masterReadmePath, updatedContent, `Delete Striver problem ${problemName}`);
              }
            }
          }

          // 3. Remove problem from .metadata.json
          const metadata = await getMetadata();
          if (metadata && metadata.problems) {
            const keysToDelete = [];
            const cleanName = stripProblemNumber(problemName).toLowerCase();
            for (const k in metadata.problems) {
              const p = metadata.problems[k];
              const pClean = stripProblemNumber(p.problemName || '').toLowerCase();
              if (
                k === problemName ||
                (request.url && k === request.url) ||
                p.problemName === problemName ||
                (folderPath && p.folderPath === folderPath) ||
                (cleanName && pClean === cleanName) ||
                (request.url && p.url === request.url)
              ) {
                keysToDelete.push(k);
              }
            }
            if (keysToDelete.length > 0) {
              keysToDelete.forEach(k => delete metadata.problems[k]);
              await saveMetadata(metadata);
            }
          }

          // 4. Update local stats in api.storage.local
          try {
            const data = await api.storage.local.get('stats');
            if (data && data.stats) {
              const stats = data.stats;
              let changed = false;
              if (stats.shas && stats.shas[problemName]) {
                const diff = stats.shas[problemName].difficulty;
                delete stats.shas[problemName];
                if (stats.solved && stats.solved > 0) stats.solved -= 1;
                if (diff === 'easy' && stats.easy > 0) stats.easy -= 1;
                if (diff === 'medium' && stats.medium > 0) stats.medium -= 1;
                if (diff === 'hard' && stats.hard > 0) stats.hard -= 1;
                changed = true;
              }
              if (folderPath && stats.shas && stats.shas[folderPath]) {
                delete stats.shas[folderPath];
                changed = true;
              }
              if (changed) {
                await api.storage.local.set({ stats });
              }
            }
          } catch (e) {}

          sendResponse({
            success: true,
            message: `Successfully deleted "${problemName}" and its folder from repository!`
          });

        } else {
          sendResponse({ success: false, error: `Unknown Striver action: ${action}` });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  return true;
}

function isChrome() {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}

function isFirefox() {
  return typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
}
