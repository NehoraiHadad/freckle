# Freckle Development Roadmap | מפת דרכים נמ״ש

**Version**: 1.0
**Created**: 2026-02-09
**Status**: Draft

---

## Summary

This roadmap outlines the phased development of Freckle (נמ״ש), a centralized product management console. Each phase builds on the previous, delivering incremental value while proving out the architecture before scaling.

**Target server**: instance-neo (Oracle Cloud) - 4 CPU, 16 GB RAM, 4 GB swap, 45 GB disk. Already running story-creator (Next.js), storybook, n8n (Docker), and monitoring services.

---

## Phase 0 - Foundation

> Scaffold the project, build the shell, establish patterns.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 0.1 | **Project scaffold** | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TypeScript strict mode |
| 0.2 | **PM2 configuration** | Add `freckle` entry to `ecosystem.config.js` (port 3001, 1 GB max memory, 768 MB heap) |
| 0.3 | **Core layout shell** | Sidebar navigation, header with breadcrumbs, responsive content area, dark/light theme |
| 0.4 | **Product registry** | Local JSON/config-based product registry - add, edit, remove products with name, URL, API key, icon |
| 0.5 | **API client infrastructure** | Typed HTTP client that talks to any Freckle-standard Admin API, with auth headers, error handling, timeout |
| 0.6 | **Environment configuration** | `.env.local` with product connection details, `FRECKLE_SECRET` for session, port config |
| 0.7 | **Basic auth gate** | Simple password/secret-based access to the Freckle console itself (not exposed publicly without auth) |

### Acceptance Criteria

- [ ] `pnpm dev` starts Freckle on port 3001 without errors
- [ ] PM2 can manage the process: `pm2 restart freckle` works
- [ ] Layout renders with sidebar, header, and empty content area
- [ ] Can add a product to the registry with name + URL + API key
- [ ] API client can make a GET request to any URL with Bearer auth
- [ ] TypeScript strict mode, ESLint, Prettier all clean

### Complexity Estimate

**Medium** - Mostly scaffolding and configuration. The API client and product registry are the main design decisions.

Estimated files: ~30-40 new files (framework boilerplate + components + lib).

### Dependencies

- None (greenfield)

### Risks

- Port conflict with story-creator (3000) or storybook (6006) - mitigated by using port 3001
- Memory pressure on instance-neo - mitigated by conservative PM2 limits (1 GB)

---

## Phase 1 - First Connection

> Connect to story-creator's existing Admin API. Prove the architecture works end-to-end.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1.1 | **Product connection flow** | Connect to a product: test URL, validate `/health` and `/meta`, store connection status |
| 1.2 | **Product dashboard** | Display stats from `/stats` - user count, content count, custom metrics, generated timestamp |
| 1.3 | **Health monitoring** | Periodic health checks (poll `/health` every 60s), status indicator in sidebar (green/yellow/red) |
| 1.4 | **Meta-driven UI** | Read `/meta` capabilities to show/hide UI sections dynamically (if product supports users, show users tab) |
| 1.5 | **Connection error handling** | Graceful handling of offline products, invalid API keys, timeout, network errors |
| 1.6 | **Upgrade story-creator API** | Bring story-creator's existing `/api/v1/admin/*` endpoints to full v1.1 compliance (CORS, response format, meta/supportedActions) |

### Acceptance Criteria

- [ ] Freckle connects to story-creator and displays its `/meta` info
- [ ] Dashboard shows real stats from story-creator's `/stats` endpoint
- [ ] Sidebar shows story-creator with green health indicator
- [ ] If story-creator goes down, Freckle shows degraded state (not crash)
- [ ] UI sections render based on capabilities from `/meta`
- [ ] story-creator's Admin API passes the compliance checklist

### Complexity Estimate

**Medium-High** - Requires both Freckle development and story-creator API upgrades. The meta-driven UI is the most interesting design challenge.

### Dependencies

- Phase 0 complete
- story-creator Admin API brought to v1.1 compliance

### Risks

- story-creator's existing admin API may need significant changes for v1.1 compliance
- Health polling could add load to story-creator - mitigated by 60s interval and client-side caching

---

## Phase 2 - Core Features

