let api = isChrome() ? chrome : isFirefox() ? browser : undefined;

// const ONE_HOUR_MS = 60 * 60 * 1000;

api.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Allow persistent stats to sync on repo link
    api.storage.local.set({ sync_stats: true});
  }
});

api.runtime.onMessage.addListener(handleMessage);

function handleMessage(request, sender, sendResponse) {
  if (request && request.closeWebPage === true && request.isSuccess === true) {
    /* Set username */
    api.storage.local.set({ leethub_username: request.username });

    /* Set token */
    api.storage.local.set({ leethub_token: request.token });

    /* Close pipe */
    api.storage.local.set({ pipe_leethub: false }, () => {
      console.log('Closed pipe.');
    });

    api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
      var tab = tabs[0];
      api.tabs.remove(tab.id);
    });

    /* Go to onboarding for UX */
    const urlOnboarding = api.runtime.getURL('welcome.html');
    api.tabs.create({ url: urlOnboarding, active: true }); // creates new tab
  } else if (request && request.closeWebPage === true && request.isSuccess === false) {
    alert('Something went wrong while trying to authenticate your profile!');
    api.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
      var tab = tabs[0];
      api.tabs.remove(tab.id);
    });
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
    // Skip LeetCode GraphQL/network hooks entirely.
    (async () => {
      try {
        const { leethub_token, leethub_hook } = await api.storage.local.get(['leethub_token', 'leethub_hook']);
        if (!leethub_token || !leethub_hook) {
          sendResponse({ success: false, error: 'User not authenticated or no repo defined' });
          return;
        }

        const title = request.title || 'Unknown-Problem';
        const rawCode = request.code || '';
        const probStatement = request.statement || '';
        const examples = request.examples || '';
        const lang = request.language || 'cpp';
        
        let ext = '.cpp';
        const langMap = {'cpp': '.cpp', 'java': '.java', 'python': '.py', 'py': '.py', 'python3': '.py', 'javascript': '.js', 'js': '.js', 'c': '.c', 'csharp': '.cs'};
        if (langMap[lang]) ext = langMap[lang];

        const sanitizeName = (name) => {
          return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        };
        const safeTitle = sanitizeName(title);
        
        const folderName = `0000-Strivers-A2Z-DSA-Sheet/${safeTitle}`;
        const fileName = `solution${ext}`;
        const readmeName = 'README.md';

        const b64EncodeUnicode = (str) => {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
          }));
        };

        const uploadSafely = async (content, fName, commitMsg) => {
          const checkUrl = `https://api.github.com/repos/${leethub_hook}/contents/${folderName}/${fName}`;
          let sha = null;
          
          try {
            const res = await fetch(checkUrl, {
              headers: { Authorization: `token ${leethub_token}`, Accept: 'application/vnd.github.v3+json' }
            });
            if (res.status === 200) {
              const data = await res.json();
              sha = data.sha;
            }
          } catch(e) {}
          
          const body = { message: commitMsg, content: b64EncodeUnicode(content) };
          if (sha) body.sha = sha;
          
          const putRes = await fetch(checkUrl, {
            method: 'PUT',
            headers: { Authorization: `token ${leethub_token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          
          if (!putRes.ok) throw new Error(`GitHub API error: ${putRes.statusText}`);
          return putRes;
        };

        const fullReadme = `<h2><a href="${request.url || 'https://takeuforward.org/plus/'}">${title}</a></h2><h3>Medium</h3><hr>${probStatement}<br><br>${examples}`;
        
        await uploadSafely(fullReadme, readmeName, `Add README for ${title}`);
        await uploadSafely(rawCode, fileName, `Add solution for ${title}`);

        // Master README logic
        const masterReadmePath = '0000-Strivers-A2Z-DSA-Sheet/README.md';
        const masterCheckUrl = `https://api.github.com/repos/${leethub_hook}/contents/${masterReadmePath}`;
        let masterSha = null;
        let masterContent = '';
        
        try {
          const mRes = await fetch(masterCheckUrl, {
            headers: { Authorization: `token ${leethub_token}`, Accept: 'application/vnd.github.v3+json' }
          });
          if (mRes.status === 200) {
            const mData = await mRes.json();
            masterSha = mData.sha;
            masterContent = decodeURIComponent(escape(atob(mData.content)));
          }
        } catch(e) {}

        if (!masterContent.includes('Strivers A2Z DSA Sheet Solutions')) {
          masterContent = '# Strivers A2Z DSA Sheet Solutions\n\n| Problem | Solution |\n| :--- | :--- |\n';
        }

        const row = `| [${title}](${safeTitle}) | [${ext}](${safeTitle}/${fileName}) |\n`;
        if (!masterContent.includes(`[${title}]`)) {
          masterContent += row;
          const mBody = { message: `Update Master README with ${title}`, content: b64EncodeUnicode(masterContent) };
          if (masterSha) mBody.sha = masterSha;
          
          await fetch(masterCheckUrl, {
            method: 'PUT',
            headers: { Authorization: `token ${leethub_token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify(mBody)
          });
        }

        sendResponse({ success: true });
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
