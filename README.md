<div align="center">
  <img src="public/logo.png" alt="Freckle Logo" width="120" />
  <h1>Freckle</h1>
  <p>
    <strong>Freckle</strong> 
    Centralized product management console.
  </p>
</div>

---

## What Is This

A centralized admin dashboard that connects to multiple products via standardized REST Admin APIs. Products expose an OpenAPI spec, and Freckle auto-discovers all resources, operations, and relationships — no hardcoded UI per product.

```
┌──────────────────────────────────┐
│              Freckle             │
│    One dashboard, all products   │
└──────┬────────┬────────┬─────────┘
       │ REST   │ REST   │ REST
       ▼        ▼        ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │Product │ │Product │ │Product │
  │Admin   │ │Admin   │ │Admin   │
  │API     │ │API     │ │API     │
  └────────┘ └────────┘ └────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | SQLite via better-sqlite3 |
| Auth | JWT (jose) with cookie-based sessions |
| UI | shadcn/ui, Tailwind CSS 4, Lucide icons |
| Charts | Recharts |
| i18n | next-intl (English + Hebrew, RTL support) |
| Process Manager | PM2 (port 4000) |

## Project Structure

```
freckle/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Dashboard (stats, trends, activity)
│   │   ├── login/                          # Auth page
│   │   ├── products/                       # Product CRUD (list, new, edit)
│   │   ├── p/[slug]/                       # Product dashboard
│   │   │   ├── [capability]/               # Resource list (auto-discovered)
│   │   │   │   └── [id]/                   # Resource detail + sub-resource tabs
│   │   ├── settings/                       # App preferences
│   │   ├── audit-log/                      # Action audit trail
│   │   └── api/
│   │       ├── proxy/[product]/[...path]/  # Server-side API proxy (keys never reach client)
│   │       └── health-check/               # Background health monitoring
│   ├── components/
│   │   ├── freckle/                        # App-specific components
│   │   │   ├── data-table.tsx              # Generic sortable data table
│   │   │   ├── entity-detail.tsx           # Resource detail view
│   │   │   ├── operation-panel.tsx         # Execute API operations (method+path from spec)
│   │   │   ├── schema-form.tsx             # Auto-generated forms from JSON Schema
│   │   │   ├── sub-resource-tab.tsx        # Lazy-loading child resources
│   │   │   ├── stats-grid.tsx              # Dashboard stats cards
│   │   │   ├── trends-chart.tsx            # Recharts time-series
│   │   │   ├── activity-feed.tsx           # Recent events feed
│   │   │   └── ...                         # search, pagination, health, empty states
│   │   └── ui/                             # shadcn/ui primitives
│   ├── lib/
│   │   ├── api-client/                     # Generic Admin API client
│   │   ├── auth/                           # JWT session management
│   │   ├── crypto.ts                       # AES-256-GCM key encryption
│   │   ├── db/                             # SQLite models + migrations
│   │   ├── openapi/                        # OpenAPI spec parser + schema resolver
│   │   └── format.ts, utils.ts             # Shared utilities
│   ├── messages/
│   │   ├── en.json                         # English translations
│   │   └── he.json                         # Hebrew translations
│   └── types/                              # TypeScript type definitions
├── docs/
│   ├── standard.md                         # Freckle Admin API Standard v1.1
│   ├── checklist.md                        # Compliance checklist
│   ├── examples/                           # curl examples
│   └── planning/                           # Architecture & design docs (10 files)
├── build-freckle-prompt.md                 # Prompt to build the console itself
├── build-prompt.md                         # Prompt to add Admin API to a product
└── prompt.md                               # Solo-agent build prompt
```

## Key Features

- **OpenAPI-driven discovery** — register a product with its API URL, Freckle fetches the OpenAPI spec and auto-generates sidebar, tables, forms, and detail views
- **Zero hardcoded UI per product** — all resources and operations are derived from the spec at runtime
- **Server-side API proxy** — API keys are encrypted at rest (AES-256-GCM) and never sent to the browser
- **Hierarchical resources** — sub-resources with `requiresParentId` render as tabs on parent detail pages
- **Auto-generated forms** — JSON Schema from the spec drives form inputs (enum → dropdown, string → input, etc.)
- **i18n + RTL** — full English and Hebrew support with Tailwind logical properties
- **Audit log** — tracks all admin operations
- **Health monitoring** — periodic product health checks with status badges

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install & Run

```bash
pnpm install
pnpm dev          # starts on http://localhost:3000
```

### Production (PM2)

```bash
pnpm build
pm2 start ecosystem.config.js --only freckle
```

The PM2 config runs the app on **port 4000**.

### Environment Variables

Create `.env.local`:

```env
FRECKLE_ADMIN_PASSWORD=<your-password>
FRECKLE_JWT_SECRET=<random-secret>
FRECKLE_ENCRYPTION_KEY=<32-byte-hex-key>
```

## Adding a Product

1. Log in to Freckle
2. Go to **Products → Add Product**
3. Enter the product name, slug, base API URL, and API key
4. Freckle fetches the OpenAPI spec from the product's well-known paths
5. All resources and operations appear automatically in the sidebar

### Admin API Standard

Products must implement the [Freckle Admin API Standard](docs/standard.md). Use [the checklist](docs/checklist.md) to verify compliance.

To add Admin API support to an existing product, use the build prompts:
- **Team build**: `build-prompt.md` (multi-agent)
- **Solo build**: `prompt.md` (single agent)

## Products

| Product | Status | Admin API | Stack |
|---------|--------|-----------|-------|
| story-creator | Active | OpenAPI (46 operations, 31 resources) | Next.js + Firebase |
| podcasto | Planned | - | - |
| CoverBuddy | Planned | - | - |
| ai-graphic-designer | Planned | - | - |
| telegraph | Planned | - | - |
| auto-video-generator | Planned | - | - |
