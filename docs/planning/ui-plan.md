# Freckle UI/UX Plan | תכנון ממשק נמ״ש

**Version**: 1.0
**Date**: 2026-02-09

---

## 1. Page Inventory

### 1.1 Global Pages (Cross-Product)

| Page | Route | Description |
|------|-------|-------------|
| Global Dashboard | `/` | Cross-product overview: aggregated stats, health status of all products, recent activity across all products |
| Product Registry | `/products` | List all registered products, add/remove/configure product connections |
| Product Registration | `/products/new` | Register a new product: enter base URL, API key, validate connection |
| Settings | `/settings` | Freckle console settings: theme, language, notification preferences, API keys management |

### 1.2 Per-Product Pages

These pages exist within the context of a selected product. The URL includes the product slug.

| Page | Route | Description |
|------|-------|-------------|
| Product Dashboard | `/p/:product` | Single product stats, health, quick actions, recent activity |
| Users List | `/p/:product/users` | Paginated user list with search/filter/sort |
| User Detail | `/p/:product/users/:id` | Full user profile, activity, actions, metadata |
| Content List | `/p/:product/content` | Paginated content list with search/filter/sort |
| Content Detail | `/p/:product/content/:id` | Full content item, preview, actions, metadata |
| Analytics | `/p/:product/analytics` | Usage charts, trends, activity feed |
| Configuration | `/p/:product/config` | Product-level admin settings |
| Operations | `/p/:product/operations` | Run batch operations, view past results |

### 1.3 Page Visibility Rules

Not every product supports every page. The sidebar dynamically shows/hides menu items based on the product's `/meta` response:

| Capability in `/meta` | Pages Shown |
|----------------------|-------------|
| `users` | Users List, User Detail |
| `content` | Content List, Content Detail |
| `analytics` | Analytics |
| `config` | Configuration |
| `operations` | Operations |
| `credits` | Credits column in Users, credits actions |
| `webhooks` | Webhooks section in Configuration |

A product with `capabilities: ["users", "content", "analytics"]` shows 3 nav items.
A product with `capabilities: ["users", "operations"]` shows 2 nav items.

---

## 2. Navigation Structure

### 2.1 Sidebar Layout

The sidebar has three zones:

```
+----------------------------------+
|  [Freckle Logo]  נמ״ש            |  <- Header: branding
|                                  |
|  +----------------------------+  |
|  | [icon] Story Creator    v  |  |  <- Product Switcher dropdown
|  |     healthy                |  |     with health indicator
|  +----------------------------+  |
|                                  |
|  GLOBAL                          |  <- Section label
|  [icon] Dashboard                |
|  [icon] Products                 |
|                                  |
|  PRODUCT                         |  <- Section label (dynamic)
|  [icon] Dashboard                |
|  [icon] Users                    |  <- Only if capability exists
|  [icon] Content                  |  <- Only if capability exists
|  [icon] Analytics                |  <- Only if capability exists
|  [icon] Configuration            |  <- Only if capability exists
|  [icon] Operations               |  <- Only if capability exists
|                                  |
|  ---                             |  <- Separator
|  [icon] Settings                 |  <- Always visible
+----------------------------------+
```

### 2.2 Product Switcher Behavior

The product switcher is a dropdown at the top of the sidebar. When a product is selected:

1. The URL changes to `/p/:product/...`
2. The sidebar re-renders the "PRODUCT" section based on `/meta` capabilities
3. The product's health status is shown as a colored dot (green/yellow/red)
4. The switcher shows the product's `displayName` from `/meta`

When no product is selected (user is on a global page), the product section collapses and the switcher shows "Select a product..."

The switcher dropdown also includes:
- A search/filter input for users with many products
- A "Register new product" shortcut link
- Each product shows: icon (derived from first letter), display name, health dot, last-checked timestamp

### 2.3 Header Bar

```
+----------------------------------------------------------+
| [Hamburger]   Freckle > Story Creator > Users    [?] [A] |
+----------------------------------------------------------+
```

- **Hamburger**: Toggle sidebar (mobile) or collapse to icon mode (desktop)
- **Breadcrumb**: Shows context path. Clickable segments.
- **[?]**: Quick help / keyboard shortcuts
- **[A]**: Admin avatar / profile dropdown (future: multi-admin support)

