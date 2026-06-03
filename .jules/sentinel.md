## 2024-05-17 - Added basic security headers and JSON payload limits natively
**Vulnerability:** Missing basic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unbounded JSON payload sizes which can lead to DoS.
**Learning:** Native Express middleware can be configured to provide basic security headers and JSON payload size limits without adding external dependencies like Helmet, which might have overly strict defaults (like CSP blocking external maps).
**Prevention:** Always ensure standard security headers are set and consider payload size limits as a base defense against simple DoS attacks.
## 2025-02-14 - Add Native Rate Limiting
**Vulnerability:** Missing rate limiting on sensitive API endpoints, allowing potential DoS attacks or excessive abuse.
**Learning:** External dependencies like `express-rate-limit` are prohibited unless explicitly approved, making native Map-based implementations necessary.
**Prevention:** Always implement native rate-limiting middleware in Express apps for high-priority APIs, ensuring it honors test environments to prevent broken pipelines and uses `.unref()` on intervals to avoid lingering memory leaks.
