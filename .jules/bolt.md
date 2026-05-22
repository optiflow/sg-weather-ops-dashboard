## 2025-05-22 - Optimizing Rate-Limited API Execution
**Learning:** Sequential rate-limited requests can be drastically optimized without hitting HTTP 429 limits. The `SingaporeWeatherClient` executed 10 API calls with 1-second delays sequentially, taking ~25s.
**Action:** Replace sequential delays with staggered concurrent execution using `Promise.all` and a delay thunk (e.g. `setTimeout` multiplying an index by `300ms`). This cut execution to ~3.5s while respecting rate limits.
