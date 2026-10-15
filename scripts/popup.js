import { getBrowser } from "./leetcode/util.js";

let action = false;

let api = getBrowser()

$('#authenticate').on('click', () => {
  oAuth2.begin();
});

$('#toggle_pat').on('click', (e) => {
  e.preventDefault();
  $('#pat_section').slideToggle(150);
});

$('#save_pat_btn').on('click', () => {
  const token = $('#pat_token_input').val().trim();
  const errorEl = $('#pat_error');
  errorEl.hide();

  if (!token) {
    errorEl.text('Please enter a GitHub token.').show();
    return;
  }

  $('#save_pat_btn').addClass('loading disabled');

  fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })
    .then(async (res) => {
      $('#save_pat_btn').removeClass('loading disabled');
      if (res.ok) {
        const userData = await res.json();
        api.storage.local.set({
          leethub_token: token,
          leethub_username: userData.login,
          pipe_leethub: false
        }, () => {
          const urlOnboarding = api.runtime.getURL('welcome.html');
          api.tabs.create({ url: urlOnboarding, active: true });
          window.close();
        });
      } else {
        errorEl.text('Invalid token or token expired (HTTP ' + res.status + ').').show();
      }
    })
    .catch((err) => {
      $('#save_pat_btn').removeClass('loading disabled');
      errorEl.text('Network error: ' + err.message).show();
    });
});

/* Get URL for welcome page */
$('#welcome_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#hook_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#reset_stats').on('click', () => {
  $('#reset_confirmation').show();
  $('#reset_yes').off('click').on('click', () => {
    api.storage.local.set({ stats: null });
    $('#p_solved').text(0);
    $('#p_solved_easy').text(0);
    $('#p_solved_medium').text(0);
    $('#p_solved_hard').text(0);
    $('#reset_confirmation').hide()
  })
  $('#reset_no').off('click').on('click', () => {
    $('#reset_confirmation').hide()
  })
});

api.storage.local.get('leethub_token', data => {
  const token = data.leethub_token;
  if (token === null || token === undefined) {
    action = true;
    $('#auth_mode').show();
  } else {
    // To validate user, load user object from GitHub.
    const AUTHENTICATION_URL = 'https://api.github.com/user';

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          /* Show MAIN FEATURES */
          api.storage.local.get('mode_type', data2 => {
            if (data2 && data2.mode_type === 'commit') {
              $('#commit_mode').show();
              /* Get problem stats and repo link */
              api.storage.local.get(['stats', 'leethub_hook'], data3 => {
                const stats = data3?.stats;
                $('#p_solved').text(stats?.solved ?? 0);
                $('#p_solved_easy').text(stats?.easy ?? 0);
                $('#p_solved_medium').text(stats?.medium ?? 0);
                $('#p_solved_hard').text(stats?.hard ?? 0);
                const leethubHook = data3?.leethub_hook;
                if (leethubHook) {
                  $('#repo_url').html(
                    `<a target="blank" style="color: cadetblue !important; font-size:0.8em;" href="https://github.com/${leethubHook}">${leethubHook}</a>`
                  );
                }
              });
            } else {
              $('#hook_mode').show();
            }
          });
        } else if (xhr.status === 401) {
          // bad oAuth
          // reset token and redirect to authorization process again!
          api.storage.local.set({ leethub_token: null }, () => {
            console.log('BAD oAuth!!! Redirecting back to oAuth process');
            action = true;
            $('#auth_mode').show();
          });
        }
      }
    });
    xhr.open('GET', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.send();
  }
});
