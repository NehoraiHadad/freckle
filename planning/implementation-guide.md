# Freckle Admin API Implementation Guide

> Step-by-step guide for adding a Freckle-compatible Admin API to **any** product.
> Goal: a developer can go from zero to a compliant Admin API in under an hour.

**Standard version**: 1.1
**Last updated**: 2026-02-09

---

## Table of Contents

1. [Pre-Implementation Checklist](#1-pre-implementation-checklist)
2. [Generate an API Key](#2-generate-an-api-key)
3. [Plan Your Endpoints](#3-plan-your-endpoints)
4. [Framework-Specific Starter Code](#4-framework-specific-starter-code)
   - [Next.js (App Router)](#nextjs-app-router)
   - [Express.js](#expressjs)
   - [FastAPI (Python)](#fastapi-python)
   - [Flask (Python)](#flask-python)
5. [Common Pitfalls](#5-common-pitfalls)
6. [Testing Your Implementation](#6-testing-your-implementation)
7. [Verification Checklist](#7-verification-checklist)

---

## 1. Pre-Implementation Checklist

Before writing any code, answer these questions:

- [ ] **What is your tech stack?** (Framework, language, database, ORM)
- [ ] **What entities does your product have?** (users, content, transactions, configs)
- [ ] **Which endpoint categories apply?** (See table below)
- [ ] **What product-specific actions exist?** (add_credits, regenerate, publish, etc.)
- [ ] **What existing patterns should you follow?** (auth middleware, response helpers, file structure)
- [ ] **Is there existing admin code to build on?** (Check for existing admin routes)

### Endpoint Category Decision Matrix

| Category | Implement If... | Skip If... |
|----------|-----------------|------------|
| **Health & Meta** | Always (required) | Never skip |
| **Stats** | Product has measurable metrics | N/A (everything is measurable) |
| **Users** | Product has user accounts | Users are managed externally |
| **Content** | Product creates/manages content | Product is a utility/tool with no stored content |
| **Analytics** | Product tracks usage or activity events | No usage tracking exists |
| **Config** | Product has admin-changeable settings | All config is environment-only |
| **Operations** | Product has batch tasks (cleanup, export, reindex) | No batch operations needed |
| **Webhooks** | Product needs to push real-time events | Polling from Freckle is sufficient |

---

## 2. Generate an API Key

Generate a cryptographically secure API key (minimum 32 characters):

```bash
# Using openssl (available on most systems)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Add it to your environment:

```bash
# .env or .env.local
ADMIN_API_KEY=your-generated-key-here
ADMIN_CORS_ORIGINS=http://localhost:3001
```

---

## 3. Plan Your Endpoints

Fill out this table for your product before writing code:

```markdown
| Method | Path | Description | Priority |
|--------|------|-------------|----------|
| GET    | /api/admin/v1/health | Health check | Required |
| GET    | /api/admin/v1/meta | Product capabilities | Required |
| GET    | /api/admin/v1/stats | Dashboard metrics | High |
| GET    | /api/admin/v1/stats/trends | Trends over time | Medium |
| GET    | /api/admin/v1/users | List users | High |
| GET    | /api/admin/v1/users/:id | User detail | High |
| PATCH  | /api/admin/v1/users/:id | Update user | Medium |
| DELETE | /api/admin/v1/users/:id | Delete/deactivate user | Medium |
| POST   | /api/admin/v1/users/:id/actions | User actions | Medium |
| GET    | /api/admin/v1/content | List content | High |
| GET    | /api/admin/v1/content/:id | Content detail | High |
| PATCH  | /api/admin/v1/content/:id | Update content | Medium |
| DELETE | /api/admin/v1/content/:id | Delete content | Medium |
| POST   | /api/admin/v1/content/:id/actions | Content actions | Medium |
| GET    | /api/admin/v1/analytics/usage | Usage analytics | Low |
| GET    | /api/admin/v1/analytics/activity | Activity feed | Low |
| GET    | /api/admin/v1/config | Get config | Low |
| PATCH  | /api/admin/v1/config | Update config | Low |
| POST   | /api/admin/v1/operations | Run operations | Low |
```

Remove rows that don't apply to your product. Add product-specific endpoints if needed.

---

## 4. Framework-Specific Starter Code

### Next.js (App Router)

#### File Structure

```
src/
├── app/
│   └── api/
│       └── admin/
│           └── v1/
│               ├── health/
│               │   └── route.ts
│               ├── meta/
│               │   └── route.ts
│               ├── stats/
│               │   ├── route.ts
│               │   └── trends/
│               │       └── route.ts
│               ├── users/
│               │   ├── route.ts          # GET (list)
│               │   └── [id]/
│               │       ├── route.ts      # GET (detail), PATCH, DELETE
│               │       └── actions/
│               │           └── route.ts  # POST
│               ├── content/
│               │   ├── route.ts
│               │   └── [id]/
│               │       ├── route.ts
│               │       └── actions/
│               │           └── route.ts
│               └── operations/
│                   └── route.ts
└── lib/
    └── api/
        ├── admin-auth.ts         # Auth middleware
        └── admin-response.ts     # Response helpers
```

#### Auth Middleware (`src/lib/api/admin-auth.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

type AdminRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps a route handler with API key authentication.
 * Usage: export const GET = withAdminAuth(async (request, context) => { ... });
 */
export function withAdminAuth(handler: AdminRouteHandler): AdminRouteHandler {
  return async (request, context) => {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    // Validate API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== ADMIN_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or missing authentication" },
        },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    try {
      const response = await handler(request, context);
      // Add CORS headers to all responses
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(getCorsHeaders())) {
        headers.set(key, value);
      }
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error("[Admin API Error]", error);
      return NextResponse.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "An internal error occurred" },
        },
        { status: 500, headers: getCorsHeaders() }
      );
    }
  };
}

function getCorsHeaders(): Record<string, string> {
  const origins = process.env.ADMIN_CORS_ORIGINS || "*";
  return {
    "Access-Control-Allow-Origin": origins,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
```

#### Response Helpers (`src/lib/api/admin-response.ts`)

```typescript
import { NextResponse } from "next/server";

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Return a success response */
export function apiSuccess<T>(data: T, meta?: PaginationMeta, status = 200) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

/** Return an error response */
export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/** Parse pagination params from URL search params */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const rawPageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const pageSize = Math.min(100, Math.max(1, rawPageSize));
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "createdAt";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";

  return { page, pageSize, search, sort, order };
}

/** Build pagination meta from total count and current params */
export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
```

#### Example: Health Endpoint (`src/app/api/admin/v1/health/route.ts`)

```typescript
import { NextResponse } from "next/server";

const startTime = Date.now();

// Health endpoint can be unauthenticated (useful for monitoring)
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: "healthy",
      version: process.env.npm_package_version || "0.1.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    },
  });
}
```

#### Example: Meta Endpoint (`src/app/api/admin/v1/meta/route.ts`)

```typescript
import { withAdminAuth } from "@/lib/api/admin-auth";
import { apiSuccess } from "@/lib/api/admin-response";

export const GET = withAdminAuth(async () => {
  return apiSuccess({
    product: "your-product-slug",
    displayName: "Your Product Name",
    version: process.env.npm_package_version || "0.1.0",
    apiStandardVersion: "1.1",
    baseUrl: "/api/admin/v1",
    capabilities: ["users", "content", "analytics", "operations"],
    contentTypes: ["story"], // replace with your content types
    description: "Brief product description",
    supportedActions: {
      users: ["add_credits", "export_data"],
      content: ["publish", "unpublish", "feature"],
      operations: ["cleanup_orphaned_files", "reindex_search"],
    },
  });
});
```

#### Example: Users List (`src/app/api/admin/v1/users/route.ts`)

```typescript
import { withAdminAuth } from "@/lib/api/admin-auth";
import { apiSuccess, parsePagination, buildMeta } from "@/lib/api/admin-response";

export const GET = withAdminAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, search, sort, order } = parsePagination(searchParams);
  const status = searchParams.get("status") || undefined;

  // Replace with your database query
  const { users, total } = await queryUsers({ page, pageSize, search, sort, order, status });

  const data = users.map((user) => ({
    id: String(user.id),
    email: user.email,
    name: user.name || null,
    image: user.image || null,
    role: user.role || "user",
    status: user.status || "active",
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt?.toISOString() || null,
    stats: {
      // Product-specific stats
    },
  }));

  return apiSuccess(data, buildMeta(total, page, pageSize));
});
```

---

### Express.js

#### File Structure

```
src/
├── routes/
│   └── admin/
│       ├── index.ts          # Router setup
│       ├── health.ts
│       ├── meta.ts
│       ├── stats.ts
│       ├── users.ts
│       └── content.ts
├── middleware/
│   ├── admin-auth.ts
│   └── admin-cors.ts
└── utils/
    └── admin-response.ts
```

#### Auth Middleware (`src/middleware/admin-auth.ts`)

```typescript
import { Request, Response, NextFunction } from "express";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or missing authentication" },
    });
  }

  next();
}
```

#### CORS Middleware (`src/middleware/admin-cors.ts`)

```typescript
import { Request, Response, NextFunction } from "express";

