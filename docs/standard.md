# Freckle Admin API Standard | תקן נמ״ש

**Version**: 1.1
**Last Updated**: 2026-02-09
**Status**: Active

---

## 1. Overview

Every product in the Freckle (נמ״ש) ecosystem exposes a **standardized Admin API** - a set of REST endpoints that provide management and monitoring capabilities. These APIs are consumed by external systems (dashboards, automation tools, bots, CLIs) and are completely decoupled from the product's internal implementation.

### Core Principles

1. **Backend-agnostic** - The product handles its own database (Firebase, Supabase, PostgreSQL, etc.). The API abstracts this away. Consumers never know or care what database is behind the API.
2. **Language-agnostic** - Products can be built in any language (TypeScript, Python, Go, etc.). The standard defines the HTTP contract, not the implementation language.
3. **Standardized contract** - All products follow the same response format, error codes, auth pattern, and pagination scheme. A consumer that works with one product works with all.
4. **Opt-in endpoints** - Not every product needs every endpoint category. Implement only what's relevant. But whatever you implement MUST follow this standard.
5. **Additive only** - Once an endpoint is published, its response shape cannot have fields removed (only added). Breaking changes require a version bump.

---

## 2. Base URL & Headers

### 2.1 Base Path

All admin endpoints live under a consistent base path:

```
/api/admin/v1/*
```

If the product already has an API structure (e.g., `/api/v1/admin/*`), that's acceptable as long as it's consistent within the product. The key is that all admin endpoints are grouped under a single, identifiable prefix.

### 2.2 Required Headers

**All requests:**
```
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>
```

**All responses:**
```
Content-Type: application/json
```

### 2.3 CORS

Products MUST set CORS headers to allow the Freckle console (and other authorized consumers) to make requests:

```
Access-Control-Allow-Origin: <configured origins or *>
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

Products SHOULD use an environment variable (`ADMIN_CORS_ORIGINS`) to configure allowed origins rather than using `*` in production.

Products MUST respond to `OPTIONS` preflight requests with a `204 No Content` and the CORS headers above.

---

## 3. Authentication

### 3.1 API Key Authentication (Primary)

All admin endpoints MUST be protected by API key authentication.

**Header format:**
```
Authorization: Bearer <ADMIN_API_KEY>
```

**Environment variable:**
```
ADMIN_API_KEY=<random-secure-string>
```

The API key should be at least 32 characters, generated with a cryptographically secure method.

### 3.2 Auth Middleware Requirements

The auth middleware MUST:
1. Validate the `Authorization` header exists and contains a valid key
2. Return `401 Unauthorized` with standard error format if invalid
3. Return `401 Unauthorized` if the header is missing entirely
4. NOT leak information about why auth failed (don't say "key expired" vs "key invalid")

**Standard 401 response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication"
  }
}
```

### 3.3 Optional: Session-Based Auth

Products MAY additionally support session-based auth (for admin users accessing via browser). If supported, the admin session must have an explicit admin role check - a regular user session must NOT grant admin access.

### 3.4 Rate Limiting (Recommended)

Admin endpoints SHOULD implement rate limiting:
- Default: 100 requests per minute per API key
- Burst: 20 requests per second
- Return `429 Too Many Requests` when exceeded

---

## 4. Response Format

### 4.1 Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

For paginated lists:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### 4.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### 4.3 Delete Response

DELETE endpoints return `200` with a confirmation body (NOT `204`), to stay consistent with the standard response format:

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "user-123"
  }
}
```

### 4.4 Rules

- `success` field is ALWAYS present and is a boolean
- On success: `data` is ALWAYS present (can be `null`, object, or array)
- On error: `error` is ALWAYS present with both `code` and `message`
- `meta` is ONLY present for paginated list responses
- No additional top-level fields beyond `success`, `data`, `error`, `meta`
- All dates are ISO 8601 strings with timezone (e.g., `"2026-02-09T12:00:00.000Z"`)
- All IDs are strings (even if numeric internally)
- All monetary values are integers in the smallest unit (cents, credits)
- `null` is acceptable for optional fields; never omit a field that's defined in the type

---

## 5. HTTP Status Codes

Use these consistently across all products:

| Status | When |
|--------|------|
| `200` | Successful GET, PATCH, DELETE, or action |
| `201` | Successful POST that created a resource |
| `400` | Invalid input / validation error |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but not authorized for this action |
| `404` | Resource not found |
| `409` | Conflict (duplicate, already exists) |
| `422` | Valid JSON but semantically invalid (e.g., can't delete active user) |
| `429` | Rate limit exceeded |
| `500` | Internal server error (never expose stack traces) |

---

## 6. Standard Error Codes

Use these machine-readable codes in the `error.code` field:

### General
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Auth failed |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Operations
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_OPERATION` | 400 | The requested operation doesn't exist or isn't supported |
| `OPERATION_FAILED` | 500 | Operation was valid but failed to execute |
| `PRECONDITION_FAILED` | 422 | Required conditions not met (e.g., user must be inactive before deletion) |

