# 以 Visual Studio Marketplace 為主、VSIX 側載為備援

課堂發佈從「僅 VSIX 側載」改為：**VS Code 走 Visual Studio Marketplace**（身分 `vans-coding.pegasi-classroom-install`），側載保留給 Cursor／離線／急救。不上架 Open VSX，因此市集文案只寫 VS Code；Cursor 說明留在 repo README。授權 MIT、掛公開 GitHub repo；首發 `0.1.0`；接受市集自動更新。發版以推送 `v*` tag 觸發 GitHub Actions：`vsce publish` 並把同一顆 `.vsix` 掛上 GitHub Release，避免市集與備援包分叉。

Marketplace Publisher `vans-coding` 由維護者**個人 Microsoft 帳號**建立並獨享發佈權；GitHub Actions 使用該帳號核發的 PAT（repo secret `VSCE_PAT`），不採組織共用 publisher。操作步驟見 [publishing.md](../publishing.md)。
