# Classroom One-Click Install — 產品規格

狀態：可開工（Wayfinder 目的地交付物）  
形態：VS Code／Cursor **擴充功能**  
平台 MVP：Windows ＋ macOS  

決策來源地圖：[`.scratch/classroom-one-click-install/map.md`](../.scratch/classroom-one-click-install/map.md)

---

## 1. 產品摘要

上課時老師常投影 `uv add …`、`uvx …` 等指令，學生必須複製貼上到編輯器終端機。本產品讓學生在側邊欄：

1. **Environment Lane**：檢查／安裝固定環境工具（uv、git、Node.js）  
2. **Course Lane**：一鍵執行本課 Install Action（清單優先來自所連 Router 的 Session Catalog；失敗時 fallback 工作區 `classroom-installs.yaml`）  

指令在**整合終端機**執行；側邊欄同步進行中／成功／失敗。  
目標使用者：課堂學生（操作）、老師（維護 catalog；VS Code 學生走市集，必要時發 VSIX 備援）。

---

## 2. 範圍／非範圍

### 範圍（MVP）

- VS Code／Cursor 擴充功能側邊欄（**Router Lane「課堂連線」在上**，其下 Environment、Course）  
- Router Lane：須先輸入 Invite Code 才能「連線登入」→ 瀏覽器 Google → Sign-in Handoff（深連結成功則自動兌換；失敗才露出貼碼與「貼上並完成連線」）→ Classroom API Key → BYOK Setup（向 router 拉模型清單、寫入**目前 Host**）。見 [ADR 0003](./adr/0003-router-sign-in-handoff.md)。  
- 環境工具：uv、git、Node.js（偵測、安裝、重新檢查、重新安裝／修復）  
- 本課動作：載入 Session／本機 Course Catalog，執行其中的整段 `command`  
- 執行前確認完整命令；公開 `git+https` repo 假設  
- 發佈：VS Code 以 **Visual Studio Marketplace** 為主（`vans-coding.pegasi-classroom-install`）；**VSIX 側載**為備援（Cursor／離線／急救）。不上架 Open VSX。見 [ADR 0002](./adr/0002-vs-marketplace-publish.md)。

### 非範圍（MVP）

- 實作細節以外的「在本規格文件內完成編碼」（規格是開工依據，不是程式本身）  
- 學生任意搜尋 PyPI／npm  
- Course Lane 的 npm／pnpm／yarn  
- `uv tool install` 列為必備  
- Linux 保證  
- 私有 git 認證、SSH 改寫、`gh auth` 產品內引導  
- 學生在擴充功能內輸入自訂 **shell 命令**（邀請碼輸入除外）  
- 多份並行 Course Catalog；File Asset／新 Action Kind 一鍵下載進專案  
- redeem rate limit 等 router 加固（另案）  
- 以 Portal 網頁兌換／下載 install 腳本為課堂主路徑（改為備援）  

### 尚未定案（實作時可先採合理預設，或另開決策）

- 校園網／proxy／離線降級  
- 多根工作區要以哪個資料夾為準  
- 市集分類／關鍵字微調（身分、繁中文案、圖示已定：id `vans-coding.pegasi-classroom-install`）
- 介面僅繁中或可英  
- 多筆動作的部分成功／重試產品文案細節（單筆重試按鈕已在 UI 草圖中）  

---

## 3. 概念與用語

權威詞彙見根目錄 [`CONTEXT.md`](../CONTEXT.md)。摘要：

| 用語 | 意義 |
|---|---|
| Install Action | 老師策展、學生可點的一筆安裝動作（顯示名＋kind＋命令） |
| Action Kind | `skill`／`package`／`mcp`（純顯示 tag） |
| Environment Tool | uv／git／Node.js |
| Course Catalog | Session YAML（Router）／fallback `classroom-installs.yaml` |
| Router Lane／Environment Lane／Course Lane | 側邊欄三區（可各自收合；Router 最上） |
| Invite Code／Classroom API Key／Sign-in Handoff／BYOK Setup | 見 [`CONTEXT.md`](../CONTEXT.md) |
| Toolchain Ready | 三工具皆偵測就緒的**總覽**狀態；不是 Course Lane 總開關 |

---

## 4. Course Catalog

權威來源為學生所連 **Router**（`vans_coding_router`／`pegasi_router`）上、Classroom API Key 所屬 Class Session 的 YAML（`GET /extension/course-catalog`，Bearer key）。老師於 Portal 以 YAML 文字區編輯（校验失敗拒存）。擴充在兌換成功、啟動且已有 key、以及「再試遠端」時拉取；成功結果只留記憶體。手上沒有可用遠端 YAML 時 fallback 工作區根目錄檔；使用 fallback 時提示並可再試。遠端合法空清單不算失敗。見 [ADR 0006](./adr/0006-session-course-catalog.md)。

### 檔案（fallback）

- 路徑：工作區**根目錄** `classroom-installs.yaml`  
- 格式：YAML（與 Session Catalog 同形）  
- 不支援自訂路徑、多份並行清單  

### Schema

