// Striver A2Z Sheet syncing script
// UI Injection
function injectSyncButton() {
  const syncBtn = document.createElement('button');
  syncBtn.innerText = 'Sync to GitHub';
  syncBtn.id = 'leethub-sync-btn';
  syncBtn.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;';
  
  syncBtn.onclick = handleSync;

  // Insert next to the workspace toolbar. The exact class/id depends on takeuforward UI, but we can append to body fixed for now or try to find a known toolbar.
  // We'll place it fixed at the bottom right for visibility if we can't find a specific toolbar, or try to find a header.
  const toolbar = document.querySelector('.coding-platform-toolbar') || document.body;
  if (toolbar === document.body) {
    syncBtn.style.position = 'fixed';
    syncBtn.style.bottom = '20px';
    syncBtn.style.right = '20px';
    syncBtn.style.zIndex = '9999';
  }
  toolbar.appendChild(syncBtn);
}

async function handleSync() {
  const syncBtn = document.getElementById('leethub-sync-btn');
  const originalText = syncBtn.innerText;
  syncBtn.innerText = 'Syncing...';
  syncBtn.disabled = true;

  try {
    let exactCode = '';

    // 1. Extract visual lines from DOM
    const viewLines = document.querySelectorAll('.view-lines');
    if (viewLines.length > 0) {
      const lines = viewLines[0].querySelectorAll('.view-line');
      if (lines.length > 0) {
        exactCode = Array.from(lines).map(l => l.textContent).join('\n');
      } else {
        exactCode = viewLines[0].innerText;
      }
    } else {
      exactCode = document.querySelector('code')?.innerText || '';
    }

    // 2. Retrieve 'problemTabsHistory' from localStorage
    const historyStr = localStorage.getItem('problemTabsHistory');
    let parsedHistory = [];
    if (historyStr) {
      parsedHistory = JSON.parse(historyStr);
    }

    // 3. Match code against complete localStorage (All languages, no time limit)
    let matchedCode = exactCode;
    let matchedLanguage = 'cpp'; // default
    
    // Strip everything except alphanumeric for invincible matching
    const cleanExact = exactCode.replace(/[^a-zA-Z0-9]/g, '');
    let foundMatch = false;

    if (cleanExact.length > 0) {
      for (const obj of parsedHistory) {
        try {
          const languages = ['cpp', 'java', 'python', 'python3', 'javascript', 'c', 'csharp'];
          for (const lang of languages) {
            if (obj.tabsByLanguage && obj.tabsByLanguage[lang] && obj.tabsByLanguage[lang].tabs.length > 0) {
              const tabCode = obj.tabsByLanguage[lang].tabs[0].code;
              const cleanTab = tabCode.replace(/[^a-zA-Z0-9]/g, '');
              
              let isMatch = false;
              if (cleanExact.length >= 30) {
                // Check 3 different chunks to bypass any leading/trailing DOM artifacts
                const chunk1 = cleanExact.substring(0, 30);
                const chunk2 = cleanExact.substring(Math.floor(cleanExact.length / 2) - 15, Math.floor(cleanExact.length / 2) + 15);
                const chunk3 = cleanExact.substring(cleanExact.length - 30);
                
                if (cleanTab.includes(chunk1) || cleanTab.includes(chunk2) || cleanTab.includes(chunk3)) {
                  isMatch = true;
                }
              } else if (cleanTab.includes(cleanExact)) {
                isMatch = true;
              }
              
              if (isMatch) {
                matchedCode = tabCode;
                matchedLanguage = lang === 'python3' ? 'py' : lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang;
                foundMatch = true;
                break;
              }
            }
          }
        } catch (e) {}
        if (foundMatch) break;
      }
    }

    // Extract title
    const titleElement = document.querySelector('h1.text-xl.font-bold, .problem-statement h1, .problem-statement h2');
    let title = titleElement ? titleElement.innerText.trim() : '';
    if (!title) {
      // Fallback to URL path segment
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      title = pathSegments.pop() || 'Striver-Problem';
    }

    // Extract Problem Statement and Examples
    const statementEl = document.querySelector('.problem-statement');
    const statementHTML = statementEl ? statementEl.innerHTML : '';
    
    const vstackEls = Array.from(document.querySelectorAll('.tuf-vstack')).filter(el => {
      // Only include sections that contain actual examples or constraints
      return el.querySelector('.tuf-example.text-new_secondary') || el.querySelector('.tuf-dark-content-box');
    });
    let examplesHTML = '';
    vstackEls.forEach(el => {
      examplesHTML += el.innerHTML + '<br><br>';
    });

    // Send Data
    const payload = {
      code: matchedCode,
      title: title,
      statement: statementHTML,
      examples: examplesHTML,
      isStriver: true,
      language: matchedLanguage
    };

    chrome.runtime.sendMessage(payload, (response) => {
      syncBtn.innerText = originalText;
      syncBtn.disabled = false;
      if (response && response.success) {
        alert(response.message || 'Problem synced successfully to Striver parent folder!');
      } else {
        alert('Failed to sync: ' + (response?.error || 'Unknown error'));
      }
    });

  } catch (error) {
    console.error(error);
    syncBtn.innerText = originalText;
    syncBtn.disabled = false;
    alert('Error syncing to GitHub');
  }
}

// Wait for DOM
setTimeout(injectSyncButton, 3000);
