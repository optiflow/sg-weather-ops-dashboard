## 2024-05-18 - Avoid Promise.all staggering for fast external APIs
**Learning:** Sequential await calls for multiple independent network requests add up to significant latency, even when there are intentional delays to avoid rate limits. Staggering execution while awaiting concurrently avoids rate limit violations while achieving massive speedups.
**Action:** Identify independent network requests in `getCurrentWeather` and switch from sequential awaits to a staggered `Promise.all` approach to optimize backend fetch performance.
