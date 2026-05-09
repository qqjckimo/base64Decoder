# analytics-proxy-endpoint Specification

## Purpose
TBD - created by archiving change cf-analytics-proxy. Update Purpose after archive.
## Requirements
### Requirement: POST endpoint validates Proxy Key
The `/cf-analytics-proxy` endpoint SHALL accept POST requests and validate the `X-Proxy-Key` header against the `ANALYTICS_PROXY_KEY` secret stored in the Worker environment. Requests with a missing or incorrect key MUST be rejected with HTTP 401.

#### Scenario: Valid Proxy Key accepted
- **WHEN** a POST request arrives at `/cf-analytics-proxy` with a correct `X-Proxy-Key` header
- **THEN** the Worker proceeds to forward the request to the CF GraphQL API

#### Scenario: Missing Proxy Key rejected
- **WHEN** a POST request arrives at `/cf-analytics-proxy` without an `X-Proxy-Key` header
- **THEN** the Worker returns HTTP 401 with a JSON error body `{"error":"Unauthorized"}`

#### Scenario: Wrong Proxy Key rejected
- **WHEN** a POST request arrives at `/cf-analytics-proxy` with an incorrect `X-Proxy-Key` value
- **THEN** the Worker returns HTTP 401 with a JSON error body `{"error":"Unauthorized"}`

### Requirement: POST endpoint forwards request to CF GraphQL API
After successful key validation, the endpoint SHALL forward the request body as-is to `https://api.cloudflare.com/client/v4/graphql`, adding the `Authorization: Bearer <CF_ANALYTICS_TOKEN>` header from the server-side environment secret. The `Content-Type: application/json` header MUST be forwarded.

#### Scenario: GraphQL query forwarded with Bearer token
- **WHEN** a valid POST request with a JSON GraphQL body is received
- **THEN** the Worker sends a POST to `https://api.cloudflare.com/client/v4/graphql` with the original body and `Authorization: Bearer <CF_ANALYTICS_TOKEN>` header
- **THEN** the CF API response (status + body) is returned to the caller unchanged

#### Scenario: CF API error is passed through
- **WHEN** the CF GraphQL API returns a non-200 status (e.g., 400, 403)
- **THEN** the Worker returns that same status code and response body to the caller

### Requirement: OPTIONS preflight response
The endpoint SHALL respond to OPTIONS requests at `/cf-analytics-proxy` with HTTP 204 and the required CORS headers, without performing any authentication.

#### Scenario: Preflight handled without auth
- **WHEN** an OPTIONS request arrives at `/cf-analytics-proxy`
- **THEN** the Worker returns HTTP 204 with headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, X-Proxy-Key`

### Requirement: CORS headers on all responses
Every response from `/cf-analytics-proxy` (including error responses) SHALL include `Access-Control-Allow-Origin: *` so browser-based clients can read the response.

#### Scenario: CORS header present on success response
- **WHEN** a valid POST request is processed and a response is returned
- **THEN** the response includes `Access-Control-Allow-Origin: *`

#### Scenario: CORS header present on error response
- **WHEN** a POST request is rejected with 401
- **THEN** the response includes `Access-Control-Allow-Origin: *`