Products MAY add custom error codes prefixed with their product name:
```
STORY_CREATOR_GENERATION_IN_PROGRESS
PODCASTO_EPISODE_LOCKED
```

---

## 7. Pagination

All list endpoints MUST support pagination.

### 7.1 Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-based) |
| `pageSize` | integer | `20` | Items per page (max: 100) |
| `search` | string | - | Free-text search across relevant fields |
| `sort` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort direction: `asc` or `desc` |

### 7.2 Response Meta

```json
{
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

- `total`: Total number of items matching the query (before pagination)
- `page`: Current page number
- `pageSize`: Items per page (actual, may be capped)
- `hasMore`: Boolean indicating if more pages exist

### 7.3 Filtering

List endpoints SHOULD support filtering via query parameters. Filter parameter names should match the field names:

```
GET /api/admin/v1/users?status=active&role=premium
GET /api/admin/v1/content?type=published&from=2026-01-01&to=2026-02-01
```

### 7.4 Export / Large Datasets

For exporting full datasets (beyond paginated browsing), use the operations endpoint:

```json
POST /api/admin/v1/operations
{
  "action": "export_users",
  "params": {
    "format": "csv",
    "filters": { "status": "active" }
  }
}
```

Response returns the data inline or a download URL:
```json
{
  "success": true,
  "data": {
    "action": "export_users",
    "result": {
      "url": "https://storage.example.com/exports/users-2026-02-09.csv",
      "expiresAt": "2026-02-10T12:00:00.000Z",
      "recordCount": 1250
    }
  }
}
```

---

## 8. Standard Endpoint Categories

### 8.1 Health & Meta (Required)

Every product MUST implement these.

#### `GET /health`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.2.0",
    "uptime": 86400,
    "timestamp": "2026-02-09T12:00:00.000Z"
  }
}
```

Status values: `"healthy"`, `"degraded"` (partially working), `"unhealthy"` (critical issues).

Note: Health endpoint MAY be unauthenticated (useful for monitoring tools, uptime checks).

#### `GET /meta`

```json
{
  "success": true,
  "data": {
    "product": "story-creator",
    "displayName": "Story Creator",
    "version": "1.2.0",
    "apiStandardVersion": "1.1",
    "baseUrl": "/api/admin/v1",
    "capabilities": ["users", "content", "analytics", "credits"],
    "contentTypes": ["story"],
    "description": "AI-powered children's story generator",
    "supportedActions": {
      "users": ["add_credits", "export_data"],
      "content": ["publish", "unpublish", "feature", "regenerate"],
      "operations": ["cleanup_orphaned_images", "reindex_search"]
    }
  }
}
```

The `capabilities` array tells consumers which endpoint categories this product supports.
The `supportedActions` object tells consumers which actions are available per category.

---

### 8.2 Dashboard Stats (Recommended)

#### `GET /stats`