> User management, content management, multi-product support.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 2.1 | **User management** | List users (paginated, searchable, sortable), user detail view, edit user (role, status, metadata), user actions (add credits, export) |
| 2.2 | **Content management** | List content (paginated, filtered by type/status), content detail view, content actions (publish, unpublish, feature) |
| 2.3 | **Product switcher** | Top-level product selector - switch between connected products, each with its own dashboard/users/content |
| 2.4 | **Second product integration** | Add Freckle Admin API to a second product (e.g., podcasto or CoverBuddy) to validate multi-product architecture |
| 2.5 | **Search & filtering** | Cross-field search on user lists and content lists, filter by status/role/type |
| 2.6 | **Bulk selection** | Select multiple users/content items for batch actions |
| 2.7 | **Detail drawers/modals** | Slide-out panels for viewing user/content details without full page navigation |

### Acceptance Criteria

- [ ] Can browse, search, and filter users from story-creator
- [ ] Can view user detail with recent activity and stats
- [ ] Can edit user role/status and execute user actions (add credits)
- [ ] Can browse, search, and filter content (stories)
- [ ] Can execute content actions (publish, unpublish)
- [ ] Product switcher allows navigating between two connected products
- [ ] Second product shows its own users/content through the same UI
- [ ] Pagination works correctly (page navigation, page size selector, total count display)

### Complexity Estimate

**High** - This is the bulk of the application. User and content management are full CRUD interfaces with pagination, search, filtering, and actions. Multi-product support requires careful state management.

### Dependencies

- Phase 1 complete
- Second product has Freckle Admin API implemented

### Risks

- Different products may have different user/content shapes - the meta-driven approach from Phase 1 helps here
- Performance with large user lists - mitigated by server-side pagination
- Second product may have a different tech stack - validated by the framework-agnostic standard

---

## Phase 3 - Advanced Features

> Analytics, operations, activity feeds, configuration management.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 3.1 | **Analytics dashboard** | Charts showing trends over time (new users, content created, active users) using `/stats/trends` data |
| 3.2 | **Usage analytics** | API call counts, unique users, top features breakdown from `/analytics/usage` |
| 3.3 | **Activity/audit feed** | Scrollable feed of recent events from `/analytics/activity` with filtering by event type |
| 3.4 | **Operations center** | Execute product-specific operations (cleanup, reindex, export) with dry-run support and result display |
| 3.5 | **Configuration management** | View and edit product configuration via `/config` endpoint |
| 3.6 | **Charting library** | Integrate a lightweight charting library (recharts or similar) for trend visualization |
| 3.7 | **Data export** | Trigger data exports (CSV) via the operations endpoint, display download links |

### Acceptance Criteria

- [ ] Analytics dashboard shows line/bar charts for key metrics over 7d/30d/90d
- [ ] Usage analytics displays API call patterns and top features
- [ ] Activity feed shows recent admin and user events with timestamp and actor
- [ ] Can execute operations with dry-run toggle (shows what would happen vs actually doing it)
- [ ] Can view and edit product configuration settings
- [ ] Charts are responsive and render correctly on different screen sizes
- [ ] Export operation returns a downloadable file or URL

### Complexity Estimate

**Medium-High** - Charts and visualizations add complexity. Operations center needs careful UX for confirming destructive actions. Activity feed is straightforward paginated list.

### Dependencies

- Phase 2 complete
- Products implement analytics and operations endpoints (not all products need all endpoints)

### Risks

- Charting library bundle size impact - mitigated by lazy loading
- Operations without dry-run could be destructive - mitigated by confirmation dialogs and dry-run-first UX

---

## Phase 4 - Polish & Extensions

> Cross-product features, integrations, notifications, mobile.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 4.1 | **Global dashboard** | Cross-product metrics overview: total users across all products, total content, health status grid |
| 4.2 | **Cross-product user search** | Search for a user by email across all connected products simultaneously |
| 4.3 | **Webhook support** | Register Freckle as a webhook receiver for product events (user.created, content.published) |
| 4.4 | **Real-time event display** | Live event feed powered by webhooks (no polling) |
| 4.5 | **n8n integration** | Trigger n8n workflows from Freckle (e.g., user reaches X credits -> send email) |
| 4.6 | **Telegram notifications** | Send alerts via Telegram for critical events (product down, user spike, error rate) |
| 4.7 | **Mobile responsiveness** | Full responsive design for mobile admin on the go |
| 4.8 | **PWA support** | Installable as Progressive Web App for quick access from phone home screen |
| 4.9 | **Keyboard shortcuts** | Power-user shortcuts (Cmd+K for search, Cmd+P for product switcher) |
| 4.10 | **i18n (Hebrew/English)** | RTL support for Hebrew interface using next-intl (same pattern as story-creator) |

