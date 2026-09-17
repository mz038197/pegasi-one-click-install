# 發佈手冊（Visual Studio Marketplace）

維護者操作說明。產品決策見 [ADR 0002](./adr/0002-vs-marketplace-publish.md)。

- **市集**：只上 Visual Studio Marketplace（不上 Open VSX）
- **身分**：`vans-coding.pegasi-classroom-install`
- **主路徑**：VS Code 市集；**備援**：GitHub Release 的 `.vsix`（Cursor／離線／急救）
- **自動發版**：推送符合 `v*` 的 git tag → [`.github/workflows/publish-extension.yml`](../.github/workflows/publish-extension.yml)

市集公開頁（審核通過後）：  
https://marketplace.visualstudio.com/items?itemName=vans-coding.pegasi-classroom-install  

管理頁：  
https://marketplace.visualstudio.com/manage/publishers/vans-coding

---

## 1. 首次設定（做一次）

### 1.1 Marketplace Publisher

1. 用維護者**個人 Microsoft 帳號**登入  
   https://marketplace.visualstudio.com/manage
2. 建立 Publisher（若尚未建立）：
   - **ID**：`vans-coding`（建完不可改；須與 `package.json` 的 `publisher` 一致）
   - **Name**：顯示名稱（可為 `vans-coding` 或品牌名）
3. 確認管理頁可看到 publisher `vans-coding`。

### 1.2 Azure DevOps 組織（用來發 PAT）

市集發佈權杖走 Azure DevOps Personal Access Token。若還沒有組織：

1. 開啟 https://aka.ms/SignupAzureDevOps（或 https://dev.azure.com/）並完成建立。
2. 本專案維護者目前使用的組織範例：`https://dev.azure.com/mz038197`（名稱可不同，重點是**同一個 Microsoft 帳號**能管 publisher）。

### 1.3 建立 PAT（Personal Access Token）

1. 開啟（把 `ORG` 換成你的組織名）：  
   `https://dev.azure.com/ORG/_usersSettings/tokens`
2. **New Token**，建議設定：
   - **Name**：例如 `vsce-publish-vans-coding`
   - **Organization**：**單一 org**（本專案：`mz038197`）。**不要**選 All accessible organizations（那是 Global PAT）。
   - **Expiration**：不要用預設 30 天。選 **Custom defined**，拉到 Azure 允許的上限（通常約 1 年）。token 自己的到期日到了，Actions 會 `Access Denied: The Personal Access Token used has expired`。
   - **Scopes**：Custom defined → **Show all scopes** → **Marketplace** →勾選 **Manage**（會一併帶上 Publish／Read）
3. **Create** 後立刻複製 token（只顯示一次）。**不要把 token 貼進聊天或 commit。**

**單一 org vs Global PAT**（兩件不同的事）：

| | 單一 org（`mz038197`） | Global PAT（All accessible organizations） |
|---|---|---|
| 能進哪些 Azure DevOps org | 只有發 token 時選的那一個 | 帳號下所有能進的 org |
| 2026-12-01 | 繼續有效（直到 token 自己的 Expiration） | Azure **全部停用**，與 Expiration 無關 |
| `vsce` | **2026-09-02** 已用 `mz038197` 通過 `vsce verify-pat vans-coding` | 舊文件曾因單一 org 401 而改用這個；現在不必再發 |

