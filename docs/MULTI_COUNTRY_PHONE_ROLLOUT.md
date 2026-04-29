# Multi-Country Phone and OTP Rollout

## Goal

Move from India-only phone handling to a multi-country foundation without breaking existing users.

## What Is Implemented Now

- Backend phone normalization accepts:
  - full E.164 input (example: `+14155552671`)
  - local phone input with region hint
- OTP endpoints now support an optional country field:
  - `POST /api/auth/login/request-otp` with `phone_country` (optional)
  - `POST /api/auth/login/verify-otp` with `phone_country` (optional)
- Team member approval OTP request supports merchant country override:
  - `POST /api/dealer/team-members/request-create` with `merchant_phone_country` (optional)
- Twilio Verify always receives E.164-formatted numbers.
- Backward compatibility is preserved:
  - if no country is provided, backend uses `DEFAULT_PHONE_REGION` (defaults to `IN`)

## Environment Variables

- `DEFAULT_PHONE_REGION` (default: `IN`)
- `ENABLED_PHONE_REGIONS` (comma-separated, default: `IN`)
  - example: `IN,US,CA,GB,AE,SG,AU`

Twilio variables remain unchanged:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

## API Contract (Current)

### Request Login OTP

`POST /api/auth/login/request-otp`

```json
{
  "phone": "4155552671",
  "phone_country": "US"
}
```

### Verify Login OTP

`POST /api/auth/login/verify-otp`

```json
{
  "phone": "4155552671",
  "phone_country": "US",
  "otp": "123456"
}
```

### Team Member Create OTP Request

`POST /api/dealer/team-members/request-create`

```json
{
  "name": "Alex",
  "phone": "9876543210",
  "email": "alex@example.com",
  "user_type": "staff",
  "password": "generated-on-frontend",
  "merchant_phone_country": "IN"
}
```

## Recommended Next Steps

1. Add a country selector in login and profile UI.
2. Store canonical user phone in E.164 at write-time (signup/profile update).
3. Add migration to normalize existing stored numbers.
4. Keep country allowlist rollout controlled by `ENABLED_PHONE_REGIONS`.
5. Add OTP analytics per country (delivery success, verify success, abuse rate, cost).

## Rollout Strategy

1. Keep `DEFAULT_PHONE_REGION=IN` and `ENABLED_PHONE_REGIONS=IN` in production.
2. Enable one new country at a time in `ENABLED_PHONE_REGIONS`.
3. Monitor logs and Twilio delivery metrics after each country enablement.
4. Expand only after stable OTP success and support readiness.
