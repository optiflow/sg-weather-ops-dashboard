## 2024-05-27 - Sequential vs Staggered Concurrent API Requests
**Learning:** Sequential execution of multiple API requests with artificial delays (like in `weather.ts`) creates a massive performance bottleneck. In this codebase, fetching 10 weather endpoints sequentially with 1-second delays took ~25+ seconds.
**Action:** Replace sequential API calls with staggered concurrent execution using `Promise.all` and a delay generator. This respects rate limits (HTTP 429) while drastically reducing execution time (e.g., from ~25s to ~3.5s).