const CORS_ORIGINS = process.env.ADMIN_CORS_ORIGINS || "*";

export function adminCors(req: Request, res: Response, next: NextFunction) {
  res.set({
    "Access-Control-Allow-Origin": CORS_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
}
```

#### Response Helpers (`src/utils/admin-response.ts`)

```typescript
import { Response } from "express";

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function apiSuccess<T>(res: Response, data: T, meta?: PaginationMeta, status = 200) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function apiError(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10));
  const rawPageSize = parseInt(String(query.pageSize || "20"), 10);
  const pageSize = Math.min(100, Math.max(1, rawPageSize));
  const search = query.search ? String(query.search) : undefined;
  const sort = String(query.sort || "createdAt");
  const order = (String(query.order || "desc")) as "asc" | "desc";
  return { page, pageSize, search, sort, order };
}

export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return { total, page, pageSize, hasMore: page * pageSize < total };
}
```

#### Router Setup (`src/routes/admin/index.ts`)

```typescript
import { Router } from "express";
import { adminAuth } from "../../middleware/admin-auth";
import { adminCors } from "../../middleware/admin-cors";
import { healthRouter } from "./health";
import { metaRouter } from "./meta";
import { usersRouter } from "./users";
import { contentRouter } from "./content";

const router = Router();

// Apply CORS to all admin routes
router.use(adminCors);

