# Freckle | נמ״ש - Technology Stack

**Version**: 1.0
**Date**: 2026-02-09
**Status**: Planning

---

## Stack Summary

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| UI Library | Tailwind CSS + shadcn/ui | Tailwind 4, shadcn latest |
| Charts | Recharts | 2.x |
| State Management | URL state + Server Components | N/A |
| Data Fetching | Server Components + Server Actions | N/A |
| Validation | Zod | 4.x |
| Freckle's Own Data | SQLite via better-sqlite3 | N/A |
| Auth | Simple password + encrypted cookie | N/A |
| Testing | Vitest (unit) + Playwright (e2e) | Vitest 4.x, Playwright 1.x |
| Package Manager | pnpm | 10.x |
| Process Manager | PM2 | Existing instance setup |

---

## Detailed Decisions

### 1. Framework: Next.js 16 (App Router)

**Choice**: Next.js 16 with App Router and React Server Components

**Rationale**:
- **Team expertise**: story-creator is built on Next.js 16 with App Router. This is the team's primary framework. No learning curve.
- **Server Components fit perfectly**: Freckle's pages are data-heavy, read-heavy, and mostly non-interactive. Server Components fetch data server-side, render HTML, and send it to the browser without shipping JavaScript for every data table.
- **Server Actions for mutations**: Admin operations (add credits, change user role) map cleanly to Server Actions. No need for a separate API layer.
- **API keys stay server-side**: Server Components and Server Actions execute on the server. Product API keys never reach the client bundle.
- **Built-in routing**: App Router's file-based routing with layouts, nested routes, and loading states maps well to Freckle's URL structure (`/products/[slug]/users/[id]`).

**Alternatives considered**:
- **Remix/React Router 7**: Strong server-side story, but the team has no experience with it. No practical benefit over Next.js for this use case.
- **Plain React SPA + API routes**: Would require building a separate backend for proxying API calls (to hide API keys). Next.js gives this for free.
- **Astro**: Good for static/content sites. Freckle is a dynamic admin tool - not a fit.

---

### 2. UI: Tailwind CSS 4 + shadcn/ui

**Choice**: Tailwind CSS for utility-first styling, shadcn/ui for pre-built accessible components

**Rationale**:
- **Already the standard**: story-creator uses this exact combination. Component patterns, theming approach, and utility classes are already familiar.
- **Admin UI components out of the box**: shadcn/ui provides Table, Dialog, DropdownMenu, Tabs, Card, Badge, Input, Select, Button - every component an admin console needs, with accessible defaults.
- **Copy-paste model**: shadcn/ui components are owned by the project (not a node_modules dependency). They can be customized without fighting library constraints.
- **Dark mode**: Built-in dark mode support through Tailwind's dark variant + next-themes. Admin tools are often used in low-light environments.
- **Responsive by default**: Tailwind's responsive utilities make it easy to ensure the admin console works on smaller screens if needed.

**Alternatives considered**:
- **Material UI / Ant Design**: Full component libraries with opinionated design. Heavier, harder to customize, and the team already prefers Tailwind's utility-first approach.
- **Radix Primitives directly**: shadcn/ui is built on Radix already. Using Radix directly means building more from scratch for no benefit.

---

### 3. Charts & Visualization: Recharts

**Choice**: Recharts for trend charts and analytics visualization

**Rationale**:
- **React-native**: Built specifically for React with declarative component API. Fits naturally into JSX.
- **Lightweight**: ~40KB gzipped. Smaller than alternatives like Chart.js (with React wrapper) or D3 (which is a visualization toolkit, not a chart library).
- **Covers the use cases**: Freckle needs line charts (trends over time), bar charts (comparison), and area charts (volume). Recharts handles all of these cleanly.
- **Responsive**: ResponsiveContainer component handles window resize automatically.
- **Composable**: Built from composable primitives (XAxis, YAxis, Line, Tooltip, Legend). Easy to build custom chart layouts.

**Specific use cases in Freckle**:
- `/stats/trends` data rendered as line charts (new users, content created over time)
- Dashboard sparklines (mini trend indicators per product)
- Analytics usage breakdown as bar charts

**Alternatives considered**:
- **Chart.js + react-chartjs-2**: Good library, but the React wrapper adds friction. Canvas-based rendering is less composable in React.
- **D3**: Too low-level for this use case. D3 is for custom visualizations, not standard charts.
- **Tremor**: Built on Recharts with Tailwind styling. Could be a good fit, but adds another abstraction layer on top of a library we'd already use directly.
- **Nivo**: Beautiful defaults but heavier (~100KB). More than needed for an admin dashboard.

