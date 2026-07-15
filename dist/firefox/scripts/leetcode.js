/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./scripts/leetcode/util.js
/** Enum for languages supported by LeetCode. */
const languages = Object.freeze({
  C: '.c',
  'C++': '.cpp',
  'C#': '.cs',
  Dart: '.dart',
  Elixir: '.ex',
  Erlang: '.erl',
  Go: '.go',
  Java: '.java',
  JavaScript: '.js',
  Javascript: '.js',
  Kotlin: '.kt',
  MySQL: '.sql',
  'MS SQL Server': '.sql',
  Oracle: '.sql',
  Pandas: '.py',
  PHP: '.php',
  Python: '.py',
  Python3: '.py',
  Racket: '.rkt',
  Ruby: '.rb',
  Rust: '.rs',
  Scala: '.scala',
  Swift: '.swift',
  TypeScript: '.ts',
});

/** @enum */
const DIFFICULTY = Object.freeze({
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  UNKNOWN: 'Unknown',
});

class util_LeetHubError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LeetHubErr';
  }
}

function isEmptyObject(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

function assert(truthy, msg) {
  if (!truthy) {
    throw new util_LeetHubError(msg);
  }
}

/**
 * Returns a function that can be immediately invoked but will start
 * a timeout of 'wait' milliseconds before it can be called again.
 * @param {Function} func to be called after wait
 * @param {number} wait time in ms
 * @param {boolean} invokeBeforeTimeout true if you want to invoke func before waiting
 * @returns {Function}
 */
function debounce(func, wait, invokeBeforeTimeout) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!invokeBeforeTimeout) func.apply(context, args);
    };
    const callNow = invokeBeforeTimeout && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Delays the execution of a function by the specified time (in milliseconds)
 * and then executes the function with the provided arguments.
 *
 * @param {Function} func - The function to be executed after the delay.
 * @param {number} wait - The number of milliseconds to wait before executing the function.
 * @param {...*} [args] - Additional arguments to pass to the function when it is called.
 * @returns {Promise<*>} A promise that resolves with the result of the function execution.
 */
function delay(func, wait, ...args) {
  return new Promise(resolve => setTimeout(() => resolve(func(...args)), wait));
}

/**
 *
 * @returns {chrome | browser} namespace of browser extension api
 */
function getBrowser() {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return chrome;
  } else if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return browser;
  } else {
    throw new util_LeetHubError('BrowserNotSupported');
  }
}

/**
 * Returns the difficulty in PascalCase for a given difficulty
 * @param {string} difficulty - The difficulty level as a string: "easy", "medium", "hard", etc.
 * @returns {string} - The difficulty level in PascalCase: "Easy", "Medium", or "Hard" or "Unknown" for unrecognized values.
 */
function getDifficulty(difficulty) {
  difficulty &&= difficulty.toUpperCase().trim();
  return DIFFICULTY[difficulty] ?? DIFFICULTY.UNKNOWN;
}

/**
 * Checks if an HTML Collection exists and has elements
 * @param {HTMLCollectionOf<Element>} elem
 * @returns
 */
function checkElem(elem) {
  return elem && elem.length > 0;
}