// Health can be unauthenticated
router.use("/health", healthRouter);

// All other routes require auth
router.use(adminAuth);
router.use("/meta", metaRouter);
router.use("/users", usersRouter);
router.use("/content", contentRouter);

export { router as adminRouter };
```

#### Mount in App (`src/app.ts`)

```typescript
import { adminRouter } from "./routes/admin";

app.use("/api/admin/v1", adminRouter);
```

#### Example: Health Route (`src/routes/admin/health.ts`)

```typescript
import { Router } from "express";
import { apiSuccess } from "../../utils/admin-response";

const router = Router();
const startTime = Date.now();

router.get("/", (req, res) => {
  apiSuccess(res, {
    status: "healthy",
    version: process.env.npm_package_version || "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
```

#### Example: Users Route (`src/routes/admin/users.ts`)

```typescript
import { Router } from "express";
import { apiSuccess, apiError, parsePagination, buildMeta } from "../../utils/admin-response";

const router = Router();

// GET /api/admin/v1/users
router.get("/", async (req, res) => {
  try {
    const { page, pageSize, search, sort, order } = parsePagination(req.query);
    const status = req.query.status ? String(req.query.status) : undefined;

    // Replace with your database query
    const { users, total } = await queryUsers({ page, pageSize, search, sort, order, status });

    const data = users.map((user) => ({
      id: String(user.id),
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      role: user.role || "user",
      status: user.status || "active",
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() || null,
      stats: {},
    }));

    apiSuccess(res, data, buildMeta(total, page, pageSize));
  } catch (error) {
    console.error("[Admin API] Users list error:", error);
    apiError(res, "INTERNAL_ERROR", "An internal error occurred", 500);
  }
});

// GET /api/admin/v1/users/:id
router.get("/:id", async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return apiError(res, "NOT_FOUND", "User not found", 404);
    }
    apiSuccess(res, {
      id: String(user.id),
      email: user.email,
      name: user.name || null,
      image: user.image || null,
      role: user.role || "user",
      status: user.status || "active",
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() || null,
      stats: {},
      metadata: {},
      recentActivity: [],
    });
  } catch (error) {
    console.error("[Admin API] User detail error:", error);
    apiError(res, "INTERNAL_ERROR", "An internal error occurred", 500);
  }
});

// PATCH /api/admin/v1/users/:id
router.patch("/:id", async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return apiError(res, "NOT_FOUND", "User not found", 404);
    }

    const { role, status, name, metadata } = req.body;

    // Reject non-updatable fields
    if (req.body.id || req.body.email || req.body.createdAt) {
      return apiError(res, "VALIDATION_ERROR", "Cannot update id, email, or createdAt", 400);
    }

    const updated = await updateUser(req.params.id, { role, status, name, metadata });
    apiSuccess(res, updated);
  } catch (error) {
    console.error("[Admin API] User update error:", error);
    apiError(res, "INTERNAL_ERROR", "An internal error occurred", 500);
  }
});

// DELETE /api/admin/v1/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return apiError(res, "NOT_FOUND", "User not found", 404);
    }
    await deleteUser(req.params.id);
    apiSuccess(res, { deleted: true, id: req.params.id });
  } catch (error) {
    console.error("[Admin API] User delete error:", error);
    apiError(res, "INTERNAL_ERROR", "An internal error occurred", 500);
  }
});