頂層鍵 `actions`（陣列）。每筆：

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | 是 | 穩定識別（狀態記憶用） |
| `title` | 是 | 側邊欄顯示名稱 |
| `kind` | 是 | Action Kind：僅允許 `skill`／`package`／`mcp`（學生分別看到「Skill」「套件」「MCP」） |
| `command` | 是 | 整段要執行的 shell 命令 |
| `description` | 否 | 一行說明 |

- 執行目錄：一律工作區根目錄  
- 表達方式：以整段 `command` 為準（非結構化拆欄位組命令）  
- `kind` **純顯示**：不分區、不收合、不改變啟用／執行／依賴行為；缺漏或非法值 → 整份 catalog 載入失敗  

### 範例

```yaml
actions:
  - id: peas-agent-tools
    title: 安裝 peas-agent-tools
    kind: package
    description: 從 GitHub 加入專案依賴（可升級）
    command: >-
      uv add --upgrade "peas-agent-tools @ git+https://github.com/mz038197/peas-agent-tools.git"

  - id: peas-agent-runtime
    title: 安裝 peas-agent-runtime
    kind: package
    command: >-
      uv add git+https://github.com/mz038197/peas-agent-runtime.git

  - id: dataset-streamlit-shell
    title: 安裝 dataset-streamlit-shell
    kind: package
    description: 以 uvx 從 Git 套件執行安裝入口
    command: >-
      uvx --from git+https://github.com/mz038197/dataset-streamlit-shell-installer.git add-dataset-streamlit-shell --update

  - id: mattpocock-skills
    title: 安裝 Matt Pocock skills
    kind: skill
    description: 以 npx 加入 mattpocock/skills
    command: >-
      npx skills@latest add mattpocock/skills
```

決策票：[03](../.scratch/classroom-one-click-install/issues/03-grilling-catalog-schema.md)

---

## 5. Environment Lane

### 偵測

- 優先在整合終端機執行「找得到指令＋版本命令成功」才算就緒（Shell Integration）。  
- 無 Shell Integration 時靜默改以系統／登入殼 PATH 跑同一組版本命令（見 [ADR 0005](./adr/0005-environment-probe-path.md)）；不彈警告 toast。  
- **與是否由本擴充功能安裝無關**；學生在外部終端機裝好，重開／新開整合終端後按「重新檢查」即可顯示版本。  
- Node 須同時驗證 `node` 與 `npm`。  
- 細節與各 OS 指令：[研究 01](../.scratch/classroom-one-click-install/research/01-toolchain-install-win-mac.md)

### 側邊欄狀態

- 就緒：顯示版本號；仍提供「重新安裝／修復」  
- 未就緒：顯示「未安裝」＋「安裝」  
- 全域「重新檢查」  

### 安裝流程（僅環境工具）

1. 確認（揭示遠端腳本／系統安裝器風險，並顯示將執行的內容或下載路徑）  
2. 跑該 OS 預設安裝路徑（見下表）  
3. 狀態改為「請重開終端機」——**不要**直接標成功  
4. 學生重開終端 → 重新檢查 → 成功才就緒  
5. 權限／MDM 失敗：保留錯誤，提示找 IT；不提權  

| 工具 | Windows 預設 | macOS 預設 |
|---|---|---|
| uv | Astral standalone PowerShell installer | Astral standalone shell installer |
| Git | Git for Windows 官方 installer | Xcode Command Line Tools |
| Node.js | 官網當期 LTS `.msi` | 官網當期 LTS `.pkg` |

### 與 Course Lane

- 「重開終端」**只**用於環境工具；本課 `uv add`／`uvx` 不要求重開。  
- 允許循序安裝。依依賴禁用本課動作：  
  - 缺 `uv` → 禁用 `uv`／`uvx` 開頭（或同等）的 command  
  - 缺 `git` → 禁用含 `git+`（或明顯需 git）的 command  
  - Node **不**鎖本課清單  
- Toolchain Ready 可當徽章，不是總開關。  

決策票：[04](../.scratch/classroom-one-click-install/issues/04-grilling-environment-lane-behavior.md)

---

## 6. Course Lane

### 行為

- 列出 catalog 的 `title`／`description`，並顯示 `kind` 對應的 tag（Skill／套件／MCP）  
- 點擊 → **每次**確認框顯示完整 `command` → 確認後在工作區根目錄送進整合終端機  
- 狀態：未執行／進行中／成功／失敗／因缺工具禁用  
- 成功後可「再執行」；失敗可「重試」  

### git+https

- MVP 假設**公開** HTTPS repo；不需 GitHub 登入／SSH／`gh auth`  
- 失敗：側邊欄短提示（查 git、網路、repo 是否仍公開）＋終端機完整輸出  

決策票：[06](../.scratch/classroom-one-click-install/issues/06-grilling-git-https-auth.md)

---

## 7. 信任邊界

可執行來源僅：

1. Environment Lane 固定偵測／官方預設安裝流程  
2. 工作區 `classroom-installs.yaml` 內的 `command`  

其餘：

- **不做** command 前綴白名單、**不做** git host 允許清單（信任教材工作區＋確認框）  
- **不提供**學生自訂命令輸入  
- 打開不可信工作區時，點本課動作等同同意執行該 YAML  

