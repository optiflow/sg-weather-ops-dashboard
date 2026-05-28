## 2026-05-29 - Staggered Promise.all for API Rate Limits
**Learning:** Sequential async fetching with manual delays can cripple performance (25s+ execution time). Running concurrent requests to rate-limited external APIs (like `api-open.data.gov.sg`) using standard `Promise.all` can trigger HTTP 429 Too Many Requests.
**Action:** Use a staggered `Promise.all` execution pattern by wrapping promises in thunks and applying incrementing `setTimeout` delays before firing each request. This allows concurrent fetching while smoothly bypassing rate limits.
