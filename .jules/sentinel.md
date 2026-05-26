## 2024-05-17 - Added basic security headers and JSON payload limits natively
**Vulnerability:** Missing basic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unbounded JSON payload sizes which can lead to DoS.
**Learning:** Native Express middleware can be configured to provide basic security headers and JSON payload size limits without adding external dependencies like Helmet, which might have overly strict defaults (like CSP blocking external maps).
**Prevention:** Always ensure standard security headers are set and consider payload size limits as a base defense against simple DoS attacks.

## 2025-02-18 - Implemented Native Rate Limiting
**Vulnerability:** Missing rate limiting on sensitive API endpoints, leading to potential abuse and DoS.
**Learning:** Rate limiting can be implemented natively using a `Map` to avoid adding external dependencies. However, the state map and cleanup interval must be placed outside the Express app creation factory to prevent memory leaks during repeated test suite executions. Additionally, background `setInterval` must use `.unref()` to avoid keeping the Node process alive.
**Prevention:** When building native rate limiters or using background intervals in backend systems, scope the state appropriately, always append `.unref()` to intervals, and ensure `trust proxy` is set when behind load balancers.