Returns key metrics. Products include the sections that are relevant to them.

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 340,
      "newLast30d": 89
    },
    "content": {
      "total": 5600,
      "publishedTotal": 4200,
      "createdLast30d": 430
    },
    "custom": {
      // Product-specific metrics - any shape
    },
    "generatedAt": "2026-02-09T12:00:00.000Z"
  }
}
```

Rules:
- Include `users` section only if the product has user accounts
- Include `content` section only if the product manages content
- `custom` is always available for product-specific metrics (credits consumed, images generated, API calls, etc.)
- `generatedAt` is always required
- Products with no users or content can return just `custom` + `generatedAt`

#### `GET /stats/trends?period=7d`

Returns time-series data for charting.

```json
{
  "success": true,
  "data": {
    "period": "7d",
    "points": [
      { "date": "2026-02-03", "newUsers": 12, "contentCreated": 45, "activeUsers": 120 },
      { "date": "2026-02-04", "newUsers": 8,  "contentCreated": 38, "activeUsers": 115 }
    ]
  }
}
```

Supported `period` values: `24h`, `7d`, `30d`, `90d`.
Point fields vary per product - include whatever metrics are meaningful.

---

### 8.3 User Management

#### `GET /users`

Query params: Standard pagination + `status`, `role`, `search`.

```json
{
  "success": true,
  "data": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "image": "https://...",
      "role": "user",
      "status": "active",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "lastActiveAt": "2026-02-08T18:30:00.000Z",
      "stats": {
        // Product-specific user stats (content count, usage, etc.)
      }
    }
  ],
  "meta": { "total": 150, "page": 1, "pageSize": 20, "hasMore": true }
}
```

Standard user fields: `id`, `email`, `name`, `image`, `role`, `status`, `createdAt`, `lastActiveAt`.
Product-specific data goes in `stats` (read-only summary) or `metadata` (editable).

#### `GET /users/:id`

Returns full user detail including activity and product-specific data.

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "role": "user",
    "status": "active",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastActiveAt": "2026-02-08T18:30:00.000Z",
    "stats": { },
    "metadata": { },
    "recentActivity": [
      {
        "action": "created_story",
        "description": "Created story 'The Lost Dragon'",
        "timestamp": "2026-02-08T18:30:00.000Z"
      }
    ]
  }
}
```

#### `PATCH /users/:id`

Update user fields. Only specified fields are updated.

**Request body:**
```json
{
  "role": "premium",
  "status": "suspended",
  "metadata": { "note": "Suspended for abuse" }
}
```

**Updatable fields:** `role`, `status`, `name`, `metadata`.
**Non-updatable fields:** `id`, `email`, `createdAt` (return `400` if attempted).

#### `DELETE /users/:id`

Deactivate or delete a user (product decides which behavior).

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "user-123"
  }
}
```

#### `POST /users/:id/actions`

Execute an operation on a user.

**Request body:**
```json
{
  "action": "add_credits",
  "params": {
    "amount": 100,
    "reason": "Compensation for bug"
  }
}
```

Common actions: `add_credits`, `reset_password`, `send_notification`, `export_data`.
Products define their own supported actions. Unsupported actions return `INVALID_OPERATION`.

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "add_credits",
    "result": "100 credits added. New balance: 250"
  }
}
```

---

### 8.4 Content Management

"Content" is whatever the product creates. Use the product's actual terminology in endpoints if preferred (`/stories`, `/episodes`, `/designs`).

#### `GET /content`

Query params: Standard pagination + `type`, `status`, `authorId`.

```json
{
  "success": true,
  "data": [
    {
      "id": "content-456",
      "title": "The Lost Dragon",
      "type": "story",
      "status": "published",
      "author": {
        "id": "user-123",
        "name": "John Doe"
      },
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-05T14:00:00.000Z",
      "stats": {
        // Views, likes, shares, etc.
      }
    }
  ],
  "meta": { "total": 50, "page": 1, "pageSize": 20, "hasMore": true }
}
```

Standard content fields: `id`, `title`, `type`, `status`, `author`, `createdAt`, `updatedAt`.
Product-specific data goes in `stats` or `metadata`.

#### `GET /content/:id`

Full content detail. MAY include the actual content body if appropriate.

#### `PATCH /content/:id`

Update content metadata. Typically: `status`, `metadata`, `title`.

#### `DELETE /content/:id`