// POST /api/admin/v1/users/:id/actions
router.post("/:id/actions", async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return apiError(res, "NOT_FOUND", "User not found", 404);
    }

    const { action, params } = req.body;

    switch (action) {
      case "add_credits":
        // Implement your action
        const result = await addCredits(req.params.id, params.amount, params.reason);
        return apiSuccess(res, { action, result });

      default:
        return apiError(res, "INVALID_OPERATION", `Unsupported action: ${action}`, 400);
    }
  } catch (error) {
    console.error("[Admin API] User action error:", error);
    apiError(res, "INTERNAL_ERROR", "An internal error occurred", 500);
  }
});

export { router as usersRouter };
```

---

### FastAPI (Python)

#### File Structure

```
app/
├── main.py
├── routers/
│   └── admin/
│       ├── __init__.py
│       ├── health.py
│       ├── meta.py
│       ├── stats.py
│       ├── users.py
│       └── content.py
├── middleware/
│   └── admin_auth.py
└── schemas/
    └── admin.py
```

#### Auth Dependency (`app/middleware/admin_auth.py`)

```python
import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
security = HTTPBearer()


async def verify_admin_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    if credentials.credentials != ADMIN_API_KEY:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or missing authentication",
                },
            },
        )
    return credentials.credentials
```

#### Response Models (`app/schemas/admin.py`)

```python
from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    page: int
    pageSize: int
    hasMore: bool


class ApiError(BaseModel):
    code: str
    message: str


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: PaginationMeta | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ApiError


class HealthData(BaseModel):
    status: str
    version: str
    uptime: int
    timestamp: str


class DeleteData(BaseModel):
    deleted: bool = True
    id: str


class ActionData(BaseModel):
    action: str
    result: Any


class ActionRequest(BaseModel):
    action: str
    params: dict[str, Any] | None = None


# Helper functions
def api_success(data: Any, meta: PaginationMeta | None = None) -> dict:
    response: dict[str, Any] = {"success": True, "data": data}
    if meta:
        response["meta"] = meta.model_dump()
    return response


def api_error(code: str, message: str) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}


def parse_pagination(
    page: int = 1,
    pageSize: int = 20,
    search: str | None = None,
    sort: str = "createdAt",
    order: str = "desc",
) -> dict:
    return {
        "page": max(1, page),
        "pageSize": min(100, max(1, pageSize)),
        "search": search,
        "sort": sort,
        "order": order,
    }


def build_meta(total: int, page: int, pageSize: int) -> PaginationMeta:
    return PaginationMeta(
        total=total,
        page=page,
        pageSize=pageSize,
        hasMore=page * pageSize < total,
    )
```

#### Router Setup (`app/routers/admin/__init__.py`)

```python
from fastapi import APIRouter
from .health import router as health_router
from .meta import router as meta_router
from .users import router as users_router
from .content import router as content_router

admin_router = APIRouter(prefix="/api/admin/v1")

# Health can be unauthenticated
admin_router.include_router(health_router, tags=["admin-health"])

# All other routes require auth (applied at route level)
admin_router.include_router(meta_router, tags=["admin-meta"])
admin_router.include_router(users_router, tags=["admin-users"])
admin_router.include_router(content_router, tags=["admin-content"])
```

#### Mount in App (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routers.admin import admin_router

app = FastAPI()

# CORS for admin endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ADMIN_CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,
)

app.include_router(admin_router)
```

#### Example: Health Endpoint (`app/routers/admin/health.py`)

```python
import time
from fastapi import APIRouter
from app.schemas.admin import api_success

router = APIRouter()
START_TIME = time.time()


@router.get("/health")
async def health():
    return api_success({
        "status": "healthy",
        "version": "0.1.0",
        "uptime": int(time.time() - START_TIME),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    })
```

#### Example: Users Endpoint (`app/routers/admin/users.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.admin_auth import verify_admin_key
from app.schemas.admin import (
    api_success, api_error, parse_pagination, build_meta, ActionRequest,
)

router = APIRouter()


@router.get("/users", dependencies=[Depends(verify_admin_key)])
async def list_users(
    page: int = 1,
    pageSize: int = 20,
    search: str | None = None,
    sort: str = "createdAt",
    order: str = "desc",
    status: str | None = None,
):
    params = parse_pagination(page, pageSize, search, sort, order)

    # Replace with your database query
    users, total = await query_users(**params, status=status)

    data = [
        {
            "id": str(u.id),
            "email": u.email,
            "name": u.name,
            "image": u.image,
            "role": u.role or "user",
            "status": u.status or "active",
            "createdAt": u.created_at.isoformat() + "Z",
            "lastActiveAt": u.last_active_at.isoformat() + "Z" if u.last_active_at else None,
            "stats": {},
        }
        for u in users
    ]

    meta = build_meta(total, params["page"], params["pageSize"])
    return api_success(data, meta)


