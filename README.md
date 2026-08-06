# pegasi-classroom-install（Pegasi 課堂安裝）

課堂用 VS Code／Cursor 擴充功能：學生在側邊欄一鍵完成環境工具（uv／git／Node）與老師策展的本課安裝動作（uv add／uvx）。

擴充功能 id：`vans-coding.pegasi-classroom-install`。

本 repo 是 Pegasi **Branded Distribution**；功能引擎以凡思 [`classroom-one-click-install`](https://github.com/mz038197/classroom-one-click-install) 為 `upstream`（`git fetch upstream` → merge `upstream/main`）。

- **規格（開工用）**：[`docs/spec.md`](./docs/spec.md)
- **實作票（MVP）**：[`.scratch/mvp-extension/`](./.scratch/mvp-extension/README.md)
- 領域用語：[`CONTEXT.md`](./CONTEXT.md)
- Wayfinder 地圖：[`.scratch/classroom-one-click-install/map.md`](./.scratch/classroom-one-click-install/map.md)
- 示例 Course Catalog：[`samples/classroom-installs.yaml`](./samples/classroom-installs.yaml)
- 發佈決策：[ADR 0002](./docs/adr/0002-vs-marketplace-publish.md)
- 發佈手冊（維護者）：[`docs/publishing.md`](./docs/publishing.md)

## 課堂使用（VS Code：市集為主）

**主路徑**：學生在 **VS Code** 擴充功能市集搜尋「Pegasi 課堂安裝」（id：`vans-coding.pegasi-classroom-install`）並安裝。

**備援**：當市集不可用、需釘某一包、或使用 Cursor 時，改走下方 **VSIX 側載**。

市集安裝後，編輯器可能自動更新擴充功能；一般課堂接受自動更新。若某次課必須全員同版，改發當日 GitHub Release 上的 `.vsix` 側載。

### 學生：課堂連線（Router）＋本課 Catalog

1. 側邊欄最上方 **課堂連線（Router Lane）**：先填邀請碼 →「連線登入」→ Google → 深連結回來後自動兌換並寫入 BYOK。深連結失敗時才出現一次性貼碼，貼上後按「貼上並完成連線」；卡住可「重新連線登入」。換新邀請碼再跑一次即可。
2. 把 `classroom-installs.yaml` 放到**工作區根目錄**（可直接用 repo 內示例，或老師改過的版本）。
3. Environment Lane（uv／git／Node）：未就緒就「安裝」，裝完依提示**重開終端**再「重新檢查」。
4. Course Lane 列出本課動作；點選 → 確認完整 command → 在整合終端機執行。

預設 Router：`http://203-71-78-31.nip.io:8000`（設定 `pegasiClassroomInstall.routerBaseUrl` 可改）。Portal 網頁路徑為備援。

## 備援：VSIX 側載

適用：Cursor、離線、市集異常，或老師要發固定版本。

### 取得 VSIX

- **建議**：到 GitHub Releases 下載對應 tag（如 `v0.1.0`）的 `.vsix`。
- **本機打包**：

```bash
npm install
npm run package
```

產物名稱為 `pegasi-classroom-install-<version>.vsix`（`*.vsix` 已列在 `.gitignore`，請自行發放，不必提交）。將該檔與 `samples/classroom-installs.yaml`（或本課自訂 catalog）一併交給學生。

### 安裝擴充功能

1. 取得 `.vsix` 檔。
2. 在 **VS Code**：命令面板 → `Extensions: Install from VSIX…` → 選檔。  
   在 **Cursor**：同樣走「從 VSIX 安裝」；若介面用語不同，到 Extensions 視圖找 Install from VSIX。
3. 重新載入視窗（若提示）。
4. 活動列應出現「Pegasi 課堂安裝」。

### Cursor 相容

市集頁與擴充功能說明**只保證 VS Code 市集安裝路徑**。Cursor 請用 VSIX 側載；文件**不保證**與 VS Code 行為完全一致，課堂前請在目標 Cursor 版本**實測**側載、側邊欄、終端機執行與重新檢查。

## 發版（維護者）

日常：`package.json` version bump → `git tag vX.Y.Z` → `git push origin vX.Y.Z`（tag 須與 version 一致）。  
首次設定 Publisher／PAT／`VSCE_PAT`、換 token、手動上傳與排錯：見 **[`docs/publishing.md`](./docs/publishing.md)**。

目前**不上架 Open VSX**；Cursor 不走市集。

## 開發

```bash
npm install
npm run compile
npm test
```

在 VS Code／Cursor 按 F5（`Run Extension`）開 Extension Development Host；活動列應出現「Pegasi 課堂安裝」側邊欄（Webview：Environment Lane 在上、Course Lane 在下）。

工作區根目錄放置 `classroom-installs.yaml` 後，Course Lane 會列出本課 Install Action；點選會先確認完整 command，再於整合終端機執行。
