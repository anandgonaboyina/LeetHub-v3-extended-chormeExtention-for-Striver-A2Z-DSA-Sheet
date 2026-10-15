<h1 align="center">
  <a href="https://standardjs.com"><img src="assets/octocode.png" alt="LeetHub v4 - Automatically sync your code to GitHub." width="400"></a>
  <br>
  LeetHub v4 - Automatically sync your code to GitHub.
  <br>
  <br>
  <a href="LeetHub-v4.zip">
    <img src="https://img.shields.io/badge/Download-LeetHub%20v4%20Extension%20(.zip)-blue?style=for-the-badge&logo=googlechrome" alt="Download ZIP">
  </a>
  <br>
  <br>
</h1>

<p align="center">
  <a href="https://github.com/arunbhardwaj/LeetHub-2.0/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/>
  </a>
</p>

## What is LeetHub v4?
<p>A chrome and firefox extension that automatically pushes your code to GitHub when you pass all tests on a <a href="https://leetcode.com/">Leetcode</a> problem. <strong>NEW in v4:</strong> It now completely supports <strong>Striver's A2Z DSA Sheet</strong> (<a href="https://takeuforward.org/">takeuforward.org</a>)! With a simple click, you can seamlessly sync your Striver sheet solutions directly to a dedicated <code>0000-Strivers-A2Z-DSA-Sheet</code> folder in your repository, complete with an organized global README.</p>
<p><strong>v4 Enhancements:</strong> Automatically pre-populates existing solution code directly from GitHub, detects if any changes occurred before updating, and allows full in-place renaming of categories and problem folders directly from the Revision Tracker!</p>

## Why LeetHub?
<p> <strong>1.</strong> Recruiters <em>want</em> to see your contributions to the Open Source community, be it through side projects, solving algorithms/data-structures, or contributing to existing OS projects.<br>
As of now, GitHub is developers' #1 portfolio. LeetHub just makes it much easier (autonomous) to keep track of progress and contributions on the largest network of engineering community, GitHub.</p>

<p> <strong>2.</strong> There's no easy way of accessing your leetcode problems in one place! <br>
Moreover, pushing code manually to GitHub from Leetcode is very time consuming. So, why not just automate it entirely without spending a SINGLE additional second on it? </p>

## How does LeetHub work?     

<p>It's as simple as:</p>
<ol>
  <li>After installation, launch LeetHub.</li>
  <li>Click on "authorize with GitHub" button to automatically set up your account with LeetHub.</li>
  <li>Setup an existing/new repository with LeetHub (private by default) by clicking "Get Started" button.</li>
  <li>Begin Leetcoding! To view your progress, simply click on the extension!</li>
</ol>


#### BONUS: Star [this repository](https://github.com/arunbhardwaj/LeetHub-2.0) for further development of features. If you want a particular feature, simply [request](https://github.com/arunbhardwaj/LeetHub-2.0/labels/feature) for it!


## Why did we build LeetHub v3?
<p>
LeetHub v2 is a fantastic tool for LeetCode, but it lacked support for one of the most comprehensive and widely used DSA resources in the world: <strong>Striver's A2Z DSA Sheet</strong>. Manually managing code files and maintaining a Github repository for Striver's sheet is a huge hassle. By building LeetHub v3, we've extended the core functionality to automatically extract, organize, and upload your takeuforward.org solutions, so you can focus 100% on learning and let the extension seamlessly build your open-source portfolio!
</p>

# Let's see you ACE that coding interview!

![leetcode view](assets/extension/leetcode.png)


# How to set up LeetHub for local development?


  1. Fork this repo and clone to your local machine
  2. Run "npm run setup" to install the developer dependencies
  3. Run `npm run build` to build the final extension files into the `./dist/` directory
  4. Go to <a href="chrome://extensions">chrome://extensions </a> or <a href="https://firefox-source-docs.mozilla.org/devtools-user/about_colon_debugging/index.html#extensions">about:debugging</a> in firefox
    a. In Chrome, enable [Developer mode](https://support.google.com/chrome/a/answer/2714278) by toggling the switch on top right corner
  6. Click `Load unpacked` or `Load Temporary Add-on...`
  7. Select the `./dist/chrome` or `./dist/firefox` LeetHub folder
  8. That's it! Be sure to `npm run build` and reload the extension after making changes


Other npm commands available:

```
npm run               Show list of commands available
npm run format        Auto-format JavaScript, HTML/CSS
npm run format-test   Test all code is formatted properly
npm run lint          Lint JavaScript
npm run lint-test     Test all code is linted properly
```