Remove content.

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "content-456"
  }
}
```

#### `POST /content/:id/actions`

Execute operations on content.

```json
{
  "action": "publish",
  "params": {}
}
```

Common actions: `publish`, `unpublish`, `feature`, `unflag`, `regenerate`.

---

### 8.5 Analytics

#### `GET /analytics/usage`

Query params: `period` (`24h`, `7d`, `30d`), `from`, `to`.

```json
{
  "success": true,
  "data": {
    "period": "7d",
    "apiCalls": 12500,
    "uniqueUsers": 340,
    "topFeatures": [
      { "feature": "story_generation", "count": 890 },
      { "feature": "image_generation", "count": 650 }
    ],
    "breakdown": [
      { "date": "2026-02-03", "apiCalls": 1800, "uniqueUsers": 120 }
    ]
  }
}
```

#### `GET /analytics/activity`

Recent activity feed (audit log). Paginated.

```json
{
  "success": true,
  "data": [
    {
      "id": "evt-789",
      "type": "user_signup",
      "actor": { "id": "user-123", "name": "John Doe" },
      "description": "New user signed up via Google",
      "timestamp": "2026-02-08T18:30:00.000Z",
      "metadata": {}
    }
  ],
  "meta": { "total": 500, "page": 1, "pageSize": 50, "hasMore": true }
}
```

---

### 8.6 Configuration

#### `GET /config`

Returns the product's admin-configurable settings.

```json
{
  "success": true,
  "data": {
    "settings": {
      // Product-specific settings - free form
    },
    "updatedAt": "2026-02-01T10:00:00.000Z",
    "updatedBy": "admin"
  }
}
```

#### `PATCH /config`

Update settings. Only specified fields are updated.

---

### 8.7 Product-Specific Operations

#### `POST /operations`

Execute a product-specific batch or system operation.

```json
{
  "action": "cleanup_orphaned_images",
  "params": {
    "dryRun": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "cleanup_orphaned_images",
    "dryRun": true,
    "result": {
      "found": 45,
      "wouldDelete": 45,
      "deleted": 0
    }
  }
}
```

### 8.8 Webhooks (Optional)

Products MAY support webhooks to push events to Freckle or other consumers instead of requiring polling.

#### `GET /webhooks`

List registered webhooks.

#### `POST /webhooks`

Register a new webhook.

```json
{
  "url": "https://freckle.app/api/webhooks/story-creator",
  "events": ["user.created", "user.deleted", "content.published"],
  "secret": "webhook-signing-secret"
}
```

#### `DELETE /webhooks/:id`

Remove a webhook registration.

#### Webhook Event Format

When a product sends a webhook, the payload MUST follow this format:

```json
{
  "event": "user.created",
  "product": "story-creator",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "data": {
    // Event-specific data
  }
}
```

Standard event naming: `{entity}.{action}` (e.g., `user.created`, `content.published`, `credits.depleted`).

---

## 9. Type Definitions

These types define the standard contract. They are written in TypeScript for clarity, but products in other languages (Python, Go, etc.) should implement equivalent structures.

### 9.1 For TypeScript / JavaScript Products

```typescript
// ============================================
// Response Types
// ============================================

interface AdminApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface AdminApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type AdminApiResponse<T> = AdminApiSuccess<T> | AdminApiError;

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Request Types
// ============================================

interface PaginationParams {
  page?: number;       // default: 1
  pageSize?: number;   // default: 20, max: 100
  search?: string;
  sort?: string;       // default: "createdAt"
  order?: "asc" | "desc"; // default: "desc"
}

interface ActionRequest {
  action: string;
  params?: Record<string, unknown>;
}

// ============================================
// Entity Types
// ============================================

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  lastActiveAt: string | null;
  stats: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface AdminUserDetail extends AdminUser {
  recentActivity: ActivityEvent[];
}

interface AdminContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  author: {
    id: string;
    name: string | null;
  };
  createdAt: string;
  updatedAt: string;
  stats: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface ActivityEvent {
  id: string;
  type: string;
  actor: { id: string; name: string | null } | null;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ============================================
// Meta & Health
// ============================================

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  timestamp: string;
}

interface MetaResponse {
  product: string;
  displayName: string;
  version: string;
  apiStandardVersion: string;
  baseUrl: string;
  capabilities: Capability[];
  contentTypes: string[];
  description: string;
  supportedActions: Record<string, string[]>;
}

type Capability =
  | "users"
  | "content"
  | "analytics"
  | "config"
  | "credits"
  | "operations"
  | "webhooks";

// ============================================
// Stats
// ============================================

interface StatsResponse {
  users?: {
    total: number;
    active: number;
    newLast30d: number;
  };
  content?: {
    total: number;
    publishedTotal: number;
    createdLast30d: number;
  };
  custom: Record<string, unknown>;
  generatedAt: string;
}

