# Pegasi Classroom Install

課堂用編輯器擴充功能（Pegasi 換皮發行）：學生點選項目以完成環境工具或本課安裝動作，並可在擴充內完成 router 邀請兌換與 BYOK 設定。此檔只記領域用語。引擎行為與凡思發行共用；預設連 **pegasi_router**。

## Language

**Branded Distribution**:
同一套課堂安裝產品的市集／VSIX 發行身分；Pegasi 與凡思為兩個 Branded Distribution。差異限於顯示名稱、圖示、強調色、extension id 與預設 `routerBaseUrl`；Install Action／三條 Lane／Router 契約相同。功能變更以凡思 repo 為 upstream 合併進來。
_Avoid_: 為 Pegasi 另寫一套 catalog／redeem client, 把品牌差異散進業務邏輯大檔

**Pegasi Distribution**:
publisher 仍為 `vans-coding`、extension id 為 `vans-coding.pegasi-classroom-install` 的 Branded Distribution；預設 Router 為課堂自架的 `pegasi_router`。
_Avoid_: 與凡思共用同一個 extension id, 要求學生手動改 `routerBaseUrl` 才能上 Pegasi 課（主路徑）


**Install Action**:
老師策展、學生可點的一筆安裝動作；含顯示名稱、必填的 Action Kind，以及背後要執行的指令意圖（例如 `uv add` 或 `uvx`），不必然等於 PyPI 套件短名。本期不另做「下載檔案進專案」的專用動作。
_Avoid_: 模組（單獨使用時易與 Python module 混淆）, package name（暗示只是短名）, File Asset 專用 kind

**Action Kind**:
標在單一 Install Action 上的封閉種類；欄位 `kind`，值為 `skill`／`package`／`mcp`（學生分別看到 tag「Skill」「套件」「MCP」）。純顯示標示：不分區、不收合、不改變啟用／執行／依賴行為。缺漏或非法值則整份 Course Catalog 載入失敗。不另增「檔案資產」kind——進專案的效果由 catalog 內既有動作（含其 `command`）完成。
_Avoid_: Action Group, 巢狀 groups, 依種類自動分區收合, 模組（單獨當領域詞或第四種 kind）, 開放任意字串 kind, 用 kind 驅動安裝邏輯, `asset`／`files`／`material` 當新 kind

**Environment Tool**:
機器層級、固定清單的工具鏈成員（目前：uv、git、Node.js）；用來讓本課安裝動作跑得起來。
_Avoid_: 全域模組, 系統套件（太寬）

**Course Catalog**:
某一課堂的策展安裝清單，以頂層 `actions` 列出本課的 Install Action。有課堂連線時，權威來源是學生所連 **Router**（`vans_coding_router` 或 `pegasi_router`，由 `routerBaseUrl` 決定）上、該 Classroom API Key 所屬 Class Session 的 YAML，經獨立 GET 拉取（與兌換解耦）。拉取時機：兌換成功後、擴充啟動且本機已有 key 時自動拉、以及手動重新載入／再試遠端；課堂結束後仍可拉最後一版。成功結果只留在擴充記憶體，不寫回工作區 `classroom-installs.yaml`。擴充「手上沒有可用 YAML」時 fallback 讀工作區根目錄該檔。遠端合法但 `actions` 為空仍算「有 YAML」，不因此 fallback。清單 UI 在 Course Lane；使用 fallback 時顯示短提示並提供再試遠端。本期不做檔案資產一鍵進專案。
_Avoid_: 巢狀 `groups`（已撤回）, 應用內建唯一清單, 多份並行清單（同一學生同時多份有效 catalog）, 僅工作區根目錄 YAML 當唯一真相（已撤回）, 輪詢自動更新, 本機覆蓋遠端, 把遠端 catalog 寫進學生專案檔, 一級 File Asset／新 asset kind（本期不做）, 把清單 UI 併進 Router Lane, 靜默 fallback, 把空的遠端 `actions` 當成失敗, 只做 Vans Router 不做 Pegasi

