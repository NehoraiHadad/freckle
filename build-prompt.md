# Build Freckle Admin API - Team Execution Prompt

> **Usage**: Copy this entire prompt and send it to Claude Code in a new session, opened at the ROOT of the target product (e.g., `/home/ubuntu/projects/story-creator`).
> Before sending, replace `{{PRODUCT_NAME}}` with the product name (e.g., `story-creator`).

---

## Task

Build a **Freckle-compatible Admin API** for this product (`{{PRODUCT_NAME}}`).

The Freckle Admin API Standard is a contract that all products must follow so that a centralized management console (Freckle | נמ״ש) can connect to them. The full standard, planning documents, and implementation guide are at:

```
/home/ubuntu/projects/freckle/
├── docs/
│   ├── standard.md              ← READ THIS FIRST - the API contract
│   ├── checklist.md             ← Use to verify compliance when done
│   └── examples/
│       └── curl-examples.sh     ← Endpoint test examples
├── prompt.md                    ← Detailed task description and guidelines
└── docs/planning/
    ├── implementation-guide.md  ← Copy-paste starter code per framework
    ├── api-client.md            ← How consumers will call your API
    └── architecture.md          ← System architecture context
```

## Instructions

### Step 1: Read the Documentation

Before doing ANYTHING, read these files in order:

1. `/home/ubuntu/projects/freckle/docs/standard.md` - The full API standard (response format, auth, pagination, error codes, types, endpoint categories)
2. `/home/ubuntu/projects/freckle/prompt.md` - Detailed task steps, code quality rules, what NOT to do
3. `/home/ubuntu/projects/freckle/docs/planning/implementation-guide.md` - Framework-specific starter code (find the section matching this product's framework)

### Step 2: Build a Team

Create a team and spawn agents to work in parallel. Follow this structure:

**Team: `{{PRODUCT_NAME}}-admin-api`**

| Agent | Role | Task |
|-------|------|------|
| `architect` | Lead / Architect | Analyze codebase, design endpoints, produce design doc, review all code |
| `infra-dev` | Backend Dev 1 | Auth middleware, CORS, response helpers, shared types, `/health`, `/meta`, `/stats` |
| `entity-dev` | Backend Dev 2 | Users CRUD, content CRUD, analytics, config, operations, product-specific actions |
| `reviewer` | QA / Reviewer | Review all code for standard compliance, security, test coverage |

### Step 3: Execute in Phases

**Phase 1 - Discovery (architect only)**
- Deep codebase analysis: tech stack, data models, existing routes, existing admin code, auth patterns, middleware (or proxy)
- Check for existing admin routes (this product may already have some)
- Produce a design document listing every endpoint to build, file structure, and what existing code to reuse
- Share design with the team for brainstorm

**Phase 2 - Team Brainstorm (all agents)**
- architect shares the design document
- All agents discuss: What entities to expose? What actions per entity? Security concerns? Edge cases? What existing code to reuse vs build new?
- architect finalizes the plan based on feedback

**Phase 3 - Parallel Implementation**
- infra-dev builds: auth middleware/wrapper, CORS setup, response helpers (`apiSuccess`, `apiError`), shared types, `/health`, `/meta`, `/stats` endpoints
- entity-dev builds (after infra is ready): users list/detail/update/delete/actions, content list/detail/update/delete/actions, analytics endpoints, config, operations
- Both follow the architect's design document and the Freckle standard exactly

**Phase 4 - Review (reviewer + architect)**
For EVERY endpoint, verify:
- [ ] Returns `{ success: true/false, data/error }` format
- [ ] Auth enforced (401 on missing/invalid key)
- [ ] CORS headers present
- [ ] `Content-Type: application/json` on response
- [ ] Inputs validated (Zod or equivalent)
- [ ] Error codes match standard (Section 6)
- [ ] HTTP status codes match standard (Section 5)
- [ ] DELETE returns 200 with `{ deleted: true, id }` not 204
- [ ] No passwords, tokens, or secrets in responses
- [ ] No stack traces in error responses
- [ ] Follows existing codebase patterns (naming, file structure, coding style)
- [ ] Admin operations logged

**Phase 5 - Verification**
- Test every endpoint with curl
- Verify `/meta` correctly lists all capabilities and supportedActions
- Run existing test suite - must still pass
- Run linter and type checker - must pass
- Produce endpoint summary table
- Run through `/home/ubuntu/projects/freckle/docs/checklist.md`

### Step 4: Deliver

When complete, produce:
1. All endpoint files implemented and working
2. Endpoint summary table (method, path, description)
3. Curl examples for each endpoint
4. `ADMIN_API_KEY` and `ADMIN_CORS_ORIGINS` added to `.env.example` or equivalent
5. Checklist from `freckle/docs/checklist.md` filled out

## Critical Rules

1. **Read the standard BEFORE writing any code.** Every response format decision is already made.
2. **Do NOT modify existing routes, pages, components, or database schema.** Admin API is additive only.
3. **Do NOT break existing tests.** Run them before and after.
4. **Do NOT invent your own patterns.** Follow existing codebase conventions for middleware, file structure, naming.
5. **Build on existing admin code if it exists.** Don't duplicate or replace what's already there.
6. **Use the implementation guide.** It has copy-paste starter code for your framework.
7. **Every agent reads the standard.** Not just the architect - every team member must understand the contract.

## Environment Variables to Add

```env
# Freckle Admin API
ADMIN_API_KEY=           # Generate with: openssl rand -base64 32
ADMIN_CORS_ORIGINS=      # Comma-separated allowed origins (e.g., http://localhost:3001)
```
