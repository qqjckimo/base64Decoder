## Why

前端 Artifact 需要查詢 Cloudflare GraphQL Analytics API，但直接在瀏覽器端帶 CF API Token 會暴露憑證。需要一個 server-side proxy 作為中介層，隱藏 token 並驗證請求來源。

## What Changes

- 新建 `src/worker.js`：tools Worker 的 script 入口，處理 `/cf-analytics-proxy` 路由，其餘請求 fallthrough 至靜態資產
- 修改 `wrangler.toml`：加入 `main = "src/worker.js"` 欄位，啟用 Worker script 模式
- 新建 analytics artifact HTML：獨立 HTML 工具，輸入 Proxy Key 後可查詢 CF Workers Analytics 資料並視覺化呈現

## Capabilities

### New Capabilities
- `analytics-proxy-endpoint`: `/cf-analytics-proxy` POST endpoint，驗證 `X-Proxy-Key` header，轉發請求至 CF GraphQL API 並帶上 server-side `CF_ANALYTICS_TOKEN`
- `worker-script-entry`: `src/worker.js` 作為 Worker 入口，含路由邏輯與靜態資產 fallthrough
- `analytics-artifact-html`: 獨立 HTML 工具頁，讓使用者輸入 Proxy Key 查詢 CF Workers Analytics 並顯示圖表

### Modified Capabilities
- `wrangler-config`: `wrangler.toml` 加入 `main` 欄位（現有靜態資產設定不變）

## Impact

- **修改檔案**：`wrangler.toml`
- **新增檔案**：`src/worker.js`、`analytics-artifact.html`（專案根目錄，不進 webpack 打包）
- **Secrets**：`CF_ANALYTICS_TOKEN`、`ANALYTICS_PROXY_KEY`（已透過 `wrangler secret put` 設定，不在任何檔案中）
- **CORS**：Proxy endpoint 需回傳 CORS headers，支援來自任意 origin 的前端 Artifact
- **靜態資產**：現有 `docs/` serving 不受影響，透過 `env.ASSETS.fetch()` fallthrough