### 2.4 Mobile Behavior

On screens < 768px:
- Sidebar becomes an overlay (slide-in from right for RTL, left for LTR)
- Hamburger menu in header opens/closes it
- Product switcher moves into the header as a compact dropdown
- Tables switch to card layout
- Stats grid goes to single column

### 2.5 RTL Support (Hebrew)

The entire layout mirrors for RTL:
- Sidebar on the right side
- Text alignment flips
- Icons for directional actions (arrows, chevrons) flip
- Breadcrumbs read right-to-left
- Tables maintain LTR for data like emails and URLs but labels are RTL

Implementation follows the story-creator pattern:
- `dir="rtl"` on root layout for Hebrew locale
- Tailwind RTL utilities (`rtl:` prefix)
- `useDirection()` hook for client components
- next-intl for translations (en, he)

---

## 3. Layout System

### 3.1 Shell Layout

```
+--------+--------------------------------------------+
|        |  Header Bar                                |
|        +--------------------------------------------+
|  Side  |                                            |
|  bar   |  Content Area                              |
|        |                                            |
|  240px |  max-w-7xl mx-auto px-6                    |
|        |                                            |
|        |                                            |
+--------+--------------------------------------------+
```

- Sidebar: 240px expanded, 48px collapsed (icon-only mode)
- Content area: Fluid, max-width 1280px, centered
- Header: Fixed height (56px), sticky
- Content padding: 24px horizontal, 24px vertical

### 3.2 Content Area Patterns

Different page types use different content patterns:

**Dashboard pages** (global & product):
```
+------------------------------------------+
|  Stats Grid (3-4 cards in a row)         |
+------------------------------------------+
|  Trends Chart    |  Activity Feed        |
|  (2/3 width)     |  (1/3 width)          |
+------------------------------------------+
|  Quick Actions / Alerts                  |
+------------------------------------------+
```

**List pages** (users, content):
```
+------------------------------------------+
|  Search Bar  [Filters v]  [Export]       |
+------------------------------------------+
|  Data Table                              |
|  - Sortable columns                      |
|  - Row click -> detail                   |
|  - Inline actions                        |
+------------------------------------------+
|  Pagination: < 1 2 3 ... 8 >            |
+------------------------------------------+
```

**Detail pages** (user detail, content detail):
```
+------------------------------------------+
|  Back Button    Entity Title    [Actions]|
+------------------------------------------+
|  [Info Tab] [Activity Tab] [Metadata Tab]|
+------------------------------------------+
|  Tab Content                             |
|                                          |
+------------------------------------------+
```

**Operations page**:
```
+------------------------------------------+
|  Available Operations                    |
|  +------+  +------+  +------+           |
|  | Op 1 |  | Op 2 |  | Op 3 |           |
|  +------+  +------+  +------+           |
+------------------------------------------+
|  Operation History (table of past runs)  |
+------------------------------------------+
```

### 3.3 Responsive Breakpoints

| Breakpoint | Width | Layout Change |
|-----------|-------|---------------|
| `sm` | 640px | Card grid: 1 col |
| `md` | 768px | Sidebar overlay -> fixed, Card grid: 2 col |
| `lg` | 1024px | Card grid: 3 col, Side-by-side panels |
| `xl` | 1280px | Card grid: 4 col, Max content width |

---

## 4. Key User Flows

### 4.1 First-Time Setup: Registering a Product

```
User opens Freckle for the first time
  |
  v
Global Dashboard shows empty state:
  "No products registered yet. Add your first product."
  [+ Register Product] button
  |
  v
Products > New page:
  1. Enter product name (display name)
  2. Enter base URL (e.g., https://story-creator.app/api/admin/v1)
  3. Enter API key
  4. Click [Test Connection]
     |
     +-- Freckle calls GET {baseUrl}/health
     |   and GET {baseUrl}/meta
     |
     +-- If both succeed:
     |     Show green checkmark
     |     Display product info from /meta (capabilities, version, etc.)
     |     [Save Product] button
     |
     +-- If either fails:
           Show error details
           Suggest troubleshooting steps (check URL, check API key, check CORS)
  |
  v
Product registered -> redirect to product dashboard
Product appears in sidebar switcher
```