interface TrendsResponse {
  period: string;
  points: Array<{
    date: string;
    [metric: string]: string | number;
  }>;
}

// ============================================
// Operations
// ============================================

interface ActionResponse {
  action: string;
  result: unknown;
}

interface DeleteResponse {
  deleted: true;
  id: string;
}

// ============================================
// Webhooks
// ============================================

interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  active: boolean;
}

interface WebhookEvent {
  event: string;
  product: string;
  timestamp: string;
  data: Record<string, unknown>;
}
```

### 9.2 For Python Products

```python
from typing import TypedDict, Literal, Any
from dataclasses import dataclass

# Response types

class PaginationMeta(TypedDict):
    total: int
    page: int
    pageSize: int
    hasMore: bool

class ApiError(TypedDict):
    code: str
    message: str

class AdminApiSuccess(TypedDict):
    success: Literal[True]
    data: Any
    meta: PaginationMeta | None

class AdminApiErrorResponse(TypedDict):
    success: Literal[False]
    error: ApiError

# Entity types

class AdminUser(TypedDict):
    id: str
    email: str
    name: str | None
    image: str | None
    role: str
    status: Literal["active", "inactive", "suspended"]
    createdAt: str
    lastActiveAt: str | None
    stats: dict[str, Any]
    metadata: dict[str, Any]

class AdminContentItem(TypedDict):
    id: str
    title: str
    type: str
    status: str
    author: dict  # { "id": str, "name": str | None }
    createdAt: str
    updatedAt: str
    stats: dict[str, Any]
    metadata: dict[str, Any]

class ActionRequest(TypedDict):
    action: str
    params: dict[str, Any] | None

# Helper functions

def api_success(data, meta=None):
    response = {"success": True, "data": data}
    if meta:
        response["meta"] = meta
    return response

def api_error(code: str, message: str, status: int = 400):
    return {"success": False, "error": {"code": code, "message": message}}, status
```

---

## 10. Implementation Checklist

When implementing the admin API for a product, verify:

### Infrastructure
- [ ] Base path is consistent (`/api/admin/v1/*` or equivalent)
- [ ] Auth middleware protects all endpoints (except `/health` if desired)
- [ ] `ADMIN_API_KEY` environment variable is documented
- [ ] CORS headers are set for Freckle console origin
- [ ] `Content-Type: application/json` is set on all responses

### Response Format
- [ ] All responses follow the `{ success, data/error, meta? }` format
- [ ] All dates are ISO 8601 strings with timezone
- [ ] All IDs are strings
- [ ] `null` used for missing optional fields (not omitted)
- [ ] DELETE returns `200` with `{ deleted: true, id }` (not `204`)

### Endpoints
- [ ] `/health` and `/meta` endpoints exist
- [ ] `/meta` correctly lists the product's `capabilities`
- [ ] `/meta` includes `supportedActions` for each capability
- [ ] List endpoints support pagination (`page`, `pageSize`, `search`, `sort`, `order`)

### Errors
- [ ] Error responses use standard error codes from Section 6
- [ ] HTTP status codes follow Section 5
- [ ] No stack traces or internal details in error responses
- [ ] Unsupported actions return `INVALID_OPERATION`

### Security
- [ ] All inputs are validated
- [ ] No passwords, tokens, or secrets in responses
- [ ] Admin operations are logged (who, what, when)

### Integrity
- [ ] No existing functionality was modified or broken
- [ ] All existing tests still pass

---

## Changelog

### v1.1 (2026-02-09)
- Added CORS requirements (Section 2.3)
- Added Content-Type header requirements (Section 2.2)
- Fixed DELETE response: returns `200` with body instead of `204` (consistency)
- Added export/large dataset guidance (Section 7.4)
- Added webhooks section (Section 8.8)
- Added `supportedActions` to `/meta` response
- Added `baseUrl` to `/meta` response
- Made `users` and `content` optional in stats (not all products have both)
- Added Python type definitions (Section 9.2)
- Added error code to HTTP status mapping (Section 6)
- Added `webhooks` capability type
- Expanded implementation checklist (Section 10)

### v1.0 (2026-02-09)
- Initial release
- Defined core response format, auth, pagination, error codes
- Defined 7 endpoint categories: health, stats, users, content, analytics, config, operations
- TypeScript type definitions