@router.get("/users/{user_id}", dependencies=[Depends(verify_admin_key)])
async def get_user(user_id: str):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=api_error("NOT_FOUND", "User not found"))

    return api_success({
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "image": user.image,
        "role": user.role or "user",
        "status": user.status or "active",
        "createdAt": user.created_at.isoformat() + "Z",
        "lastActiveAt": user.last_active_at.isoformat() + "Z" if user.last_active_at else None,
        "stats": {},
        "metadata": {},
        "recentActivity": [],
    })


@router.delete("/users/{user_id}", dependencies=[Depends(verify_admin_key)])
async def delete_user(user_id: str):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=api_error("NOT_FOUND", "User not found"))

    await remove_user(user_id)
    return api_success({"deleted": True, "id": user_id})


@router.post("/users/{user_id}/actions", dependencies=[Depends(verify_admin_key)])
async def user_action(user_id: str, body: ActionRequest):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=api_error("NOT_FOUND", "User not found"))

    if body.action == "add_credits":
        result = await add_credits(user_id, body.params.get("amount", 0), body.params.get("reason"))
        return api_success({"action": body.action, "result": result})

    raise HTTPException(
        status_code=400,
        detail=api_error("INVALID_OPERATION", f"Unsupported action: {body.action}"),
    )
```

---

### Flask (Python)

#### File Structure

```
app/
├── __init__.py
├── admin/
│   ├── __init__.py       # Blueprint setup
│   ├── auth.py           # Auth decorator
│   ├── responses.py      # Response helpers
│   ├── health.py
│   ├── meta.py
│   ├── users.py
│   └── content.py
```

#### Auth Decorator (`app/admin/auth.py`)

```python
import os
from functools import wraps
from flask import request, jsonify

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")


def require_admin_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer ") or auth_header[7:] != ADMIN_API_KEY:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or missing authentication",
                },
            }), 401

        return f(*args, **kwargs)
    return decorated
```

#### Response Helpers (`app/admin/responses.py`)

```python
from flask import jsonify


def api_success(data, meta=None, status=200):
    body = {"success": True, "data": data}
    if meta:
        body["meta"] = meta
    return jsonify(body), status


def api_error(code, message, status=400):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def parse_pagination(args):
    page = max(1, int(args.get("page", 1)))
    raw_page_size = int(args.get("pageSize", 20))
    page_size = min(100, max(1, raw_page_size))
    search = args.get("search")
    sort = args.get("sort", "createdAt")
    order = args.get("order", "desc")
    return {"page": page, "pageSize": page_size, "search": search, "sort": sort, "order": order}


def build_meta(total, page, page_size):
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "hasMore": page * page_size < total,
    }
```

#### Blueprint Setup (`app/admin/__init__.py`)

```python
from flask import Blueprint

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin/v1")

# Import routes to register them
from . import health, meta, users, content  # noqa: F401, E402
```

#### Register in App (`app/__init__.py`)

```python
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    # CORS for admin endpoints
    CORS(app, resources={
        r"/api/admin/*": {
            "origins": os.getenv("ADMIN_CORS_ORIGINS", "*").split(","),
            "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "max_age": 86400,
        }
    })

    from .admin import admin_bp
    app.register_blueprint(admin_bp)

    return app
```

#### Example: Health Route (`app/admin/health.py`)

```python
import time
from . import admin_bp
from .responses import api_success

START_TIME = time.time()


@admin_bp.route("/health", methods=["GET"])
def health():
    return api_success({
        "status": "healthy",
        "version": "0.1.0",
        "uptime": int(time.time() - START_TIME),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    })
```

#### Example: Users Routes (`app/admin/users.py`)

```python
from flask import request
from . import admin_bp
from .auth import require_admin_auth
from .responses import api_success, api_error, parse_pagination, build_meta


@admin_bp.route("/users", methods=["GET"])
@require_admin_auth
def list_users():
    try:
        params = parse_pagination(request.args)
        status_filter = request.args.get("status")

        # Replace with your database query
        users, total = query_users(**params, status=status_filter)

        data = [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "image": u.image,
                "role": u.role or "user",
                "status": u.status or "active",
                "createdAt": u.created_at.isoformat() + "Z",
                "lastActiveAt": u.last_active_at.isoformat() + "Z" if u.last_active_at else None,
                "stats": {},
            }
            for u in users
        ]

        meta = build_meta(total, params["page"], params["pageSize"])
        return api_success(data, meta)
    except Exception as e:
        print(f"[Admin API] Users list error: {e}")
        return api_error("INTERNAL_ERROR", "An internal error occurred", 500)


