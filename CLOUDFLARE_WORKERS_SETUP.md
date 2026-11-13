# Cloudflare Workers 部署指南

此文件說明如何將開發者工具集合部署到 Cloudflare Workers。

## 📋 前置需求

- Cloudflare 帳號
- Node.js 18+ 和 npm
- GitHub 帳號（用於自動部署）

## 🚀 設定步驟

### 1. 安裝 Wrangler CLI

專案已經包含 `wrangler` 作為 devDependency，執行：

```bash
npm install
```

### 2. 登入 Cloudflare

```bash
npx wrangler auth login
```

此命令會開啟瀏覽器讓您登入 Cloudflare 帳號。

### 3. 建置專案

```bash
npm run build
```

### 4. 部署到 Cloudflare Workers

Production 只透過 Cloudflare Workers Builds 從 `main` 自動部署，**不要手動執行 `wrangler deploy`**，原因見 README 的 Production Deployment。

#### 本地預覽
```bash
npm run preview
```

### 5. 設定 GitHub 自動部署（推薦）

#### 5.1 安裝 GitHub App

1. 前往 [Cloudflare Workers & Pages GitHub App](https://github.com/apps/cloudflare-workers-and-pages)
2. 點擊 "Install" 並選擇您的 GitHub 帳號或組織
3. 選擇要授權的倉庫（建議只選擇此專案倉庫）

#### 5.2 在 Cloudflare Dashboard 設定

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 點擊 "Workers & Pages"
3. 點擊 "Create" > "Pages" > "Connect to Git"
4. 選擇您的 GitHub 倉庫
5. 設定建置選項：
   - **Build command**: `npm run build`
   - **Build output directory**: `docs`
   - **Framework preset**: None

#### 5.3 環境變數設定

如需設定環境變數，可在 Cloudflare Dashboard 的專案設定中添加。

## 📁 配置檔案說明

### `wrangler.toml`
```toml
name = "developer-tools-collection"
main = "src/index.js"
compatibility_date = "2024-09-11"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./docs"

[build]
command = "npm run build"
```

## 🔗 存取網站

部署完成後，您的網站將可在以下網址存取：

- **Workers 網域**: `https://developer-tools-collection.{your-subdomain}.workers.dev`
- **自訂網域** (可選): 可在 Cloudflare Dashboard 中設定

## 🔄 自動部署

每當您推送變更到主分支時：

1. GitHub 會觸發 Cloudflare Workers Builds
2. 自動執行 `npm run build`
3. 部署更新後的檔案到 Workers
4. 約 1-3 分鐘後更新生效

## 📊 優勢

### vs GitHub Pages
- ✅ **更快的建置時間**: Cloudflare 的建置基礎設施
- ✅ **更好的 CDN**: Cloudflare 全球網路
- ✅ **更多功能**: 未來可擴展至 serverless functions

### vs Cloudflare Pages
- ✅ **官方推薦**: Cloudflare 2024+ 主力投資方向
- ✅ **統一平台**: 未來所有功能開發都在 Workers
- ✅ **更多整合**: Durable Objects、Cron Triggers 等

## 🛠️ 故障排除

### 建置失敗
```bash
# 檢查本地建置
npm run build

# 檢查 wrangler 配置
npx wrangler whoami
```

### 部署失敗
到 Cloudflare dashboard 的 Workers Builds 查看 build log。

### GitHub 整合問題
1. 確認 GitHub App 已正確安裝
2. 檢查倉庫權限設定
3. 確認 `wrangler.toml` 配置正確

## 📝 常用指令

```bash
# 開發伺服器
npm run dev

# 建置專案
npm run build

# 本地預覽 Workers
npm run preview

# 查看部署資訊
npx wrangler deployments list

# 查看 Workers 日誌
npx wrangler tail
```

## 🔐 安全性

- 所有處理都在客戶端進行
- 不會傳輸任何使用者資料
- 符合隱私保護原則

## 📞 需要協助？

- [Cloudflare Workers 官方文件](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文件](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

Happy deploying! 🚀