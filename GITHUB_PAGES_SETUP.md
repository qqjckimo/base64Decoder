# GitHub Pages 部署指南

此文件說明如何為 Base64 圖片解碼工具設定 GitHub Pages。

## 📋 前置需求

- GitHub 帳號
- 具有管理員權限的 GitHub 倉庫

## 🚀 設定步驟

### 1. 啟用 GitHub Pages

1. 前往 GitHub 倉庫頁面
2. 點擊 **Settings** 頁籤
3. 在左側選單中找到 **Pages**
4. 在 **Source** 部分選擇：
   - **Deploy from a branch** 或 **GitHub Actions**（推薦）
5. 如果選擇 **GitHub Actions**：
   - GitHub 會自動檢測到 `.github/workflows/pages.yml` 檔案
   - 工作流程會在推送到 `main` 分支時自動執行

### 2. 設定自訂網域（選用）

如果您有自訂網域：

1. 在 **Pages** 設定中的 **Custom domain** 欄位輸入您的網域
2. 建議啟用 **Enforce HTTPS**
3. 在您的 DNS 提供商設定中新增 CNAME 記錄指向 `qqjckimo.github.io`

### 3. 檢查部署狀態

1. 前往 **Actions** 頁籤
2. 查看最新的 "Deploy to GitHub Pages" 工作流程
3. 確認部署成功（綠色勾號）

## 🔗 存取網站

部署完成後，您的網站將可在以下網址存取：

- **標準網址**：`https://qqjckimo.github.io/base64Decoder/`
- **自訂網域**（如已設定）：`https://yourdomain.com/`

## 📁 檔案結構說明

```
base64Decoder/
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Actions 部署工作流程
├── index.html                 # 主要應用程式檔案
├── _config.yml               # Jekyll 組態檔案
├── README.md                 # 專案說明文件
├── .gitignore               # Git 忽略檔案設定
└── LICENSE                  # 授權檔案
```

## 🔄 自動部署

每當您推送變更到 `main` 分支時：

1. GitHub Actions 會自動觸發
2. 建置並部署網站到 GitHub Pages
3. 約 1-5 分鐘後更新生效

## ⚙️ 組態檔案說明

### `_config.yml`
- Jekyll 靜態網站產生器的組態
- 包含網站標題、描述、URL 等設定
- SEO 優化設定

### `.github/workflows/pages.yml`
- GitHub Actions 工作流程定義
- 自動化部署流程
- 權限和環境設定

## 🛠️ 故障排除

### 部署失敗
- 檢查 Actions 頁籤中的錯誤訊息
- 確認 `pages.yml` 檔案格式正確
- 檢查 GitHub Pages 設定是否正確

### 網站無法存取
- 確認 GitHub Pages 已啟用
- 檢查部署狀態是否為成功
- 等待 DNS 快取更新（最多 24 小時）

### 變更未生效
- 確認變更已推送到 `main` 分支
- 檢查 Actions 是否執行成功
- 清除瀏覽器快取

## 📞 需要協助？

如果遇到問題，可以：

1. 檢查 [GitHub Pages 官方文件](https://docs.github.com/en/pages)
2. 查看 GitHub Actions 執行日誌
3. 在倉庫中建立 Issue

---

Happy coding! 🎉