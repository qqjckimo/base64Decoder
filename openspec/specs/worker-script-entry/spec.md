# worker-script-entry Specification

## Purpose
TBD - created by archiving change cf-analytics-proxy. Update Purpose after archive.
## Requirements
### Requirement: Worker script uses bare fetch handler
`src/worker.js` SHALL export a default object with a `fetch` handler using the standard Cloudflare Worker module syntax (`export default { fetch(request, env, ctx) {} }`). No third-party router framework (Hono, itty-router, etc.) SHALL be introduced.

#### Scenario: Worker module exports default fetch handler
- **WHEN** wrangler bundles `src/worker.js`
- **THEN** the file exports a default object with a `fetch` method that accepts `(request, env, ctx)` parameters

### Requirement: Route /cf-analytics-proxy to proxy handler
The fetch handler SHALL route requests whose URL pathname is `/cf-analytics-proxy` to the analytics proxy handler function, regardless of whether the method is GET, POST, or OPTIONS.

#### Scenario: POST to /cf-analytics-proxy is routed to proxy handler
- **WHEN** a POST request arrives with pathname `/cf-analytics-proxy`
- **THEN** the fetch handler delegates to `handleAnalyticsProxy(request, env)`

#### Scenario: OPTIONS to /cf-analytics-proxy is routed to proxy handler
- **WHEN** an OPTIONS request arrives with pathname `/cf-analytics-proxy`
- **THEN** the fetch handler delegates to `handleAnalyticsProxy(request, env)` which returns the preflight response

### Requirement: All other requests fall through to static assets
For any request whose pathname does NOT match `/cf-analytics-proxy`, the fetch handler SHALL call `env.ASSETS.fetch(request)` and return its response, preserving the existing static asset serving behavior.

#### Scenario: Request for a static asset is served from ASSETS
- **WHEN** a GET request arrives with any pathname other than `/cf-analytics-proxy` (e.g., `/`, `/index.html`, `/core.bundle.js`)
- **THEN** the fetch handler calls `env.ASSETS.fetch(request)` and returns the result

#### Scenario: Unknown path returns ASSETS 404
- **WHEN** a GET request arrives for a path that does not exist in the `docs/` directory
- **THEN** `env.ASSETS.fetch(request)` returns a 404 response and the Worker returns it unchanged