### 4.2 Daily Use: Checking Dashboard, Drilling into a User

```
Admin opens Freckle
  |
  v
Global Dashboard shows:
  - All products with health status badges
  - Aggregated stats across products (total users, total content)
  - Recent activity across all products (last 10 events)
  |
  v
Click on "Story Creator" in product list or sidebar switcher
  |
  v
Product Dashboard shows:
  - Stats cards: Total users, Active users, Total stories, Credits consumed
  - Trends chart: 7-day user signups, story creations, credit usage
  - Recent activity: last 10 events from /analytics/activity
  - Health status details (version, uptime)
  |
  v
Click "Users" in sidebar (or user count stat card)
  |
  v
Users List shows:
  - 20 users per page, sorted by createdAt desc
  - Columns: Email, Name, Role, Status, Last Active, Stats summary
  - Search bar filters by email/name
  |
  v
Click on a user row
  |
  v
User Detail shows:
  - Info tab: ID, email, name, role, status, creation date, last active
  - Stats tab: Product-specific stats (stories created, credits balance, etc.)
  - Activity tab: Recent actions by this user
  - Actions panel: Add credits, Reset password, Export data, etc.
    (buttons populated from /meta supportedActions.users)
```

### 4.3 Operations: Running a Cleanup, Checking Result

```
Navigate to Operations page
  |
  v
Available operations listed as cards:
  (populated from /meta supportedActions.operations)
  Each card shows: operation name, brief description, [Run] button
  |
  v
Click [Run] on "cleanup_orphaned_images"
  |
  v
Confirmation dialog:
  "Run cleanup_orphaned_images?"
  [x] Dry run first (recommended)
  [Cancel] [Run]
  |
  v
POST /operations with { action: "cleanup_orphaned_images", params: { dryRun: true } }
  |
  v
Result shown:
  "Dry run complete: Found 45 orphaned images that would be deleted."
  [Run for real] [Dismiss]
  |
  v
If user clicks [Run for real]:
  POST /operations with { action: "cleanup_orphaned_images", params: { dryRun: false } }
  |
  v
Result shown:
  "Operation complete: 45 images deleted."
  Entry added to Operation History table below
```

### 4.4 Switching Between Products

```
User is viewing Story Creator users list
  |
  v
Click product switcher in sidebar
  |
  v
Dropdown opens showing:
  [Search products...]
  --------------------------
  Story Creator        [green dot]
  Podcasto             [green dot]
  CoverBuddy           [yellow dot]
  ai-graphic-designer   [red dot]
  --------------------------
  [+ Register new product]
  |
  v
Click "Podcasto"
  |
  v
URL changes to /p/podcasto
Sidebar menu updates:
  - Podcasto has capabilities: ["users", "content", "analytics"]
  - Shows: Dashboard, Users, Content, Analytics
  - Does NOT show: Configuration, Operations (not in capabilities)
Redirected to Podcasto product dashboard
```

---

## 5. ASCII Wireframes

