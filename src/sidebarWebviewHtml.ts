/** 產生側邊欄 Webview HTML（CSP；腳本以外部 media/sidebar.js 載入）。 */
export function getSidebarWebviewHtml(
  cspSource: string,
  scriptUri: string,
): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; img-src ${cspSource} https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pegasi 課堂安裝</title>
  <style>
    :root {
      --pegasi-accent: #007070;
      --pegasi-accent-hover: #008a8a;
      --pegasi-accent-muted: color-mix(in srgb, var(--pegasi-accent) 18%, transparent);
      --brand-gradient-a: #007070;
      --brand-gradient-b: #009999;
      --brand-gradient-c: #f8c000;
      --logo-badge-bg: #eef5f5;
      --logo-badge-shadow: rgba(0, 112, 112, 0.18);
      --ok: var(--vscode-testing-iconPassed, #3d9a5f);
      --err: var(--vscode-testing-iconFailed, #e11d48);
      --warn: var(--vscode-editorWarning-foreground, #d97706);
      --radius: 10px;
      --pad: 12px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 10px 10px 20px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.45;
    }
    header.hero {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
      padding: 12px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, rgba(0, 112, 112, 0.12), transparent 70%);
      border: 1px solid var(--vscode-sideBarSectionHeader-border, transparent);
    }
    header.hero .logo-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 3px;
      border-radius: 8px;
      background: var(--logo-badge-bg);
      box-shadow: 0 0 0 1px var(--logo-badge-shadow);
      overflow: hidden;
      flex-shrink: 0;
    }
    header.hero .logo-badge img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    header.hero h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    header.hero h1.gradient-text {
      background: linear-gradient(135deg, var(--brand-gradient-a) 0%, var(--brand-gradient-b) 50%, var(--brand-gradient-c) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
    header.hero p {
      margin: 2px 0 0;
      opacity: 0.8;
      font-size: 11px;
    }
    section.lane {
      margin-bottom: 14px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #4444));
      border-radius: var(--radius);
      background: var(--vscode-editor-background);
      overflow: hidden;
    }
    .lane-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px var(--pad);
      background: var(--vscode-sideBarSectionHeader-background, transparent);
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, transparent);
    }
    .lane-head-main {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .lane-head-main:hover { opacity: 0.9; }
    .lane-chevron {
      flex-shrink: 0;
      font-size: 10px;
      opacity: 0.8;
      width: 1em;
    }
    .lane-head h2 {
      margin: 0;
      font-size: 12px;
      font-weight: 650;
      text-transform: none;
    }
    .lane-body { padding: 10px var(--pad) 12px; }
    .lane.collapsed .lane-body { display: none; }
    .lane.collapsed .lane-head { border-bottom: none; }
    .badge {
      display: inline-block;
      margin-bottom: 10px;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 11px;
      background: var(--pegasi-accent-muted);
      color: var(--vscode-foreground);
    }
    .badge.bad {
      background: color-mix(in srgb, var(--warn) 16%, transparent);
    }
    .tip, .empty {
      margin: 0 0 10px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 11px;
      background: var(--vscode-inputValidation-infoBackground, rgba(127,127,127,.12));
      border-left: 3px solid var(--pegasi-accent);
    }
    .empty { border-left-color: var(--warn); }
    .card {
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border, rgba(127,127,127,.25));
      background: var(--vscode-sideBar-background);
      margin-bottom: 8px;
    }
    .card:last-child { margin-bottom: 0; }
    .card.disabled { opacity: 0.72; }
    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .card-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .card-title {
      margin: 0;
      font-size: 12.5px;
      font-weight: 600;
    }
    .kind-tag {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      border: 1px solid color-mix(in srgb, var(--pegasi-accent) 40%, transparent);
      background: var(--pegasi-accent-muted);
      white-space: nowrap;
    }
    .card-desc, .card-detail {
      margin: 4px 0 0;
      font-size: 11px;
      opacity: 0.85;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      padding: 2px 7px;
      border-radius: 999px;
      white-space: nowrap;
      border: 1px solid transparent;
    }
    .status.ready, .status.succeeded { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 35%, transparent); }
    .status.missing, .status.failed, .status.error { color: var(--err); border-color: color-mix(in srgb, var(--err) 35%, transparent); }
    .status.needs-reopen-terminal, .status.unverified, .status.warn, .status.awaiting_sign_in {
      color: var(--warn);
      border-color: color-mix(in srgb, var(--warn) 35%, transparent);
    }
    .status.installing, .status.running, .status.busy {
      color: var(--pegasi-accent);
      border-color: color-mix(in srgb, var(--pegasi-accent) 40%, transparent);
    }
    .status.idle { opacity: 0.75; }
    .row-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
    button {
      font: inherit;
      cursor: pointer;
      border-radius: 6px;
      border: 1px solid transparent;
      padding: 5px 10px;
      font-size: 11.5px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    button.primary {
      background: var(--pegasi-accent);
      color: #fff;
    }
    button.primary:hover:not(:disabled) { background: var(--pegasi-accent-hover); }
    button.secondary {
      background: transparent;
      color: var(--vscode-foreground);
      border-color: var(--vscode-button-secondaryBackground, rgba(127,127,127,.35));
    }
    button.secondary:hover:not(:disabled) {
      background: var(--vscode-toolbar-hoverBackground, rgba(127,127,127,.12));
    }
    .field { margin: 8px 0; display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 11px; opacity: 0.85; }
    .field input, .field textarea {
      font: inherit;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--vscode-input-border, rgba(127,127,127,.45));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
    }
    .field textarea { min-height: 52px; resize: vertical; }
  </style>
</head>
<body>
  <div id="app"><p class="empty">載入中…</p></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}
