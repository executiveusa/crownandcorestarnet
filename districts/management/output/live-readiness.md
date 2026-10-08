# Crown & Core — Live Readiness

Generated: 2026-10-08T14:24:06.495Z

## Ready without credentials

- public-web

## Credential present — authenticated smoke still required

- square

## Blocked

- meta: BLOCKED_MISSING_AUTH — missing CC_META_ACCESS_TOKEN, CC_META_AD_ACCOUNT_ID
- google-business: BLOCKED_MISSING_AUTH — missing CC_GOOGLE_ACCESS_TOKEN
- analytics: BLOCKED_MISSING_AUTH — missing CC_GA4_PROPERTY_ID, CC_GOOGLE_ACCESS_TOKEN
- communications: BLOCKED_PROVIDER_TBD
- perspective: BLOCKED_MISSING_AUTH — missing CC_PERSPECTIVE_TOKEN
- riverside: BLOCKED_MISSING_AUTH — missing CC_RIVERSIDE_TOKEN
- media-storage: BLOCKED_PROVIDER_TBD

## Next unlock

**square** — customers, bookings, visits, orders/payments/revenue as authorized. Reason: CREDENTIAL_PRESENT_UNVERIFIED.

Credential presence is not proof of valid access. Any credential-bearing connector must pass its authenticated read-only smoke test before being treated as live.
