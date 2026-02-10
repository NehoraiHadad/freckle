# Build Freckle Console | בניית נמ״ש

> **Usage**: Send this entire prompt to Claude Code in a new session opened at `/home/ubuntu/projects/freckle`.

---

## Task

Build the **Freckle (נמ״ש)** console - a centralized product management dashboard that connects to all products via their standardized Admin APIs.

Everything has been planned. The architecture, UI, data model, components, tech stack, and roadmap are all documented. Your job is to **execute the plan**.

## Documentation (READ FIRST)

All planning documents are at `/home/ubuntu/projects/freckle/docs/planning/`. Read them in this order:

| # | File | What It Tells You |
|---|------|-------------------|
| 1 | `vision.md` | What Freckle is, scope, features, success criteria |
| 2 | `architecture.md` | System design, Mermaid diagrams, component architecture, security, deployment |
| 3 | `tech-stack.md` | Every technology choice with rationale (Next.js 16, Tailwind, shadcn, SQLite, Recharts, etc.) |
| 4 | `ui-plan.md` | Every page, navigation structure, layout system, user flows, ASCII wireframes, RTL support |
| 5 | `components.md` | 10+ core components with TypeScript interfaces, component tree, patterns |
| 6 | `data-model.md` | SQLite schema (product registry, stats cache, health checks, audit log, preferences) |
| 7 | `api-client.md` | Generic API client, caching strategy, error handling, health monitoring, code examples |
| 8 | `roadmap.md` | 5-phase development plan with deliverables and acceptance criteria |
| 9 | `implementation-guide.md` | Reference for the API contract products follow |

Also read:
- `/home/ubuntu/projects/freckle/docs/standard.md` - The Admin API Standard (the contract Freckle consumes)
- `/home/ubuntu/projects/freckle/README.md` - Project overview

## Server Context

This runs on **instance-neo** (Oracle Cloud, 4 CPU, 16 GB RAM). Other services already running:

| Service | Port | Manager |
|---------|------|---------|
| story-creator (Next.js) | 3000 | PM2 |
| storybook | 6006 | PM2 |
| n8n (Docker) | 5678 | Docker Compose |

Freckle should run on a **new port** (see architecture.md for recommendation). Managed by PM2. Memory budget: ~1 GB max.

PM2 config is at `/home/ubuntu/projects/ecosystem.config.js` - add Freckle to it.

**CRITICAL**: Never run `pnpm dev` manually. Always use PM2.

## Team Structure

Create a team named `freckle-build` with the following agents:

| Agent | Role | Responsibilities |
|-------|------|-----------------|
| `architect` | Tech Lead | Reads all docs first, creates project skeleton, defines file structure, makes architectural decisions, reviews all code, resolves conflicts between agents |
| `core-dev` | Core & Infrastructure | Project setup (Next.js, Tailwind, shadcn), layout shell (sidebar, header, product switcher), SQLite setup, API client, auth (admin login), product registry CRUD |
| `features-dev` | Features & Pages | Dashboard pages (global + per-product), user management pages, content management pages, analytics pages, operations page, config page |
| `ui-dev` | Components & Polish | Core reusable components (DataTable, StatsGrid, TrendsChart, ActionPanel, ActivityFeed, HealthBadge, SearchBar), responsive design, RTL support, dark mode, loading/error/empty states |

## Execution Plan

Follow the roadmap from `roadmap.md`. Build in phases:

### Phase 0 - Foundation (architect + core-dev)

**architect**:
1. Read ALL planning docs thoroughly
2. Initialize the Next.js project (`pnpm create next-app` or manual setup following `tech-stack.md`)
3. Set up: Tailwind, shadcn/ui, TypeScript config, ESLint, project structure
4. Define the file/folder structure (following `architecture.md` and `components.md`)
5. Share the skeleton with the team

**core-dev** (after skeleton is ready):
1. Set up SQLite with better-sqlite3 (schema from `data-model.md`)
2. Build the admin auth system (simple password + encrypted cookie, as specified in `tech-stack.md`)
3. Build the API client (`AdminApiClient` class from `api-client.md`)
4. Build the product registry (add/edit/remove products, store encrypted API keys)
5. Set up CORS and request handling

**Acceptance criteria:**
- [ ] Next.js app runs on assigned port
- [ ] Admin can log in with password
- [ ] Products can be registered (URL + API key)
- [ ] API client can call a registered product's `/health` and `/meta`
- [ ] SQLite database created with all tables
- [ ] PM2 config updated

### Phase 1 - Layout & First Connection (core-dev + ui-dev)

**core-dev**:
1. Build the app shell layout (sidebar + header + content area) following `ui-plan.md`
2. Build the product switcher (dropdown showing registered products with health status)
3. Connect to story-creator's existing admin API as first product
4. Build health monitoring (periodic checks, status badges)

