const localAuth = {
  /**
   * Parses Access Code and forwards to background script
   */
  parseAccessCode(url) {
    if (url.includes('error=')) {
      chrome.storage.local.set({ pipe_leethub: false });
      chrome.runtime.sendMessage({
        closeWebPage: true,
        isSuccess: false,
      });
      return;
    }

    let code = null;
    try {
      const parsed = new URL(url);
      code = parsed.searchParams.get('code');
    } catch (e) {
      const codeMatch = url.match(/[?&]code=([\w\/\-]+)/);
      if (codeMatch) code = codeMatch[1];
    }

    if (code) {
      // Send code directly to background service worker for secure token exchange
      chrome.runtime.sendMessage({
        type: 'GITHUB_AUTH_CODE',
        code: code
      });
    }
  },
};

const link = window.location.href;

/* Check for open pipe */
if (window.location.host === 'github.com') {
  chrome.storage.local.get(['pipe_leethub', 'leethub_token'], (data) => {
    // If pipe is open or token not saved yet, parse access code from URL
    if (data && (data.pipe_leethub || !data.leethub_token)) {
      localAuth.parseAccessCode(link);
    }
  });
}
