# wrangler-config Specification

## Purpose
TBD - created by archiving change cf-analytics-proxy. Update Purpose after archive.
## Requirements
### Requirement: wrangler.toml declares Worker script entry point
`wrangler.toml` SHALL include `main = "src/worker.js"` at the top-level (outside any `[env.*]` section), enabling Cloudflare Workers to use the script as the Worker entry point instead of pure static asset serving mode. All existing configuration (`name`, `compatibility_date`, `[assets]`, `[build]`, `[env.preview]`, `[env.development]`) MUST be preserved unchanged.

#### Scenario: main field present at top level
- **WHEN** `wrangler.toml` is read by wrangler
- **THEN** the `main` field equals `"src/worker.js"` and appears at the top-level (not inside a section)

#### Scenario: Existing fields not removed or altered
- **WHEN** `wrangler.toml` is read by wrangler
- **THEN** `name = "tools"`, `compatibility_date`, `[assets] directory = "./docs"`, `[build] command = "npm run build"`, `[env.preview]`, and `[env.development]` are all still present with their original values

#### Scenario: Static asset serving still works after change
- **WHEN** a request for a static asset is made to the deployed Worker
- **THEN** `env.ASSETS` is available to the Worker script (wrangler provisions it because `[assets]` section is present alongside `main`)