/** @param {string} string @returns {string} problem slug, e.g. 0001-two-sum */
function convertToSlug(string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

function addLeadingZeros(title) {
  const maxTitlePrefixLength = 4;
  var len = title.split('-')[0].length;
  if (len < maxTitlePrefixLength) {
    return '0'.repeat(4 - len) + title;
  }
  return title;
}

function formatStats(time, timePercentile, space, spacePercentile) {
  return `Time: ${time} (${timePercentile}%), Space: ${space} (${spacePercentile}%) - LeetHub`;
}

function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (isObject(source[key])) {
      if (!target[key]) {
        Object.assign(target, { [key]: {} });
      }
      mergeDeep(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
}

function mergeStats(obj1, obj2) {
  function countDifficulties(shas) {
    const difficulties = { easy: 0, medium: 0, hard: 0, solved: 0 };
    for (const problem in shas) {
      if ('difficulty' in shas[problem]) {
        const difficulty = shas[problem].difficulty;
        if (difficulty in difficulties) {
          difficulties[difficulty]++;
        }
      }
    }
    for (let value of Object.values(difficulties)) {
      difficulties.solved += value;
    }
    return difficulties;
  }

  const merged = {};
  mergeDeep(merged, obj1);
  mergeDeep(merged, obj2);

  const shas = merged.shas || {};
  const difficulties = countDifficulties(shas);

  merged.easy = difficulties.easy;
  merged.medium = difficulties.medium;
  merged.hard = difficulties.hard;
  merged.solved = difficulties.solved;

  return merged;
}



;// CONCATENATED MODULE: ./scripts/leetcode/versions.js


/*
 * V1 - old UI functionality
 * V2 - new UI functionality
 */
function LeetCodeV1() {
  this.difficulty;
  this.progressSpinnerElementId = 'leethub_progress_elem';
  this.progressSpinnerElementClass = 'leethub_progress';
  this.injectSpinnerStyle();
}
LeetCodeV1.prototype.init = async function () {};
/* Function for finding and parsing the full code. */
/* - At first find the submission details url. */
/* - Then send a request for the details page. */
/* - Parse the code from the html reponse. */
/* - Parse the stats from the html response (explore section) */
LeetCodeV1.prototype.findCode = function (commitMsg) {
  // Get the submission details url from the submission page.
  let submissionURL;
  const e = document.getElementsByClassName('status-column__3SUg');
  if (checkElem(e)) {
    // for normal problem submisson
    const submissionRef = e[1].innerHTML.split(' ')[1];
    submissionURL = 'https://leetcode.com' + submissionRef.split('=')[1].slice(1, -1);
  } else {
    // for a submission in explore section
    const submissionRef = document.getElementById('result-state');
    submissionURL = submissionRef.href;
  }

  if (submissionURL == undefined) {
    return;
  }
  /* Request for the submission details page */
  return fetch(submissionURL)
    .then(res => {
      if (res.status == 200) {
        return res.text();
      } else {
        throw new Error('' + res.status);
      }
    })
    .then(responseText => {
      const doc = new DOMParser().parseFromString(responseText, 'text/html');
      /* the response has a js object called pageData. */
      /* Pagedata has the details data with code about that submission */
      const scripts = doc.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const text = scripts[i].innerText;
        if (text.includes('pageData')) {
          /* Extract the full code */
          const firstIndex = text.indexOf('submissionCode');
          const lastIndex = text.indexOf('editCodeUrl');
          let slicedText = text.slice(firstIndex, lastIndex);
          /* slicedText has form "submissionCode: 'Details code'" */
          /* Find the index of first and last single inverted coma. */
          const firstInverted = slicedText.indexOf("'");
          const lastInverted = slicedText.lastIndexOf("'");
          /* Extract only the code */
          const codeUnicoded = slicedText.slice(firstInverted + 1, lastInverted);
          /* The code has some unicode. Replacing all unicode with actual characters */
          const code = codeUnicoded.replace(/\\u[\dA-F]{4}/gi, function (match) {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
          });

          /* For a submission in explore section we do not get probStat beforehand.
              So, parse statistics from submisson page */
          if (!commitMsg) {
            slicedText = text.slice(text.indexOf('runtime'), text.indexOf('memory'));
            const resultRuntime = slicedText.slice(
              slicedText.indexOf("'") + 1,
              slicedText.lastIndexOf("'")
            );
            slicedText = text.slice(text.indexOf('memory'), text.indexOf('total_correct'));
            const resultMemory = slicedText.slice(
              slicedText.indexOf("'") + 1,
              slicedText.lastIndexOf("'")
            );
            commitMsg = `Time: ${resultRuntime}, Memory: ${resultMemory} - LeetHub`;
          }

          if (code != null) {
            return code;
          }
        }
      }
    });
};
/** @returns {languages} */
LeetCodeV1.prototype.getLanguageExtension = function () {
  const tag = [
    ...document.getElementsByClassName('ant-select-selection-selected-value'),
    ...document.getElementsByClassName('Select-value-label'),
  ];
  if (tag && tag.length > 0) {
    for (let i = 0; i < tag.length; i += 1) {
      const elem = tag[i].textContent;
      if (elem !== undefined && languages[elem] !== undefined) {
        return languages[elem];
      }
    }
  }
  return null;
};
/* function to get the notes if there is any
   the note should be opened atleast once for this to work
   this is because the dom is populated after data is fetched by opening the note */
LeetCodeV1.prototype.getNotesIfAny = function () {
  // there are no notes on expore
  if (document.URL.startsWith('https://leetcode.com/explore/')) return '';

  let notes = '';
  if (
    checkElem(document.getElementsByClassName('notewrap__eHkN')) &&
    checkElem(
      document.getElementsByClassName('notewrap__eHkN')[0].getElementsByClassName('CodeMirror-code')
    )
  ) {
    let notesdiv = document
      .getElementsByClassName('notewrap__eHkN')[0]
      .getElementsByClassName('CodeMirror-code')[0];
    if (notesdiv) {
      for (i = 0; i < notesdiv.childNodes.length; i++) {
        if (notesdiv.childNodes[i].childNodes.length == 0) continue;
        const text = notesdiv.childNodes[i].childNodes[0].innerText;
        if (text) {
          notes = `${notes}\n${text.trim()}`.trim();
        }
      }
    }
  }
  return notes.trim();
};
// Returns a slugged num+title variation e.g. 0001-two-sum
LeetCodeV1.prototype.getProblemNameSlug = function () {
  const questionElem = document.getElementsByClassName('content__u3I1 question-content__JfgR');
  const questionDescriptionElem = document.getElementsByClassName('question-description__3U1T');
  let questionTitle = 'unknown-problem';
  if (checkElem(questionElem)) {
    let qtitle = document.getElementsByClassName('css-v3d350');
    if (checkElem(qtitle)) {
      questionTitle = qtitle[0].innerHTML;
    }
  } else if (checkElem(questionDescriptionElem)) {
    let qtitle = document.getElementsByClassName('question-title');
    if (checkElem(qtitle)) {
      questionTitle = qtitle[0].innerText;
    }
  }
  return addLeadingZeros(convertToSlug(questionTitle));
};
/* Gets the success state of the solution and updates html elements with new classes */
LeetCodeV1.prototype.getSuccessStateAndUpdate = function () {
  const successTag = document.getElementsByClassName('success__3Ai7');
  const resultState = document.getElementById('result-state');

  // check success state for a normal problem
  if (
    checkElem(successTag) &&
    successTag[0].className === 'success__3Ai7' &&
    successTag[0].innerText.trim() === 'Success'
  ) {
    console.log(successTag[0]);
    successTag[0].classList.add('marked_as_success');
    return true;
  }
  // check success state for a explore section problem
  else if (
    resultState &&
    resultState.className === 'text-success' &&
    resultState.innerText === 'Accepted'
  ) {
    resultState.classList.add('marked_as_success');
    return true;
  }

  return false;
};
/* Parser function for time/space stats */
LeetCodeV1.prototype.parseStats = function () {
  const probStats = document.getElementsByClassName('data__HC-i');
  if (!checkElem(probStats)) {
    return null;
  }
  const time = probStats[0].textContent;
  const timePercentile = probStats[1].textContent;
  const space = probStats[2].textContent;
  const spacePercentile = probStats[3].textContent;

  return `Time: ${time} (${timePercentile}), Space: ${space} (${spacePercentile}) - LeetHub`;
};
/* Parser function for the question, question title, question difficulty, and tags */
LeetCodeV1.prototype.parseQuestion = function () {
  let questionUrl = window.location.href;
  if (questionUrl.endsWith('/submissions/')) {
    questionUrl = questionUrl.substring(0, questionUrl.lastIndexOf('/submissions/') + 1);
  }
  const questionElem = document.getElementsByClassName('content__u3I1 question-content__JfgR');
  const questionDescriptionElem = document.getElementsByClassName('question-description__3U1T');
  if (checkElem(questionElem)) {
    const qbody = questionElem[0].innerHTML;

    // Problem title.
    let qtitle = document.getElementsByClassName('css-v3d350');
    if (checkElem(qtitle)) {
      qtitle = qtitle[0].innerHTML;
    } else {
      qtitle = 'unknown-problem';
    }

    // Problem difficulty, each problem difficulty has its own class.
    const isHard = document.getElementsByClassName('css-t42afm');
    const isMedium = document.getElementsByClassName('css-dcmtd5');
    const isEasy = document.getElementsByClassName('css-14oi08n');

    if (checkElem(isEasy)) {
      this.difficulty = getDifficulty('easy');
    } else if (checkElem(isMedium)) {
      this.difficulty = getDifficulty('medium');
    } else if (checkElem(isHard)) {
      this.difficulty = getDifficulty('hard');
    } else {
      this.difficulty = getDifficulty(null);
    }
    // Final formatting of the contents of the README for each problem
    const markdown = `<h2><a href="${questionUrl}">${qtitle}</a></h2><h3>${difficulty}</h3><hr>${qbody}`;
    return markdown;
  } else if (checkElem(questionDescriptionElem)) {
    let questionTitle = document.getElementsByClassName('question-title');
    if (checkElem(questionTitle)) {
      questionTitle = questionTitle[0].innerText;
    } else {
      questionTitle = 'unknown-problem';
    }

    const questionBody = questionDescriptionElem[0].innerHTML;
    const markdown = `<h2>${questionTitle}</h2><hr>${questionBody}`;

    return markdown;
  }
};
/* Injects a spinner on left side to the "Run Code" button */
LeetCodeV1.prototype.startSpinner = function () {
  try {
    let elem = document.getElementById('leethub_progress_anchor_element');
    if (!elem) {
      elem = document.createElement('span');
      elem.id = 'leethub_progress_anchor_element';
      elem.style = 'margin-right: 20px;padding-top: 2px;';
    }
    elem.innerHTML = `<div id="${this.progressSpinnerElementId}" class="${this.progressSpinnerElementClass}"></div>`;
    this.insertToAnchorElement(elem);
  } catch (error) {
    console.log(error);
  }
};
/* Injects css style required for the upload progress indicator */
LeetCodeV1.prototype.injectSpinnerStyle = function () {
  const style = document.createElement('style');
  style.textContent = `.${this.progressSpinnerElementClass} {pointer-events: none;width: 2.0em;height: 2.0em;border: 0.4em solid transparent;border-color: #eee;border-top-color: #3E67EC;border-radius: 50%;animation: loadingspin 1s linear infinite;} @keyframes loadingspin { 100% { transform: rotate(360deg) }}`;
  document.head.append(style);
};
/* Inserts an anchor element that is specific to the page you are on (e.g. Explore) */
LeetCodeV1.prototype.insertToAnchorElement = function (elem) {
  if (document.URL.startsWith('https://leetcode.com/explore/')) {
    const action = document.getElementsByClassName('action');
    if (
      checkElem(action) &&
      checkElem(action[0].getElementsByClassName('row')) &&
      checkElem(action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6')) &&
      action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6').length > 1
    ) {
      target = action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6')[1];
      elem.className = 'pull-left';
      if (target.childNodes.length > 0) target.childNodes[0].prepend(elem);
    }
  } else {
    if (checkElem(document.getElementsByClassName('action__38Xc'))) {
      let target = document.getElementsByClassName('action__38Xc')[0];
      elem.className = 'runcode-wrapper__8rXm';
      if (target.childNodes.length > 0) target.childNodes[0].prepend(elem);
    }
  }
};
/* Creates a ✔️ tick mark before "Run Code" button signaling LeetHub has done its job */
LeetCodeV1.prototype.markUploaded = function () {
  let elem = document.getElementById(this.progressSpinnerElementId);
  if (elem) {
    elem.className = '';
    elem.style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid #78b13f;border-right:7px solid #78b13f;';
  }
};
/* Creates a ❌ failed tick mark before "Run Code" button signaling that upload failed */
LeetCodeV1.prototype.markUploadFailed = function () {
  let elem = document.getElementById(this.progressSpinnerElementId);
  if (elem) {
    elem.className = '';
    elem.style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid red;border-right:7px solid red;';
  }
};

function LeetCodeV2() {
  this.submissionData;
  this.submissionId;
  this.difficulty;
  this.progressSpinnerElementId = 'leethub_progress_elem';
  this.progressSpinnerElementClass = 'leethub_progress';
  this.injectSpinnerStyle();
}
LeetCodeV2.prototype.init = async function () {
  const submissionId = this.submissionId;

  // Query for getting the solution runtime and memory stats, the code, the coding language, the question id, question title and question difficulty
  const submissionDetailsQuery = {
    query:
      '\n    query submissionDetails($submissionId: Int!) {\n  submissionDetails(submissionId: $submissionId) {\n    runtime\n    runtimeDisplay\n    runtimePercentile\n    runtimeDistribution\n    memory\n    memoryDisplay\n    memoryPercentile\n    memoryDistribution\n    code\n    timestamp\n    statusCode\n    lang {\n      name\n      verboseName\n    }\n    question {\n      questionId\n    title\n    titleSlug\n    content\n    difficulty\n  topicTags {\n    name\n    slug\n    }\n   }\n    notes\n    topicTags {\n      tagId\n      slug\n      name\n    }\n    runtimeError\n  }\n}\n    ',
    variables: { submissionId: submissionId },
    operationName: 'submissionDetails',
  };
  const submissionDetailsOptions = {
    method: 'POST',
    headers: {
      cookie: document.cookie, // required to authorize the API request
      'content-type': 'application/json',
    },
    body: JSON.stringify(submissionDetailsQuery),
  };
  const submissionData = await fetch('https://leetcode.com/graphql/', submissionDetailsOptions)
    .then(res => res.json())
    .then(res => res.data.submissionDetails)
    
  // Query for getting question details mainly frontendId
  // TODO: maybe handle a case where submissionData.question does not exist (e.g. LeetCode changes structure of response object)
  const questionDetailsQuery = {
    query: "\n    query questionDetail($titleSlug: String!) {\n  languageList {\n    id\n    name\n  }\n  submittableLanguageList {\n    id\n    name\n    verboseName\n  }\n  statusList {\n    id\n    name\n  }\n  questionDiscussionTopic(questionSlug: $titleSlug) {\n    id\n    commentCount\n    topLevelCommentCount\n  }\n  ugcArticleOfficialSolutionArticle(questionSlug: $titleSlug) {\n    uuid\n    chargeType\n    canSee\n    hasVideoArticle\n  }\n  question(titleSlug: $titleSlug) {\n    title\n    titleSlug\n    questionId\n    questionFrontendId\n    questionTitle\n    translatedTitle\n    content\n    translatedContent\n    categoryTitle\n    difficulty\n    stats\n    companyTagStatsV2\n    topicTags {\n      name\n      slug\n      translatedName\n    }\n    similarQuestionList {\n      difficulty\n      titleSlug\n      title\n      translatedTitle\n      isPaidOnly\n    }\n    mysqlSchemas\n    dataSchemas\n    frontendPreviews\n    likes\n    dislikes\n    isPaidOnly\n    status\n    canSeeQuestion\n    enableTestMode\n    metaData\n    enableRunCode\n    enableSubmit\n    enableDebugger\n    envInfo\n    isLiked\n    nextChallenges {\n      difficulty\n      title\n      titleSlug\n      questionFrontendId\n    }\n    libraryUrl\n    adminUrl\n    hints\n    codeSnippets {\n      code\n      lang\n      langSlug\n    }\n    exampleTestcaseList\n    hasFrontendPreview\n    featuredContests {\n      titleSlug\n      title\n    }\n  }\n}\n    ",
    variables: { titleSlug: submissionData.question.titleSlug },
    operationName: 'questionDetail',
  };
  const questionDetailsOptions = {
    method: 'POST',
    headers: {
      cookie: document.cookie, // required to authorize the API request
      'content-type': 'application/json',
    },
    body: JSON.stringify(questionDetailsQuery),
  };
  const frontendId = await fetch('https://leetcode.com/graphql/', questionDetailsOptions)
    .then(res => res.json())
    .then(res => res.data.question.questionFrontendId)
    
  submissionData.question.questionFrontendId = frontendId;

  this.submissionData = submissionData;
};
LeetCodeV2.prototype.findCode = function () {
  const code = this.getCode();
  if (!code) {
    throw new LeetHubError('SolutionCodeNotFound');
  }

  return code;
};
LeetCodeV2.prototype.getCode = function () {
  if (this.submissionData != null) {
    return this.submissionData.code;
  }

  const code = document.getElementsByTagName('code');
  if (!checkElem(code)) {
    return null;
  }

  return code[0].innerText;
};
/** @returns {languages} */
LeetCodeV2.prototype.getLanguageExtension = function () {
  if (this.submissionData != null) {
    return languages[this.submissionData.lang.verboseName];
  }

  const tag = document.querySelector('button[id^="headlessui-listbox-button"]');
  if (!tag) {
    throw new LeetHubError('LanguageButtonNotFound');
  }

  const lang = tag.innerText;
  if (languages[lang] === undefined) {
    throw new LeetHubError(`UnknownLanguage::${lang}`);
  }

  return languages[lang];
};
LeetCodeV2.prototype.getNotesIfAny = function () {};
LeetCodeV2.prototype.getProblemNameSlug = function () {
  const slugTitle = this.submissionData.question.titleSlug;
  const qNum = this.submissionData.question.questionFrontendId;

  return addLeadingZeros(qNum + '-' + slugTitle);
};
LeetCodeV2.prototype.getSuccessStateAndUpdate = function () {
  const successTag = document.querySelectorAll('[data-e2e-locator="submission-result"]');
  if (checkElem(successTag)) {
    console.log(successTag[0]);
    successTag[0].classList.add('marked_as_success');
    return true;
  }
  return false;
};
LeetCodeV2.prototype.parseStats = function () {
  if (this.submissionData != null) {
    const runtimePercentile =
      Math.round((this.submissionData.runtimePercentile + Number.EPSILON) * 100) / 100;
    const spacePercentile =
      Math.round((this.submissionData.memoryPercentile + Number.EPSILON) * 100) / 100;
    return formatStats(
      this.submissionData.runtimeDisplay,
      runtimePercentile,
      this.submissionData.memoryDisplay,
      spacePercentile
    );
  }

  const probStats = document.getElementsByClassName('flex w-full pb-4')[0].innerText.split('\n');
  if (!checkElem(probStats)) {
    return null;
  }

  const time = probStats[1];
  const timePercentile = probStats[3];
  const space = probStats[5];
  const spacePercentile = probStats[7];

  return formatStats(time, timePercentile, space, spacePercentile);
};
LeetCodeV2.prototype.parseQuestion = function () {
  let markdown;
  if (this.submissionData != null) {
    const questionUrl = window.location.href.split('/submissions')[0];
    const qTitle = `${this.submissionData.question.questionId}. ${this.submissionData.question.title}`;
    const qBody = this.parseQuestionDescription();

    this.difficulty = getDifficulty(this.submissionData.question.difficulty);

    // Final formatting of the contents of the README for each problem
    markdown = `<h2><a href="${questionUrl}">${qTitle}</a></h2><h3>${this.difficulty}</h3><hr>${qBody}`;
  } else {
    // TODO: get the README markdown via scraping. Right now this isn't possible.
    markdown = null;
  }

  return markdown;
};
LeetCodeV2.prototype.parseQuestionTitle = function () {
  if (this.submissionData != null) {
    return this.submissionData.question.title;
  }

  let questionTitle = document
    .getElementsByTagName('title')[0]
    .innerText.split(' ')
    .slice(0, -2)
    .join(' ');

  if (questionTitle === '') {
    questionTitle = 'unknown-problem';
  }

  return questionTitle;
};
LeetCodeV2.prototype.parseQuestionDescription = function () {
  if (this.submissionData != null) {
    return this.submissionData.question.content;
  }

  const description = document.getElementsByName('description');
  if (!checkElem(description)) {
    return null;
  }
  return description[0].content;
};
LeetCodeV2.prototype.parseDifficulty = function () {
  if (this.submissionData != null) {
    return getDifficulty(this.submissionData.question.difficulty);
  }

  const diffElement = document.getElementsByClassName('mt-3 flex space-x-4');
  if (checkElem(diffElement)) {
    return diffElement[0].children[0].innerText;
  }
  // Else, we're not on the description page. Nothing we can do.
  return 'unknown';
};
LeetCodeV2.prototype.startSpinner = function () {
  let elem = document.getElementById('leethub_progress_anchor_element');
  if (!elem) {
    elem = document.createElement('span');
    elem.id = 'leethub_progress_anchor_element';
    elem.style = 'margin-right: 20px;padding-top: 2px;';
  }
  elem.innerHTML = `<div id="${this.progressSpinnerElementId}" class="${this.progressSpinnerElementClass}"></div>`;
  this.insertToAnchorElement(elem);
};
LeetCodeV2.prototype.injectSpinnerStyle = function () {
  const style = document.createElement('style');
  style.textContent = `.${this.progressSpinnerElementClass} {pointer-events: none;width: 2.0em;height: 2.0em;border: 0.4em solid transparent;border-color: #eee;border-top-color: #3E67EC;border-radius: 50%;animation: loadingspin 1s linear infinite;} @keyframes loadingspin { 100% { transform: rotate(360deg) }}`;
  document.head.append(style);
};
LeetCodeV2.prototype.insertToAnchorElement = function (elem) {
  if (document.URL.startsWith('https://leetcode.com/explore/')) {
    // TODO: support spinner when answering problems on Explore pages
    //   action = document.getElementsByClassName('action');
    //   if (
    //     checkElem(action) &&
    //     checkElem(action[0].getElementsByClassName('row')) &&
    //     checkElem(action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6')) &&
    //     action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6').length > 1
    //   ) {
    //     target = action[0].getElementsByClassName('row')[0].getElementsByClassName('col-sm-6')[1];
    //     elem.className = 'pull-left';
    //     if (target.childNodes.length > 0) target.childNodes[0].prepend(elem);
    //   }
    return;
  }
  // TODO: target within the Run and Submit div regardless of UI position of submit button
  let target = document.querySelector('[data-e2e-locator="submission-result"]').parentElement;
  if (target) {
    elem.className = 'runcode-wrapper__8rXm';
    target.appendChild(elem);
  }
};
LeetCodeV2.prototype.markUploaded = function () {
  let elem = document.getElementById(this.progressSpinnerElementId);
  if (elem) {
    elem.className = '';
    elem.style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid #78b13f;border-right:7px solid #78b13f;';
  }
};
LeetCodeV2.prototype.markUploadFailed = function () {
  let elem = document.getElementById(this.progressSpinnerElementId);
  if (elem) {
    elem.className = '';
    elem.style =
      'display: inline-block;transform: rotate(45deg);height:24px;width:12px;border-bottom:7px solid red;border-right:7px solid red;';
  }
};



;// CONCATENATED MODULE: ./scripts/leetcode/submitBtn.js


let api = getBrowser()

const getSubmissionPageBtns = () => {
  return document.querySelector('.flex.flex-none.gap-2:not(.justify-center):not(.justify-between)');
};

const createToolTip = () => {
  const toolTip = document.createElement('div');
  toolTip.id = 'leethub-upload-tooltip';
  toolTip.textContent =
    'Manually upload this submission to GitHub (beta).\nThis will OVERWRITE your current submission.\nPlease be mindful of your GitHub rate-limits.';
  toolTip.className =
    'fixed bg-sd-popover text-sd-popover-foreground rounded-sd-md z-modal text-xs text-left font-normal whitespace-pre-line shadow p-3 border-sd-border border cursor-default translate-y-20 transition-opacity opacity-0 transition-delay-1000 duration-300 group-hover:opacity-100';
  return toolTip;
};

const createGitIcon = () => {
  const uploadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  uploadIcon.setAttribute('id', 'leethub-upload-icon');
  uploadIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  uploadIcon.setAttribute('width', '16');
  uploadIcon.setAttribute('height', '17');
  uploadIcon.setAttribute('viewBox', '0 0 38.999866 56.642887');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'style',
    'fill:#fcfcfc;fill-opacity:1;stroke:#ffffff;stroke-width:3;stroke-dasharray:none;stroke-opacity:1'
  );
  path.setAttribute(
    'd',
    'm 19.775372,2.121319 -9.072314,9.072314 a 0.51539412,0.66999737 45 0 0 -0.109554,0.838192 0.49679682,0.64582142 45 0 0 0.810286,-0.125057 l 7.846033,-7.846033 v 30.608468 a 0.47397466,0.47397466 0 0 0 0.473873,0.473873 h 0.0093 a 0.51713218,0.51713218 0 0 0 0.516765,-0.517281 V 4.018877 l 7.559745,7.560262 a 0.62190211,0.49679682 45 0 0 0.793233,0.107487 0.64518265,0.51539412 45 0 0 -0.09198,-0.820621 l -8.033101,-8.033102 0.0047,-0.0047 z m 7.81141,17.001029 v 0.999939 l 5.229655,0.01189 a 3.6922154,3.6922154 0 0 1 3.683496,3.692281 v 26.633 a 3.6835681,3.6835681 0 0 1 -3.683496,3.683496 H 6.1834371 a 3.6835681,3.6835681 0 0 1 -3.683496,-3.683496 v -26.633 a 3.6835681,3.6835681 0 0 1 3.683496,-3.683496 H 11.538666 V 19.143023 H 6.3121111 a 4.8119141,4.8119141 0 0 0 -4.812109,4.812109 v 26.375651 a 4.8119141,4.8119141 0 0 0 4.812109,4.81211 H 32.687762 a 4.8119141,4.8119141 0 0 0 4.81211,-4.81211 V 23.955128 a 4.8220648,4.8220648 0 0 0 -4.81211,-4.822444 z'
  );

  uploadIcon.appendChild(path);
  return uploadIcon;
};

function addManualSubmitBtn(eventHandler) {
  const btns = getSubmissionPageBtns();
  if (btns.innerText.includes('Solution') && !btns.innerText.includes('LeetHub')) {
    btns.appendChild(
      (() => {
        const btn = document.createElement('button');
        btn.innerText = 'Sync w/ LeetHub';
        btn.setAttribute('style', 'background-color:darkorange');
        btn.setAttribute(
          'class',
          'group whitespace-nowrap focus:outline-none text-label-r bg-green-s dark:bg-dark-blue-s hover:bg-green-3 dark:hover:bg-dark-blue-3 flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium'
        );

        btn.prepend(createGitIcon());
        btn.appendChild(createToolTip());
        btn.addEventListener('click', eventHandler);
        return btn;
      })()
    );
  }
}

function setupManualSubmitBtn(submitBtnHandler) {
  // Detect when submissionPageBtns load.
  const submissionPageBtnsObserver = new MutationObserver((_, observer) => {
    const url = window.location.href;
    const btns = getSubmissionPageBtns();

    if (btns && btns.children.length < 3 && url.match(/\/submissions\//)) {
      observer.disconnect();
      addManualSubmitBtn(submitBtnHandler);
    }
  });

  // For continued SPA use, detect when LeetCode dynamic layout loads, set up click listener, then listen for btns. 
  const pageObserver = new MutationObserver((_, observer) => {
    // Display submission button on refresh trigger
    if (window.location.href.match(/leetcode\.com\/(.*)\/submissions\/(\d+)/)) {
      submissionPageBtnsObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
      return
    } 

    const dynamicLayout = document.querySelector('.flexlayout__layout');
    if (!dynamicLayout) {
      return;
    }
    
    observer.disconnect()

    dynamicLayout.addEventListener('click', async () => {
      const submissionId = await listenForSubmissionId();
      if (submissionId) {
        // listen for submission buttons
        submissionPageBtnsObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  });

  pageObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// Get SubmissionID by listening for URL changes to `/submissions/(d+)` format
async function listenForSubmissionId() {
  const { submissionId } = await api.runtime.sendMessage({
    type: 'LEETCODE_SUBMISSION',
  });
  if (submissionId == null) {
    return;
  }
  return submissionId;
}

/* harmony default export */ const submitBtn = (setupManualSubmitBtn);

;// CONCATENATED MODULE: ./scripts/leetcode/readmeTopics.js


const leetCodeSectionStart = `<!---LeetCode Topics Start-->`;
const leetCodeSectionHeader = `# LeetCode Topics`;
const leetCodeSectionEnd = `<!---LeetCode Topics End-->`;

function appendProblemToReadme(topic, markdownFile, hook, problem) {
  const url = `https://github.com/${hook}/tree/master/${problem}`;
  const topicHeader = `## ${topic}`;
  const topicTableHeader = `\n${topicHeader}\n|  |\n| ------- |\n`;
  const newRow = `| [${problem}](${url}) |`;

  // Check if the LeetCode Section exists, or add it
  let leetCodeSectionStartIndex = markdownFile.indexOf(leetCodeSectionStart);
  if (leetCodeSectionStartIndex === -1) {
    markdownFile +=
      '\n' + [leetCodeSectionStart, leetCodeSectionHeader, leetCodeSectionEnd].join('\n');
    leetCodeSectionStartIndex = markdownFile.indexOf(leetCodeSectionStart);
  }

  // Get LeetCode section and the Before & After sections
  const beforeSection = markdownFile.slice(0, markdownFile.indexOf(leetCodeSectionStart));
  const afterSection = markdownFile.slice(
    markdownFile.indexOf(leetCodeSectionEnd) + leetCodeSectionEnd.length,
  );

  let leetCodeSection = markdownFile.slice(
    markdownFile.indexOf(leetCodeSectionStart) + leetCodeSectionStart.length,
    markdownFile.indexOf(leetCodeSectionEnd),
  );

  // Check if topic table exists, or add it
  let topicTableIndex = leetCodeSection.indexOf(topicHeader);
  if (topicTableIndex === -1) {
    leetCodeSection += topicTableHeader;
    topicTableIndex = leetCodeSection.indexOf(topicHeader);
  }

  // Get the Topic table. If topic table was just added, then its end === LeetCode Section end
  const endTopicString = leetCodeSection.slice(topicTableIndex).match(/\|\n[^|]/)?.[0];
  const endTopicIndex = (endTopicString != null) ? leetCodeSection.indexOf(endTopicString, topicTableIndex + 1) : -1;
  let topicTable =
    endTopicIndex === -1
      ? leetCodeSection.slice(topicTableIndex)
      : leetCodeSection.slice(topicTableIndex, endTopicIndex + 1);
  topicTable = topicTable.trim();

  // Check if the problem exists in topic table, prevent duplicate add
  const problemIndex = topicTable.indexOf(problem);
  if (problemIndex !== -1) {
    return markdownFile;
  }

  // Append problem to the Topic
  topicTable = [topicTable, newRow, '\n'].join('\n');

  // Replace the old Topic table with the updated one in the markdown file
  leetCodeSection =
    leetCodeSection.slice(0, topicTableIndex) +
    topicTable +
    (endTopicIndex === -1 ? '' : leetCodeSection.slice(endTopicIndex + 1));

  markdownFile = [
    beforeSection,
    leetCodeSectionStart,
    leetCodeSection,
    leetCodeSectionEnd,
    afterSection,
  ].join('');

  return markdownFile;
}

// Sorts each Topic table by the problem number
function sortTopicsInReadme(markdownFile) {
  let beforeSection = markdownFile.slice(0, markdownFile.indexOf(leetCodeSectionStart));
  const afterSection = markdownFile.slice(
    markdownFile.indexOf(leetCodeSectionEnd) + leetCodeSectionEnd.length,
  );

  // Matches any text between the start and end tags. Should never fail to match.
  const leetCodeSection = markdownFile.match(
    new RegExp(`${leetCodeSectionStart}([\\s\\S]*)${leetCodeSectionEnd}`),
  )?.[1];
  if (leetCodeSection == null) throw new util_LeetHubError('LeetCodeTopicSectionNotFound');
  

  // Remove the header
  let topics = leetCodeSection.trim().split('## ');
  topics.shift();

  // Get Array<sorted-topic>
  topics = topics.map(section => {
    let lines = section.trim().split('\n');

    // Get the problem topic
    const topic = lines.shift();

    // Check if topic exists elsewhere
    let topicHeaderIndex = markdownFile.indexOf(`## ${topic}`);
    let leetCodeSectionStartIndex = markdownFile.indexOf(leetCodeSectionStart);
    if (topicHeaderIndex < leetCodeSectionStartIndex) {
      // matches the next '|\n' that doesn't precede a '|'. Typically this is '|\n#. Should always match if topic existed elsewhere.
      const endTopicString = markdownFile.slice(topicHeaderIndex).match(/\|\n[^|]/)?.[0];
      if (endTopicString == null) throw new util_LeetHubError('EndOfTopicNotFound');

      // Get the old problems for merge
      const endTopicIndex = markdownFile.indexOf(endTopicString, topicHeaderIndex + 1);
      const topicSection = markdownFile.slice(topicHeaderIndex, endTopicIndex + 1);
      const problemsToMerge = topicSection.trim().split('\n').slice(3);

      // Merge previously solved problems and removes duplicates
      lines = lines.concat(problemsToMerge).reduce((array, element) => {
        if (!array.includes(element)) {
          array.push(element);
        }
        return array;
      }, []);

      // Delete the old topic section after merging
      beforeSection =
        markdownFile.slice(0, topicHeaderIndex) +
        markdownFile.slice(endTopicIndex + 1, markdownFile.indexOf(leetCodeSectionStart));
    }

    // Remove the header and header separator
    lines = lines.slice(2);

    lines.sort((a, b) => {
      let numA = parseInt(a.match(/\/(\d+)-/)[1]);
      let numB = parseInt(b.match(/\/(\d+)-/)[1]);
      return numA - numB;
    });

    // Reconstruct the topic
    return ['## ' + topic].concat('|  |', '| ------- |', lines).join('\n');
  });

  // Reconstruct the file
  markdownFile =
    beforeSection +
    [leetCodeSectionStart, leetCodeSectionHeader, ...topics, leetCodeSectionEnd].join('\n') +
    afterSection;

  return markdownFile;
}



;// CONCATENATED MODULE: ./scripts/leetcode/leetcode.js





/* Commit messages */
const readmeMsg = 'Create README - LeetHub';
const updateReadmeMsg = 'Update README - Topic Tags';
const updateStatsMsg = 'Updated stats';
const discussionMsg = 'Prepend discussion post - LeetHub';
const createNotesMsg = 'Attach NOTES - LeetHub';
const defaultRepoReadme =
  'A collection of LeetCode questions to ace the coding interview! - Created using [LeetHub v2](https://github.com/arunbhardwaj/LeetHub-2.0)';
const readmeFilename = 'README.md';
const statsFilename = 'stats.json';

// problem types
const NORMAL_PROBLEM = 0;
const EXPLORE_SECTION_PROBLEM = 1;

const WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS = 500;

const leetcode_api = getBrowser();

/**
 * Constructs a file path by appending the given filename to the problem directory.
 * If no filename is provided, it returns the problem name as the path.
 *
 * @param {string} problem - The base problem directory or the entire file path if no filename is provided.
 * @param {string} [filename] - Optional parameter for the filename to be appended to the problem directory.
 * @returns {string} - Returns a string representing the complete file path, either with or without the appended filename.
 */
const getPath = (problem, filename) => {
  return filename ? `${problem}/${filename}` : problem;
};

// https://web.archive.org/web/20190623091645/https://monsur.hossa.in/2012/07/20/utf-8-in-javascript.html
// In order to preserve mutation of the data, we have to encode it, which is usually done in base64.
// But btoa only accepts ASCII 7 bit chars (0-127) while Javascript uses 16-bit minimum chars (0-65535).
// EncodeURIComponent converts the Unicode Points UTF-8 bits to hex UTF-8.
// Unescape converts percent-encoded hex values into regular ASCII (optional; it shrinks string size).
// btoa converts ASCII to base64.
/** Decodes a base64 encoded string into UTF-8 format using URI encoding.*/
const decode = data => decodeURIComponent(escape(atob(data)));
/** Encodes a given string into base64 format.*/
const encode = data => btoa(unescape(encodeURIComponent(data)));

/**
 * Uploads content to a specified GitHub repository and updates local stats with the sha of the updated file.
 * @async
 * @param {string} token - The authentication token used to authorize the request.
 * @param {string} hook - The owner and repository name in the format 'owner/repo'.
 * @param {string} content - The content to be uploaded, typically a string encoded in base64.
 * @param {string} problem - The problem slug, which is a combination of problem ID and name, and acts as a folder.
 * @param {string} filename - The name of the file, typically the problem slug + file extension.
 * @param {string} sha - The SHA of the existing file.
 * @param {string} message - A commit message describing the change.
 * @param {string} [difficulty] - The difficulty level of the problem.
 *
 * @returns {Promise<string>} - A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubError} - Throws an error if the response is not OK (e.g., HTTP status code is not `200-299`).
 */
const upload = async (token, hook, content, problem, filename, sha, message) => {
  const path = getPath(problem, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let data = {
    message,
    content,
    sha,
  };

  let options = {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(data),
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new util_LeetHubError(res.status, { cause: res });
  }
  console.log(`Successfully committed ${getPath(problem, filename)} to github`);

  const body = await res.json();
  //TODO: Think, should we be setting stats state here?
  const stats = await getAndInitializeStats(problem);
  stats.shas[problem][filename] = body.content.sha;
  leetcode_api.storage.local.set({ stats });

  return body.content.sha;
};

// Returns stats object. If it didn't exist, initializes stats with default difficulty values and initializes the sha object for problem
const getAndInitializeStats = problem => {
  return leetcode_api.storage.local.get('stats').then(({ stats }) => {
    if (stats == null || isEmptyObject(stats)) {
      stats = {};
      stats.shas = {};
      stats.solved = 0;
      stats.easy = 0;
      stats.medium = 0;
      stats.hard = 0;
    }

    if (stats.shas[problem] == null) {
      stats.shas[problem] = {};
    }

    return stats;
  });
};

/**
 * Increment the statistics for a given problem based on its difficulty.
 * @param {DIFFICULTY} difficulty - The difficulty level of the problem, which can be `easy`, `medium`, or `hard`.
 * @param {string} problem - The slug problem name, e.g. `0001-two-sum`
 * @returns {Promise<Object>} A promise that resolves to the updated statistics object.
 */
const incrementStats = (difficulty, problem) => {
  const diff = getDifficulty(difficulty);
  return leetcode_api.storage.local.get('stats').then(({ stats }) => {
    stats.solved += 1;
    stats.easy += diff === DIFFICULTY.EASY ? 1 : 0;
    stats.medium += diff === DIFFICULTY.MEDIUM ? 1 : 0;
    stats.hard += diff === DIFFICULTY.HARD ? 1 : 0;
    stats.shas[problem].difficulty = diff.toLowerCase();
    leetcode_api.storage.local.set({ stats });
    return stats;
  });
};

/**
 * Sets persistent stats and merges any cloud updates into local stats
 * @async
 * @param {Object} localStats - Local statistics about LeetCode problems.
 * @returns {Promise<void>} A promise that resolves to the sha of the newly updated `stats.json` file.
 *
 * @throws {Error} - If the upload operation fails for any reason other than 409 Conflict
 */
const setPersistentStats = async localStats => {
  let pStats = { leetcode: localStats };
  const pStatsEncoded = encode(JSON.stringify(pStats));
  const sha = localStats?.shas?.[readmeFilename]?.[''] || '';

  const { leethub_token: token, leethub_hook: hook } = await leetcode_api.storage.local.get([
    'leethub_token',
    'leethub_hook',
  ]);

  try {
    return await upload(token, hook, pStatsEncoded, statsFilename, '', sha, updateStatsMsg);
  } catch (e) {
    if (e.message === '409') {
      // Stats were updated on GitHub since last submission
      const { content, sha } = await getGitHubFile(token, hook, statsFilename).then(res =>
        res.json()
      );
      pStats = JSON.parse(decode(content));
      const mergedStats = mergeStats(pStats.leetcode, localStats);
      const mergedStatsEncoded = encode(JSON.stringify({ leetcode: mergedStats }));

      // Update local stats with the changes from GitHub
      await leetcode_api.storage.local.set({ stats: mergedStats });

      return await delay(
        () => upload(token, hook, mergedStatsEncoded, statsFilename, '', sha, updateStatsMsg),
        WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
      );
    }
    throw e;
  }
};

const isCompleted = problemName => {
  return leetcode_api.storage.local.get('stats').then(data => {
    if (data?.stats?.shas?.[problemName] == null) return false;

    for (let file of Object.keys(data?.stats?.shas?.[problemName])) {
      if (file.includes(problemName)) return true;
    }

    return false;
  });
};

/* Discussion posts prepended at top of README */
/* Future implementations may require appending to bottom of file */
const updateReadmeWithDiscussionPost = async (
  addition,
  directory,
  filename,
  commitMsg,
  shouldPreprendDiscussionPosts
) => {
  let responseSHA;
  const { leethub_token, leethub_hook } = await leetcode_api.storage.local.get([
    'leethub_token',
    'leethub_hook',
  ]);

  return getGitHubFile(leethub_token, leethub_hook, directory, filename)
    .then(resp => resp.json())
    .then(data => {
      responseSHA = data.sha;
      return decode(data.content);
    })
    .then(existingContent =>
      shouldPreprendDiscussionPosts ? encode(addition + existingContent) : encode(existingContent)
    )
    .then(newContent =>
      upload(leethub_token, leethub_hook, newContent, directory, filename, responseSHA, commitMsg)
    );
};

/**
 * Wrapper func to upload code to a specific GitHub repository and handle 409 errors (conflict)
 * @async
 * @function uploadGitWith409Retry
 * @param {string} code - The code content that needs to be uploaded.
 * @param {string} problemName - The name of the problem or file where the code is related to.
 * @param {string} filename - The target filename in the repository where the code will be stored.
 * @param {string} commitMsg - The commit message that describes the changes being made.
 * @param {Object} [optionals] - Optional parameters for updating stats
 * @param {string} optionals.sha - The SHA value of the existing content to be updated (optional).
 * @param {DIFFICULTY} optionals.difficulty - The difficulty level of the problem (optional).
 *
 * @returns {Promise<string>} A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubError} If there's no token defined, the mode type is not `commit`, or if no repository hook is defined.
 */
async function uploadGitWith409Retry(code, problemName, filename, commitMsg, optionals) {
  let token;
  let hook;

  const storageData = await leetcode_api.storage.local.get([
    'leethub_token',
    'mode_type',
    'leethub_hook',
    'stats',
  ]);

  token = storageData.leethub_token;
  if (!token) {
    throw new util_LeetHubError('LeethubTokenUndefined');
  }

  if (storageData.mode_type !== 'commit') {
    throw new util_LeetHubError('LeetHubNotAuthorizedByGit');
  }

  hook = storageData.leethub_hook;
  if (!hook) {
    throw new util_LeetHubError('NoRepoDefined');
  }

  /* Get SHA, if it exists */
  const sha = optionals?.sha
    ? optionals.sha
    : storageData.stats?.shas?.[problemName]?.[filename] !== undefined
    ? storageData.stats.shas[problemName][filename]
    : '';

  try {
    return await upload(
      token,
      hook,
      code,
      problemName,
      filename,
      sha,
      commitMsg,
      optionals?.difficulty
    );
  } catch (err) {
    if (err.message === '409') {
      const data = await getGitHubFile(token, hook, problemName, filename).then(res => res.json());
      return upload(
        token,
        hook,
        code,
        problemName,
        filename,
        data.sha,
        commitMsg,
        optionals?.difficulty
      );
    }
    throw err;
  }
}

/** Returns GitHub data for the file specified by `${directory}/${filename}` path
 * @async
 * @function getGitHubFile
 * @param {string} token - The personal access token for authentication with GitHub.
 * @param {string} hook - The owner and repository name in the format "owner/repository".
 * @param {string} directory - The directory within the repository where the file is located.
 * @param {string} filename - The name of the file to be fetched.
 * @returns {Promise<Response>} A promise that resolves with the response from the GitHub API request.
 * @throws {Error} Throws an error if the response is not OK (e.g., HTTP status code is not 200-299).
 */
async function getGitHubFile(token, hook, directory, filename) {
  const path = getPath(directory, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let options = {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new Error(res.status);
  }

  return res;
}

/* Discussion Link - When a user makes a new post, the link is prepended to the README for that problem.*/
document.addEventListener('click', event => {
  const element = event.target;
  const oldPath = window.location.pathname;

  /* Act on Post button click */
  /* Complex since "New" button shares many of the same properties as "Post button */
  if (
    element &&
    (element.classList.contains('icon__3Su4') ||
      element.parentElement?.classList.contains('icon__3Su4') ||
      element.parentElement?.classList.contains('btn-content-container__214G') ||
      element.parentElement?.classList.contains('header-right__2UzF'))
  ) {
    setTimeout(function () {
      /* Only post if post button was clicked and url changed */
      if (
        oldPath !== window.location.pathname &&
        oldPath === window.location.pathname.substring(0, oldPath.length) &&
        !Number.isNaN(window.location.pathname.charAt(oldPath.length))
      ) {
        const date = new Date();
        const currentDate = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`;
        const addition = `[Discussion Post (created on ${currentDate})](${window.location})  \n`;
        const problemName = window.location.pathname.split('/')[2]; // must be true.
        updateReadmeWithDiscussionPost(addition, problemName, readmeFilename, discussionMsg, true);
      }
    }, 1000);
  }
});

function createRepoReadme() {
  const content = encode(defaultRepoReadme);
  return uploadGitWith409Retry(content, readmeFilename, '', readmeMsg);
}

async function updateReadmeTopicTagsWithProblem(topicTags, problemName) {
  if (topicTags == null) {
    console.log(new util_LeetHubError('TopicTagsNotFound'));
    return;
  }

  const { leethub_token, leethub_hook, stats } = await leetcode_api.storage.local.get([
    'leethub_token',
    'leethub_hook',
    'stats',
  ]);

  let readme;
  let newSha;

  try {
    const { content, sha } = await getGitHubFile(
      leethub_token,
      leethub_hook,
      readmeFilename
    ).then(resp => resp.json());
    readme = content;
    stats.shas[readmeFilename] = { '': sha };
    await leetcode_api.storage.local.set({ stats });
  } catch (err) {
    if (err.message === '404') {
      newSha = await createRepoReadme();
    }
    throw err;
  }
  readme = decode(readme);
  for (let topic of topicTags) {
    readme = appendProblemToReadme(topic.name, readme, leethub_hook, problemName);
  }
  readme = sortTopicsInReadme(readme);
  readme = encode(readme);

  return delay(
    () => uploadGitWith409Retry(readme, readmeFilename, '', updateReadmeMsg, { sha: newSha }),
    WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
  );
}

/** @param {LeetCodeV1 | LeetCodeV2} leetCode */
function loader(leetCode) {
  let iterations = 0;
  const intervalId = setInterval(async () => {
    try {
      const isSuccessfulSubmission = leetCode.getSuccessStateAndUpdate();
      if (!isSuccessfulSubmission) {
        iterations++;
        if (iterations > 9) {
          // poll for max 10 attempts (10 seconds)
          throw new util_LeetHubError('Could not find successful submission after 10 seconds.');
        }
        return;
      }
      leetCode.startSpinner();

      // If successful, stop polling
      clearInterval(intervalId);

      // For v2, query LeetCode API for submission results
      await leetCode.init();

      const probStats = leetCode.parseStats();
      if (!probStats) {
        throw new util_LeetHubError('SubmissionStatsNotFound');
      }

      const probStatement = leetCode.parseQuestion();
      if (!probStatement) {
        throw new util_LeetHubError('ProblemStatementNotFound');
      }

      const problemName = leetCode.getProblemNameSlug();
      const alreadyCompleted = await isCompleted(problemName);
      const language = leetCode.getLanguageExtension();
      if (!language) {
        throw new util_LeetHubError('LanguageNotFound');
      }
      const filename = problemName + language;

      /* Upload README */
      const uploadReadMe = await leetcode_api.storage.local.get('stats').then(({ stats }) => {
        const shaExists = stats?.shas?.[problemName]?.[readmeFilename] !== undefined;

        if (!shaExists) {
          return uploadGitWith409Retry(
            encode(probStatement),
            problemName,
            readmeFilename,
            readmeMsg
          );
        }
      });

      /* Upload Notes if any*/
      const notes = leetCode.getNotesIfAny();
      let uploadNotes;
      if (notes != undefined && notes.length > 0) {
        uploadNotes = uploadGitWith409Retry(encode(notes), problemName, 'NOTES.md', createNotesMsg);
      }

      /* Upload code to Git */
      const code = leetCode.findCode(probStats);
      const uploadCode = uploadGitWith409Retry(encode(code), problemName, filename, probStats);

      /* Group problem into its relevant topics */
      const updateRepoReadMe = updateReadmeTopicTagsWithProblem(
        leetCode.submissionData?.question?.topicTags,
        problemName
      );

      const newSHAs = await Promise.all([uploadReadMe, uploadNotes, uploadCode, updateRepoReadMe]);

      leetCode.markUploaded();

      if (!alreadyCompleted) {
        // Increments local and persistent stats
        incrementStats(leetCode.difficulty, problemName).then(setPersistentStats);
      }
    } catch (err) {
      leetCode.markUploadFailed();
      clearInterval(intervalId);

      if (!(err instanceof util_LeetHubError)) {
        console.error(err);
        return;
      }
    }
  }, 1000);
}

/**
 * Submit by Keyboard Shortcuts (only supported on LeetCode v2)
 * @param {Event} event
 * @returns
 */
function wasSubmittedByKeyboard(event) {
  const isEnterKey = event.key === 'Enter';
  const isMacOS = window.navigator.userAgent.includes('Mac');

  // Adapt to MacOS operating system
  return isEnterKey && ((isMacOS && event.metaKey) || (!isMacOS && event.ctrlKey));
}

/**
 * Get SubmissionID by listening for URL changes to `/submissions/(d+)` format
 * @returns {string} submissionId
 */
async function leetcode_listenForSubmissionId() {
  const { submissionId } = await leetcode_api.runtime.sendMessage({
    type: 'LEETCODE_SUBMISSION',
  });
  if (submissionId == null) {
    console.log(new util_LeetHubError('SubmissionIdNotFound'));
    return;
  }
  return submissionId;
}

/**
 * @param {Event} event
 * @param {LeetCodeV2} leetCode
 * @returns {void}
 */
async function v2SubmissionHandler(event, leetCode) {
  if (event.type !== 'click' && !wasSubmittedByKeyboard(event)) {
    return;
  }

  const authenticated =
    !isEmptyObject(await leetcode_api.storage.local.get(['leethub_token'])) &&
    !isEmptyObject(await leetcode_api.storage.local.get(['leethub_hook']));
  if (!authenticated) {
    throw new util_LeetHubError('UserNotAuthenticated');
  }

  // is click or is ctrl enter
  const submissionId = await leetcode_listenForSubmissionId();
  leetCode.submissionId = submissionId;
  loader(leetCode);
  return true;
}

// Use MutationObserver to determine when the submit button elements are loaded
const submitBtnObserver = new MutationObserver(function (_mutations, observer) {
  const v1SubmitBtn = document.querySelector('[data-cy="submit-code-btn"]');
  const v2SubmitBtn = document.querySelector('[data-e2e-locator="console-submit-button"]');
  const textareaList = document.getElementsByTagName('textarea');
  const textarea =
    textareaList.length === 4
      ? textareaList[2]
      : textareaList.length === 2
      ? textareaList[0]
      : textareaList[1];

  if (v1SubmitBtn) {
    observer.disconnect();

    const leetCode = new LeetCodeV1();
    v1SubmitBtn.addEventListener('click', () => loader(leetCode));
    return;
  }

  if (v2SubmitBtn && textarea) {
    observer.disconnect();

    const leetCode = new LeetCodeV2();
    if (!!!v2SubmitBtn.onclick) {
      textarea.addEventListener('keydown', e => v2SubmissionHandler(e, leetCode));
      v2SubmitBtn.onclick = e => v2SubmissionHandler(e, leetCode);
    }
  }
});

submitBtnObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

/* Sync to local storage */
leetcode_api.storage.local.get('isSync', data => {
  const keys = [
    'leethub_token',
    'leethub_username',
    'pipe_leethub',
    'stats',
    'leethub_hook',
    'mode_type',
  ];
  if (!data || !data.isSync) {
    keys.forEach(key => {
      leetcode_api.storage.sync.get(key, data => {
        leetcode_api.storage.local.set({ [key]: data[key] });
      });
    });
    leetcode_api.storage.local.set({ isSync: true }, () => {
      console.log('LeetHub Synced to local values');
    });
  } else {
    console.log('LeetHub Local storage already synced!');
  }
});

submitBtn(
  debounce(
    () => {
      const leetCode = new LeetCodeV2();
      // Manual submission event can only fire when we have submissionId. Simply retrieve it.
      const submissionId = window.location.href.match(/leetcode\.com\/.*\/submissions\/(\d+)/)[1];
      leetCode.submissionId = submissionId;
      loader(leetCode);
      return;
    },
    5000,
    true
  )
);

class LeetHubNetworkError extends util_LeetHubError {
  constructor(response) {
    super(response.statusText);
    this.status = response.status;
  }
}

/******/ })()
;