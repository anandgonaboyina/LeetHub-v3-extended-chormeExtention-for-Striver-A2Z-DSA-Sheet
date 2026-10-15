// =============================================================================
// LeetHub V4 — Striver A2Z Sheet Content Script
// Runs on https://takeuforward.org/*
// Non-blocking Left-Side Panel + Accurate DOM Extraction + Monaco Interop
// =============================================================================

(function () {
  'use strict';

  // State
  let currentExistingProblem = null;
  let cachedCategories = [];
  let originalLoadedCode = '';
  let originalLoadedCategory = '';
  let originalLoadedSubcategory = '';
  let originalLoadedTitle = '';
  const STANDARD_CATEGORIES = [
    'Arrays', 'Strings', 'Binary Search', 'Sorting', 'Recursion',
    'Linked List', 'Stack', 'Queue', 'Heap', 'Trees', 'Graphs',
    'DP', 'Greedy', 'Bit Manipulation', 'Math', 'Sliding Window',
    'Two Pointers', 'Hashing', 'Backtracking', 'Trie'
  ];

  // =========================================================================
  // SECTION 1: CSS Injection
  // =========================================================================

  function injectStyles() {
    if (document.getElementById('lh-striver-styles')) return;
    const style = document.createElement('style');
    style.id = 'lh-striver-styles';
    style.textContent = `
      /* ---- Design Tokens ---- */
      :root {
        --lh-primary: #007bff;
        --lh-primary-hover: #0056b3;
        --lh-success: #28a745;
        --lh-success-hover: #218838;
        --lh-warning: #ffc107;
        --lh-danger: #dc3545;
        --lh-info: #17a2b8;
        --lh-bg: #ffffff;
        --lh-bg-subtle: #f8f9fa;
        --lh-text: #212529;
        --lh-text-muted: #6c757d;
        --lh-border: #dee2e6;
        --lh-shadow: 0 8px 30px rgba(0,0,0,0.18);
        --lh-radius: 10px;
        --lh-font: 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      /* ---- Floating Button Group (Bottom Right) ---- */
      #lh-striver-btn-group {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        gap: 8px;
        align-items: center;
        font-family: var(--lh-font);
      }

      .lh-btn {
        padding: 9px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
        font-family: var(--lh-font);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      }

      .lh-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .lh-btn-primary {
        background: var(--lh-primary);
        color: #fff;
      }
      .lh-btn-primary:hover:not(:disabled) {
        background: var(--lh-primary-hover);
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
      }

      .lh-btn-outline {
        background: var(--lh-bg);
        color: var(--lh-primary);
        border: 2px solid var(--lh-primary);
      }
      .lh-btn-outline:hover:not(:disabled) {
        background: var(--lh-primary);
        color: #fff;
      }

      .lh-btn-success {
        background: var(--lh-success);
        color: #fff;
      }
      .lh-btn-success:hover:not(:disabled) {
        background: var(--lh-success-hover);
        box-shadow: 0 4px 12px rgba(40,167,69,0.3);
      }

      .lh-btn-secondary {
        background: #6c757d;
        color: #fff;
      }
      .lh-btn-secondary:hover:not(:disabled) {
        background: #5a6268;
      }

      .lh-btn-sm {
        padding: 5px 10px;
        font-size: 12px;
      }

      .lh-btn-icon {
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        background: var(--lh-bg);
        color: var(--lh-text);
        border: 2px solid var(--lh-border);
      }
      .lh-btn-icon:hover {
        border-color: var(--lh-primary);
        color: var(--lh-primary);
      }

      /* ---- Left-Side Non-Blocking Panel (Sync Panel) ---- */
      #lh-sync-panel {
        position: fixed;
        top: 16px;
        left: 16px;
        bottom: 16px;
        width: 440px;
        max-width: calc(100vw - 32px);
        background: var(--lh-bg);
        border-radius: var(--lh-radius);
        box-shadow: var(--lh-shadow);
        border: 1px solid var(--lh-border);
        z-index: 99998;
        display: flex;
        flex-direction: column;
        font-family: var(--lh-font);
        transform: translateX(-490px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        pointer-events: auto;
      }

      #lh-sync-panel.lh-panel-open {
        transform: translateX(0);
      }

      .lh-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--lh-border);
        background: #fdfdfd;
        flex-shrink: 0;
      }

      .lh-panel-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--lh-text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lh-panel-close {
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: var(--lh-text-muted);
        padding: 0 4px;
        line-height: 1;
      }
      .lh-panel-close:hover {
        color: var(--lh-text);
      }

      .lh-panel-body {
        padding: 16px 18px;
        overflow-y: auto;
        flex: 1;
      }

      .lh-panel-footer {
        padding: 12px 18px;
        border-top: 1px solid var(--lh-border);
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        background: #fdfdfd;
        flex-shrink: 0;
      }

      /* ---- Status Banners inside Panel ---- */
      .lh-status-box {
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 12px;
        margin-bottom: 14px;
        line-height: 1.4;
      }

      .lh-status-checking {
        background: #e3f2fd;
        border: 1px solid #bbdefb;
        color: #0d47a1;
      }

      .lh-status-found {
        background: #e8f5e9;
        border: 1px solid #c8e6c9;
        color: #1b5e20;
      }

      .lh-status-new {
        background: #f3e5f5;
        border: 1px solid #e1bee7;
        color: #4a148c;
      }

      /* ---- Form Elements ---- */
      .lh-form-group {
        margin-bottom: 12px;
      }

      .lh-form-group label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        font-weight: 700;
        color: var(--lh-text);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Form elements: Ensure high contrast in both light & dark host pages */
      .lh-form-group input,
      .lh-form-group select,
      .lh-form-group textarea,
      .lh-sidebar-filters input,
      .lh-sidebar-filters select,
      #lh-sidebar-search,
      #lh-sidebar-cat-filter,
      #lh-sync-title,
      #lh-sync-code,
      #lh-sync-lang,
      #lh-sync-category,
      #lh-sync-new-category,
      #lh-sync-subcategory,
      #lh-move-category-select,
      #lh-move-new-cat-input,
      #lh-move-subcategory-input {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--lh-border) !important;
        border-radius: 6px !important;
        font-size: 13px !important;
        font-family: var(--lh-font) !important;
        color: #111827 !important;
        background-color: #ffffff !important;
        box-sizing: border-box !important;
        transition: border-color 0.2s;
      }

      /* Explicit styling for ALL dropdown options so they never appear invisible / white-on-white */
      select option,
      .lh-form-group select option,
      .lh-sidebar-filters select option,
      #lh-sidebar-cat-filter option,
      #lh-sync-category option,
      #lh-sync-lang option,
      #lh-move-category-select option {
        background-color: #ffffff !important;
        color: #111827 !important;
        padding: 6px 10px !important;
        font-size: 13px !important;
      }

      select option:checked,
      #lh-sidebar-cat-filter option:checked,
      #lh-sync-category option:checked,
      #lh-sync-lang option:checked,
      #lh-move-category-select option:checked {
        background-color: #e5e7eb !important;
        color: #111827 !important;
        font-weight: 600 !important;
      }

      .lh-form-group input:focus,
      .lh-form-group select:focus,
      .lh-form-group textarea:focus,
      .lh-sidebar-filters input:focus,
      .lh-sidebar-filters select:focus,
      #lh-sidebar-cat-filter:focus,
      #lh-sync-category:focus,
      #lh-sync-lang:focus,
      #lh-move-category-select:focus {
        outline: none !important;
        border-color: var(--lh-primary) !important;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.18) !important;
        background-color: #ffffff !important;
        color: #111827 !important;
      }

      .lh-form-group textarea {
        min-height: 150px;
        resize: vertical;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        tab-size: 4;
      }

      .lh-paste-btn {
        background: none;
        border: none;
        color: var(--lh-primary);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        text-transform: none;
      }
      .lh-paste-btn:hover {
        text-decoration: underline;
      }

      .lh-form-row {
        display: flex;
        gap: 10px;
      }

      .lh-form-row .lh-form-group {
        flex: 1;
      }

      .lh-form-hint {
        font-size: 11px;
        color: var(--lh-text-muted);
        margin-top: 3px;
      }

      /* ---- Toast Notifications ---- */
      #lh-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 200000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: var(--lh-font);
      }

      .lh-toast {
        padding: 12px 18px;
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 14px rgba(0,0,0,0.22);
        animation: lh-toastIn 0.3s ease;
        max-width: 360px;
        word-wrap: break-word;
      }

      @keyframes lh-toastIn {
        from { transform: translateX(80px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .lh-toast-success { background: var(--lh-success); }
      .lh-toast-error { background: var(--lh-danger); }
      .lh-toast-info { background: var(--lh-info); }

      /* ---- Non-blocking Get Code Modal/Panel ---- */
      #lh-getcode-panel {
        position: fixed;
        top: 16px;
        left: 16px;
        bottom: 16px;
        width: 480px;
        max-width: calc(100vw - 32px);
        background: var(--lh-bg);
        border-radius: var(--lh-radius);
        box-shadow: var(--lh-shadow);
        border: 1px solid var(--lh-border);
        z-index: 99998;
        display: flex;
        flex-direction: column;
        font-family: var(--lh-font);
        transform: translateX(-520px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }

      #lh-getcode-panel.lh-panel-open {
        transform: translateX(0);
      }

      .lh-code-preview {
        background: #1e1e2e;
        color: #cdd6f4;
        border-radius: 6px;
        padding: 12px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
        overflow-x: auto;
        max-height: 320px;
        overflow-y: auto;
        white-space: pre;
        tab-size: 4;
      }

      .lh-meta-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
        border-bottom: 1px solid #f0f0f0;
      }

      .lh-meta-label {
        color: var(--lh-text-muted);
        font-weight: 500;
      }

      .lh-meta-value {
        color: var(--lh-text);
        font-weight: 600;
        font-family: 'Consolas', monospace;
        font-size: 12px;
      }

      /* ---- Sidebar (Revision Tracker) ---- */
      #lh-sidebar {
        position: fixed;
        top: 0;
        right: -450px;
        width: 440px;
        max-width: 100vw;
        height: 100vh;
        background: var(--lh-bg);
        box-shadow: -4px 0 24px rgba(0,0,0,0.15);
        z-index: 100001;
        transition: right 0.3s ease;
        display: flex;
        flex-direction: column;
        font-family: var(--lh-font);
      }

      #lh-sidebar.lh-sidebar-open {
        right: 0;
      }

      .lh-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--lh-border);
        flex-shrink: 0;
        background: #fdfdfd;
      }

      .lh-sidebar-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--lh-text);
      }

      .lh-sidebar-filters {
        padding: 12px 18px;
        border-bottom: 1px solid var(--lh-border);
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
        background: #f8f9fa;
      }

      .lh-sidebar-filters input,
      .lh-sidebar-filters select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--lh-border) !important;
        border-radius: 6px !important;
        font-size: 13px !important;
        font-family: var(--lh-font) !important;
        background-color: #ffffff !important;
        color: #111827 !important;
        box-sizing: border-box !important;
      }

      /* Horizontal category tabs / pills */
      .lh-sidebar-cat-pills {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 4px 0 2px 0;
        scrollbar-width: thin;
      }
      .lh-sidebar-cat-pills::-webkit-scrollbar {
        height: 4px;
      }
      .lh-sidebar-cat-pills::-webkit-scrollbar-thumb {
        background: #ced4da;
        border-radius: 4px;
      }

      .lh-cat-pill {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        background: #e9ecef;
        color: #495057;
        border: 1px solid transparent;
        white-space: nowrap;
        transition: all 0.15s ease;
        user-select: none;
        flex-shrink: 0;
      }
      .lh-cat-pill:hover {
        background: #dee2e6;
        color: #212529;
      }
      .lh-cat-pill.active {
        background: var(--lh-primary);
        color: #fff;
        border-color: var(--lh-primary);
      }

      .lh-sidebar-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }

      /* Revision Tracker Problem Card */
      .lh-sidebar-card {
        padding: 12px 18px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: background 0.15s;
      }

      .lh-sidebar-card:hover {
        background: #f8faff;
      }

      .lh-sidebar-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }

      .lh-sidebar-item-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--lh-text);
        margin-bottom: 4px;
        line-height: 1.35;
        word-break: break-word;
      }

      .lh-sidebar-item-meta {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .lh-card-actions {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .lh-btn-gh {
        background: #24292e;
        color: #fff;
        border: none;
      }
      .lh-btn-gh:hover:not(:disabled) {
        background: #1b1f23;
        color: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      }

      .lh-badge {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        background: #e3f2fd;
        color: #1565c0;
      }

      .lh-time-ago {
        font-size: 11px;
        color: var(--lh-text-muted);
      }

      .lh-empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--lh-text-muted);
        font-size: 13px;
      }

      .lh-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(0,123,255,0.25);
        border-top-color: var(--lh-primary);
        border-radius: 50%;
        animation: lh-spin 0.6s linear infinite;
        vertical-align: middle;
      }

      @keyframes lh-spin {
        to { transform: rotate(360deg); }
      }

      /* ---- Modal Backdrop & Dialog System ---- */
      .lh-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(2px);
        z-index: 100004;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      .lh-modal-backdrop.lh-modal-open {
        display: flex;
      }

      .lh-dialog-modal {
        background: var(--lh-bg);
        border-radius: var(--lh-radius);
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        border: 1px solid var(--lh-border);
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        width: 100%;
        font-family: var(--lh-font);
        animation: lh-scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }

      @keyframes lh-scaleIn {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }

      .lh-dialog-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid var(--lh-border);
        background: #fcfcfc;
        flex-shrink: 0;
      }

      .lh-dialog-modal-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--lh-text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lh-dialog-modal-body {
        padding: 18px 20px;
        overflow-y: auto;
        flex: 1;
      }

      .lh-dialog-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid var(--lh-border);
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        align-items: center;
        background: #fcfcfc;
        flex-shrink: 0;
      }

      /* ---- Q&A Tabs & Content ---- */
      .lh-qa-tabs {
        display: flex;
        gap: 4px;
        border-bottom: 2px solid var(--lh-border);
      }

      .lh-qa-tab {
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--lh-text-muted);
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .lh-qa-tab:hover {
        color: var(--lh-text);
      }

      .lh-qa-tab.active {
        color: var(--lh-primary);
        border-bottom-color: var(--lh-primary);
      }

      .lh-qa-content {
        line-height: 1.65;
        font-size: 13px;
        color: #111827 !important;
        background: #ffffff !important;
        word-break: break-word;
      }

      /* Force all descendant text in QA modal to be clearly visible dark text (overriding dark mode classes) */
      .lh-qa-content p,
      .lh-qa-content span,
      .lh-qa-content div,
      .lh-qa-content li,
      .lh-qa-content ul,
      .lh-qa-content ol,
      .lh-qa-content td,
      .lh-qa-content th,
      .lh-qa-content tr,
      .lh-qa-content table,
      .lh-qa-content section,
      .lh-qa-content article,
      .lh-qa-content label {
        color: #1f2937 !important;
        background-color: transparent !important;
      }

      .lh-qa-content strong,
      .lh-qa-content b,
      .lh-qa-content h1,
      .lh-qa-content h2,
      .lh-qa-content h3,
      .lh-qa-content h4,
      .lh-qa-content [class*="sectionTitle"] {
        color: #0f172a !important;
        font-weight: 700 !important;
      }

      .lh-qa-content a {
        color: #007bff !important;
        text-decoration: underline !important;
      }

      .lh-qa-content h1,
      .lh-qa-content h2,
      .lh-qa-content h3 {
        margin-top: 14px;
        margin-bottom: 8px;
        color: #0f172a !important;
        font-weight: 700;
      }

      .lh-qa-content hr {
        border: none;
        border-top: 1px solid var(--lh-border);
        margin: 12px 0;
      }

      .lh-qa-content pre {
        background: #f8f9fa;
        padding: 10px 14px;
        border-radius: 6px;
        border: 1px solid var(--lh-border);
        overflow-x: auto;
        font-family: 'Consolas', monospace;
        font-size: 12px;
      }

      .lh-qa-content p {
        margin-bottom: 8px;
        color: #1f2937 !important;
        line-height: 1.65;
      }

      /* Neutralize Tailwind grid layout that causes 1rem column squishing */
      .lh-qa-content .grid,
      .lh-qa-content [class*="grid-cols"],
      .lh-qa-content [class*="grid"] {
        display: block !important;
        grid-template-columns: none !important;
        width: 100% !important;
      }

      .lh-qa-content [role="separator"] {
        display: none !important;
      }

      .lh-qa-content [class*="__richText"],
      .lh-qa-content [class*="richText"] {
        width: 100% !important;
        max-width: 100% !important;
        display: block !important;
      }

      /* Ensure math formulas and variables (KaTeX) do not wrap characters onto separate lines */
      .lh-qa-content .katex {
        display: inline-block !important;
        white-space: nowrap !important;
        font-size: 1.05em !important;
        line-height: 1.2 !important;
      }

      .lh-qa-content .katex * {
        display: inline !important;
        white-space: nowrap !important;
      }

      .lh-qa-content .katex-mathml {
        display: none !important;
      }

      .lh-qa-content .katex-html {
        display: inline !important;
        white-space: nowrap !important;
      }
    `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // SECTION 2: DOM & Question Data Extraction
  // =========================================================================

  function stripProblemNumber(str) {
    if (!str) return '';
    return str.replace(/^\s*\d+[\.\-\:\s_]+\s*/, '').trim();
  }

  function extractTitle() {
    // Specifically target TakeUForward's ProblemPanel title structure
    const titleEl = document.querySelector('[class*="ProblemPanel-module__"][class*="__title"]') ||
                    document.querySelector('[class*="ProblemPanel"][class*="title"]') ||
                    document.querySelector('h1.ProblemPanel-module__qBixIa__title') ||
                    document.querySelector('h1.text-xl.font-bold') ||
                    document.querySelector('.problem-statement h1') ||
                    document.querySelector('main h1') ||
                    document.querySelector('h1');
    if (titleEl) {
      const clone = titleEl.cloneNode(true);
      clone.querySelectorAll('svg, span[role="img"], span[class*="Badge"], span[class*="titlePotdBadge"], button').forEach(e => e.remove());
      const cleaned = stripProblemNumber(clone.innerText.trim());
      if (cleaned) return cleaned;
    }

    // Fallback to URL path segment
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const last = pathSegments.pop() || 'Striver-Problem';
    const cleanLast = stripProblemNumber(last);
    return cleanLast.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function extractProblemData() {
    const title = extractTitle();
    const url = window.location.href;

    // Target the actual problem content container
    const contentContainer = document.querySelector('[class*="ProblemPanel-module__"][class*="__content"]') ||
                              document.querySelector('.ProblemPanel-module__qBixIa__content') ||
                              document.querySelector('[class*="ProblemPanel"][class*="content"]') ||
                              document.querySelector('[class*="ProblemPanel-module__"][class*="__scrollable"]') ||
                              document.querySelector('.problem-statement') ||
                              document.querySelector('[data-tufy-selectable]');

    let statementHTML = '';
    let examplesHTML = '';
    let difficulty = 'Medium';

    if (contentContainer) {
      const clone = contentContainer.cloneNode(true);

      // Clean up ads, gamification quiz, cta buttons, and decorative dividers
      clone.querySelectorAll(`
        aside, ins, iframe,
        [class*="PracticeProblemAd"],
        [class*="gamification"],
        [class*="ExplainProblem"],
        [class*="shortcutButtons"],
        button
      `).forEach(el => el.remove());

      // 1. Convert example grid boxes to clean, semantic containers
      // This eliminates .grid and .grid-cols-[1rem_1fr] which squish text into a 16px column
      clone.querySelectorAll('[class*="grid-cols-"], .grid').forEach(gridEl => {
        gridEl.querySelectorAll('[role="separator"]').forEach(s => s.remove());
        gridEl.removeAttribute('class');
        gridEl.setAttribute('style', 'background:#f8f9fa; border-left:3px solid #007bff; padding:10px 14px; margin:8px 0; border-radius:4px; box-sizing:border-box;');
      });

      // 2. Remove all separator lines
      clone.querySelectorAll('[role="separator"]').forEach(el => el.remove());

      // 3. Remove duplicate KaTeX MathML so only clean math/HTML remains
      clone.querySelectorAll('.katex-mathml').forEach(el => el.remove());

      // 4. Clean TakeUForward module class names from headings and rich text
      clone.querySelectorAll('[class*="sectionTitle"]').forEach(el => {
        el.removeAttribute('class');
        el.setAttribute('style', 'font-size:14px; font-weight:700; margin:14px 0 6px 0; color:#111827;');
      });

      clone.querySelectorAll('[class*="__richText"]').forEach(el => {
        el.removeAttribute('class');
        el.setAttribute('style', 'line-height:1.6; margin-bottom:8px;');
      });

      // 5. Strip TakeUForward dark theme text/bg classes and inline colors that cause invisible text
      clone.querySelectorAll('*').forEach(el => {
        el.removeAttribute('data-slot');
        el.removeAttribute('aria-hidden');
        el.removeAttribute('data-tufy-selectable');
        if (el.tagName !== 'PRE' && el.tagName !== 'CODE') {
          el.style.color = '';
        }
        if (el.className && typeof el.className === 'string') {
          el.className = el.className
            .replace(/\btext-[a-z0-9_()/-]+\b/gi, '')
            .replace(/\bbg-[a-z0-9_()/-]+\b/gi, '')
            .replace(/\bdark:[a-z0-9_()/-]+\b/gi, '')
            .trim();
        }
      });

      statementHTML = clone.innerHTML.trim();
    }

    // Fallback to legacy TUF structure if needed
    if (!statementHTML) {
      const oldStatement = document.querySelector('.problem-statement');
      if (oldStatement) statementHTML = oldStatement.innerHTML;

      const vstackEls = Array.from(document.querySelectorAll('.tuf-vstack')).filter(el => {
        return el.querySelector('.tuf-example') || el.querySelector('.tuf-dark-content-box');
      });
      vstackEls.forEach(el => {
        examplesHTML += el.innerHTML + '<br><br>';
      });
    }

    // Difficulty extraction (look for Easy / Medium / Hard badge)
    const diffBadges = Array.from(document.querySelectorAll('span, div, p')).filter(el => {
      const text = el.innerText?.trim();
      return text === 'Easy' || text === 'Medium' || text === 'Hard';
    });
    if (diffBadges.length > 0) {
      difficulty = diffBadges[0].innerText.trim();
    }

    return {
      title,
      url,
      statement: statementHTML,
      examples: examplesHTML,
      difficulty
    };
  }

  function detectActiveLanguage() {
    const langEl = document.querySelector('[class*="CodePanel-module__"][class*="__languageSelect"] [data-slot="select-value"]') ||
                   document.querySelector('[class*="languageSelect"] [data-slot="select-value"]') ||
                   document.querySelector('[class*="languageSelect"]');
    if (langEl) {
      const text = langEl.textContent.trim().toLowerCase();
      if (text.includes('c++') || text.includes('cpp')) return 'cpp';
      if (text.includes('java') && !text.includes('script')) return 'java';
      if (text.includes('python')) return 'py';
      if (text.includes('javascript') || text === 'js') return 'js';
      if (text.includes('typescript') || text === 'ts') return 'ts';
      if (text === 'c') return 'c';
      if (text.includes('c#') || text.includes('csharp') || text === 'cs') return 'cs';
      if (text.includes('go')) return 'go';
      if (text.includes('rust')) return 'rs';
      if (text.includes('kotlin')) return 'kt';
    }
    return 'cpp';
  }

  function timeAgo(dateString) {
    if (!dateString) return 'Previously solved';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  // =========================================================================
  // SECTION 3: Monaco Editor Interop (Read Current Code)
  // =========================================================================

  function fetchCurrentEditorCode(callback) {
    const handler = function (event) {
      if (event.data && event.data.type === 'LH_MONACO_READ_RESULT') {
        window.removeEventListener('message', handler);
        callback(event.data.code || '');
      }
    };
    window.addEventListener('message', handler);

    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          let code = '';
          if (window.monaco && window.monaco.editor) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              const active = models.find(m => m.uri.toString().includes('tuf-editor')) || models[0];
              code = active.getValue();
            }
          }
          window.postMessage({ type: 'LH_MONACO_READ_RESULT', code: code }, '*');
        } catch (e) {
          window.postMessage({ type: 'LH_MONACO_READ_RESULT', code: '' }, '*');
        }
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    setTimeout(() => window.removeEventListener('message', handler), 800);
  }

  // =========================================================================
  // SECTION 4: Toast Notification System
  // =========================================================================

  function ensureToastContainer() {
    let container = document.getElementById('lh-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lh-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 3000;
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'lh-toast lh-toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  }

  // =========================================================================
  // SECTION 5: Left-Side Sync Panel (Priority 1)
  // =========================================================================

  function createSyncPanel() {
    if (document.getElementById('lh-sync-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'lh-sync-panel';
    panel.innerHTML = `
      <div class="lh-panel-header">
        <h3 id="lh-sync-panel-title"><span>🚀</span> Sync To GitHub</h3>
        <button class="lh-panel-close" id="lh-sync-close-btn">&times;</button>
      </div>

      <div class="lh-panel-body">
        <!-- Status Banner -->
        <div id="lh-sync-status-box" class="lh-status-box lh-status-checking">
          <span class="lh-spinner"></span> Checking repository for existing problem...
        </div>

        <!-- Link Problem Buttons -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px;">
          <button type="button" class="lh-btn lh-btn-sm lh-btn-outline" id="lh-sync-link-btn" style="flex:1;">
            <span>🔗</span> Link Existing Problem in Repo
          </button>
          <button type="button" class="lh-btn lh-btn-sm lh-btn-secondary" id="lh-sync-unlink-btn" style="display:none;" title="Save as a new problem instead of updating">
            ✕ Unlink
          </button>
        </div>

        <!-- Search & Link Section (Collapsible) -->
        <div id="lh-sync-link-section" style="display:none; margin-bottom:14px; padding:12px; background:#f0f7ff; border:1px solid #cce5ff; border-radius:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <b style="font-size:12px; color:#004085;">🔍 Select Existing Problem:</b>
            <button type="button" id="lh-sync-link-close-btn" style="background:none; border:none; color:#6c757d; cursor:pointer; font-size:16px; line-height:1;">&times;</button>
          </div>
          <input type="text" id="lh-sync-link-search" placeholder="Search by name, category, or folder..." style="width:100%; padding:6px 10px; margin-bottom:8px; font-size:12px; border:1px solid #b8daff; border-radius:4px; background:#fff; color:#111827;" />
          <div id="lh-sync-link-results" style="max-height:160px; overflow-y:auto; font-size:12px; border:1px solid #b8daff; border-radius:4px; background:#fff;"></div>
        </div>

        <div class="lh-form-group">
          <label>Problem Title</label>
          <input type="text" id="lh-sync-title" />
        </div>

        <div class="lh-form-group">
          <label>Problem URL</label>
          <input type="text" id="lh-sync-url" readonly style="color: var(--lh-text-muted); background: var(--lh-bg-subtle);" />
        </div>

        <div class="lh-form-group">
          <label>
            <span>Solution Code <span style="color:var(--lh-danger)">*</span></span>
            <button type="button" class="lh-paste-btn" id="lh-sync-paste-btn">📋 Paste from Clipboard</button>
          </label>
          <textarea id="lh-sync-code" placeholder="Paste your solution code here (Ctrl+V)..."></textarea>
        </div>

        <div class="lh-form-row">
          <div class="lh-form-group">
            <label>Language</label>
            <select id="lh-sync-lang">
              <option value="cpp" selected>C++ (.cpp)</option>
              <option value="java">Java (.java)</option>
              <option value="py">Python (.py)</option>
              <option value="js">JavaScript (.js)</option>
              <option value="ts">TypeScript (.ts)</option>
              <option value="c">C (.c)</option>
              <option value="cs">C# (.cs)</option>
              <option value="go">Go (.go)</option>
              <option value="rs">Rust (.rs)</option>
              <option value="kt">Kotlin (.kt)</option>
              <option value="swift">Swift (.swift)</option>
              <option value="dart">Dart (.dart)</option>
            </select>
          </div>

          <div class="lh-form-group">
            <label>Category <span style="color:var(--lh-danger)">*</span></label>
            <select id="lh-sync-category">
              <option value="">Loading categories...</option>
            </select>
          </div>
        </div>

        <div id="lh-new-category-row" class="lh-form-group" style="display:none;">
          <label>New Category Name</label>
          <input type="text" id="lh-sync-new-category" placeholder="e.g. Binary Search, Dynamic Programming" />
        </div>

        <div class="lh-form-group">
          <label>Subcategory <span style="color:var(--lh-text-muted);font-weight:normal;">(optional)</span></label>
          <input type="text" id="lh-sync-subcategory" placeholder="e.g. 1D, 2D, BST, Binary Tree" />
          <div class="lh-form-hint">Generates nested folders e.g. DP/1D or Trees/BST</div>
        </div>
      </div>

      <div class="lh-panel-footer">
        <button class="lh-btn lh-btn-secondary" id="lh-sync-cancel-btn">Cancel</button>
        <button class="lh-btn lh-btn-success" id="lh-sync-save-btn">Save to GitHub</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Event Listeners
    document.getElementById('lh-sync-close-btn').onclick = closeSyncPanel;
    document.getElementById('lh-sync-cancel-btn').onclick = closeSyncPanel;
    document.getElementById('lh-sync-save-btn').onclick = handleSaveToGitHub;

    // Paste from clipboard button
    document.getElementById('lh-sync-paste-btn').onclick = async function () {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          document.getElementById('lh-sync-code').value = text;
          showToast('Pasted from clipboard!', 'info', 1500);
        }
      } catch (err) {
        document.getElementById('lh-sync-code').focus();
        showToast('Press Ctrl+V to paste into the code box', 'info', 2500);
      }
    };

    // Category select listener
    const categorySelect = document.getElementById('lh-sync-category');
    categorySelect.addEventListener('change', function () {
      const newRow = document.getElementById('lh-new-category-row');
      if (categorySelect.value === '__new__') {
        newRow.style.display = 'block';
        document.getElementById('lh-sync-new-category').focus();
      } else {
        newRow.style.display = 'none';
      }
    });

    // Link / Unlink Existing Problem Listeners
    let allRepoProblemsCache = [];
    const linkBtn = document.getElementById('lh-sync-link-btn');
    const unlinkBtn = document.getElementById('lh-sync-unlink-btn');
    const linkSection = document.getElementById('lh-sync-link-section');
    const linkSearch = document.getElementById('lh-sync-link-search');
    const linkResults = document.getElementById('lh-sync-link-results');

    linkBtn.onclick = function () {
      if (linkSection.style.display === 'block') {
        linkSection.style.display = 'none';
        return;
      }
      linkSection.style.display = 'block';
      linkResults.innerHTML = '<div style="padding:10px; text-align:center; color:var(--lh-text-muted);"><span class="lh-spinner"></span> Loading repo problems...</div>';
      linkSearch.value = '';
      linkSearch.focus();

      chrome.runtime.sendMessage({ isStriver: true, action: 'striver_get_all_problems' }, function (res) {
        if (res && res.problems) {
          allRepoProblemsCache = res.problems;
          renderLinkResults(allRepoProblemsCache);
        } else {
          linkResults.innerHTML = '<div style="padding:10px; color:#dc3545;">Could not load problems from repo.</div>';
        }
      });
    };

    document.getElementById('lh-sync-link-close-btn').onclick = function () {
      linkSection.style.display = 'none';
    };

    linkSearch.oninput = function () {
      const q = linkSearch.value.toLowerCase().trim();
      const filtered = allRepoProblemsCache.filter(p =>
        (p.problemName && p.problemName.toLowerCase().includes(q)) ||
        (p.problemSlug && p.problemSlug.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
      renderLinkResults(filtered);
    };

    function renderLinkResults(list) {
      if (!list || list.length === 0) {
        linkResults.innerHTML = '<div style="padding:10px; text-align:center; color:var(--lh-text-muted);">No matching problems found.</div>';
        return;
      }
      linkResults.innerHTML = '';
      list.slice(0, 50).forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:7px 10px; border-bottom:1px solid #f0f0f0; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;';
        item.onmouseenter = () => item.style.background = '#e8f4fd';
        item.onmouseleave = () => item.style.background = '#fff';

        let catText = p.category || 'General';
        if (p.subcategory) catText += ' > ' + p.subcategory;

        item.innerHTML = `
          <div style="flex:1; min-width:0; padding-right:8px;">
            <div style="font-weight:600; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.problemName)}</div>
            <div style="font-size:11px; color:#6c757d;">📁 ${escapeHtml(p.folderPath || '')}</div>
          </div>
          <span class="lh-badge" style="font-size:10px; flex-shrink:0;">${escapeHtml(catText)}</span>
        `;

        item.onclick = function () {
          currentExistingProblem = p;
          linkSection.style.display = 'none';

          // Prepopulate fields with clean problem name and category
          document.getElementById('lh-sync-title').value = p.problemName;
          populateCategoriesDropdown(p.category);
          document.getElementById('lh-sync-subcategory').value = p.subcategory || '';
          if (p.language) {
            const langSelect = document.getElementById('lh-sync-lang');
            if (langSelect.querySelector(`option[value="${p.language}"]`)) {
              langSelect.value = p.language;
            }
          }

          // Prepopulate solution code from GitHub
          const codeArea = document.getElementById('lh-sync-code');
          codeArea.value = '';
          codeArea.placeholder = 'Fetching saved solution code from GitHub...';

          chrome.runtime.sendMessage(
            {
              isStriver: true,
              action: 'striver_get_code',
              githubPath: p.githubPath,
              title: p.problemName,
              url: p.url
            },
            function (codeRes) {
              if (codeRes && codeRes.success && codeRes.code) {
                codeArea.value = codeRes.code;
                originalLoadedCode = codeRes.code;
              } else {
                codeArea.placeholder = 'Paste your solution code here (Ctrl+V)...';
                originalLoadedCode = '';
              }
              originalLoadedCategory = p.category || '';
              originalLoadedSubcategory = p.subcategory || '';
              originalLoadedTitle = p.problemName || '';
            }
          );

          // Update Status Banner
          const statusBox = document.getElementById('lh-sync-status-box');
          statusBox.className = 'lh-status-box lh-status-found';
          statusBox.innerHTML = `
            <b>🔗 Linked to Repository:</b> <span class="lh-badge">${p.category}${p.subcategory ? ' > ' + p.subcategory : ''}</span><br>
            <span style="font-size:11px;color:#2e7d32">Linked to "${escapeHtml(p.problemName)}". Loaded solution from GitHub.</span>
          `;

          const headerTitle = document.getElementById('lh-sync-panel-title');
          const saveBtn = document.getElementById('lh-sync-save-btn');
          headerTitle.innerHTML = '<span>🔄</span> Update in GitHub';
          saveBtn.textContent = 'Update in GitHub';
          saveBtn.className = 'lh-btn lh-btn-primary';

          unlinkBtn.style.display = 'inline-block';
          showToast(`Linked to "${p.problemName}"!`, 'success', 2500);
        };

        linkResults.appendChild(item);
      });
    }

    unlinkBtn.onclick = function () {
      currentExistingProblem = null;
      originalLoadedCode = '';
      originalLoadedCategory = '';
      originalLoadedSubcategory = '';
      originalLoadedTitle = '';
      unlinkBtn.style.display = 'none';

      const codeArea = document.getElementById('lh-sync-code');
      codeArea.value = '';
      codeArea.placeholder = 'Paste your solution code here (Ctrl+V)...';

      const probData = extractProblemData();
      document.getElementById('lh-sync-title').value = probData.title;
      populateCategoriesDropdown('');
      document.getElementById('lh-sync-subcategory').value = '';

      const statusBox = document.getElementById('lh-sync-status-box');
      statusBox.className = 'lh-status-box lh-status-new';
      statusBox.innerHTML = `
        <b>✨ New Problem:</b> Not linked.<br>
        <span style="font-size:11px;color:#6a1b9a">Select category and save as a new problem.</span>
      `;

      document.getElementById('lh-sync-panel-title').innerHTML = '<span>🚀</span> Sync To GitHub';
      const saveBtn = document.getElementById('lh-sync-save-btn');
      saveBtn.textContent = 'Save to GitHub';
      saveBtn.className = 'lh-btn lh-btn-success';

      showToast('Unlinked. Will save as new problem.', 'info', 2000);
    };
  }

  function openSyncPanel() {
    createSyncPanel();
    const panel = document.getElementById('lh-sync-panel');
    const getCodePanel = document.getElementById('lh-getcode-panel');
    if (getCodePanel) getCodePanel.classList.remove('lh-panel-open');

    // Extract current question title & URL
    const probData = extractProblemData();
    document.getElementById('lh-sync-title').value = probData.title;
    document.getElementById('lh-sync-url').value = probData.url;

    // Automatically detect and set active editor language
    document.getElementById('lh-sync-lang').value = detectActiveLanguage();

    // Reset code area while checking repo
    const codeBox = document.getElementById('lh-sync-code');
    codeBox.value = '';
    codeBox.placeholder = 'Checking repository for existing solution...';

    originalLoadedCode = '';
    originalLoadedCategory = '';
    originalLoadedSubcategory = '';
    originalLoadedTitle = probData.title;

    // Reset status
    const statusBox = document.getElementById('lh-sync-status-box');
    statusBox.className = 'lh-status-box lh-status-checking';
    statusBox.innerHTML = '<span class="lh-spinner"></span> Checking repository for existing solution...';

    const saveBtn = document.getElementById('lh-sync-save-btn');
    saveBtn.textContent = 'Save to GitHub';
    saveBtn.className = 'lh-btn lh-btn-success';
    saveBtn.disabled = false;

    // Close link search section if previously opened
    const linkSec = document.getElementById('lh-sync-link-section');
    if (linkSec) linkSec.style.display = 'none';

    // Open panel smoothly on the left
    panel.classList.add('lh-panel-open');

    // Check if problem already exists in repository
    checkExistingAndPopulate(probData.title, probData.url);
  }

  function closeSyncPanel() {
    const panel = document.getElementById('lh-sync-panel');
    if (panel) panel.classList.remove('lh-panel-open');
  }

  function checkExistingAndPopulate(title, url) {
    chrome.runtime.sendMessage(
      {
        isStriver: true,
        action: 'striver_check_existing',
        title: title,
        url: url
      },
      function (response) {
        const statusBox = document.getElementById('lh-sync-status-box');
        const saveBtn = document.getElementById('lh-sync-save-btn');
        const headerTitle = document.getElementById('lh-sync-panel-title');
        const subcatInput = document.getElementById('lh-sync-subcategory');
        const langSelect = document.getElementById('lh-sync-lang');
        const unlinkBtn = document.getElementById('lh-sync-unlink-btn');

        if (response && response.categories) {
          cachedCategories = response.categories;
        }

        if (response && response.exists && response.problem) {
          // Existing problem found!
          currentExistingProblem = response.problem;

          const cat = response.problem.category || 'General';
          const subcat = response.problem.subcategory || '';
          const lang = response.problem.language || 'cpp';

          populateCategoriesDropdown(cat);
          subcatInput.value = subcat;
          if (langSelect.querySelector(`option[value="${lang}"]`)) {
            langSelect.value = lang;
          }

          // Prepopulate existing code from GitHub!
          const codeArea = document.getElementById('lh-sync-code');
          if (response.code) {
            codeArea.value = response.code;
            originalLoadedCode = response.code;
          } else {
            codeArea.value = '';
            codeArea.placeholder = 'Paste your solution code here (Ctrl+V)...';
            originalLoadedCode = '';
          }
          originalLoadedCategory = cat;
          originalLoadedSubcategory = subcat;
          originalLoadedTitle = response.problem.problemName || title;

          statusBox.className = 'lh-status-box lh-status-found';
          statusBox.innerHTML = `
            <b>🔄 Found in repository:</b> <span class="lh-badge">${cat}${subcat ? ' > ' + subcat : ''}</span><br>
            <span style="font-size:11px;color:#2e7d32">Existing solution loaded from GitHub. You can edit code or change category to update.</span>
          `;

          headerTitle.innerHTML = '<span>🔄</span> Update in GitHub';
          saveBtn.textContent = 'Update in GitHub';
          saveBtn.className = 'lh-btn lh-btn-primary';
          if (unlinkBtn) unlinkBtn.style.display = 'inline-block';

        } else {
          // New problem
          currentExistingProblem = null;
          originalLoadedCode = '';
          originalLoadedCategory = '';
          originalLoadedSubcategory = '';
          originalLoadedTitle = title;
          populateCategoriesDropdown('');

          const codeArea = document.getElementById('lh-sync-code');
          codeArea.value = '';
          codeArea.placeholder = 'Paste your solution code here (Ctrl+V)...';

          // Try to pull code from Monaco if user already wrote code in the web editor
          fetchCurrentEditorCode(code => {
            if (code && !codeArea.value.trim() && !currentExistingProblem) {
              codeArea.value = code;
            }
          });

          statusBox.className = 'lh-status-box lh-status-new';
          statusBox.innerHTML = `
            <b>✨ New Problem:</b> Not in your repository yet.<br>
            <span style="font-size:11px;color:#6a1b9a">Select a category and paste code to sync, or click "Link Existing" above.</span>
          `;

          headerTitle.innerHTML = '<span>🚀</span> Sync To GitHub';
          saveBtn.textContent = 'Save to GitHub';
          saveBtn.className = 'lh-btn lh-btn-success';
          if (unlinkBtn) unlinkBtn.style.display = 'none';
        }
      }
    );
  }

  function populateCategoriesDropdown(selectedCategory) {
    const select = document.getElementById('lh-sync-category');
    if (!select) return;

    select.innerHTML = '';

    const allCats = new Set([...STANDARD_CATEGORIES, ...cachedCategories]);
    if (selectedCategory && selectedCategory !== 'General') {
      allCats.add(selectedCategory);
    }

    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = '-- Select Category --';
    select.appendChild(optDefault);

    Array.from(allCats).sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedCategory) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    const optNew = document.createElement('option');
    optNew.value = '__new__';
    optNew.textContent = '+ Create New Category';
    select.appendChild(optNew);
  }

  function handleSaveToGitHub() {
    const title = document.getElementById('lh-sync-title').value.trim();
    const url = document.getElementById('lh-sync-url').value.trim();
    const code = document.getElementById('lh-sync-code').value;
    const lang = document.getElementById('lh-sync-lang').value;
    const catSelect = document.getElementById('lh-sync-category');
    const newCatInput = document.getElementById('lh-sync-new-category');
    const subcatInput = document.getElementById('lh-sync-subcategory');

    const category = catSelect.value === '__new__' ? newCatInput.value.trim() : catSelect.value;
    const subcategory = subcatInput.value.trim();

    if (!code.trim()) {
      showToast('Please paste your code before saving.', 'error');
      document.getElementById('lh-sync-code').focus();
      return;
    }
    if (!category) {
      showToast('Please select or create a category.', 'error');
      catSelect.focus();
      return;
    }
    if (!title) {
      showToast('Problem title is required.', 'error');
      document.getElementById('lh-sync-title').focus();
      return;
    }

    // Check if problem already exists and no changes were made to code or category
    if (currentExistingProblem) {
      const cleanTitle = stripProblemNumber(title) || title;
      const codeUnchanged = (code.trim() === (originalLoadedCode || '').trim());
      const catUnchanged = (category === (originalLoadedCategory || ''));
      const subcatUnchanged = (subcategory === (originalLoadedSubcategory || ''));
      const titleUnchanged = (cleanTitle.toLowerCase() === (originalLoadedTitle || '').toLowerCase());

      if (codeUnchanged && catUnchanged && subcatUnchanged && titleUnchanged) {
        showToast('No changes detected in code or category. Already up-to-date!', 'info', 3500);
        return;
      }
    }

    // Extract the complete, cleaned problem statement & examples
    const probData = extractProblemData();

    const saveBtn = document.getElementById('lh-sync-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="lh-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span> Saving...';

    const payload = {
      isStriver: true,
      action: 'striver_save',
      title: title,
      url: url,
      code: code,
      language: lang,
      category: category,
      subcategory: subcategory,
      statement: probData.statement,
      examples: probData.examples,
      difficulty: probData.difficulty,
      oldFolderPath: currentExistingProblem ? currentExistingProblem.folderPath : null,
      oldGithubPath: currentExistingProblem ? currentExistingProblem.githubPath : null
    };

    chrome.runtime.sendMessage(payload, function (response) {
      if (response && response.success) {
        closeSyncPanel();
        showToast(response.message || 'Saved successfully!', 'success', 4000);
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = currentExistingProblem ? 'Update in GitHub' : 'Save to GitHub';
        showToast('Failed to save: ' + (response ? response.error : 'Unknown error'), 'error', 5000);
      }
    });
  }

  // =========================================================================
  // SECTION 6: Left-Side "Get Your Code" Panel (Priority 2)
  // =========================================================================

  function createGetCodePanel() {
    if (document.getElementById('lh-getcode-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'lh-getcode-panel';
    panel.innerHTML = `
      <div class="lh-panel-header">
        <h3><span>📥</span> Get Your Code</h3>
        <button class="lh-panel-close" id="lh-getcode-close-btn">&times;</button>
      </div>

      <div class="lh-panel-body" id="lh-getcode-body">
        <div class="lh-empty-state">
          <span class="lh-spinner" style="width:22px;height:22px;"></span><br><br>
          Searching your repository for this problem...
        </div>
      </div>

      <div class="lh-panel-footer" id="lh-getcode-footer">
        <button class="lh-btn lh-btn-secondary" id="lh-getcode-cancel-btn">Close</button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('lh-getcode-close-btn').onclick = closeGetCodePanel;
    document.getElementById('lh-getcode-cancel-btn').onclick = closeGetCodePanel;
  }

  function openGetCodePanel() {
    createGetCodePanel();
    const panel = document.getElementById('lh-getcode-panel');
    const syncPanel = document.getElementById('lh-sync-panel');
    if (syncPanel) syncPanel.classList.remove('lh-panel-open');

    const body = document.getElementById('lh-getcode-body');
    const footer = document.getElementById('lh-getcode-footer');

    body.innerHTML = `
      <div class="lh-empty-state">
        <span class="lh-spinner" style="width:22px;height:22px;"></span><br><br>
        Searching your repository for this problem...
      </div>
    `;

    footer.innerHTML = `<button class="lh-btn lh-btn-secondary" id="lh-getcode-cancel-btn">Close</button>`;
    document.getElementById('lh-getcode-cancel-btn').onclick = closeGetCodePanel;

    panel.classList.add('lh-panel-open');

    const title = extractTitle();
    const url = window.location.href;

    chrome.runtime.sendMessage(
      {
        isStriver: true,
        action: 'striver_get_code',
        title: title,
        url: url
      },
      function (response) {
        if (!response || !response.success) {
          body.innerHTML = `
            <div class="lh-empty-state" style="padding:40px 20px;">
              <div style="font-size:38px;margin-bottom:12px;">📝</div>
              <b style="font-size:15px;color:var(--lh-text);">Problem not solved yet</b><br><br>
              <span style="color:var(--lh-text-muted);">Save your solution first using "Sync To GitHub".</span>
            </div>
          `;
          return;
        }

        const catLabel = response.category + (response.subcategory ? ' > ' + response.subcategory : '');
        const code = response.code;

        body.innerHTML = `
          <div class="lh-meta-row">
            <span class="lh-meta-label">Problem</span>
            <span class="lh-meta-value">${response.problemName}</span>
          </div>
          <div class="lh-meta-row">
            <span class="lh-meta-label">Category</span>
            <span class="lh-meta-value"><span class="lh-badge">${catLabel}</span></span>
          </div>
          <div class="lh-meta-row">
            <span class="lh-meta-label">File Path</span>
            <span class="lh-meta-value" style="font-size:11px;">${response.filePath}</span>
          </div>
          <div class="lh-meta-row" style="border-bottom:none;">
            <span class="lh-meta-label">Last Updated</span>
            <span class="lh-meta-value">${timeAgo(response.lastUpdated)}</span>
          </div>
          <div style="margin-top:14px;">
            <label style="display:block;font-size:11px;font-weight:700;margin-bottom:6px;text-transform:uppercase;color:var(--lh-text);">Saved Code Preview</label>
            <div class="lh-code-preview" id="lh-getcode-display"></div>
          </div>
        `;

        const codeDisplay = document.getElementById('lh-getcode-display');
        if (codeDisplay) codeDisplay.textContent = code;

        footer.innerHTML = `
          <button class="lh-btn lh-btn-secondary" id="lh-getcode-cancel-btn">Close</button>
          <button class="lh-btn lh-btn-primary" id="lh-getcode-copy-btn">📋 Copy Code</button>
        `;

        document.getElementById('lh-getcode-cancel-btn').onclick = closeGetCodePanel;

        document.getElementById('lh-getcode-copy-btn').onclick = function () {
          navigator.clipboard.writeText(code).then(() => {
            showToast('Code copied to clipboard!', 'success', 2000);
          }).catch(() => {
            showToast('Code copied!', 'success', 2000);
          });
        };
      }
    );
  }

  function closeGetCodePanel() {
    const panel = document.getElementById('lh-getcode-panel');
    if (panel) panel.classList.remove('lh-panel-open');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // SECTION 7: Revision Tracker Sidebar & Modals
  // Shows ENTIRE repository folder (all historical & current problems)
  // Provides Move Category function and Question & Answer Modal
  // =========================================================================

  function createSidebar() {
    if (document.getElementById('lh-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'lh-sidebar';
    sidebar.innerHTML = `
      <div class="lh-sidebar-header">
        <h3 id="lh-sidebar-title">📚 Solved Problems</h3>
        <button class="lh-panel-close" id="lh-sidebar-close">&times;</button>
      </div>
      <div class="lh-sidebar-filters">
        <input type="text" id="lh-sidebar-search" placeholder="Search problems or categories..." />
        <div style="display:flex;gap:8px;">
          <select id="lh-sidebar-cat-filter" style="flex:1;">
            <option value="">All Categories</option>
          </select>
          <button class="lh-btn lh-btn-sm lh-btn-outline" id="lh-sidebar-rename-cat" title="Rename category folder across all its problems in repository">✏️ Rename Cat</button>
          <button class="lh-btn lh-btn-sm lh-btn-outline" id="lh-sidebar-sort" title="Toggle sort order">↕ Sort</button>
        </div>
        <div class="lh-sidebar-cat-pills" id="lh-sidebar-cat-pills"></div>
      </div>
      <div class="lh-sidebar-list" id="lh-sidebar-list">
        <div class="lh-empty-state"><span class="lh-spinner"></span> Loading repository problems...</div>
      </div>
    `;

    document.body.appendChild(sidebar);

    document.getElementById('lh-sidebar-close').onclick = function () {
      sidebar.classList.remove('lh-sidebar-open');
    };

    let sortAsc = false;
    document.getElementById('lh-sidebar-sort').onclick = function () {
      sortAsc = !sortAsc;
      this.textContent = sortAsc ? '↑ Oldest' : '↓ Newest';
      renderSidebarList();
    };

    document.getElementById('lh-sidebar-rename-cat').onclick = function () {
      const catVal = document.getElementById('lh-sidebar-cat-filter').value;
      openRenameCategoryModal(catVal);
    };

    document.getElementById('lh-sidebar-search').oninput = renderSidebarList;
    document.getElementById('lh-sidebar-cat-filter').onchange = function () {
      updatePillsActive(this.value);
      renderSidebarList();
    };

    sidebar._data = { problems: [], categories: [], counts: {}, hook: '', branch: 'main' };
    sidebar._getSortAsc = () => sortAsc;
  }

  function toggleSidebar() {
    createSidebar();
    const sidebar = document.getElementById('lh-sidebar');

    if (sidebar.classList.contains('lh-sidebar-open')) {
      sidebar.classList.remove('lh-sidebar-open');
      return;
    }

    sidebar.classList.add('lh-sidebar-open');
    loadSidebarData();
  }

  function loadSidebarData() {
    const listEl = document.getElementById('lh-sidebar-list');
    listEl.innerHTML = '<div class="lh-empty-state"><span class="lh-spinner"></span> Scanning entire repository...</div>';

    chrome.runtime.sendMessage(
      { isStriver: true, action: 'striver_get_all_problems' },
      function (response) {
        const sidebar = document.getElementById('lh-sidebar');
        if (!sidebar) return;

        if (!response || !response.success) {
          listEl.innerHTML = `
            <div class="lh-empty-state">
              Could not load repository problems.<br><br>
              <span style="color:var(--lh-text-muted);font-size:11px;">${response ? response.error : 'No response from extension'}</span>
            </div>
          `;
          return;
        }

        const problems = response.problems || [];
        const repoCategories = response.categories || [];
        cachedCategories = repoCategories;

        // Count problems per category
        const counts = {};
        problems.forEach(p => {
          const c = p.category || 'General';
          counts[c] = (counts[c] || 0) + 1;
        });

        // Combined standard and repository categories
        const allCatSet = new Set([...STANDARD_CATEGORIES, ...repoCategories]);
        const sortedCats = Array.from(allCatSet).sort();

        sidebar._data = {
          problems: problems,
          categories: sortedCats,
          counts: counts,
          hook: response.hook || '',
          branch: response.branch || 'main'
        };

        const totalCount = problems.length;
        document.getElementById('lh-sidebar-title').textContent = `📚 Solved Problems (${totalCount})`;

        // Populate dropdown with counts matching the sync form
        const catFilter = document.getElementById('lh-sidebar-cat-filter');
        catFilter.innerHTML = `<option value="">All Categories (${totalCount})</option>`;
        sortedCats.forEach(c => {
          const count = counts[c] || 0;
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = `${c}${count > 0 ? ` (${count})` : ''}`;
          catFilter.appendChild(opt);
        });

        // Render horizontal category pills/tabs
        renderCategoryPills(sortedCats, counts, totalCount);

        renderSidebarList();
      }
    );
  }

  function renderCategoryPills(categories, counts, totalCount) {
    const container = document.getElementById('lh-sidebar-cat-pills');
    if (!container) return;
    container.innerHTML = '';

    const catFilter = document.getElementById('lh-sidebar-cat-filter');
    const currentSelected = catFilter ? catFilter.value : '';

    // 'All' pill
    const allPill = document.createElement('button');
    allPill.className = `lh-cat-pill ${!currentSelected ? 'active' : ''}`;
    allPill.textContent = `All (${totalCount})`;
    allPill.onclick = () => {
      if (catFilter) catFilter.value = '';
      updatePillsActive('');
      renderSidebarList();
    };
    container.appendChild(allPill);

    // Add pills for categories that have solved problems first, then other standard categories
    const solvedCats = categories.filter(c => (counts[c] || 0) > 0);
    solvedCats.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `lh-cat-pill ${currentSelected === cat ? 'active' : ''}`;
      pill.dataset.category = cat;
      pill.textContent = `${cat} (${counts[cat]})`;
      pill.onclick = () => {
        if (catFilter) catFilter.value = cat;
        updatePillsActive(cat);
        renderSidebarList();
      };
      container.appendChild(pill);
    });
  }

  function updatePillsActive(selectedCat) {
    const pills = document.querySelectorAll('.lh-cat-pill');
    pills.forEach(p => {
      if (!selectedCat && !p.dataset.category) {
        p.classList.add('active');
      } else if (p.dataset.category === selectedCat) {
        p.classList.add('active');
        p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else {
        p.classList.remove('active');
      }
    });
  }

  function renderSidebarList() {
    const sidebar = document.getElementById('lh-sidebar');
    const listEl = document.getElementById('lh-sidebar-list');
    if (!sidebar || !listEl) return;

    const data = sidebar._data;
    const searchVal = (document.getElementById('lh-sidebar-search').value || '').toLowerCase().trim();
    const catVal = document.getElementById('lh-sidebar-cat-filter').value;
    const sortAsc = sidebar._getSortAsc();

    const filtered = (data.problems || []).filter(p => {
      const matchSearch = !searchVal ||
        (p.problemName && p.problemName.toLowerCase().includes(searchVal)) ||
        (p.category && p.category.toLowerCase().includes(searchVal)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(searchVal));
      const matchCat = !catVal || p.category === catVal;
      return matchSearch && matchCat;
    });

    if (sortAsc) {
      filtered.sort((a, b) => {
        if (!a.lastUpdated) return 1;
        if (!b.lastUpdated) return -1;
        return new Date(a.lastUpdated) - new Date(b.lastUpdated);
      });
    } else {
      filtered.sort((a, b) => {
        if (!a.lastUpdated) return 1;
        if (!b.lastUpdated) return -1;
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="lh-empty-state">
          ${(data.problems || []).length === 0 ? 'No problems found in repository.<br>Sync your first solution to get started!' : 'No problems match your search.'}
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    const hook = data.hook || '';
    const branch = data.branch || 'main';

    filtered.forEach(problem => {
      const card = document.createElement('div');
      card.className = 'lh-sidebar-card';

      let catDisplay = problem.category || 'General';
      if (problem.subcategory) catDisplay += ' > ' + problem.subcategory;

      const ghUrl = problem.githubUrl || (hook && problem.githubPath ? `https://github.com/${hook}/blob/${branch}/${problem.githubPath}` : '');

      card.innerHTML = `
        <div class="lh-sidebar-card-top">
          <div style="flex:1; min-width:0;">
            <div class="lh-sidebar-item-title" title="${escapeHtml(problem.problemName)}">${escapeHtml(problem.problemName)}</div>
            <div class="lh-sidebar-item-meta">
              <span class="lh-badge">${escapeHtml(catDisplay)}</span>
              ${problem.language ? `<span class="lh-badge" style="background:#f3e8ff;color:#6b21a8;">${escapeHtml(problem.language.toUpperCase())}</span>` : ''}
              <span class="lh-time-ago">${timeAgo(problem.lastUpdated)}</span>
            </div>
          </div>
        </div>
        <div class="lh-card-actions">
          <button class="lh-btn lh-btn-sm lh-btn-primary lh-card-btn-view" title="View Question and Solution Code">
            <span>📖</span> View
          </button>
          <button class="lh-btn lh-btn-sm lh-btn-gh lh-card-btn-gh" title="Open file on GitHub">
            <span>🐙</span> GitHub
          </button>
          <button class="lh-btn lh-btn-sm lh-btn-outline lh-card-btn-move" title="Edit Problem Title, Folder Name, or Move Category">
            <span>✏️</span> Edit / Move
          </button>
        </div>
      `;

      // Two main action buttons + Edit/Move button
      const btnView = card.querySelector('.lh-card-btn-view');
      btnView.onclick = (e) => {
        e.stopPropagation();
        openQAModal(problem);
      };

      const btnGh = card.querySelector('.lh-card-btn-gh');
      btnGh.onclick = (e) => {
        e.stopPropagation();
        if (ghUrl) {
          window.open(ghUrl, '_blank');
        } else {
          showToast('GitHub link not available', 'error');
        }
      };

      const btnMove = card.querySelector('.lh-card-btn-move');
      btnMove.onclick = (e) => {
        e.stopPropagation();
        openMoveModal(problem);
      };

      listEl.appendChild(card);
    });
  }

  // =========================================================================
  // SECTION 7B: Edit Problem & Folder Modal
  // Renames problem title & folder, or moves problem to another category/subcategory
  // =========================================================================

  function openMoveModal(problem) {
    let backdrop = document.getElementById('lh-move-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'lh-move-backdrop';
      backdrop.className = 'lh-modal-backdrop';
      backdrop.innerHTML = `
        <div class="lh-dialog-modal" style="max-width: 440px;">
          <div class="lh-dialog-modal-header">
            <h3><span>✏️</span> Edit Problem & Folder</h3>
            <button class="lh-panel-close" id="lh-move-close-btn">&times;</button>
          </div>
          <div class="lh-dialog-modal-body">
            <div class="lh-form-group">
              <label>Problem Title & Folder Name <span style="color:var(--lh-danger)">*</span></label>
              <input type="text" id="lh-move-prob-name-input" />
              <div style="font-size:11px;color:var(--lh-text-muted);margin-top:3px;">
                Current folder in GitHub: <code id="lh-move-folder-code" style="color:#0d6efd;word-break:break-all;"></code>
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <span style="font-size:11px;font-weight:700;color:var(--lh-text-muted);text-transform:uppercase;">Current Location</span>
              <div id="lh-move-current-cat" style="margin-top:3px;"></div>
            </div>
            <hr style="border:none;border-top:1px solid var(--lh-border);margin:12px 0;">
            <div class="lh-form-group">
              <label>Target Category <span style="color:var(--lh-danger)">*</span></label>
              <select id="lh-move-category-select"></select>
            </div>
            <div id="lh-move-new-cat-row" class="lh-form-group" style="display:none;">
              <label>New Category Name</label>
              <input type="text" id="lh-move-new-cat-input" placeholder="e.g. Dynamic Programming, Trees" />
            </div>
            <div class="lh-form-group">
              <label>Subcategory <span style="color:var(--lh-text-muted);font-weight:normal;">(optional)</span></label>
              <input type="text" id="lh-move-subcategory-input" placeholder="e.g. 1D, 2D, BST, Binary Tree" />
              <div class="lh-form-hint">Generates nested folders (e.g. Category/Subcategory/Problem-Name)</div>
            </div>
          </div>
          <div class="lh-dialog-modal-footer">
            <button class="lh-btn lh-btn-secondary" id="lh-move-cancel-btn">Cancel</button>
            <button class="lh-btn lh-btn-primary" id="lh-move-submit-btn">Save Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      document.getElementById('lh-move-close-btn').onclick = closeMoveModal;
      document.getElementById('lh-move-cancel-btn').onclick = closeMoveModal;
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeMoveModal();
      };

      const moveCatSelect = document.getElementById('lh-move-category-select');
      moveCatSelect.onchange = function () {
        const newRow = document.getElementById('lh-move-new-cat-row');
        if (moveCatSelect.value === '__new__') {
          newRow.style.display = 'block';
          document.getElementById('lh-move-new-cat-input').focus();
        } else {
          newRow.style.display = 'none';
        }
      };
    }

    const nameInput = document.getElementById('lh-move-prob-name-input');
    nameInput.value = problem.problemName;
    const folderCode = document.getElementById('lh-move-folder-code');
    if (folderCode) folderCode.textContent = problem.folderPath || 'N/A';

    const curCatDisplay = problem.category + (problem.subcategory ? ` > ${problem.subcategory}` : '');
    document.getElementById('lh-move-current-cat').innerHTML = `<span class="lh-badge">${escapeHtml(curCatDisplay)}</span>`;

    // Populate category dropdown
    const moveCatSelect = document.getElementById('lh-move-category-select');
    moveCatSelect.innerHTML = '';
    const allCatSet = new Set([...STANDARD_CATEGORIES, ...cachedCategories]);
    if (problem.category) allCatSet.add(problem.category);

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Target Category --';
    moveCatSelect.appendChild(defaultOpt);

    Array.from(allCatSet).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === problem.category) opt.selected = true;
      moveCatSelect.appendChild(opt);
    });

    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ Create New Category';
    moveCatSelect.appendChild(newOpt);

    document.getElementById('lh-move-subcategory-input').value = problem.subcategory || '';
    document.getElementById('lh-move-new-cat-row').style.display = 'none';
    document.getElementById('lh-move-new-cat-input').value = '';

    const submitBtn = document.getElementById('lh-move-submit-btn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';

    submitBtn.onclick = function () {
      const newTitle = nameInput.value.trim();
      const selectedCat = moveCatSelect.value === '__new__'
        ? document.getElementById('lh-move-new-cat-input').value.trim()
        : moveCatSelect.value.trim();
      const subcat = document.getElementById('lh-move-subcategory-input').value.trim();

      if (!newTitle) {
        showToast('Problem title / folder name is required.', 'error');
        nameInput.focus();
        return;
      }
      if (!selectedCat) {
        showToast('Please select or enter a category.', 'error');
        moveCatSelect.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="lh-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span> Saving...';

      chrome.runtime.sendMessage(
        {
          isStriver: true,
          action: 'striver_move_problem',
          problemName: problem.problemName,
          newProblemName: newTitle,
          url: problem.url || '',
          oldFolderPath: problem.folderPath || '',
          oldGithubPath: problem.githubPath || '',
          newCategory: selectedCat,
          newSubcategory: subcat
        },
        function (response) {
          if (response && response.success) {
            closeMoveModal();
            showToast(response.message || 'Updated successfully!', 'success', 3500);
            loadSidebarData(); // Refresh list
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            showToast('Failed to save: ' + (response ? response.error : 'Unknown error'), 'error', 4000);
          }
        }
      );
    };

    backdrop.classList.add('lh-modal-open');
  }

  function closeMoveModal() {
    const backdrop = document.getElementById('lh-move-backdrop');
    if (backdrop) backdrop.classList.remove('lh-modal-open');
  }

  // =========================================================================
  // SECTION 7C: Rename Category Folder Modal
  // Renames an entire Category folder on GitHub and moves all problems under it
  // =========================================================================

  function openRenameCategoryModal(preselectedCat) {
    let backdrop = document.getElementById('lh-rename-cat-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'lh-rename-cat-backdrop';
      backdrop.className = 'lh-modal-backdrop';
      backdrop.innerHTML = `
        <div class="lh-dialog-modal" style="max-width: 440px;">
          <div class="lh-dialog-modal-header">
            <h3><span>✏️</span> Rename Category Folder</h3>
            <button class="lh-panel-close" id="lh-rename-cat-close-btn">&times;</button>
          </div>
          <div class="lh-dialog-modal-body">
            <div class="lh-form-group">
              <label>Select Category to Rename <span style="color:var(--lh-danger)">*</span></label>
              <select id="lh-rename-cat-select"></select>
            </div>
            <div class="lh-form-group">
              <label>New Category Name <span style="color:var(--lh-danger)">*</span></label>
              <input type="text" id="lh-rename-cat-new-name" placeholder="e.g. Dynamic Programming, Trees" />
              <div class="lh-form-hint" style="font-size:11px; color:var(--lh-text-muted); margin-top:4px;">
                This renames the category folder in your GitHub repository, moves all solved problems under it, and updates your master README.
              </div>
            </div>
          </div>
          <div class="lh-dialog-modal-footer">
            <button class="lh-btn lh-btn-secondary" id="lh-rename-cat-cancel-btn">Cancel</button>
            <button class="lh-btn lh-btn-primary" id="lh-rename-cat-submit-btn">Rename Category</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      document.getElementById('lh-rename-cat-close-btn').onclick = closeRenameCategoryModal;
      document.getElementById('lh-rename-cat-cancel-btn').onclick = closeRenameCategoryModal;
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeRenameCategoryModal();
      };
    }

    const select = document.getElementById('lh-rename-cat-select');
    const newNameInput = document.getElementById('lh-rename-cat-new-name');
    select.innerHTML = '';

    const sidebar = document.getElementById('lh-sidebar');
    const categories = (sidebar && sidebar._data && sidebar._data.categories) || cachedCategories || [];
    const counts = (sidebar && sidebar._data && sidebar._data.counts) || {};

    const availableCats = categories.filter(c => (counts[c] || 0) > 0);
    if (availableCats.length === 0) {
      categories.forEach(c => availableCats.push(c));
    }

    availableCats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `${c}${counts[c] ? ` (${counts[c]} problems)` : ''}`;
      if (preselectedCat && c === preselectedCat) opt.selected = true;
      select.appendChild(opt);
    });

    const currentCat = select.value || preselectedCat || '';
    newNameInput.value = currentCat;

    select.onchange = function () {
      newNameInput.value = this.value;
      newNameInput.focus();
    };

    const submitBtn = document.getElementById('lh-rename-cat-submit-btn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Rename Category';

    submitBtn.onclick = function () {
      const oldCat = select.value.trim();
      const newCat = newNameInput.value.trim();

      if (!oldCat || !newCat) {
        showToast('Both old and new category names are required.', 'error');
        return;
      }
      if (oldCat.toLowerCase() === newCat.toLowerCase()) {
        showToast('New name is identical to the current name.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="lh-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span> Renaming in GitHub...';

      chrome.runtime.sendMessage(
        {
          isStriver: true,
          action: 'striver_rename_category',
          oldCategory: oldCat,
          newCategory: newCat
        },
        function (response) {
          if (response && response.success) {
            closeRenameCategoryModal();
            showToast(response.message || 'Category renamed successfully!', 'success', 4000);
            loadSidebarData();
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Rename Category';
            showToast('Failed to rename: ' + (response ? response.error : 'Unknown error'), 'error', 5000);
          }
        }
      );
    };

    backdrop.classList.add('lh-modal-open');
    newNameInput.focus();
  }

  function closeRenameCategoryModal() {
    const backdrop = document.getElementById('lh-rename-cat-backdrop');
    if (backdrop) backdrop.classList.remove('lh-modal-open');
  }

  // Sanitizes and formats problem statement HTML from README so it renders beautifully in Q&A modal
  function cleanReadmeForDisplay(html) {
    if (!html) return '';
    try {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // 1. Neutralize any TakeUForward grid containers (e.g. grid-cols-[1rem_1fr]) that squish text into 16px columns
      temp.querySelectorAll('.grid, [class*="grid-cols-"]').forEach(el => {
        el.classList.remove('grid');
        Array.from(el.classList).forEach(c => {
          if (c.includes('grid-cols') || c === 'grid') el.classList.remove(c);
        });
        el.querySelectorAll('[role="separator"]').forEach(s => s.remove());
        el.style.display = 'block';
        el.style.width = '100%';
        el.style.background = '#f8f9fa';
        el.style.borderLeft = '3px solid #007bff';
        el.style.padding = '10px 14px';
        el.style.margin = '10px 0';
        el.style.borderRadius = '4px';
        el.style.boxSizing = 'border-box';
      });

      // 2. Remove all separator lines
      temp.querySelectorAll('[role="separator"]').forEach(el => el.remove());

      // 3. Remove duplicate MathML from KaTeX
      temp.querySelectorAll('.katex-mathml').forEach(el => el.remove());

      // 4. Ensure richText and paragraph containers take full width and don't wrap single characters
      temp.querySelectorAll('[class*="__richText"], [class*="richText"]').forEach(el => {
        el.style.display = 'block';
        el.style.width = '100%';
        el.style.maxWidth = '100%';
      });

      // 5. Ensure section titles look distinct
      temp.querySelectorAll('[class*="sectionTitle"]').forEach(el => {
        el.style.fontSize = '14px';
        el.style.fontWeight = '700';
        el.style.margin = '12px 0 6px 0';
        el.style.color = '#111827';
      });

      // 6. Fix KaTeX inline formatting
      temp.querySelectorAll('.katex').forEach(el => {
        el.style.display = 'inline-block';
        el.style.whiteSpace = 'nowrap';
      });

      // 7. Strip TakeUForward dark theme text/bg classes and inline colors that cause invisible text
      temp.querySelectorAll('*').forEach(el => {
        if (el.tagName !== 'PRE' && el.tagName !== 'CODE' && !el.style.borderLeft) {
          el.style.color = '';
          el.style.backgroundColor = '';
        }
        if (el.className && typeof el.className === 'string') {
          el.className = el.className
            .replace(/\btext-[a-z0-9_()/-]+\b/gi, '')
            .replace(/\bbg-[a-z0-9_()/-]+\b/gi, '')
            .replace(/\bdark:[a-z0-9_()/-]+\b/gi, '')
            .trim();
        }
      });

      return temp.innerHTML;
    } catch (e) {
      console.warn('LeetHub: error cleaning readme HTML', e);
      return html;
    }
  }

  function openQAModal(problem) {
    let backdrop = document.getElementById('lh-qa-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'lh-qa-backdrop';
      backdrop.className = 'lh-modal-backdrop';
      backdrop.innerHTML = `
        <div class="lh-dialog-modal" style="max-width: 820px;">
          <div class="lh-dialog-modal-header">
            <h3 id="lh-qa-modal-title"><span>📖</span> Problem Details</h3>
            <button class="lh-panel-close" id="lh-qa-close-btn">&times;</button>
          </div>
          <div style="padding: 0 20px; background: #fafafa; border-bottom: 1px solid var(--lh-border);">
            <div id="lh-qa-meta-bar" style="padding: 10px 0; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"></div>
            <div class="lh-qa-tabs">
              <button class="lh-qa-tab active" id="lh-tab-btn-question"><span>❓</span> Question Statement</button>
              <button class="lh-qa-tab" id="lh-tab-btn-code"><span>💻</span> Solution Code</button>
            </div>
          </div>
          <div class="lh-dialog-modal-body" style="padding: 18px 20px;">
            <div id="lh-qa-tab-question" class="lh-qa-pane">
              <div class="lh-empty-state"><span class="lh-spinner"></span> Loading problem statement...</div>
            </div>
            <div id="lh-qa-tab-code" class="lh-qa-pane" style="display:none;">
              <div class="lh-empty-state"><span class="lh-spinner"></span> Loading solution code...</div>
            </div>
          </div>
          <div class="lh-dialog-modal-footer">
            <button class="lh-btn lh-btn-secondary" id="lh-qa-footer-close">Close</button>
            <button class="lh-btn lh-btn-outline" id="lh-qa-footer-move"><span>📁</span> Move Category</button>
            <button class="lh-btn lh-btn-gh" id="lh-qa-footer-gh"><span>🐙</span> View on GitHub</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      document.getElementById('lh-qa-close-btn').onclick = closeQAModal;
      document.getElementById('lh-qa-footer-close').onclick = closeQAModal;
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeQAModal();
      };

      // Tabs switching
      const tabQ = document.getElementById('lh-tab-btn-question');
      const tabC = document.getElementById('lh-tab-btn-code');
      const paneQ = document.getElementById('lh-qa-tab-question');
      const paneC = document.getElementById('lh-qa-tab-code');

      tabQ.onclick = () => {
        tabQ.classList.add('active');
        tabC.classList.remove('active');
        paneQ.style.display = 'block';
        paneC.style.display = 'none';
      };

      tabC.onclick = () => {
        tabC.classList.add('active');
        tabQ.classList.remove('active');
        paneC.style.display = 'block';
        paneQ.style.display = 'none';
      };
    }

    // Set header and meta
    const titleEl = document.getElementById('lh-qa-modal-title');
    titleEl.innerHTML = `<span>📖</span> ${escapeHtml(problem.problemName)}`;

    let catDisplay = problem.category || 'General';
    if (problem.subcategory) catDisplay += ` > ${problem.subcategory}`;

    const metaBar = document.getElementById('lh-qa-meta-bar');
    metaBar.innerHTML = `
      <span class="lh-badge">${escapeHtml(catDisplay)}</span>
      ${problem.language ? `<span class="lh-badge" style="background:#f3e8ff;color:#6b21a8;">${escapeHtml(problem.language.toUpperCase())}</span>` : ''}
      <span class="lh-time-ago">${timeAgo(problem.lastUpdated)}</span>
      ${problem.url ? `<a href="${escapeHtml(problem.url)}" target="_blank" style="margin-left:auto;font-size:12px;color:var(--lh-primary);text-decoration:none;font-weight:600;">🔗 Open Problem on TakeUForward &rarr;</a>` : ''}
    `;

    // Reset to Question tab
    document.getElementById('lh-tab-btn-question').click();

    const paneQ = document.getElementById('lh-qa-tab-question');
    const paneC = document.getElementById('lh-qa-tab-code');
    paneQ.innerHTML = '<div class="lh-empty-state"><span class="lh-spinner"></span> Loading problem statement from repository...</div>';
    paneC.innerHTML = '<div class="lh-empty-state"><span class="lh-spinner"></span> Loading solution code from repository...</div>';

    // Footer buttons setup
    document.getElementById('lh-qa-footer-move').onclick = () => {
      closeQAModal();
      openMoveModal(problem);
    };

    const ghBtn = document.getElementById('lh-qa-footer-gh');
    ghBtn.onclick = () => {
      const url = problem.githubUrl || (problem.githubPath ? `https://github.com/${problem.githubPath}` : '');
      if (url) window.open(url, '_blank');
      else showToast('GitHub URL not available', 'error');
    };

    backdrop.classList.add('lh-modal-open');

    // Fetch details (Question README + Solution code)
    chrome.runtime.sendMessage(
      {
        isStriver: true,
        action: 'striver_get_problem_details',
        githubPath: problem.githubPath || '',
        folderPath: problem.folderPath || '',
        problemName: problem.problemName,
        url: problem.url || ''
      },
      function (response) {
        if (!response || !response.success) {
          paneQ.innerHTML = `<div class="lh-empty-state">Could not load problem statement.<br><span style="font-size:11px;color:var(--lh-text-muted);">${response ? response.error : 'Unknown error'}</span></div>`;
          paneC.innerHTML = `<div class="lh-empty-state">Could not load solution code.<br><span style="font-size:11px;color:var(--lh-text-muted);">${response ? response.error : 'Unknown error'}</span></div>`;
          return;
        }

        // 1. Render Question Pane
        if (response.readme && response.readme.trim()) {
          paneQ.innerHTML = `
            <div class="lh-qa-content" style="max-height: 480px; overflow-y: auto; padding-right: 8px;">
              ${cleanReadmeForDisplay(response.readme)}
            </div>
          `;
        } else {
          // Fallback if no README in repo
          paneQ.innerHTML = `
            <div class="lh-empty-state" style="padding: 30px 10px;">
              <div style="font-size:32px;margin-bottom:8px;">📝</div>
              <b>No README statement saved for this problem yet.</b><br><br>
              ${problem.url ? `<a href="${escapeHtml(problem.url)}" target="_blank" class="lh-btn lh-btn-sm lh-btn-outline">Open on TakeUForward</a>` : ''}
            </div>
          `;
        }

        // 2. Render Code Pane
        if (response.code) {
          const code = response.code;
          paneC.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
              <span style="font-family:'Consolas',monospace; font-size:11px; color:var(--lh-text-muted); word-break:break-all;">
                📁 ${escapeHtml(response.githubPath || problem.githubPath || '')}
              </span>
              <div style="display:flex; gap:6px;">
                <button class="lh-btn lh-btn-sm lh-btn-primary" id="lh-qa-copy-btn"><span>📋</span> Copy Code</button>
              </div>
            </div>
            <div class="lh-code-preview" id="lh-qa-code-box" style="max-height: 420px;"></div>
          `;

          const codeBox = document.getElementById('lh-qa-code-box');
          if (codeBox) codeBox.textContent = code;

          document.getElementById('lh-qa-copy-btn').onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
              showToast('Code copied to clipboard!', 'success', 2000);
            }).catch(() => {
              showToast('Code copied!', 'success', 2000);
            });
          };
        } else {
          paneC.innerHTML = '<div class="lh-empty-state">No solution code found in repository.</div>';
        }

        if (response.githubUrl) {
          ghBtn.onclick = () => window.open(response.githubUrl, '_blank');
        }
      }
    );
  }

  function closeQAModal() {
    const backdrop = document.getElementById('lh-qa-backdrop');
    if (backdrop) backdrop.classList.remove('lh-modal-open');
  }

  // =========================================================================
  // SECTION 8: Floating Buttons Injection
  // =========================================================================

  function injectButtons() {
    if (document.getElementById('lh-striver-btn-group')) return;

    const group = document.createElement('div');
    group.id = 'lh-striver-btn-group';

    const trackerBtn = document.createElement('button');
    trackerBtn.className = 'lh-btn lh-btn-icon';
    trackerBtn.innerHTML = '📋';
    trackerBtn.title = 'Revision Tracker (View All Solved Problems in Repo)';
    trackerBtn.onclick = toggleSidebar;

    const getCodeBtn = document.createElement('button');
    getCodeBtn.className = 'lh-btn lh-btn-outline';
    getCodeBtn.textContent = 'Get Your Code';
    getCodeBtn.onclick = openGetCodePanel;

    const syncBtn = document.createElement('button');
    syncBtn.className = 'lh-btn lh-btn-primary';
    syncBtn.textContent = 'Sync To GitHub';
    syncBtn.onclick = openSyncPanel;

    group.appendChild(trackerBtn);
    group.appendChild(getCodeBtn);
    group.appendChild(syncBtn);

    document.body.appendChild(group);
  }

  // =========================================================================
  // SECTION 9: Initialization
  // =========================================================================

  function initStriver() {
    injectStyles();
    injectButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStriver);
  } else {
    setTimeout(initStriver, 1200);
  }

})();
