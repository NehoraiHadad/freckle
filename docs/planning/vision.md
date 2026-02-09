# Freckle | נמ״ש - Product Vision

**Version**: 1.0
**Date**: 2026-02-09
**Status**: Planning

---

## What Is Freckle

Freckle (נמ״ש) is a centralized product management console that provides a single admin interface for monitoring, managing, and operating across an entire portfolio of products. Instead of logging into each product's admin panel separately, Freckle aggregates all management capabilities into one unified dashboard.

Each product in the portfolio exposes a standardized Admin API (defined by the [Freckle Admin API Standard v1.1](/docs/standard.md)). Freckle consumes these APIs and renders a consistent management experience regardless of the underlying product's technology stack.

---

## The Problem

### Current Pain Points

1. **Scattered admin interfaces**: Managing 6+ products means context-switching between separate dashboards, each with different URLs, auth mechanisms, and UX patterns.
2. **No cross-product visibility**: There is no single place to see an overview of all products' health, user counts, or content volume. Understanding the portfolio's state requires visiting each product individually.
3. **Inconsistent management experiences**: Each product has its own admin UI (if it has one at all). Some have rich dashboards (story-creator), others have no admin interface (ai-graphic-designer, auto-video-generator).
4. **Manual operations overhead**: Running operations (cleanup tasks, user credit adjustments, exports) requires SSH access, scripts, or curl commands rather than a UI.
5. **No unified activity feed**: There is no way to see a cross-product timeline of events (new users, content created, errors) without checking each product's logs.

### Who Feels This Pain

**Nehorai** - the sole developer and admin of all products. As a solo developer managing a growing portfolio, the cognitive overhead of remembering each product's admin endpoints, data models, and operational procedures is significant and growing.

---

## Target User

**Primary user**: Nehorai (single admin)
- Manages all products in the portfolio
- Needs quick visibility into product health and key metrics
- Performs occasional admin operations (add credits, manage users, run maintenance tasks)
- Values speed and simplicity over enterprise features

**Secondary consumers** (non-interactive):
- **n8n workflows**: Automation pipelines that trigger operations via Freckle or directly via product Admin APIs
- **Telegram bots**: Notification and quick-action bots that query product health and stats

---

## Products in the Portfolio

| Product | Description | Stack | Admin API Status | Key Entities |
|---------|-------------|-------|------------------|--------------|
| **story-creator** | AI children's story generator | Next.js 16, Firebase, Gemini | Partial (existing `/api/v1/admin/*`) | Users, Stories, Characters, Credits |
| **podcasto** | AI podcast generator from Telegram content | Next.js 15, Supabase, AWS Lambda | Planned | Podcasts, Episodes, Subscriptions |
| **CoverBuddy** | AI insurance assistant agent | Python, LangGraph, Claude | Planned | Conversations, Quotes |
| **ai-graphic-designer** | AI graphic design agent | Python, Google ADK, Supabase | Planned | Users, Projects, Designs, Brand Kits |
| **auto-video-generator** | Automated promo video creator | Node.js, Playwright, Remotion | Planned | Videos, Renders |
| **telegraph** | Telegram channel management tools | Node.js/Python | Planned | Channels, Messages |
| **AgentMaestro** | Multi-agent orchestrator for Claude Code | Node.js, TypeScript | Planned | Sessions, Delegations |

---

## Key Features & Capabilities

### 1. Portfolio Dashboard
- At-a-glance health status of all registered products (healthy/degraded/unhealthy)
- Key metrics per product: total users, active users, content count, custom metrics
- Trend sparklines showing 7-day activity
- Quick action buttons for common operations

### 2. Product Registry
- Register products by providing their Admin API base URL and API key
- Auto-discover capabilities via the `/meta` endpoint
- Health monitoring with configurable check intervals
- Product metadata display (version, capabilities, supported actions)

### 3. Universal Entity Browser
- Browse users, content, and other entities across any product using the same UI
- Generic list/detail/edit views that adapt based on the product's `/meta` capabilities
- Standardized pagination, search, sort, and filter controls
- Cross-product user search (find a user across all products by email)