### 5.1 Global Dashboard

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Dashboard                     [?] [Admin] |
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Select |  PRODUCT HEALTH                                           |
| produc |  +-------------+ +-------------+ +-------------+          |
| t...   |  | Story       | | Podcasto    | | CoverBuddy  |          |
|        |  | Creator     | |             | |              |          |
| -----  |  | [*] healthy | | [*] healthy | | [!] degraded |          |
| GLOBAL |  | v1.2.0      | | v0.8.1      | | v2.0.0       |          |
| Dashb  |  | 1250 users  | | 340 users   | | 89 users     |          |
| Produc |  +-------------+ +-------------+ +-------------+          |
|        |                                                            |
| -----  |  AGGREGATED STATS                                         |
| PRODUC |  +----------+ +----------+ +----------+ +----------+      |
| (none) |  | Total    | | Active   | | Total    | | Created  |      |
|        |  | Users    | | Users    | | Content  | | (30d)    |      |
| -----  |  | 1,679    | | 512      | | 8,430    | | 670      |      |
| Settin |  +----------+ +----------+ +----------+ +----------+      |
|        |                                                            |
|        |  RECENT ACTIVITY (ALL PRODUCTS)                            |
|        |  +-------------------------------------------------------+|
|        |  | [SC] user.signup  John signed up via Google  2m ago    ||
|        |  | [PO] content.pub  Episode #42 published     15m ago   ||
|        |  | [SC] credits.add  100 credits added to Jane  1h ago   ||
|        |  | [CB] user.signup  Designer X joined          3h ago   ||
|        |  +-------------------------------------------------------+|
+--------+------------------------------------------------------------+
```

### 5.2 Product Switcher (Open)

```
+----------------------------+
| [icon] Story Creator    v  |
|     healthy                |
+----------------------------+
| [Search products...]       |
|----------------------------|
| [S] Story Creator    [*]   |  <- green dot (healthy)
| [P] Podcasto         [*]   |  <- green dot
| [C] CoverBuddy      [!]   |  <- yellow dot (degraded)
| [A] ai-graphic-des  [x]   |  <- red dot (unhealthy)
| [T] telegraph        [?]   |  <- grey dot (not connected)
|----------------------------|
| [+] Register new product   |
+----------------------------+
```

### 5.3 Product Dashboard

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Dashboard      [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  STATS                                                     |
| Creat  |  +----------+ +----------+ +----------+ +----------+      |
| [*]    |  | Total    | | Active   | | Total    | | Credits  |      |
|        |  | Users    | | (30d)    | | Stories  | | Used     |      |
| -----  |  | 1,250    | | 340      | | 5,600    | | 45.2K    |      |
| GLOBAL |  | +7.2%    | | -2.1%    | | +12.5%   | | +15.8%   |      |
| Dashb  |  +----------+ +----------+ +----------+ +----------+      |
| Produc |                                                            |
|        |  +-------------------------------------+ +--------------+  |
| -----  |  | TRENDS (7 days)                     | | ACTIVITY     |  |
| PRODUC |  |                                     | |              |  |
| Dashb  |  |     ....                            | | user.signup  |  |
| Users  |  |    .    ..                          | |   John, 2m   |  |
| Conten |  |   .      .                          | |              |  |
| Analyt |  |  .        ...                       | | story.create |  |
| Config |  | .            .                      | |   Jane, 15m  |  |
| Operat |  |               ....                  | |              |  |
|        |  |                                     | | credits.add  |  |
| -----  |  | [24h] [7d] [30d] [90d]              | |   Admin, 1h  |  |
| Settin |  +-------------------------------------+ +--------------+  |
|        |                                                            |
|        |  QUICK ACTIONS                                             |
|        |  [Cleanup Images] [Reindex Search] [Export Users]          |
+--------+------------------------------------------------------------+
```

