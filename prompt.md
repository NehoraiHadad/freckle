# Prompt: Build Freckle Admin API for This Product

## Read This First

This product is part of the **Freckle (נמ״ש)** multi-product ecosystem. Each product exposes a **standardized Admin API** that Freckle and other systems (automation, bots) consume.

Every endpoint you build MUST comply with the **Freckle Admin API Standard** - the formal specification for response format, error codes, pagination, authentication, and types.

### How to Access the Standard

The standard document is provided in one of these ways:
1. **Attached to this prompt** (scroll down - if the standard is appended below the `---STANDARD---` marker, use it)
2. **As a separate file** - the user may provide `standard.md` alongside this prompt
3. **At a known path** - if you have filesystem access, look for `freckle/docs/standard.md` in the project root or parent directories

**If you cannot find the standard, STOP and ask the user to provide it.** Do not guess or invent your own response format.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│     Consumers (Freckle dashboard, n8n, bots) │
└──────────┬───────────────────────────────────┘
           │ REST API (standard contract)
           ▼
     ┌──────────────┐
     │ This Product  │
     │ /api/admin/*  │
     ├──────────────┤
     │ Internal DB   │
     └──────────────┘
```

The admin API is an **addition** to the product. It does NOT replace or modify any existing functionality. It simply exposes management endpoints alongside the existing application.

---

## Your Task

### Step 1: Analyze the Codebase

Before writing any code:

1. **Identify the tech stack** - Framework, language, database, ORM, auth, existing middleware
2. **Map all data models** - What entities exist? (users, content, transactions, configs)
3. **Find existing patterns** - How are routes structured? What wrappers/middleware exist? What auth pattern is used?
4. **Check for existing admin code** - Is there already admin functionality? Catalog it and build on top of it.
5. **List product-specific concepts** - What makes this product unique? (credits, episodes, designs, agents, etc.)
6. **Check the language** - Is this TypeScript/JavaScript, Python, Go, or something else? Use the appropriate type definitions from the standard.

Produce a written summary of your findings before proceeding to design.

### Step 2: Design the Endpoints

Based on your analysis, determine which endpoint categories from the standard apply:

| Category | Implement If... |
|----------|-----------------|
| Health & Meta | **Always** (required by standard) |
| Stats | Product has measurable metrics |
| Users | Product has user accounts |
| Content | Product creates/stores content |
| Analytics | Product tracks usage or activity |
| Config | Product has admin-configurable settings |
| Operations | Product has batch/system operations |
| Webhooks | Product needs to push real-time events |

List the **exact endpoints** you plan to build, with their routes and brief description. Also list the **product-specific actions** each entity supports (e.g., for users: `add_credits`, `export_data`).

**Present the design for review before implementing.**

### Step 3: Implement

Build the endpoints following:
- The **standard** for response format, auth, pagination, error codes, CORS, types
- The **existing codebase patterns** for file structure, naming, middleware, coding style

#### Implementation Order

1. Auth middleware / wrapper (or reuse existing if available)
2. CORS middleware (or reuse existing if available)
3. Response helper functions (`apiSuccess()`, `apiError()`)
4. Shared types (standard types adapted to the product)
5. `/health` and `/meta` endpoints
6. `/stats` endpoint
7. Entity endpoints (users, content) - these are the bulk of the work
8. Analytics and config endpoints
9. Product-specific operations
10. Webhooks (if applicable)

### Step 4: Test

Write tests for the admin API endpoints:

- **Auth tests** - Verify 401 on missing/invalid key, 200 on valid key
- **Response format tests** - Verify every endpoint returns `{ success, data/error }`
- **Pagination tests** - Verify `page`, `pageSize`, `search`, `sort`, `order` work correctly
- **Error tests** - Verify 404 on missing resources, 400 on bad input, standard error codes
- **CORS tests** - Verify OPTIONS preflight returns correct headers

Use the product's existing test framework. If no test framework exists, at minimum provide a test script (curl or equivalent) that validates all endpoints.

### Step 5: Verify

- [ ] All endpoints return the standard response format
- [ ] Auth rejects requests without valid API key
- [ ] CORS headers are set correctly
- [ ] `Content-Type: application/json` on all responses
- [ ] Pagination works correctly on list endpoints
- [ ] Error responses use standard error codes
- [ ] DELETE returns 200 with `{ deleted: true, id }` (not 204)
- [ ] `/meta` correctly lists capabilities and supportedActions
- [ ] No lint, type, or compilation errors
- [ ] All existing tests still pass
- [ ] No existing functionality was modified
- [ ] `ADMIN_API_KEY` is documented in `.env.example` or equivalent
- [ ] `ADMIN_CORS_ORIGINS` is documented in `.env.example` or equivalent

### Step 6: Document

Produce an **endpoint summary** as a table:

```markdown
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/v1/health | Health check |
| GET | /api/admin/v1/meta | Product capabilities |
| ... | ... | ... |
```

Include at least one **curl example per endpoint** showing request and response.

---

## What NOT to Do

These rules are non-negotiable:

1. **Do NOT modify existing routes, pages, or components.** The admin API is additive only.
2. **Do NOT change the database schema.** Work with existing data structures. If you need computed fields, compute them in the API layer.
3. **Do NOT break existing tests.** Run the existing test suite before and after your changes.
4. **Do NOT invent your own response format.** Follow the standard exactly.
5. **Do NOT expose sensitive data.** Never return passwords, tokens, secrets, or internal configuration in API responses.
6. **Do NOT add dependencies without justification.** Prefer using what's already in the project.
7. **Do NOT hardcode the admin API key.** Always read from environment variable.

---

## Team Workflow

This task should be executed by a **team of agents** working together.

### Roles

| Role | Responsibility |
|------|---------------|
| **Architect** (lead) | Codebase analysis, API design, endpoint planning, standard compliance review, final code review |
| **Backend Dev 1** | Infrastructure: auth middleware, CORS, response helpers, shared types, health/meta/stats endpoints |
| **Backend Dev 2** | Entity endpoints: users CRUD, content CRUD, analytics, config, operations |
| **Reviewer** | Security review, standard compliance check, edge case testing, test writing |

### Phases

**Phase 1 - Discovery (Architect)**
- Deep codebase analysis (tech stack, data models, existing patterns, existing admin code)
- Written design document with proposed endpoints, file structure, and implementation plan
- Identify risks, edge cases, and existing code to build on vs build new
- Identify the testing approach

**Phase 2 - Team Brainstorm (All)**
Before any code is written, the team discusses:
- Which entities are worth exposing via API?
- What product-specific actions should exist for each entity?
- Are there security considerations unique to this product?
- What existing middleware/wrappers/patterns can be reused?
- What are the edge cases? (empty states, deleted users, large datasets, concurrent operations)
- What should the `/meta` response look like for this product?
- Does this product need webhooks?

Each team member contributes their perspective. The architect synthesizes into a final plan.

**Phase 3 - Parallel Implementation**
- Backend Dev 1: Infrastructure + core endpoints (auth, CORS, helpers, types, health, meta, stats)
- Backend Dev 2: Entity endpoints (begins after infrastructure is ready)
- Both follow the architect's design document exactly
- Both communicate blockers immediately rather than working around them

**Phase 4 - Review (Reviewer + Architect)**
For each endpoint, verify:
- Standard compliance (response format, error codes, status codes, CORS)
- Input validation on all parameters
- Auth enforced
- No data leakage (passwords, tokens, internal IDs not exposed)
- Graceful error handling (no unhandled exceptions, no stack traces)
- Follows existing codebase conventions (not introducing new patterns)
- Tests exist and pass

**Phase 5 - Integration Verification**
- Test every endpoint manually (curl or HTTP client)
- Verify the `/meta` endpoint correctly lists all capabilities and supported actions
- Verify CORS works from a different origin
- Verify pagination edge cases (page 0, page beyond total, pageSize > 100)
- Confirm all existing tests still pass
- Run linter and type checker
- Produce endpoint summary document with curl examples

### Communication Rules

- All agents communicate clearly about what they're working on before starting
- Architectural decisions are escalated to the architect, not made independently
- If existing code conflicts with the plan, raise it immediately rather than working around it
- Each agent briefly explains their implementation decisions when submitting for review
- The architect has final say on design decisions
- When in doubt, check the standard

---

## Code Quality Rules

- **Follow existing patterns** - Match the codebase's style, conventions, file structure, naming. Do NOT introduce new patterns if equivalent ones exist.
- **Full type safety** - Typed request/response shapes, no `any` (TypeScript) or untyped `dict` (Python)
- **Validate all inputs** - Use the project's existing validation library (Zod, Pydantic, etc.)
- **Handle errors gracefully** - Consistent error responses, never expose stack traces
- **Log admin operations** - Who did what, when (use the project's existing logger)
- **Security first** - No data leakage, sanitize outputs, validate ownership
- **Don't over-build** - Only implement endpoints for data that actually exists in the product
- **Keep it clean** - Small, focused functions. One responsibility per file. Clear naming.

---

## Definition of Done

The task is **complete** when ALL of the following are true:

- [ ] All planned endpoints are implemented and working
- [ ] Auth middleware protects all admin endpoints (except `/health` if opted out)
- [ ] CORS is configured and working
- [ ] All inputs are validated
- [ ] Response format is consistent and standard-compliant across all endpoints
- [ ] DELETE returns 200 with body (not 204)
- [ ] `/meta` accurately reflects capabilities and supported actions
- [ ] No lint, type, or compilation errors
- [ ] All existing tests still pass
- [ ] New tests cover auth, response format, pagination, and error cases
- [ ] No existing functionality was modified or broken
- [ ] Endpoint summary table is produced (method, path, description)
- [ ] At least one curl example per endpoint is documented
- [ ] `ADMIN_API_KEY` and `ADMIN_CORS_ORIGINS` documented in `.env.example` or equivalent
- [ ] Code reviewed by at least one other team member

---

## ---STANDARD---

> **If the Freckle Admin API Standard is not appended below this line, ask the user to provide `standard.md`.**