**ui-dev**:
1. Build core components following `components.md`:
   - `HealthBadge` (healthy/degraded/unhealthy indicator)
   - `StatsGrid` (displays stats from `/stats` endpoint)
   - `ProductSwitcher` (dropdown with health indicators)
   - `SearchBar` (generic search input)
   - `Pagination` (page navigation using standard `meta`)
2. Set up the design system (colors, typography, spacing following shadcn)
3. Implement dark mode toggle
4. Implement RTL support for Hebrew

**Acceptance criteria:**
- [ ] App has working sidebar + header layout
- [ ] Product switcher shows registered products with health status
- [ ] story-creator stats display on dashboard
- [ ] Dark mode works
- [ ] RTL/Hebrew works

### Phase 2 - Core Features (features-dev + ui-dev)

**features-dev**:
1. Global dashboard page (cross-product overview: all products' stats, health status)
2. Product dashboard page (single product stats, trends chart, quick actions)
3. User management pages (list with search/filter/pagination, detail view, actions)
4. Content management pages (list with search/filter/pagination, detail view, actions)

**ui-dev**:
1. Build remaining core components:
   - `DataTable` (generic paginated table, handles standard `data[]` + `meta`)
   - `TrendsChart` (time-series chart using Recharts)
   - `EntityDetail` (generic detail view with tabs)
   - `ActionPanel` (dynamic action buttons from `/meta` supportedActions)
   - `ActivityFeed` (event timeline)
2. Loading skeletons, error states, empty states for all pages

**Acceptance criteria:**
- [ ] Global dashboard shows all products' health and stats
- [ ] Can browse users list with search, filter, pagination
- [ ] Can view user detail and execute actions (e.g., add credits)
- [ ] Can browse content list with search, filter, pagination
- [ ] DataTable works generically for both users and content
- [ ] All states handled (loading, error, empty, no results)

### Phase 3 - Advanced Features (features-dev + core-dev)

**features-dev**:
1. Analytics page (usage charts, activity feed with audit log)
2. Operations page (run batch operations, dry-run support, view results)
3. Configuration page (view/edit product settings)
4. Product registry management page (add/edit/remove products, test connection)

**core-dev**:
1. Audit logging (log all admin actions to SQLite)
2. Stats caching (cache product stats with TTL, serve from cache for global dashboard)
3. Error recovery (retry logic, graceful degradation when product is offline)

**Acceptance criteria:**
- [ ] Analytics page shows usage charts and activity feed
- [ ] Can run operations with dry-run preview
- [ ] Can view and edit product configuration
- [ ] All admin actions logged to audit log
- [ ] Dashboard works even when a product is offline (shows cached/warning)

### Phase 4 - Polish (all agents)

1. Responsive design (mobile-friendly)
2. Keyboard navigation and accessibility
3. i18n (English + Hebrew with next-intl)
4. Performance optimization (parallel data fetching, suspense boundaries)
5. Final review against `docs/checklist.md` for every connected product
6. PM2 configuration finalized and saved
7. Clean up: remove unused code, ensure consistent naming

**Acceptance criteria:**
- [ ] Works on mobile
- [ ] Accessible (keyboard navigation, screen reader friendly)
- [ ] Hebrew/RTL fully functional
- [ ] Fast load times (no waterfall requests)
- [ ] PM2 config saved and auto-restarts on crash

## Architecture Rules

Follow these from the planning docs:

1. **Next.js App Router** - Server Components by default, Client Components only when needed (interactivity)
2. **Server Actions for mutations** - No client-side API calls for write operations
3. **API proxy pattern** - Client components call Freckle's own API routes, which forward to product APIs (keeps API keys server-side)
4. **URL-driven state** - Pagination, filters, search all in URL params (no client state for these)
5. **Generic components** - One `DataTable` for users AND content. One `EntityDetail` for any entity. Components read the standard response shape, not product-specific shapes.
6. **Product capabilities drive UI** - The sidebar menu for a product is built from its `/meta` capabilities array. If a product doesn't have "analytics", that menu item doesn't show.

## Code Quality Rules

- Follow story-creator's conventions where applicable (same developer, same style)
- TypeScript strict mode, no `any`
- All inputs validated with Zod
- Use a logger (not console.log)
- Component max 150 lines (extract to hooks/sub-components)
- Files named in kebab-case, components in PascalCase
- Commit after each phase is complete and working

## What NOT to Do

1. **Do NOT modify any other project** (story-creator, podcasto, etc.). Freckle is its own project.
2. **Do NOT start pnpm dev manually.** Use PM2 after setup.
3. **Do NOT over-engineer.** This is a single-admin tool. No user roles, no multi-tenancy, no OAuth.
4. **Do NOT build features not in the roadmap.** Follow the phases exactly.
5. **Do NOT skip reading the planning docs.** Everything is already decided - your job is to execute, not redesign.
6. **Do NOT store product API keys in plaintext.** Encrypt with AES-256-GCM (see `data-model.md`).
