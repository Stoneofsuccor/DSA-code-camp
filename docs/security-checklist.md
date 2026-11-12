# Security Checklist

- [x] **Passwords:** Hashed using `scrypt` with a random salt per user (Build 7).
- [x] **Authentication:** Signed JWTs with expiration times (Build 7).
- [x] **Authorization:** Role guards (`requireRole`) on the backend (Build 7).
- [x] **SQL Injection:** Prevented via parameterised queries (`db.prepare` with `?`).
- [x] **XSS:** Frontend uses `.textContent` and custom `el()` builder instead of `innerHTML` for user data.
- [x] **CSRF:** Not applicable because we use Bearer tokens, not cookies.
- [x] **Rate Limiting:** Login and check-in routes limited by IP to prevent brute force.
- [x] **Security Headers:** CSP, X-Content-Type-Options, X-Frame-Options enabled.
- [x] **QR Forgery:** HMAC-SHA256 signatures with constant-time comparison.
- [x] **Race Conditions (Overselling / Check-in):** Solved via atomic SQL updates.
- [x] **Secrets:** Stored in `.env` and excluded from Git via `.gitignore`.