@admin_bp.route("/users/<user_id>", methods=["GET"])
@require_admin_auth
def get_user(user_id):
    user = find_user_by_id(user_id)
    if not user:
        return api_error("NOT_FOUND", "User not found", 404)

    return api_success({
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "image": user.image,
        "role": user.role or "user",
        "status": user.status or "active",
        "createdAt": user.created_at.isoformat() + "Z",
        "lastActiveAt": user.last_active_at.isoformat() + "Z" if user.last_active_at else None,
        "stats": {},
        "metadata": {},
        "recentActivity": [],
    })


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@require_admin_auth
def delete_user(user_id):
    user = find_user_by_id(user_id)
    if not user:
        return api_error("NOT_FOUND", "User not found", 404)

    remove_user(user_id)
    return api_success({"deleted": True, "id": user_id})


@admin_bp.route("/users/<user_id>/actions", methods=["POST"])
@require_admin_auth
def user_action(user_id):
    user = find_user_by_id(user_id)
    if not user:
        return api_error("NOT_FOUND", "User not found", 404)

    body = request.get_json()
    action = body.get("action")
    params = body.get("params", {})

    if action == "add_credits":
        result = add_credits(user_id, params.get("amount", 0), params.get("reason"))
        return api_success({"action": action, "result": result})

    return api_error("INVALID_OPERATION", f"Unsupported action: {action}", 400)
```

---

## 5. Common Pitfalls

These are the mistakes that come up repeatedly. Avoid them.

### Pitfall 1: Forgetting CORS Headers

**Wrong**: CORS only on GET endpoints, or missing OPTIONS handler.

**Right**: CORS on ALL responses (including errors), and handle OPTIONS preflight with 204.

### Pitfall 2: Returning 204 for DELETE

**Wrong**:
```typescript
res.status(204).end();
```

**Right**:
```typescript
res.status(200).json({ success: true, data: { deleted: true, id: "user-123" } });
```

The standard requires 200 with a body for DELETE, not 204 No Content.

### Pitfall 3: Not Validating Pagination Params

**Wrong**: Accepting `pageSize=999999` or `page=-5`.

**Right**:
```typescript
const page = Math.max(1, parseInt(raw));
const pageSize = Math.min(100, Math.max(1, parseInt(raw)));
```

Always cap pageSize at 100 and floor page at 1.

### Pitfall 4: Exposing Sensitive Fields

**Wrong**: Returning password hashes, auth tokens, internal API keys in user responses.

**Right**: Explicitly map fields to the response shape. Never spread the entire database record.

```typescript
// WRONG - exposes everything
return apiSuccess(user);

// RIGHT - explicit field mapping
return apiSuccess({
  id: String(user.id),
  email: user.email,
  name: user.name || null,
  // ... only the fields defined in the standard
});
```

### Pitfall 5: Not Logging Admin Operations

Every write operation (PATCH, DELETE, POST action) should be logged:

```typescript
logger.info("[Admin API] User updated", {
  userId: id,
  changes: { role: "premium" },
  timestamp: new Date().toISOString(),
});
```

### Pitfall 6: Hardcoding the API Key

**Wrong**:
```typescript
const API_KEY = "my-secret-key-12345";
```

**Right**:
```typescript
const API_KEY = process.env.ADMIN_API_KEY;
```

Always read from environment variables.

### Pitfall 7: Inconsistent Error Responses

**Wrong**: Some errors return `{ message: "..." }`, others return `{ error: "..." }`.

**Right**: ALWAYS use the standard error format:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable" } }
```

### Pitfall 8: Omitting Null Fields

**Wrong**: Omitting fields when they have no value.
```json
{ "id": "123", "email": "user@example.com" }
```

**Right**: Including all defined fields, using null for missing values.
```json
{ "id": "123", "email": "user@example.com", "name": null, "image": null }
```

### Pitfall 9: Numeric IDs Instead of Strings

**Wrong**: `"id": 123`

**Right**: `"id": "123"`

All IDs in responses must be strings, even if they're numeric internally.

### Pitfall 10: Stack Traces in Error Responses

**Wrong**:
```json
{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "TypeError: Cannot read properties of undefined\n    at Object..." } }
```

**Right**:
```json
{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "An internal error occurred" } }
```

Log the full error server-side, return a generic message to the client.

---

## 6. Testing Your Implementation

### What to Test

| Category | Tests |
|----------|-------|
| **Auth** | Missing header -> 401, wrong key -> 401, valid key -> 200 |
| **Response format** | Every endpoint returns `{ success, data/error }` |
| **Pagination** | Default values, custom page/pageSize, pageSize > 100 capped, page 0 -> page 1, page beyond total -> empty array |
| **Errors** | 404 for missing resources, 400 for bad input, standard error codes |
| **CORS** | OPTIONS returns 204 with correct headers, responses include CORS headers |
| **Delete** | Returns 200 with `{ deleted: true, id }`, not 204 |
| **Actions** | Valid action succeeds, invalid action returns INVALID_OPERATION |

