## 1. wrangler.toml — Add Worker Script Entry Point

- [x] 1.1 Read current `wrangler.toml` to confirm existing fields (`name`, `compatibility_date`, `[assets]`, `[build]`, `[env.preview]`, `[env.development]`)
- [x] 1.2 Add `main = "src/worker.js"` at the top-level (before any section headers), leaving all existing fields unchanged

## 2. src/worker.js — Worker Script Entry and Routing

- [x] 2.1 Create `src/worker.js` exporting `export default { fetch(request, env, ctx) {} }` (bare handler, no router framework)
- [x] 2.2 Parse `new URL(request.url).pathname` inside the fetch handler and route pathname `/cf-analytics-proxy` to `handleAnalyticsProxy(request, env)`
- [x] 2.3 Implement fallthrough: for all other pathnames, return `env.ASSETS.fetch(request)`

## 3. src/worker.js — Analytics Proxy Handler

- [x] 3.1 Implement `handleAnalyticsProxy(request, env)` function that handles OPTIONS preflight: return HTTP 204 with headers `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, X-Proxy-Key`
- [x] 3.2 For POST requests, validate `X-Proxy-Key` header against `env.ANALYTICS_PROXY_KEY`; return HTTP 401 `{"error":"Unauthorized"}` with `Access-Control-Allow-Origin: *` if missing or wrong
- [x] 3.3 Forward valid POST requests to `https://api.cloudflare.com/client/v4/graphql` with original body, `Content-Type: application/json`, and `Authorization: Bearer ${env.CF_ANALYTICS_TOKEN}` header
- [x] 3.4 Return the CF GraphQL API response (status code + body) unchanged to the caller, always appending `Access-Control-Allow-Origin: *` header

## 4. analytics-artifact.html — Page Structure and Inputs

- [x] 4.1 Create `analytics-artifact.html` at the project root (not in `src/` or `docs/`); all JS and CSS must be inline — no external dependencies
- [x] 4.2 Add Proxy URL text input and Proxy Key `type="password"` input, plus a submit button
- [x] 4.3 Add start date, end date (date inputs), and script name text input for query filtering

## 5. analytics-artifact.html — GraphQL Query Logic

- [x] 5.1 On form submit, construct a CF GraphQL query body targeting `workersInvocationsAdaptive` with `sum { requests errors }` grouped by `datetime`, filtered by the user-supplied date range and `scriptName`
- [x] 5.2 Send a POST fetch to the user-supplied Proxy URL with `Content-Type: application/json` and `X-Proxy-Key` header set to the entered key
- [x] 5.3 Parse the response: extract `datetime`, `sum.requests`, `sum.errors` from the GraphQL response payload for chart rendering
- [x] 5.4 Display human-readable error messages for HTTP 401 (e.g., "Invalid Proxy Key"), other non-200 statuses, and network errors

## 6. analytics-artifact.html — SVG Line Chart

- [x] 6.1 Implement a vanilla JS function that generates an `<svg>` element with two `<polyline>` series: requests (blue) and errors (red), with labeled X-axis (time) and Y-axis (count)
- [x] 6.2 Calculate coordinate mapping from data values to SVG pixel space (min/max scaling for both axes)
- [x] 6.3 Render time labels on the X-axis at reasonable intervals; render count labels on the Y-axis
- [x] 6.4 Show a "No data" message in the chart area when the API returns zero data points; replace the SVG chart in the DOM on each successful query

## 7. Verification

- [ ] 7.1 Run `wrangler dev` locally and confirm `OPTIONS /cf-analytics-proxy` returns 204 with correct CORS headers
- [ ] 7.2 Confirm `POST /cf-analytics-proxy` without key returns 401 with `Access-Control-Allow-Origin: *`
- [ ] 7.3 Confirm `POST /cf-analytics-proxy` with wrong key returns 401
- [ ] 7.4 Confirm `GET /` and other static paths are served from `env.ASSETS` (not intercepted by proxy handler)
- [ ] 7.5 Open `analytics-artifact.html` locally, fill in production Proxy URL + Key, submit, and verify chart renders with correct data