決策票：[05](../.scratch/classroom-one-click-install/issues/05-grilling-trust-boundary.md)

---

## 8. UI／側邊欄 IA

採用原型**變體 A**：環境工具在上、本課安裝在下。

必須涵蓋狀態：

- 環境：版本／未安裝／請重開終端／重新檢查／重新安裝  
- 本課：Action Kind tag、成功、進行中、失敗短提示、缺工具禁用、確認框  

### 兩大區收合

- **環境工具**與**本課安裝**兩區各自可收合／展開  
- 預設：兩區都展開  
- 收合狀態只記在本次 webview session；腳本／webview 完整重載後回到兩區展開  
- 不做依 Action Kind 的子區收合（Course Lane 維持扁平清單）  

草圖：[prototypes/07-sidebar-ia.md](../.scratch/classroom-one-click-install/prototypes/07-sidebar-ia.md)  
決策票：[07](../.scratch/classroom-one-click-install/issues/07-prototype-sidebar-ia.md)

側邊欄實作：狀態真相在 extension host；產品 UI 為 **單一 Webview View**（取代 Tree View），確認框仍用編輯器原生對話框（見 [ADR 0001](./adr/0001-webview-sidebar.md)、API 研究）。

---

## 9. 技術約束

| 主題 | 約束 |
|---|---|
| 編輯器 | VS Code 擴充功能 API；Cursor 相容列入實測矩陣（文件無保證） |
| 執行與結果 | 主路徑：Shell Integration（`executeCommand`＋`onDidEndTerminalShellExecution` 取 exit code）更新側邊欄。`sendText` 僅能標「已送出／未驗證」。跨 shell 要可靠可判定結果時可用 VS Code Task |
| OS | MVP：Windows ＋ macOS |
| 發佈 | VS Code：Visual Studio Marketplace 為主；Sideload 備援；不上 Open VSX（[ADR 0002](./adr/0002-vs-marketplace-publish.md)） |
| 詳情 | [研究 02](../.scratch/classroom-one-click-install/research/02-vscode-terminal-sidebar-apis.md)、[研究 01](../.scratch/classroom-one-click-install/research/01-toolchain-install-win-mac.md) |

---

## 10. 驗收標準

實作完成 MVP 時，下列皆應可手動或自動化驗證：

1. **Catalog 載入**：課堂連線後 Course Lane 顯示 Session Catalog 的 `title`、kind tag（與選填 `description`）；無可用遠端 YAML 時 fallback 工作區 `classroom-installs.yaml` 並提示可再試遠端。  
2. **確認後執行**：點一本課動作會先顯示完整 `command`；取消不執行；確認後在工作區根目錄於整合終端機執行該命令。  
3. **外部安裝可偵測**：在編輯器外安裝 uv（或 git／Node）後，新開整合終端並按「重新檢查」，該工具顯示版本且非「未安裝」。  
4. **環境安裝不假成功**：對未安裝工具走「安裝」流程後，狀態為「請重開終端機」類提示，而非直接就緒；重開並重新檢查後才變就緒。  
5. **依依賴禁用**：僅移除／隱藏 `git`（uv 仍在）時，含 `git+` 的本課動作禁用；不要求 Node 就緒也能點純 `uv`／`uvx` 且不含 `git+` 的動作（若清單中有此類）。  
6. **公開 git 失敗提示**：模擬 `git+https` 失敗時，側邊欄有短提示且終端機可見完整輸出；產品不引導 `gh auth`。  
7. **無自訂命令**：UI 不提供任意命令輸入框；Environment 安裝項固定為 uv／git／Node。  
8. **側邊欄 IA**：環境區在本課區之上；具備重新檢查與（就緒時）重新安裝／修復入口；兩大區可各自收合，預設展開。  

---

## 附錄：決策索引

| 票 | 摘要 |
|---|---|
| [01](../.scratch/classroom-one-click-install/issues/01-research-toolchain-install-win-mac.md) | 工具鏈安裝／偵測研究 |
| [02](../.scratch/classroom-one-click-install/issues/02-research-vscode-terminal-sidebar-apis.md) | 終端機與側邊欄 API |
| [03](../.scratch/classroom-one-click-install/issues/03-grilling-catalog-schema.md) | Catalog schema |
| [04](../.scratch/classroom-one-click-install/issues/04-grilling-environment-lane-behavior.md) | Environment 行為 |
| [05](../.scratch/classroom-one-click-install/issues/05-grilling-trust-boundary.md) | 信任邊界 |
| [06](../.scratch/classroom-one-click-install/issues/06-grilling-git-https-auth.md) | git+https 假設 |
| [07](../.scratch/classroom-one-click-install/issues/07-prototype-sidebar-ia.md) | 側邊欄 IA |
| [08](../.scratch/classroom-one-click-install/issues/08-grilling-spec-outline-dod.md) | 規格大綱與 DoD |
| [09](../.scratch/classroom-one-click-install/issues/09-task-write-spec.md) | 撰寫本規格 |
| [10](../.scratch/classroom-one-click-install/issues/10-grilling-marketplace-publish.md) | 市集發佈策略 |