### Acceptance Criteria

- [ ] Global dashboard shows aggregated metrics from all connected products
- [ ] Cross-product search finds the same user across different products
- [ ] Webhook events appear in real-time without page refresh
- [ ] n8n workflow can be triggered from a Freckle button/action
- [ ] Telegram bot sends alerts when products go down
- [ ] All views are usable on mobile (320px+)
- [ ] App can be installed as PWA on mobile/desktop
- [ ] Keyboard shortcuts work for common actions
- [ ] Full Hebrew translation with RTL layout

### Complexity Estimate

**High** - Many independent features. Each is medium complexity but the breadth is significant. Can be parallelized effectively.

### Dependencies

- Phase 3 complete
- Products support webhook registration (Section 8.8 of standard)
- n8n instance running (already deployed on instance-neo)
- Telegram bot token configured

### Risks

- Webhook delivery reliability (products need retry logic)
- n8n workflow complexity for non-trivial automations
- Mobile UX for data-dense admin tables - may need separate mobile views
- Memory impact of webhook listener on instance-neo - should be minimal (event-driven, not polling)

---

## Phase Dependency Map

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
(Foundation) (First     (Core       (Advanced)   (Polish &
              Connection) Features)                Extensions)

Key cross-dependencies:
- Phase 1.6 requires story-creator codebase access
- Phase 2.4 requires a second product to have Admin API
- Phase 4.3 requires products to implement webhooks (Sec 8.8)
- Phase 4.5 requires n8n to be running (already deployed)
```

---

## Server Resource Budget

Current instance-neo allocation:

| Consumer | RAM | Notes |
|----------|-----|-------|
| OS + system services | ~2 GB | Fixed |
| n8n (Docker) | ~250 MB | Always running |
| story-creator (PM2) | up to 2 GB | max_memory_restart |
| storybook (PM2) | up to 1 GB | max_memory_restart |
| monitoring services | ~100 MB | server-monitor-api + scripts |
| **Available** | **~10.5 GB** | |

Proposed Freckle allocation:

| Setting | Value |
|---------|-------|
| PM2 max_memory_restart | 1 GB |
| NODE_OPTIONS --max-old-space-size | 768 MB |
| Port | 3001 |

This leaves ~9.5 GB headroom for Claude Code sessions and other temporary processes.

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16 (App Router) | Same as story-creator, team familiarity, SSR for fast dashboard loads |
| Styling | Tailwind CSS 4 + shadcn/ui | Same as story-creator, consistent design system |
| State management | React Server Components + SWR for client data | Minimal client state, server-first approach |
| Charts | recharts (lazy loaded) | Lightweight, React-native, good for admin dashboards |
| API client | Custom typed client (fetch-based) | Simple, no extra dependencies, typed request/response |
| Auth | Simple secret-based gate | Freckle is internal-only, no need for full user auth initially |
| i18n | next-intl | Same as story-creator, already familiar |
| Testing | Vitest + Playwright | Same as story-creator, consistent tooling |
| Process manager | PM2 | Already used for story-creator |
| Package manager | pnpm | Already used across all projects |

---

## Milestones Summary

| Milestone | Key Outcome | Blocking Deliverable |
|-----------|-------------|---------------------|
| **M0** - Scaffolded | Empty shell running on port 3001, managed by PM2 | Phase 0 complete |
| **M1** - Connected | Freckle displays live data from story-creator | Phase 1 complete |
| **M2** - Functional | Full CRUD for users and content across 2 products | Phase 2 complete |
| **M3** - Insightful | Analytics, charts, operations, activity feeds | Phase 3 complete |
| **M4** - Complete | Cross-product features, integrations, mobile, i18n | Phase 4 complete |
