## 2024-05-24 - Singapore Weather API Rate Limiting Bottleneck
**Learning:** The application was artificially delaying backend weather API fetch calls by 1000ms and executing them sequentially, causing location additions/refreshes to take 13+ seconds. This pattern was likely implemented to avoid the `429 Too Many Requests` rate limits from the data.gov.sg endpoints.
**Action:** Replaced the slow sequential loop with a staggered concurrent execution (`Promise.all` with a 250ms interval between calls) to drastically improve fetch time (from ~13s to ~3s) without exceeding rate limits.