### curl Test Script

Save this as `test-admin-api.sh` and run against your product:

```bash
#!/bin/bash
# Test script for Freckle Admin API compliance
# Usage: ./test-admin-api.sh <base_url> <api_key>

BASE_URL="${1:-http://localhost:3000/api/admin/v1}"
API_KEY="${2:-your-api-key-here}"
AUTH="Authorization: Bearer $API_KEY"
PASS=0
FAIL=0

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $name"
    ((PASS++))
  else
    echo "  FAIL: $name (expected '$expected' in response)"
    echo "    Got: $actual"
    ((FAIL++))
  fi
}

echo "=== Testing: $BASE_URL ==="
echo ""

# --- Health ---
echo "[Health]"
RESP=$(curl -s "$BASE_URL/health")
check "Returns success" '"success":true' "$RESP"
check "Has status field" '"status"' "$RESP"
check "Has version field" '"version"' "$RESP"
check "Has uptime field" '"uptime"' "$RESP"
check "Has timestamp field" '"timestamp"' "$RESP"
echo ""

# --- Auth ---
echo "[Auth]"
RESP=$(curl -s "$BASE_URL/meta")
check "No auth -> 401" '"UNAUTHORIZED"' "$RESP"
RESP=$(curl -s -H "Authorization: Bearer wrong-key" "$BASE_URL/meta")
check "Wrong key -> 401" '"UNAUTHORIZED"' "$RESP"
RESP=$(curl -s -H "$AUTH" "$BASE_URL/meta")
check "Valid key -> success" '"success":true' "$RESP"
echo ""

# --- Meta ---
echo "[Meta]"
RESP=$(curl -s -H "$AUTH" "$BASE_URL/meta")
check "Has product field" '"product"' "$RESP"
check "Has displayName field" '"displayName"' "$RESP"
check "Has capabilities array" '"capabilities"' "$RESP"
check "Has apiStandardVersion" '"apiStandardVersion"' "$RESP"
check "Has baseUrl" '"baseUrl"' "$RESP"
check "Has supportedActions" '"supportedActions"' "$RESP"
echo ""

# --- CORS ---
echo "[CORS]"
RESP=$(curl -s -D - -o /dev/null -X OPTIONS -H "Origin: http://localhost:3001" "$BASE_URL/meta")
check "OPTIONS returns CORS headers" 'access-control-allow' "$RESP"
echo ""

# --- Stats ---
echo "[Stats]"
RESP=$(curl -s -H "$AUTH" "$BASE_URL/stats")
if echo "$RESP" | grep -q '"success":true'; then
  check "Stats returns success" '"success":true' "$RESP"
  check "Has generatedAt" '"generatedAt"' "$RESP"
else
  echo "  SKIP: Stats endpoint not implemented"
fi
echo ""

# --- Users ---
echo "[Users]"
RESP=$(curl -s -H "$AUTH" "$BASE_URL/users?page=1&pageSize=5")
if echo "$RESP" | grep -q '"success":true'; then
  check "List users returns success" '"success":true' "$RESP"
  check "Has meta.total" '"total"' "$RESP"
  check "Has meta.page" '"page"' "$RESP"
  check "Has meta.pageSize" '"pageSize"' "$RESP"
  check "Has meta.hasMore" '"hasMore"' "$RESP"
else
  echo "  SKIP: Users endpoint not implemented"
fi
echo ""

# --- Pagination Edge Cases ---
echo "[Pagination]"
RESP=$(curl -s -H "$AUTH" "$BASE_URL/users?pageSize=200")
if echo "$RESP" | grep -q '"pageSize":100'; then
  check "pageSize capped at 100" '"pageSize":100' "$RESP"
elif echo "$RESP" | grep -q '"success":true'; then
  echo "  WARN: pageSize not capped at 100"
  ((FAIL++))
else
  echo "  SKIP: Users endpoint not implemented"
fi
echo ""

# --- Summary ---
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
```

### Framework-Specific Test Examples

#### Vitest (Next.js)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database layer
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => mockDb,
}));

