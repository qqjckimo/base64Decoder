# analytics-artifact-html Specification

## Purpose
TBD - created by archiving change cf-analytics-proxy. Update Purpose after archive.
## Requirements
### Requirement: Single-file HTML artifact at project root
`analytics-artifact.html` SHALL be a self-contained single HTML file placed in the project root directory. It MUST NOT be referenced by or integrated into the webpack build or the main SPA. All JS and CSS MUST be inline within the file.

#### Scenario: File placed at project root, not in src/ or docs/
- **WHEN** the file is created
- **THEN** its path is `<project-root>/analytics-artifact.html` (not `src/` or `docs/`)

### Requirement: User inputs for Proxy URL and Proxy Key
The page SHALL provide two text inputs: one for the Proxy URL (the full URL of the `/cf-analytics-proxy` endpoint) and one for the Proxy Key (`X-Proxy-Key` value, rendered as `type="password"`). A submit button SHALL trigger the query.

#### Scenario: User fills in Proxy URL and Proxy Key then submits
- **WHEN** the user enters a valid Proxy URL and Proxy Key and clicks the query button
- **THEN** the page sends a POST request to the entered Proxy URL with `X-Proxy-Key` header set to the entered key

#### Scenario: Proxy Key input masked
- **WHEN** the user types into the Proxy Key field
- **THEN** the characters are obscured (input type="password")

### Requirement: Date range and script name inputs
The page SHALL provide date range inputs (start date, end date) and a script name input so the user can filter the Workers Analytics query.

#### Scenario: User specifies date range and script name
- **WHEN** the user sets start date, end date, and script name then submits
- **THEN** the GraphQL query includes the specified date range and `scriptName` filter in the `workersInvocationsAdaptive` query

### Requirement: GraphQL query for workersInvocationsAdaptive
The page SHALL issue a GraphQL POST to the proxy using the `workersInvocationsAdaptive` dataset, requesting `sum { requests, errors }` grouped by `datetime` (1-hour or 1-day granularity). The query MUST target the authenticated account's analytics.

#### Scenario: GraphQL body constructed correctly
- **WHEN** the user submits the form
- **THEN** the request body is a JSON object with a `query` field containing a valid CF GraphQL query for `workersInvocationsAdaptive` with the user-specified date range and script name
- **THEN** the `Content-Type: application/json` header is included

#### Scenario: Response data parsed for chart rendering
- **WHEN** the CF GraphQL API returns valid data via the proxy
- **THEN** the page extracts `datetime`, `sum.requests`, and `sum.errors` from the response and renders them in the SVG chart

### Requirement: Pure SVG line chart visualization
The page SHALL render a line chart using inline SVG (no chart library). The chart MUST show two series: `requests` (blue) and `errors` (red) over time. Axes and time labels MUST be visible.

#### Scenario: Chart rendered after successful query
- **WHEN** valid data is returned from the proxy
- **THEN** an SVG element is updated/replaced in the DOM showing two polylines (requests in blue, errors in red) with labeled X-axis (time) and Y-axis (count)

#### Scenario: Empty data shows empty chart with message
- **WHEN** the API returns zero data points for the queried range
- **THEN** the chart area shows a "No data" message instead of empty axes

### Requirement: Error display for failed requests
The page SHALL display a human-readable error message when the proxy returns a non-200 status or the network request fails.

#### Scenario: Proxy returns 401 Unauthorized
- **WHEN** the proxy returns HTTP 401
- **THEN** the page shows an error message indicating authentication failure (e.g., "Invalid Proxy Key")

#### Scenario: Network error
- **WHEN** the fetch to the proxy fails due to a network error
- **THEN** the page shows an error message with the error details

