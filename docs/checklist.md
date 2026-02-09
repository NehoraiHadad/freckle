# Freckle Admin API Compliance Checklist | בדיקת תאימות נמ״ש

Quick verification checklist for any product's Admin API implementation.
Based on **Freckle Admin API Standard v1.1**.

## Product: _______________
## Date: _______________
## Reviewed by: _______________

---

## Auth
- [ ] `ADMIN_API_KEY` env var exists and is documented
- [ ] All endpoints (except `/health` if opted out) require auth
- [ ] Invalid key returns `401` with `UNAUTHORIZED` error code
- [ ] Missing header returns `401`
- [ ] Auth error message is generic (doesn't leak why it failed)

## Headers & CORS
- [ ] All responses include `Content-Type: application/json`
- [ ] `ADMIN_CORS_ORIGINS` env var exists and is documented
- [ ] CORS headers set on all responses (`Access-Control-Allow-*`)
- [ ] `OPTIONS` preflight requests return `204` with CORS headers
- [ ] All requests expect `Content-Type: application/json`

## Response Format
- [ ] All responses have `success` boolean field
- [ ] Success responses have `data` field (never omitted, can be `null`)
- [ ] Error responses have `error.code` and `error.message`
- [ ] List responses have `meta` with `total`, `page`, `pageSize`, `hasMore`
- [ ] No extra top-level fields beyond `success`, `data`, `error`, `meta`
- [ ] All dates are ISO 8601 strings with timezone
- [ ] All IDs are strings
- [ ] `null` used for missing optional fields (not omitted)
- [ ] DELETE returns `200` with `{ deleted: true, id }` (not `204`)

## Required Endpoints
- [ ] `GET /health` returns `status`, `version`, `uptime`, `timestamp`
- [ ] `GET /meta` returns `product`, `displayName`, `version`, `apiStandardVersion`
- [ ] `GET /meta` includes `capabilities` array (accurately reflects implemented endpoints)
- [ ] `GET /meta` includes `supportedActions` per capability
- [ ] `GET /meta` includes `baseUrl`

## Pagination (for all list endpoints)
- [ ] Supports `page` parameter (default: 1)
- [ ] Supports `pageSize` parameter (default: 20, max: 100)
- [ ] `pageSize` capped at 100 even if higher value requested
- [ ] Supports `search` parameter
- [ ] Supports `sort` and `order` parameters
- [ ] `meta` in response is accurate (total count is correct)
- [ ] Edge cases handled: page 0 → page 1, page beyond total → empty array with correct meta

## Error Handling
- [ ] Uses standard error codes from the standard (Section 6)
- [ ] HTTP status codes match the standard (Section 5)
- [ ] No stack traces in responses
- [ ] Invalid input returns `400` with `VALIDATION_ERROR`
- [ ] Not found returns `404` with `NOT_FOUND`
- [ ] Unsupported action returns `400` with `INVALID_OPERATION`
- [ ] Custom error codes are prefixed with product name

## Security
- [ ] No passwords, tokens, or secrets in responses
- [ ] Internal IDs converted to strings
- [ ] User data doesn't leak sensitive fields (password hashes, auth tokens)
- [ ] All inputs are validated and sanitized
- [ ] Admin operations are logged (who, what, when)

## Code Quality
- [ ] Follows existing codebase patterns and conventions
- [ ] Full type safety (no `any` / untyped `dict`)
- [ ] All inputs validated with project's validation library
- [ ] Uses project's existing logger (not `console.log` / `print`)
- [ ] No existing functionality modified or broken
- [ ] All existing tests still pass
- [ ] No lint, type, or compilation errors
- [ ] New tests written for admin endpoints

## Documentation
- [ ] Endpoint summary table exists (method, path, description)
- [ ] At least one curl example per endpoint
- [ ] `ADMIN_API_KEY` documented in `.env.example` or equivalent
- [ ] `ADMIN_CORS_ORIGINS` documented in `.env.example` or equivalent

---

## Endpoint Inventory

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /health | [ ] | |
| GET | /meta | [ ] | |
| GET | /stats | [ ] | |
| GET | /stats/trends | [ ] | |
| GET | /users | [ ] | |
| GET | /users/:id | [ ] | |
| PATCH | /users/:id | [ ] | |
| DELETE | /users/:id | [ ] | |
| POST | /users/:id/actions | [ ] | |
| GET | /content | [ ] | |
| GET | /content/:id | [ ] | |
| PATCH | /content/:id | [ ] | |
| DELETE | /content/:id | [ ] | |
| POST | /content/:id/actions | [ ] | |
| GET | /analytics/usage | [ ] | |
| GET | /analytics/activity | [ ] | |
| GET | /config | [ ] | |
| PATCH | /config | [ ] | |
| POST | /operations | [ ] | |
| GET | /webhooks | [ ] | |
| POST | /webhooks | [ ] | |
| DELETE | /webhooks/:id | [ ] | |

Mark with `[x]` if implemented and verified, `[-]` if not applicable, `[ ]` if missing.
