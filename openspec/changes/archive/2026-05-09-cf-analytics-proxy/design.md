## Context

`tools` Cloudflare Worker 目前以純靜態資產模式運行（`wrangler.toml` 無 `main` 欄位，僅有 `[assets] directory = "./docs"`）。前端 Artifact 若要直接查詢 Cloudflare GraphQL Analytics API，必須在瀏覽器端暴露 CF API Token，這是不可接受的安全風險。

解法：在同一個 Worker 加入 `/cf-analytics-proxy` POST endpoint，作為 server-side proxy 隱藏 token。所有 secrets（`CF_ANALYTICS_TOKEN`、`ANALYTICS_PROXY_KEY`）已透過 `wrangler secret put` 預先設定，不存在任何檔案中。

現有 `docs/` 靜態資產 serving 必須完全保留，不受影響。

## Goals / Non-Goals

**Goals:**
- 新增 `src/worker.js` 作為 Worker script 入口，處理 `/cf-analytics-proxy` 路由
- `/cf-analytics-proxy` 以 `X-Proxy-Key` 驗證來源，轉發請求至 CF GraphQL API 並附加 server-side Bearer token
- 所有非代理路由 fallthrough 至 `env.ASSETS.fetch(request)`，靜態資產行為不變
- 新增 `analytics-artifact.html` 獨立工具頁，讓使用者輸入 Proxy URL + Proxy Key 查詢並視覺化 Workers Analytics
- 修改 `wrangler.toml` 加入 `main = "src/worker.js"`

**Non-Goals:**
- 不引入 router 框架（Hono、itty-router 等）
- 不整合 `analytics-artifact.html` 至主 SPA 或 webpack 打包
- 不加入 rate limiting 或 IP 白名單
- 不修改現有 webpack 設定
- 不在 Worker 端解析或轉換 GraphQL response 內容
- 不負責 secrets 的初始設定（已在 scope 外完成）

## Decisions

### Decision 1：裸 fetch handler，不引入 router 框架

**選擇**：`export default { fetch(request, env, ctx) {} }` 加上手動 pathname 比對。

**理由**：路由規則只有一條（`/cf-analytics-proxy` vs. 其他）。引入 Hono 或 itty-router 會增加 bundle 大小與依賴複雜度，完全不符 YAGNI。裸 handler 在 wrangler esbuild 下產出最小的 bundle。

**替代方案考慮**：Hono（~12KB gzip）、itty-router（~1KB）。即使是最輕的 itty-router 對此規模也屬過度設計。

---

### Decision 2：CORS 策略 — `Access-Control-Allow-Origin: *`

**選擇**：所有來自 `/cf-analytics-proxy` 的回應（包含錯誤回應）一律附加 `Access-Control-Allow-Origin: *`。

**理由**：`analytics-artifact.html` 是本地使用的獨立工具頁，origin 不固定。Proxy Key 是唯一的驗證機制，開放 CORS 不會提升額外風險——沒有 key 就無法取得資料。

**取捨**：任何知道 endpoint URL 的人都可以嘗試暴力破解 key，因此建議使用高熵隨機字串作為 `ANALYTICS_PROXY_KEY`。這個 trade-off 在 scope 內被接受。

**替代方案考慮**：鎖定特定 origin（如 `https://tools.xxx.workers.dev`）。但 `analytics-artifact.html` 可能從 `file://` 或其他 origin 開啟，限制 origin 會使工具無法使用。

---

### Decision 3：`analytics-artifact.html` 雙 input 設計（Proxy URL + Proxy Key）

**選擇**：頁面提供兩個輸入欄位：Proxy URL（完整 endpoint URL）與 Proxy Key（`type="password"`）。

**理由**：若將 Proxy URL 硬編進 HTML，工具在不同環境（preview / production）下需要修改檔案才能使用，難以重用。讓使用者自行填入 URL 與 Key，工具成為完全可攜的獨立 artifact。

**替代方案考慮**：hardcode URL + 只輸入 Key。缺點是 preview 與 production 需要不同版本的 HTML 檔案。

---

### Decision 4：純 SVG 折線圖，不引入圖表庫

**選擇**：以 vanilla JS 動態生成 `<svg>` 元素，手動計算座標渲染 `<polyline>`。

**理由**：`analytics-artifact.html` 是 single-file 工具，不能有外部依賴（Chart.js 約 200KB）。SVG 折線圖對 requests/errors over time 的時序資料已足夠，實作複雜度可接受。

**替代方案考慮**：CDN 載入 Chart.js。違反 single-file 原則且增加外部依賴，在離線或網路受限環境下無法使用。

---

### Decision 5：`wrangler.toml` 的 `main` 欄位位置

**選擇**：`main = "src/worker.js"` 加在 top-level（`name`、`compatibility_date` 等欄位旁），不放在任何 `[env.*]` section 內。

**理由**：`[assets]` section 存在時，wrangler 會自動將 `env.ASSETS` binding 注入 Worker，讓 fallthrough 可以運作。`main` 必須在 top-level 才能對所有環境生效。現有 `[env.preview]`、`[env.development]` 設定不需修改。

---

### Decision 6：proxy handler 不解析 GraphQL response

**選擇**：Worker 將 CF GraphQL API 的回應（status code + body）原封不動回傳給呼叫端。

**理由**：解析邏輯放在前端 `analytics-artifact.html`，Worker 保持薄層代理職責。若未來需要轉換格式，只需修改 HTML 而非重部署 Worker。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| 忘記呼叫 `env.ASSETS.fetch()` → 靜態資產全部 404 | worker.js default route 必須是 `return env.ASSETS.fetch(request)`；有對應 spec scenario 驗證 |
| Proxy Key 暴力破解（open CORS） | 使用高熵隨機字串作為 `ANALYTICS_PROXY_KEY`；無 rate limiting 是已知限制 |
| CF GraphQL API schema 異動 → query 失效 | query 結構集中在 `analytics-artifact.html`，修改範圍小；此風險在 scope 外 |
| `env.ASSETS` 在 wrangler 本機 dev 模式下行為與 production 不同 | 使用 `wrangler dev --remote` 或 preview environment 驗證 |
| analytics-artifact.html 放根目錄可能被 `npm run build` 覆蓋 | webpack output 目標是 `docs/`，根目錄不受影響；需確認 .gitignore 不排除此檔案 |

## Migration Plan

1. 修改 `wrangler.toml`：加入 `main = "src/worker.js"`（top-level）
2. 新增 `src/worker.js`：實作 bare fetch handler 與 `handleAnalyticsProxy`
3. 新增 `analytics-artifact.html`：放置於專案根目錄
4. 以 `wrangler dev` 本地驗證：
   - `OPTIONS /cf-analytics-proxy` → 204 + CORS headers
   - `POST /cf-analytics-proxy`（無 key）→ 401
   - `POST /cf-analytics-proxy`（錯 key）→ 401
   - `POST /cf-analytics-proxy`（正確 key）→ CF API response passthrough
   - `GET /` → 靜態資產（不受影響）
5. `wrangler deploy` 至 production
6. 開啟 `analytics-artifact.html`，填入 production Proxy URL + Key，驗證圖表正確渲染

**Rollback**：從 `wrangler.toml` 移除 `main` 欄位並重新部署，Worker 回退至純靜態資產模式。`src/worker.js` 與 `analytics-artifact.html` 留存不影響功能。
