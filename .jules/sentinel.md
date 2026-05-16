## 2026-05-16 - Add security headers and limit JSON payload size
**Vulnerability:** Missing security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and unlimited JSON payload sizes mapping to a DoS risk from large inputs.
**Learning:** In native Express setups avoiding heavy external dependencies like Helmet, crucial headers must be appended via middleware manually.
**Prevention:** Include native security-focused middlewares and configure `express.json({ limit })` defensively on any new API server.