---

### 4. Freckle's Own Data Store: SQLite via better-sqlite3

**Choice**: SQLite file-based database for Freckle's product registry and settings

**Rationale**:
- **Simplicity**: Freckle stores only its own configuration data (product registry, admin settings). This is a tiny dataset - likely under 10 rows for the foreseeable future.
- **Zero infrastructure**: No database server to run, no connection strings, no Docker containers. A single `.db` file on disk.
- **Synchronous reads**: better-sqlite3 provides synchronous reads, which are actually desirable for a single-user app. No connection pooling complexity.
- **Backup is trivial**: Copy one file. No pg_dump, no export commands.
- **Runs on the same server**: Freckle runs on instance-neo alongside everything else. SQLite adds zero memory overhead (no database process).
- **Encryption**: API keys are encrypted at the application layer before storage (AES-256-GCM). SQLite stores the ciphertext.

**What Freckle stores in SQLite**:
- Product registry (5-10 rows): slug, displayName, baseUrl, encrypted apiKey, icon, settings
- Cached meta/health responses (optional, for faster cold starts)
- Admin preferences (theme, dashboard layout)

**What Freckle does NOT store**:
- User data (lives in products)
- Content data (lives in products)
- Analytics data (lives in products)
- Activity logs (queried from products on demand)

**Alternatives considered**:
- **JSON file**: Even simpler, but no query capabilities, no atomicity, race condition risk on concurrent writes (even unlikely with single user). SQLite is "JSON file but better" for structured data.
- **Supabase**: Adds an external dependency, network latency, and a service to maintain. story-creator-like complexity for a config store holding 10 rows. Overkill.
- **Firebase Firestore**: Same over-engineering concern. Plus, Freckle doesn't need real-time sync or offline support.
- **PostgreSQL**: Requires running a database server. Even with Docker, that's another process consuming RAM on instance-neo. Not justified for this data volume.
- **Drizzle + SQLite**: Drizzle ORM is an option for type-safe queries, but raw better-sqlite3 with hand-written types is simpler for 2-3 tables. Can adopt Drizzle later if queries become complex.

---

### 5. State Management: URL State + Server Components

**Choice**: No client-side state management library. Use URL search params for pagination/filter state, Server Components for data.

**Rationale**:
- **Server Components eliminate most client state**: Data is fetched and rendered server-side. There is no client-side "store" of users or content.
- **URL as state**: Pagination (`?page=2`), search (`?search=john`), sort (`?sort=createdAt&order=desc`), and filters (`?status=active`) are all URL search params. This means:
  - State survives page refresh
  - State is shareable (copy URL)
  - Browser back/forward works correctly
  - No state sync bugs
- **Minimal client state**: The only client-side state is transient UI state: dialog open/close, sidebar collapsed/expanded, loading indicators. React's `useState` handles this.

**Alternatives considered**:
- **Zustand**: story-creator uses Zustand sparingly. For Freckle, there is no global client state that needs a store. Every page fetches its own data.
- **React Query / SWR**: Useful for client-side data fetching with caching. But Freckle uses Server Components for data fetching, making these libraries redundant.
- **Redux**: Massive overkill for an admin tool with no complex client-side state flows.

---

### 6. Data Fetching: Server Components + Server Actions

**Choice**: Server Components for reads, Server Actions for writes

**Rationale**:
- **Server Components for reads**: Each page is a Server Component that calls `ProductApiClient` methods directly. Data arrives as props. No useEffect, no loading spinners for initial data (streaming handles progressive loading).
- **Server Actions for writes**: Mutations (update user, execute action, change config) are Server Actions. They run server-side, call the product API, and revalidate the page.
- **No API routes needed**: Freckle doesn't need its own REST API. Server Actions handle forms and mutations. Server Components handle data loading.

**Pattern**:
```
Page (Server Component)
  -> reads product registry (SQLite)
  -> calls product Admin API (fetch)
  -> passes data to presentational components
  -> interactive parts are Client Components with Server Action forms
```

---

### 7. Validation: Zod 4

**Choice**: Zod for runtime validation of API responses and form inputs