### 5.4 Users List with Search/Filters

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Users          [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  +------------------------------------------------------+  |
| Creat  |  | [Search icon] Search users by email or name...       |  |
| [*]    |  +------------------------------------------------------+  |
|        |                                                            |
| -----  |  Filters: [Status v] [Role v]            [Export v]       |
| GLOBAL |                                                            |
| ...    |  +------------------------------------------------------+  |
|        |  | Email           | Name     | Role  | Status | Active |  |
| -----  |  +------------------------------------------------------+  |
| PRODUC |  | john@mail.com   | John Doe | user  | active | 2h ago |  |
| Dashb  |  | jane@mail.com   | Jane S.  | prem  | active | 1d ago |  |
| Users* |  | bob@mail.com    | Bob K.   | user  | susp.  | 30d    |  |
| Conten |  | alice@mail.com  | Alice W. | admin | active | 5m ago |  |
| Analyt |  | mike@mail.com   | Mike R.  | user  | inact. | 90d    |  |
| Config |  | sarah@mail.com  | Sarah L. | prem  | active | 3h ago |  |
| Operat |  | ...             | ...      | ...   | ...    | ...    |  |
|        |  +------------------------------------------------------+  |
| -----  |                                                            |
| Settin |  Showing 1-20 of 1,250 users                              |
|        |  [<] [1] [2] [3] ... [63] [>]        [20 v] per page      |
+--------+------------------------------------------------------------+
```

### 5.5 User Detail View

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Users > John   [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  [< Back to Users]                                        |
| Creat  |                                                            |
| [*]    |  +----------------------------+  +----------------------+  |
|        |  | John Doe                   |  | ACTIONS              |  |
| -----  |  | john@example.com           |  | [Add Credits]        |  |
| GLOBAL |  | Role: user  Status: active |  | [Export Data]        |  |
| ...    |  | Joined: Jan 15, 2026       |  | [Send Notification]  |  |
|        |  | Last active: 2 hours ago   |  | [Suspend User]       |  |
| -----  |  +----------------------------+  +----------------------+  |
| PRODUC |                                                            |
| Dashb  |  [Info] [Stats] [Activity] [Metadata]                     |
| Users* |  -------------------------------------------------------  |
| Conten |                                                            |
| Analyt |  INFO TAB:                                                 |
| Config |  +------------------------------------------------------+  |
| Operat |  | User ID      | user-123                              |  |
|        |  | Email        | john@example.com                      |  |
| -----  |  | Name         | John Doe                              |  |
| Settin |  | Role         | user                [Edit]            |  |
|        |  | Status       | active              [Edit]            |  |
|        |  | Created      | 2026-01-15T10:00:00Z                  |  |
|        |  | Last Active  | 2026-02-08T18:30:00Z                  |  |
|        |  +------------------------------------------------------+  |
|        |                                                            |
|        |  STATS TAB (product-specific):                             |
|        |  +----------+ +----------+ +----------+                    |
|        |  | Stories  | | Credits  | | Images   |                    |
|        |  | Created  | | Balance  | | Generated|                    |
|        |  | 24       | | 150      | | 72       |                    |
|        |  +----------+ +----------+ +----------+                    |
|        |                                                            |
|        |  ACTIVITY TAB:                                             |
|        |  +------------------------------------------------------+  |
|        |  | created_story   "The Lost Dragon"       2h ago       |  |
|        |  | generated_image  Page 3 illustration     2h ago       |  |
|        |  | used_credits     10 credits deducted     2h ago       |  |
|        |  | login            Signed in via Google    1d ago       |  |
|        |  +------------------------------------------------------+  |
+--------+------------------------------------------------------------+
```

### 5.6 Content List

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Content        [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  +------------------------------------------------------+  |
| Creat  |  | [Search icon] Search content by title...             |  |
| [*]    |  +------------------------------------------------------+  |
|        |                                                            |
| -----  |  Filters: [Status v] [Type v] [Author v]     [Export v]   |
| ...    |                                                            |
|        |  +------------------------------------------------------+  |
|        |  | Title           | Type  | Author   | Status | Updated|  |
|        |  +------------------------------------------------------+  |
|        |  | The Lost Dragon | story | John D.  | publis | 2h ago |  |
|        |  | Magic Garden    | story | Jane S.  | draft  | 1d ago |  |
|        |  | Night Sky       | story | Alice W. | publis | 3d ago |  |
|        |  | ...             | ...   | ...      | ...    | ...    |  |
|        |  +------------------------------------------------------+  |
|        |                                                            |
|        |  Showing 1-20 of 5,600 items                               |
|        |  [<] [1] [2] [3] ... [280] [>]       [20 v] per page      |
+--------+------------------------------------------------------------+
```

### 5.7 Operations Page

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Operations     [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  AVAILABLE OPERATIONS                                      |
| Creat  |  +---------------------+ +---------------------+          |
| [*]    |  | Cleanup Orphaned    | | Reindex Search      |          |
|        |  | Images              | |                     |          |
| -----  |  | Remove images not   | | Rebuild the search  |          |
| ...    |  | linked to stories.  | | index for all       |          |
|        |  |                     | | content.            |          |
|        |  | [Run with Dry Run]  | | [Run with Dry Run]  |          |
|        |  +---------------------+ +---------------------+          |
|        |                                                            |
|        |  OPERATION HISTORY                                         |
|        |  +------------------------------------------------------+  |
|        |  | Operation        | Ran By | Status   | Time         |  |
|        |  +------------------------------------------------------+  |
|        |  | cleanup_images   | Admin  | success  | 2h ago       |  |
|        |  |   Result: 45 images deleted                          |  |
|        |  | reindex_search   | Admin  | success  | 1d ago       |  |
|        |  |   Result: 5,600 items reindexed                      |  |
|        |  | cleanup_images   | Admin  | dry_run  | 1d ago       |  |
|        |  |   Result: Would delete 45 images                     |  |
|        |  +------------------------------------------------------+  |
+--------+------------------------------------------------------------+
```

### 5.8 Analytics Page

```
+--------+------------------------------------------------------------+
|        |  [=]   Freckle > Story Creator > Analytics      [?] [Admin]|
|  Frkl  +------------------------------------------------------------+
|        |                                                            |
| Story  |  USAGE OVERVIEW                [24h] [7d] [30d] [90d]     |
| Creat  |  +----------+ +----------+ +----------+                    |
| [*]    |  | API Calls| | Unique   | | Top      |                    |
|        |  | 12,500   | | Users    | | Feature  |                    |
| -----  |  |          | | 340      | | story_gen|                    |
| ...    |  +----------+ +----------+ +----------+                    |
|        |                                                            |
|        |  USAGE BREAKDOWN                                           |
|        |  +------------------------------------------------------+  |
|        |  |                                                      |  |
|        |  |  API Calls   ||||||||||||||||||||                     |  |
|        |  |  Unique Users ||||||||                                |  |
|        |  |                                                      |  |
|        |  |  Mon  Tue  Wed  Thu  Fri  Sat  Sun                   |  |
|        |  +------------------------------------------------------+  |
|        |                                                            |
|        |  TOP FEATURES                                              |
|        |  +------------------------------------------------------+  |
|        |  | Feature            | Usage Count | % of Total        |  |
|        |  | story_generation   | 890         | 35.6%             |  |
|        |  | image_generation   | 650         | 26.0%             |  |
|        |  | character_creation | 420         | 16.8%             |  |
|        |  | story_reading      | 340         | 13.6%             |  |
|        |  | export             | 200         | 8.0%              |  |
|        |  +------------------------------------------------------+  |
|        |                                                            |
|        |  ACTIVITY FEED                                             |
|        |  +------------------------------------------------------+  |
|        |  | [user_signup]     John via Google           2m ago    |  |
|        |  | [content_pub]     "The Lost Dragon"         15m ago   |  |
|        |  | [credits_depleted] Jane ran out of credits  1h ago    |  |
|        |  | [content_created] Bob created "Night Sky"   2h ago    |  |
|        |  | ... Load more                                        |  |
|        |  +------------------------------------------------------+  |
+--------+------------------------------------------------------------+
```

---

## 6. Design Tokens and Theming

### 6.1 Color Palette

Following shadcn/ui design tokens (already used in story-creator):

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | white | slate-950 | Page background |
| `foreground` | slate-950 | slate-50 | Primary text |
| `card` | white | slate-900 | Card backgrounds |
| `primary` | slate-900 | slate-50 | Primary buttons, active nav |
| `secondary` | slate-100 | slate-800 | Secondary buttons |
| `muted` | slate-100 | slate-800 | Muted text, inactive elements |
| `accent` | slate-100 | slate-800 | Hover states |
| `destructive` | red-500 | red-900 | Delete, danger actions |

Health-specific colors:
| Status | Color | Usage |
|--------|-------|-------|
| healthy | green-500 | Health dot, success badges |
| degraded | yellow-500 | Warning dot, degraded badges |
| unhealthy | red-500 | Error dot, unhealthy badges |

### 6.2 Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Page title | 2xl (24px) | semibold | System / Outfit (en) / Heebo (he) |
| Section title | lg (18px) | semibold | Same |
| Body text | sm (14px) | normal | Same |
| Small/meta | xs (12px) | normal | Same |
| Monospace (IDs, code) | sm (14px) | normal | JetBrains Mono / system mono |

### 6.3 Spacing

Following Tailwind 4px grid:
- Card padding: 24px (p-6)
- Section gap: 32px (space-y-8)
- Component gap: 16px (gap-4)
- Inline gap: 8px (gap-2)

---

## 7. State Management Patterns

### 7.1 URL-Driven State

All filterable/paginated state lives in the URL search params:

```
/p/story-creator/users?page=2&pageSize=20&search=john&status=active&sort=createdAt&order=desc
```

Benefits:
- Shareable URLs
- Browser back/forward works
- Refresh preserves state
- No client state management needed for list views

### 7.2 Product Context

The selected product is determined by the URL (`/p/:product`). A React context provides the current product's metadata to all child components:

```
ProductProvider
  -> fetches /meta on mount or product change
  -> provides: product slug, displayName, capabilities, supportedActions, health
  -> children conditionally render based on capabilities
```

### 7.3 Data Fetching Strategy

| Data Type | Fetching Strategy | Cache |
|-----------|-------------------|-------|
| Product meta | Server component, revalidate every 5 min | ISR |
| Health status | Client poll every 60s OR webhook push | Short cache |
| Stats | Server component, revalidate every 1 min | ISR |
| Trends | Client fetch on period change | SWR |
| User list | Server component with searchParams | No cache |
| User detail | Server component | No cache |
| Content list | Server component with searchParams | No cache |
| Activity feed | Client fetch, auto-refresh every 30s | SWR |
| Config | Server component | No cache |

### 7.4 Optimistic Updates

For actions (add credits, change status, etc.):
1. Show loading state on the action button
2. Execute the API call
3. On success: show toast notification, refresh the data
4. On error: show error toast with the error message from the API

No optimistic UI updates -- always wait for server confirmation since these are admin operations where accuracy matters more than perceived speed.

---

## 8. Error States and Edge Cases

### 8.1 Empty States

Each page needs an empty state when there's no data:

| Page | Empty State Message | Action |
|------|-------------------|--------|
| Global Dashboard (no products) | "No products registered. Add your first product to get started." | [Register Product] button |
| Users List (no users) | "No users found." | -- |
| Users List (search, no results) | "No users match your search." | [Clear search] link |
| Content List (no content) | "No content found." | -- |
| Activity Feed (no events) | "No recent activity." | -- |
| Operations (none available) | "This product doesn't have any operations configured." | -- |

### 8.2 Error States

| Scenario | Display |
|----------|---------|
| Product unreachable | Banner: "Cannot connect to [Product Name]. Last seen healthy 5 min ago." |
| API returns 401 | Banner: "Authentication failed for [Product]. Check the API key." |
| API returns 500 | Inline error: "Something went wrong. [Retry] [View Details]" |
| API returns 429 | Toast: "Rate limited. Please wait a moment." |
| Network error | Banner: "Network error. Check your connection." |

### 8.3 Loading States

Follow the story-creator pattern:
- Skeleton loaders for cards (stats, user info)
- Table skeleton rows for data tables
- Spinner for action buttons
- Full-page skeleton for initial page load

---

## 9. Accessibility

### 9.1 Keyboard Navigation

- Tab through all interactive elements
- Enter/Space to activate buttons and links
- Escape to close dialogs, dropdowns, sidebar on mobile
- Arrow keys for dropdown menus, table row navigation
- Ctrl+K (or Cmd+K) for global search (future)

### 9.2 Screen Reader Support

- All interactive elements have `aria-label`
- Table headers use `scope="col"`
- Health status dots have `aria-label` (e.g., "Status: healthy")
- Product switcher uses `role="combobox"`
- Sidebar nav uses `role="navigation"` with `aria-label`
- Page sections use semantic headings (h1 for page title, h2 for sections)
- Live regions for toast notifications and async operation results

### 9.3 Color Contrast

All text meets WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text). Health status indicators use both color AND icon/text (never color alone).

---

## 10. Future Considerations

These are NOT in scope for v1 but should be considered in the architecture:

- **Multi-admin support**: Multiple admin users with different permission levels
- **Audit log page**: Centralized log of all admin actions across products
- **Notifications**: Real-time alerts (via webhooks) for important events
- **Comparison views**: Compare metrics between products or time periods
- **Custom dashboards**: Drag-and-drop dashboard builder
- **Mobile app**: React Native companion app for on-the-go monitoring
- **Dark mode**: Already supported via shadcn/ui design tokens
- **Product groups**: Group related products (e.g., "Content Tools", "AI Tools")