**Router**:
學生透過設定 `routerBaseUrl` 連上的課堂後端；本期支援的兩個對等實作是 `vans_coding_router` 與 `pegasi_router`。Course Catalog 的 Portal 編輯、Session 儲存與 extension GET 契約必須在兩者保持一致，擴充不為 Pegasi／Vans 各寫一套 catalog 邏輯。
_Avoid_: 只實作單一 router 部署, 兩套不相容的 catalog API／YAML 形狀

**Pegasi Router**:
Pegasi Distribution 對學生／設定說明使用的 **Router** 後端稱呼；指 `routerBaseUrl` 預設連上的 `pegasi_router` 實作。不是 Host 語言模型清單裡的 provider `name`，也不是凡思發行的 Router 顯示名。談公開網址、課堂連線、兌換時用此名；談「選模型／清除 provider」不用此名。
_Avoid_: 把 Chat LM provider 條目叫 Pegasi Router, 用 Pegasi Router 兼指 BYOK 寫入的模型提供者, 要求凡思發行改用此顯示名, 在選模型提示裡顯示 Pegasi Router 卻寫入另一個 provider `name`

**Classroom Chat Provider**:
BYOK Setup 寫入 Host 語言模型清單、供學生選用的那個 provider 條目；Pegasi Distribution 與其 `name` 字串與凡思引擎相同（目前為 `VCRouter`），不因 Pegasi 品牌另改 `name`。清除課堂連線時依此 `name`（與 vendor）匹配移除。學生可見的「選模型」文案採主句中性＋括號實際 `name`（對得上清單），不寫成 Pegasi Router。Pegasi Distribution 的學生可見字串隨此規則更新；不改匹配邏輯，也不要求凡思發行同步改文案。
_Avoid_: Pegasi Router（指後端時）, 為 Pegasi 單獨改 provider `name` 卻不處理舊機器遷移, 文案寫 Pegasi Router 但 JSON 仍為另一字串且不說明不一致, 只寫中性詞卻在多個 custom endpoint 並存時不提示清單上的 `name`, 只改 glossary 卻長期留下相反的學生提示

**Router Lane**:
側邊欄最上方區塊（學生可見標題「課堂連線」）：學生須先輸入 Invite Code 才能「連線登入」；主路徑為填碼 → Google → 深連結回來後自動兌換並 BYOK Setup。進入「等待登入」（或連線失敗）後才露出一次性貼碼與「貼上並完成連線」，供深連結未跳回時使用；可「重新連線登入」清掉舊手遞重跑。等待期間邀請碼仍可改。可整區收合／展開。Portal 網頁兌換與下載 install 腳本僅為備援。
_Avoid_: 塞進 Environment Lane, Course Lane, 僅命令面板而無側邊欄入口, 與 Portal 並列為同等主路徑, 無碼仍開 Google, idle 就顯示貼碼／完成鈕

**Environment Lane**:
側邊欄中負責檢查／安裝 Environment Tool 的區塊；學生可整區收合／展開（在 Router Lane 之下，與 Course Lane 並列）。

**Course Lane**:
側邊欄中列出 Course Catalog 並觸發 Install Action 的扁平清單區塊；學生可整區收合／展開。不分依 Action Kind 的子區。清單來源可來自 Session Catalog 或本機 fallback，但展示與點選仍在此區，不併進 Router Lane。
_Avoid_: 把安裝清單 UI 併進課堂連線區, 連線成功後自動跑完所有動作

**Toolchain Ready**:
uv、git、Node.js 三者皆以接近學生預期的 shell PATH 偵測為可用（找得到指令且版本命令成功）的總覽狀態：優先整合終端，Shell Integration 不可用時可改以系統／登入殼 PATH；與是否由本擴充功能安裝無關。不是 Course Lane 的總開關——本課動作改依各動作所需工具是否就緒來啟用。
_Avoid_: 環境安裝完成（未說明偵測基準）, 本擴充功能已執行安裝（不足以代表就緒）, 三工具未齊就不能裝任何本課項目, 僅編輯器行程啟動當下 PATH

**Marketplace Install**:
VS Code 學生從 Visual Studio Marketplace 安裝本擴充功能的主路徑。
_Avoid_: 市集側載, Open VSX 安裝（本產品不上架 Open VSX）