官方淘汰說明：[Retirement of Global PATs](https://aka.ms/GlobalPATDeprecation)。市集已上架的擴充版本不受影響，只影響之後用該 token 發版的 CI。凡思 `classroom-one-click-install` 的 `VSCE_PAT` 是另一個 secret，兩邊都要是單一 org。

### 1.4 寫入 GitHub secret

同一 publisher `vans-coding` 可重用凡思 repo 的 PAT（Marketplace Manage）。在有 `gh` 登入、且對本 repo 有 admin 權限的本機終端：

```powershell
gh secret set VSCE_PAT --repo mz038197/pegasi-one-click-install
```

貼上 PAT 後 Enter。確認：

```powershell
gh secret list --repo mz038197/pegasi-one-click-install
```

應看到 `VSCE_PAT`。可選本機驗證（仍勿把 token 貼給他人）：

```bash
npx @vscode/vsce verify-pat vans-coding -p "<你的 PAT>"
```

成功會顯示 verification succeeded。

### 1.5 第一次上架的備援做法

若 CI 尚未就緒，可在管理頁手動上傳：

1. https://marketplace.visualstudio.com/manage/publishers/vans-coding
2. **New extension** → **Visual Studio Code**
3. 上傳本機 `npm run package` 產出的 `.vsix`
4. 狀態可能先顯示 **Verifying**；通過前公開頁可能 404，屬正常。

---

## 2. 日常發版（version 已就緒後）

前置：`VSCE_PAT` secret 仍有效；`main`（或你要發的 commit）已 push。

1. 修改 `package.json` 的 `version`（例如 `0.1.0` → `0.1.1`），commit 並 push。
2. tag **必須**與 version 一致（workflow 會核對）：

```bash
git tag v0.1.1
git push origin v0.1.1
```

3. 在 GitHub Actions 查看 **Publish Extension** workflow：
   - 核對 tag ↔ `package.json` version
   - typecheck／test
   - `vsce package` / `vsce publish`
   - 建立 GitHub Release，並附上 `.vsix`

4. 驗收：
   - 市集／VS Code 擴充功能可裝到新版本
   - https://github.com/mz038197/pegasi-one-click-install/releases 有對應 tag 與 `.vsix`

**不要**對已發過的同一個 `version`／tag 再 publish 一次（市集會拒同一版重傳）。要修 bug 就 bump version。

---

## 3. 更換／輪替 PAT

在下列情況需要新 token：

- 接近或已過 **Expiration**（例如當初選 30 天）
- token 曾外洩（聊天、截圖、log）
- 撤銷舊 token 後 CI 失敗
- **仍是 Global PAT**（Organization＝All accessible organizations）：2026-12-01 當天會失效，即使 Expiration 還沒到。見「1.3」。Pegasi 與凡思 repo 的 secret **各自獨立**，兩邊都要重設

步驟：

1. 到 `https://dev.azure.com/ORG/_usersSettings/tokens` **Revoke** 舊 token（可選）。
2. 依「1.3」建新 PAT：單一 org（`mz038197`）+ Marketplace Manage + 長到期日。
3. 再執行一次 `gh secret set VSCE_PAT --repo mz038197/pegasi-one-click-install`（覆寫 secret）。凡思發行另設 `mz038197/classroom-one-click-install`。
4. 用 `vsce verify-pat` 或下一輪 `v*` tag 驗證 Actions。

---

## 4. 常見問題

| 現象 | 可能原因 | 處理 |
|---|---|---|
| Actions：`The Personal Access Token used has expired` | token 的 Expiration 到了（預設常是 30 天） | 依「1.3」發新 PAT（長到期日、單一 org）並重設 `VSCE_PAT`。**不要**重跑舊 `v*` tag 上的失敗 job 來「補發」已過期的同一顆包；bump version 再打新 tag |
| Actions：`Personal Access Token verification has failed` / 401 | secret 空、scope 不足、或 2026-12-01 後仍用 Global PAT | 重建單一 org PAT（Marketplace Manage）並重設 `VSCE_PAT` |
| 2026-12-01 後發版突然 401，token 未過期 | 仍是 Global PAT，已被 Azure 停用 | 改單一 org `mz038197`（或 Entra），Pegasi／凡思 secret 都要換 |
| Actions：tag 與 version 不符 | tag `v0.1.1` 但 `package.json` 仍是 `0.1.0` | 對齊後重打新 tag（勿重用已推送的錯誤 tag 內容除非 force，一般改 version 再打新 tag） |
| 市集公開頁 404，管理頁顯示 Verifying | 首次／更新後審核中 | 等 Verifying 結束；課堂可暫時用 Release `.vsix` |
| 想釘課堂版本 | 市集會自動更新 | 發當日 GitHub Release 的 `.vsix` 側載 |
| Cursor 學生裝不到市集版 | 只上 VS Marketplace | 改 VSIX 側載；見根目錄 README |

---

## 5. 相關檔案

| 檔案 | 用途 |
|---|---|
| [`package.json`](../package.json) | `publisher`、`name`、`version`、`license`、`repository` |
| [`.vscodeignore`](../.vscodeignore) | VSIX 排除清單 |
| [`EXTENSION_README.md`](../EXTENSION_README.md) | 市集顯示說明（繁中、只寫 VS Code） |
| [`.github/workflows/publish-extension.yml`](../.github/workflows/publish-extension.yml) | tag 觸發的發版流水線 |
| [ADR 0002](./adr/0002-vs-marketplace-publish.md) | 為何這樣發佈 |
| 官方： [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) | Microsoft 完整說明 |
