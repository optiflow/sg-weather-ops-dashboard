## 2024-05-17 - Added basic security headers and JSON payload limits natively
**Vulnerability:** Missing basic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unbounded JSON payload sizes which can lead to DoS.
**Learning:** Native Express middleware can be configured to provide basic security headers and JSON payload size limits without adding external dependencies like Helmet, which might have overly strict defaults (like CSP blocking external maps).
**Prevention:** Always ensure standard security headers are set and consider payload size limits as a base defense against simple DoS attacks.

## 2024-06-02 - Added rate limiting to API routes
**Vulnerability:** Missing rate limiting on sensitive API endpoints, allowing for potential Denial-of-Service (DoS) and abuse.
**Learning:** A native in-memory rate limiter can be added simply using an Express middleware, leveraging a `Map` stored outside `createApp` to persist state across connections without causing memory leaks in testing. To ensure accuracy behind proxies, `app.set('trust proxy', 1)` must be used.
**Prevention:** Always implement base rate limiting for sensitive endpoints, and assure `trust proxy` is properly configured.