**Sideload**:
以 `.vsix` 檔直接安裝擴充功能的備援路徑；用於 Cursor、離線、市集異常，或需固定某一版本時。
_Avoid_: 從市集安裝, 本機開發 Host（F5）當課堂安裝

**Invite Code**:
老師為某一課堂發出、給學生兌換用的短碼；學生只在擴充內輸入，不經深連結或開啟登入的 URL 傳遞。空白時不可開始「連線登入」；有碼且 Sign-in Handoff 到達時自動兌換。擴充內輸入不改變既有兌換威脅模型（仍須 Google 身分＋有效碼）；不在此產品範圍內單獨加硬 router（如 rate limit）。
_Avoid_: API key, session token, 邀請連結（若指整段 URL）, 把擴充輸入框本身當成新的匿名兌換破口

**Classroom API Key**:
兌換 Invite Code 後取得的課堂憑證（文件示例以 `vcr_sk_…` 為主；實務上亦可能為 `pegasi_sk_…`）；編輯器以此呼叫 router 的 OpenAI-compatible API。擴充在兌換成功後保存它（Host secret、固定 hex id、覆寫同一格）；換新邀請碼時再跑一次流程並覆寫。本機不會隨課堂結束自動刪除。前綴品牌化不在 Pegasi Router 顯示名決策範圍內。
_Avoid_: Portal session, Google token, upstream provider key, 把 key 前綴改名當成 Pegasi Router 命名的一部分, Pegasi 發行拒收 `vcr_sk_…`（未另開契約決策前）

**Clear Classroom Connection**:
學生主動清除本機課堂連線：刪 Host／擴充內的 Classroom API Key、移除 Classroom Chat Provider，並將 Router Lane 重置為未兌換；不動其他 provider（如 OpenRouter）。確認文案與「選模型」同一套：主句中性＋括號實際 `name`，不寫 Pegasi Router。
_Avoid_: 只清側邊欄狀態卻留 key, 清掉學生其他 BYOK, 每次兌換換新 secret id 造成堆積, 清除提示寫 Pegasi Router

**Sign-in Handoff**:
瀏覽器完成 Google 登入後交給擴充的短效、單次證明，僅供立刻兌換 Invite Code；不是長期 Portal session，兌換後即丟棄。主路徑經 `vscode://` 深連結；深連結失敗時以瀏覽器顯示的一次性貼碼交回擴充。URI／貼碼皆不得承載 Classroom API Key。
_Avoid_: session credential（常駐）, API key in URI, oauth_state cookie, 失敗就只能改走 Portal

**BYOK Setup**:
把 router 的模型清單與 Classroom API Key 寫入**目前正在執行本擴充的**那個編輯器之語言模型／自訂端點設定，使 Copilot（或同等客戶端）能走課堂 router。`chatLanguageModels.json` 的 `apiKey` 必須是 Host 的 secret 參照（如 `${input:chat.lm.secret.…}`）；Classroom API Key 本體進 Host secret storage，不把 `vcr_sk_…` 明文當 `apiKey` 字串。僅支援 VS Code；Cursor 不自動寫入，改提示 Portal／手動。不一次改寫其他編輯器產品的設定路徑。模型清單向 router 拉取（單一真相在 router），不打包死在擴充裡。
_Avoid_: 下載並執行 install-vscode-models.cmd（那是 Portal 備援路徑）, 只合併模型卻不處理 key, 明文 Classroom API Key 寫進 `apiKey`, 一次寫入多個編輯器產品路徑, 以擴充內建 template 為唯一來源, 在 Cursor 自動寫 Host secret

**Host Full Restart**:
完整退出目前 Host 並自動再開同一 Host，使 Host secret／pending BYOK 等需進程重生才穩定的狀態生效；學生可見動作為「重新啟動」。硬承諾：按下後必須回來，不可只關不開卻仍稱重啟。
_Avoid_: Reload Window（重載視窗）, 只執行退出卻不重開, 把「稍後手動重開」當成同等主路徑