describe("Admin API - Users", () => {
  const API_KEY = "test-admin-key";

  beforeEach(() => {
    process.env.ADMIN_API_KEY = API_KEY;
  });

  it("returns 401 without auth header", async () => {
    const response = await GET(new Request("http://localhost/api/admin/v1/users"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated users with valid auth", async () => {
    const request = new Request("http://localhost/api/admin/v1/users?page=1&pageSize=10", {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(10);
  });

  it("caps pageSize at 100", async () => {
    const request = new Request("http://localhost/api/admin/v1/users?pageSize=500", {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const response = await GET(request);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(100);
  });
});
```

#### pytest (FastAPI)

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
API_KEY = "test-admin-key"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}


def test_health_no_auth_required():
    response = client.get("/api/admin/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "status" in data["data"]


def test_users_requires_auth():
    response = client.get("/api/admin/v1/users")
    assert response.status_code == 401


def test_users_wrong_key():
    response = client.get(
        "/api/admin/v1/users",
        headers={"Authorization": "Bearer wrong-key"},
    )
    assert response.status_code == 401


def test_users_list_paginated():
    response = client.get(
        "/api/admin/v1/users?page=1&pageSize=10",
        headers=HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert data["meta"]["page"] == 1
    assert data["meta"]["pageSize"] == 10


def test_users_pagesize_capped():
    response = client.get(
        "/api/admin/v1/users?pageSize=500",
        headers=HEADERS,
    )
    data = response.json()
    assert data["meta"]["pageSize"] == 100


def test_user_not_found():
    response = client.get(
        "/api/admin/v1/users/nonexistent",
        headers=HEADERS,
    )
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_delete_returns_200_with_body():
    response = client.delete(
        "/api/admin/v1/users/existing-user",
        headers=HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["deleted"] is True


def test_invalid_action():
    response = client.post(
        "/api/admin/v1/users/existing-user/actions",
        headers=HEADERS,
        json={"action": "nonexistent_action"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_OPERATION"
```

---

## 7. Verification Checklist

After implementation, go through this checklist before declaring done.

### Infrastructure
- [ ] Base path is consistent across all endpoints
- [ ] Auth middleware protects all endpoints (except `/health` if opted out)
- [ ] `ADMIN_API_KEY` is read from environment variable
- [ ] `ADMIN_CORS_ORIGINS` is read from environment variable
- [ ] CORS headers on all responses (including errors)
- [ ] OPTIONS preflight returns 204 with CORS headers

### Response Format
- [ ] Every response has `"success": true/false`
- [ ] Success responses have `"data"` field
- [ ] Error responses have `"error": { "code", "message" }`
- [ ] List responses have `"meta": { "total", "page", "pageSize", "hasMore" }`
- [ ] All dates are ISO 8601 with timezone (e.g., `"2026-02-09T12:00:00.000Z"`)
- [ ] All IDs are strings
- [ ] Null used for missing optional fields (not omitted)
- [ ] DELETE returns 200 with body (not 204)

### Endpoints
- [ ] `/health` returns status, version, uptime, timestamp
- [ ] `/meta` returns product, displayName, version, apiStandardVersion, baseUrl
- [ ] `/meta` capabilities array matches implemented endpoints
- [ ] `/meta` supportedActions lists all available actions
- [ ] List endpoints support page, pageSize, search, sort, order
- [ ] pageSize capped at 100

### Errors
- [ ] Standard error codes used (UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR, etc.)
- [ ] HTTP status codes match the standard
- [ ] No stack traces in responses
- [ ] Unsupported actions return INVALID_OPERATION

### Security
- [ ] No passwords, tokens, or secrets in responses
- [ ] All IDs converted to strings
- [ ] Inputs validated
- [ ] Admin operations logged

### Documentation
- [ ] Endpoint summary table
- [ ] `ADMIN_API_KEY` documented in `.env.example`
- [ ] `ADMIN_CORS_ORIGINS` documented in `.env.example`

---

## Quick Reference Card

Keep this handy while implementing:

```
Response format:
  Success:  { "success": true, "data": ... }
  List:     { "success": true, "data": [...], "meta": { total, page, pageSize, hasMore } }
  Error:    { "success": false, "error": { "code": "...", "message": "..." } }
  Delete:   { "success": true, "data": { "deleted": true, "id": "..." } }

Status codes: 200 (ok), 201 (created), 400 (bad input), 401 (no auth),
              404 (not found), 409 (conflict), 422 (semantic error), 429 (rate limit), 500 (server)

Error codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR,
             CONFLICT, RATE_LIMITED, INTERNAL_ERROR, INVALID_OPERATION,
             OPERATION_FAILED, PRECONDITION_FAILED

Auth header: Authorization: Bearer <ADMIN_API_KEY>

Pagination: ?page=1&pageSize=20&search=query&sort=createdAt&order=desc
  - page: min 1 (default 1)
  - pageSize: min 1, max 100 (default 20)
  - order: "asc" or "desc" (default "desc")

Dates: ISO 8601 with timezone: "2026-02-09T12:00:00.000Z"
IDs: Always strings: "123" not 123
Nulls: Use null, never omit defined fields
```
