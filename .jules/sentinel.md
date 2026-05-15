## 2025-05-15 - Express Hardening
**Vulnerability:** Missing security headers and JSON payload limits exposed the API to common web vulnerabilities (MIME sniffing, clickjacking, XSS) and Denial of Service (DoS) attacks.
**Learning:** By default, Express does not set security headers or limit JSON payload sizes, requiring explicit configuration or middleware to harden the server.
**Prevention:** Always configure basic security headers (e.g., using Helmet or manually) and set appropriate payload size limits on body parsers (e.g., `express.json({ limit: '100kb' })`) when setting up Express servers.
