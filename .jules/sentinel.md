## 2024-05-17 - Added basic security headers and JSON payload limits natively
**Vulnerability:** Missing basic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unbounded JSON payload sizes which can lead to DoS.
**Learning:** Native Express middleware can be configured to provide basic security headers and JSON payload size limits without adding external dependencies like Helmet, which might have overly strict defaults (like CSP blocking external maps).
**Prevention:** Always ensure standard security headers are set and consider payload size limits as a base defense against simple DoS attacks.
## 2024-05-24 - [Implement Native API Rate Limiting for Express]
**Vulnerability:** Missing rate limit on `/api` routes allowed brute force or DoS attacks without external dependencies.
**Learning:** Adding a rate limiter requires scoping the memory tracking outside the Express application factory to prevent memory leaks during testing. Trust proxy must also be explicitly set (`app.set('trust proxy', 1)`) so the client IP is properly resolved behind reverse proxies, avoiding shared limit blocks for all proxy traffic.
**Prevention:** Always implement native rate limiting with state stored outside request scopes and configure `trust proxy` appropriately when limiting by IP address.