### 4. Operations Console
- Execute product-specific actions (add credits, publish content, run cleanup) from a UI
- Dry-run support for destructive operations
- Operation history log (who ran what, when, with what result)

### 5. Unified Activity Feed
- Chronological event stream aggregated from all products' `/analytics/activity` endpoints
- Filter by product, event type, user, or time range
- Real-time updates via polling or webhooks

### 6. Analytics Overview
- Combined usage analytics across the portfolio
- Per-product trend charts (7d, 30d, 90d)
- Top-level KPIs: total users across all products, total content created, API call volume

### 7. Configuration Management
- View and edit product configuration settings via `/config` endpoints
- Diff view showing changes before applying

---

## Scope

### In Scope (v1.0)

- Product registry (add/remove/edit products)
- Portfolio health dashboard
- Per-product stats and trend charts
- User management (list, view detail, edit role/status, execute actions)
- Content management (list, view detail, edit status, execute actions)
- Activity feed (per-product)
- Operations console (execute product-specific operations)
- Configuration viewer
- Single admin authentication (Nehorai only)

### Out of Scope (Non-Goals)

- **Multi-tenant admin**: Only one admin user. No RBAC, no teams, no org hierarchy.
- **Product deployment/CI-CD**: Freckle does not deploy products. It only manages them at the application level.
- **Direct database access**: Freckle never touches product databases. All interactions go through the standardized Admin API.
- **User-facing features**: Freckle is an admin tool, not a user-facing product. No public pages, no SEO, no marketing site.
- **Billing/payments**: No payment processing or subscription management within Freckle itself.
- **Real-time collaboration**: Single admin, no need for real-time multi-user features.
- **Product-specific UI customization**: The whole point is a generic, standardized UI. Products don't get custom dashboards inside Freckle.
- **Log aggregation**: Freckle is not a logging platform. It shows activity feeds from Admin APIs, not raw server logs.
- **Alerting/on-call**: Basic health status display, but no PagerDuty-style alerting, escalation, or incident management.
- **Mobile app**: Desktop-first admin console. Responsive enough to check on a phone but not optimized for mobile workflows.

---

## Success Criteria

### Functional
1. **All active products registered**: story-creator, podcasto, and at least one more product connected and visible in Freckle.
2. **Health at a glance**: Portfolio dashboard shows real-time health status of all products within 1 second of page load.
3. **User management works**: Can browse users from story-creator, view their details, add credits, and change roles entirely through Freckle's UI.
4. **Content browsing works**: Can browse stories from story-creator, view details, and change publish status through Freckle.
5. **Operations executable**: Can run product-specific operations (e.g., cleanup orphaned images) from the operations console.

### Developer Experience
6. **Adding a new product takes < 30 minutes**: After implementing the Admin API standard on a product, registering it in Freckle and seeing it on the dashboard should be fast.
7. **Zero product-specific code in Freckle**: Freckle's UI components are entirely generic, driven by `/meta` endpoint data. Adding a new product requires zero changes to Freckle's codebase.

### Quality
8. **Type-safe**: Full TypeScript coverage with no `any` types in the core codebase.
9. **Fast**: Dashboard loads under 2 seconds. Entity lists paginate without full page reloads.
10. **Secure**: All product API keys encrypted at rest. Admin auth enforced on all routes.

---

## Design Principles

1. **Convention over configuration**: The standardized API contract means Freckle can render UI for any product without product-specific code. The `/meta` endpoint tells Freckle what a product supports; Freckle figures out the rest.

2. **Data belongs to products**: Freckle is a read-heavy, write-light consumer. Products own their data and logic. Freckle is a management lens, not a data store.

3. **Progressive enhancement**: Start with the required endpoints (`/health`, `/meta`) and get value immediately. Additional capabilities (users, content, analytics) enhance the experience as products implement more of the standard.

4. **Single admin simplicity**: No user management system within Freckle itself. One admin, one password, one session. This removes an entire class of complexity.

5. **Fail gracefully**: If a product's Admin API is down, Freckle shows degraded status for that product without affecting the rest of the dashboard. Network errors are expected, not exceptional.