**Rationale**:
- **Already in the ecosystem**: story-creator uses Zod 4 extensively. Same patterns, same mental model.
- **API response validation**: Product Admin APIs should follow the standard, but Freckle should validate responses defensively. Zod schemas for `AdminApiResponse`, `AdminUser`, `AdminContentItem`, etc. catch malformed responses before they hit the UI.
- **Form validation**: Server Action inputs (action params, config changes) are validated with Zod schemas before being sent to product APIs.
- **Type inference**: `z.infer<typeof schema>` generates TypeScript types from schemas, keeping types and runtime validation in sync.

---

### 8. Authentication: Simple Password + Encrypted Cookie

**Choice**: Environment variable password with encrypted session cookie

**Rationale**:
- **Single user = single password**: There is one admin. OAuth flows, user databases, and session tables add complexity with zero benefit for a single-user tool.
- **Implementation**: Login page sends password to a Server Action. Server Action compares against `FRECKLE_ADMIN_PASSWORD` env var. On success, sets an encrypted HTTP-only cookie using `jose` (JWT in cookie) or `iron-session`.
- **Security is still solid**: The cookie is HTTP-only (no XSS), encrypted (no tampering), and SameSite=Strict (no CSRF). The password in the env var is never logged or exposed.
- **Middleware guard**: Next.js middleware checks the cookie on every request. Unauthenticated requests redirect to login.

**Alternatives considered**:
- **NextAuth.js**: Powerful but designed for multi-user, multi-provider auth. For one user with one password, it adds unnecessary abstraction.
- **Supabase Auth**: External dependency for authenticating a single user. Not justified.
- **Basic HTTP Auth**: Works but provides a poor UX (browser's native dialog, no logout, no session management).

---

### 9. Testing: Vitest + Playwright

**Choice**: Vitest for unit/integration tests, Playwright for end-to-end tests

**Rationale**:
- **Team standard**: story-creator uses this exact combination. Test patterns, config, and CI setup are transferable.
- **Vitest**: Fast, ESM-native, compatible with Next.js. Good for testing:
  - ProductApiClient (mocked HTTP responses)
  - Response parsing and validation (Zod schemas)
  - Registry operations (SQLite with in-memory DB for tests)
  - Server Action logic (mocked API calls)
- **Playwright**: For testing the actual admin UI:
  - Login flow
  - Dashboard loads and shows product health
  - User list pagination and search
  - Action execution (add credits)
  - Navigation between products

**Test priorities for Freckle**:
1. **API consumer layer** (unit): Does `ProductApiClient` correctly handle all response shapes, errors, and edge cases?
2. **Response validation** (unit): Do Zod schemas correctly validate and reject various API responses?
3. **Dashboard rendering** (integration): Does the dashboard correctly render data from mocked product APIs?
4. **Auth flow** (e2e): Login, session persistence, logout
5. **User management flow** (e2e): Navigate to product, browse users, view detail, execute action

---

### 10. Package Manager: pnpm

**Choice**: pnpm

**Rationale**:
- **Already the standard**: story-creator uses pnpm. The server has pnpm installed globally. PM2 ecosystem config references the pnpm binary.
- **Disk efficient**: Hard links and content-addressable storage mean shared dependencies across projects don't duplicate on disk.
- **Strict by default**: Prevents phantom dependencies that could cause production bugs.

---

### 11. Development Tooling

| Tool | Purpose | Rationale |
|------|---------|-----------|
| **ESLint** | Linting | Same config as story-creator |
| **Prettier** | Formatting | Consistent code style |
| **TypeScript strict mode** | Type checking | Catch errors at compile time |
| **Husky** | Git hooks | Pre-commit quality checks |
| **lint-staged** | Incremental checks | Only lint/test changed files |

---

## Dependency Philosophy

Freckle should be a **lean** application. It is an admin tool, not a product with end-user growth requirements.

**Guidelines**:
- Prefer built-in Node.js/Next.js capabilities over adding libraries
- Prefer shadcn/ui components (zero runtime cost, owned code) over component library packages
- Avoid libraries that add more than 50KB to the client bundle
- Every dependency must have a clear, specific justification
- No "nice to have" libraries - only add what is needed for the current scope

**Expected total dependencies** (rough estimate):
- **Runtime**: next, react, react-dom, tailwind, zod, better-sqlite3, recharts, jose (or iron-session), lucide-react (~10 runtime deps)
- **Dev**: typescript, eslint, prettier, vitest, playwright, tailwindcss, @types/* (~15 dev deps)

This is deliberately smaller than story-creator's dependency tree. Admin tools should be boring and stable.
