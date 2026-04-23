# Production Security Hardening

## 1) Disable API Docs in Production

`backend/server.py` now supports environment-based docs control.

Use these env vars in production:

```env
APP_ENV=production
ENABLE_API_DOCS=false
```

Behavior:
- `ENABLE_API_DOCS=false` => disables `/docs`, `/redoc`, and `/openapi.json`.
- In non-production environments, docs remain enabled by default.

## 2) Protect Admin Routes in Nginx

Use the sample config:

- `deploy/nginx/admin-protection.conf.example`

Steps:
1. Copy relevant `location` blocks into your Nginx `server { ... }`.
2. Replace placeholder `allow` IPs with your office/VPN public IPs.
3. Reload Nginx:
   - `sudo nginx -t`
   - `sudo systemctl reload nginx`

Recommended defense-in-depth:
- Keep backend admin token checks enabled (already enforced in API).
- Add IP allowlist on `/api/admin/` and `/admin/`.
- Optionally enable Nginx basic auth for `/api/admin/`.

## 3) Quick Verification

From a non-allowlisted IP:
- `/api/admin/...` should be blocked by Nginx.
- `/docs` should be unavailable when `ENABLE_API_DOCS=false`.

From an allowlisted IP:
- Admin API should still require valid admin bearer token.

## 4) Forgot Password (Production-Safe)

`backend/server.py` now includes:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Security controls in the flow:
- Generic response on forgot-password (prevents account enumeration).
- Short-lived signed reset token (`PASSWORD_RESET_EXPIRE_MINUTES`, default 30 min).
- One-time reset behavior via password-hash fingerprint check.
- Per-IP/email and per-IP rate limits for forgot/reset endpoints.

Set these env vars in production:

```env
FRONTEND_BASE_URL=https://your-frontend-domain.com
PASSWORD_RESET_EXPIRE_MINUTES=30
FORGOT_PASSWORD_WINDOW_SECONDS=900
FORGOT_PASSWORD_MAX_ATTEMPTS=5
RESET_PASSWORD_WINDOW_SECONDS=900
RESET_PASSWORD_MAX_ATTEMPTS=10
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASSWORD=replace-with-app-password
SMTP_FROM=SupplySync <noreply@example.com>
SMTP_USE_TLS=true
```
