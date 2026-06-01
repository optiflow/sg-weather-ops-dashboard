## 2024-05-17 - Added basic security headers and JSON payload limits natively
**Vulnerability:** Missing basic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unbounded JSON payload sizes which can lead to DoS.
**Learning:** Native Express middleware can be configured to provide basic security headers and JSON payload size limits without adding external dependencies like Helmet, which might have overly strict defaults (like CSP blocking external maps).
**Prevention:** Always ensure standard security headers are set and consider payload size limits as a base defense against simple DoS attacks.

## 2024-06-01 - Implemented native rate limiting
**Vulnerability:** Missing rate limiting on sensitive API endpoints, allowing for potential DoS or abuse.
**Learning:** Rate limiting can be implemented natively using an in-memory Map in Node.js instead of pulling in external dependencies like `express-rate-limit`. The rate limiting state must be scoped outside the app factory to prevent memory leaks in tests, and background intervals must be unreferenced using `.unref()` so they don't keep the Node.js process alive.
**Prevention:** Always ensure sensitive endpoints have rate limits and be mindful of memory management in native implementations.
