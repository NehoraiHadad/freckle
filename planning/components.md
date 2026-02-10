# Freckle Component Design | תכנון רכיבים

**Version**: 1.0
**Date**: 2026-02-09

---

## 1. Component Architecture Overview

```
src/components/
  freckle/                    <- Freckle-specific components
    product-switcher.tsx       <- Product selection dropdown
    health-badge.tsx           <- healthy/degraded/unhealthy indicator
    stats-grid.tsx             <- Displays stats from /stats endpoint
    trends-chart.tsx           <- Time-series chart from /stats/trends
    data-table.tsx             <- Generic paginated table
    entity-detail.tsx          <- Generic detail view with tabs
    action-panel.tsx           <- Lists and executes actions from /meta
    activity-feed.tsx          <- Displays /analytics/activity events
    search-bar.tsx             <- Generic search with debounce
    operation-card.tsx         <- Single operation with run/dry-run
    operation-history.tsx      <- Table of past operation results
    pagination.tsx             <- Page navigation controls
    filter-bar.tsx             <- Dropdown filters row
    empty-state.tsx            <- Reusable empty state with icon/message/action
    error-banner.tsx           <- Connection error / auth error banner
    breadcrumbs.tsx            <- Dynamic breadcrumb trail
    confirm-dialog.tsx         <- Confirmation dialog for destructive actions
  layout/
    shell.tsx                  <- Sidebar + header + content area
    sidebar.tsx                <- Sidebar navigation
    header.tsx                 <- Top header bar
    sidebar-nav.tsx            <- Navigation items within sidebar
    product-section.tsx        <- Dynamic product nav based on capabilities
  ui/                          <- shadcn/ui primitives (reused from story-creator)
    badge.tsx
    button.tsx
    card.tsx
    dialog.tsx
    dropdown-menu.tsx
    input.tsx
    select.tsx
    separator.tsx
    sheet.tsx
    skeleton.tsx
    table.tsx
    tabs.tsx
    tooltip.tsx
    sonner.tsx                 <- Toast notifications
```

---

## 2. Core Components

### 2.1 ProductSwitcher

**Purpose**: Dropdown at the top of the sidebar allowing the admin to switch between registered products.

**Type**: Client Component (`"use client"`)

**Props**:
```typescript
interface ProductSwitcherProps {
  products: ProductSummary[];
  currentProduct: string | null;  // product slug from URL
}

interface ProductSummary {
  slug: string;                    // URL-safe identifier (e.g., "story-creator")
  displayName: string;             // From /meta (e.g., "Story Creator")
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  version: string;
  lastCheckedAt: string;           // ISO timestamp
}
```

**Behavior**:
- Renders as a button showing current product name + health dot
- Click opens a popover/dropdown with:
  - Search input at top (filters product list client-side)
  - List of products, each with: first-letter avatar, display name, health dot
  - "Register new product" link at bottom
- Selecting a product navigates to `/p/:slug`
- When no product is selected, shows "Select a product..." placeholder

**API Data Source**: Local product registry (stored in Freckle's own database/config). Health data refreshed via polling each product's `/health` endpoint.

**shadcn components used**: `Popover`, `Command` (combobox pattern), `Badge`

**Wireframe**:
```
Closed:
+----------------------------+
| [S] Story Creator    [v]   |
|     [*] healthy            |
+----------------------------+

Open:
+----------------------------+
| [Search products...]       |
|----------------------------|
| [S] Story Creator    [*]   |
| [P] Podcasto         [*]   |
| [C] CoverBuddy      [!]   |
|----------------------------|
| [+] Register new product   |
+----------------------------+
```

---

### 2.2 HealthBadge

**Purpose**: Visual indicator of a product's health status.

**Type**: Server Component (no interactivity needed)

**Props**:
```typescript
interface HealthBadgeProps {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  showLabel?: boolean;     // default: true
  size?: "sm" | "md";     // default: "md"
}
```

**Rendering**:
| Status | Dot Color | Label | Icon |
|--------|-----------|-------|------|
| healthy | green-500 | "Healthy" | CheckCircle |
| degraded | yellow-500 | "Degraded" | AlertTriangle |
| unhealthy | red-500 | "Unhealthy" | XCircle |
| unknown | gray-400 | "Unknown" | HelpCircle |

**Accessibility**: Always includes `aria-label` with the status text, never relies on color alone.

**shadcn components used**: `Badge` (variant based on status)

```
[*] Healthy     [!] Degraded     [x] Unhealthy     [?] Unknown
(green)         (yellow)          (red)              (gray)
```

---

### 2.3 StatsGrid

**Purpose**: Displays key metrics from the `/stats` endpoint as a responsive grid of stat cards.

**Type**: Server Component (data fetched server-side)

**Props**:
```typescript
interface StatsGridProps {
  stats: StatsResponse;          // From /stats endpoint
  productCapabilities: string[]; // To know which sections to show
}

// Each stat card:
interface StatCardData {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    percentage: number;
    label: string;           // e.g., "vs last 30 days"
  };
}
```

**How it consumes the API**:
1. Reads `data.users` (if product has `users` capability) -> generates user stat cards
2. Reads `data.content` (if product has `content` capability) -> generates content stat cards
3. Reads `data.custom` -> generates custom stat cards
4. Each field maps to a `StatCardData` with appropriate icon and formatting

**Standard field mapping**:
| API Field | Card Label | Icon |
|-----------|-----------|------|
| `users.total` | Total Users | Users |
| `users.active` | Active Users | UserCheck |
| `users.newLast30d` | New (30d) | UserPlus |
| `content.total` | Total Content | FileText |
| `content.publishedTotal` | Published | FileCheck |
| `content.createdLast30d` | Created (30d) | FilePlus |
| `custom.*` | Dynamic from key | Blocks (default) |

**Layout**: `grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

**shadcn components used**: `Card`, `CardHeader`, `CardTitle`, `CardContent`

**Pattern reference**: Directly based on story-creator's `DashboardStats` component but generalized for any product.

---

### 2.4 TrendsChart

**Purpose**: Renders time-series data from `/stats/trends` as a line or bar chart.

**Type**: Client Component (interactive period selector, chart library)

**Props**:
```typescript
interface TrendsChartProps {
  productSlug: string;
  initialPeriod?: "24h" | "7d" | "30d" | "90d";   // default: "7d"
}
```

**Behavior**:
1. On mount, fetches `/stats/trends?period=7d` for the product
2. Renders period selector buttons: [24h] [7d] [30d] [90d]
3. Clicking a period re-fetches data and updates the chart
4. Chart auto-detects available metrics from the response `points` array
5. Each metric becomes a line/series on the chart
6. Tooltip on hover shows exact values for each data point

**How it consumes the API**:
```json
{
  "data": {
    "period": "7d",
    "points": [
      { "date": "2026-02-03", "newUsers": 12, "contentCreated": 45, "activeUsers": 120 }
    ]
  }
}
```
- `date` is always the X axis
- Every other key in the point object becomes a line series
- Keys are converted to human-readable labels (camelCase -> Title Case)
- Colors are auto-assigned from a predefined palette

**Chart library**: Recharts (lightweight, React-native, used commonly with shadcn/ui).

**Loading state**: Skeleton placeholder matching chart dimensions.

**Error state**: Inline error message with retry button.

---

### 2.5 DataTable

**Purpose**: Generic paginated, sortable, searchable table that works for both users and content (and any future entity type).

**Type**: Client Component (interactive sorting, pagination, search)

**Props**:
```typescript
interface DataTableProps<T> {
  // Data
  data: T[];
  meta: PaginationMeta;

  // Column definitions
  columns: ColumnDef<T>[];

  // URL-driven state
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    sort?: string;
    order?: string;
    [key: string]: string | undefined;  // additional filters
  };

  // Callbacks
  onRowClick?: (item: T) => void;
  baseUrl: string;                       // For building pagination/sort URLs

  // Optional features
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  exportAction?: () => void;
  emptyState?: {
    icon: ReactNode;
    title: string;
    description: string;
  };
}

interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface FilterDefinition {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

**How it consumes the standard API**:
- Reads `data[]` array for table rows
- Reads `meta` object for pagination controls
- Builds URLs with search params for server-side pagination/sorting
- Each column's `render` function handles the display of that column's data

**Column click -> sort behavior**:
1. Clicking a sortable column header toggles sort direction
2. Updates URL: `?sort=email&order=asc`
3. Server component re-renders with new data

**Pagination behavior**:
- Shows page numbers: `< 1 2 3 ... 63 >`
- Shows "Showing 1-20 of 1,250"
- Page size selector: [10] [20] [50] [100]
- All state lives in URL search params

**How one DataTable works for both users and content**:
```typescript
// Users page
<DataTable<AdminUser>
  data={users}
  meta={meta}
  columns={[
    { key: "email", header: "Email", sortable: true, render: (u) => u.email },
    { key: "name", header: "Name", sortable: true, render: (u) => u.name || "-" },
    { key: "role", header: "Role", render: (u) => <Badge>{u.role}</Badge> },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { key: "lastActiveAt", header: "Last Active", sortable: true, render: (u) => <TimeAgo date={u.lastActiveAt} /> },
  ]}
  searchPlaceholder="Search users by email or name..."
  filters={[
    { key: "status", label: "Status", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "suspended", label: "Suspended" },
    ]},
    { key: "role", label: "Role", options: dynamicRoleOptions },
  ]}
  onRowClick={(user) => router.push(`/p/${product}/users/${user.id}`)}
  baseUrl={`/p/${product}/users`}
/>

// Content page - same component, different columns
<DataTable<AdminContentItem>
  data={content}
  meta={meta}
  columns={[
    { key: "title", header: "Title", sortable: true, render: (c) => c.title },
    { key: "type", header: "Type", render: (c) => <Badge variant="outline">{c.type}</Badge> },
    { key: "author", header: "Author", render: (c) => c.author.name || "Unknown" },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "updatedAt", header: "Updated", sortable: true, render: (c) => <TimeAgo date={c.updatedAt} /> },
  ]}
  searchPlaceholder="Search content by title..."
  filters={[
    { key: "status", label: "Status", options: statusOptions },
    { key: "type", label: "Type", options: contentTypeOptions },
  ]}
  onRowClick={(item) => router.push(`/p/${product}/content/${item.id}`)}
  baseUrl={`/p/${product}/content`}
/>
```

**shadcn components used**: `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`, `Input`, `Select`, `Button`

---

### 2.6 EntityDetail

**Purpose**: Generic detail view for any entity (user, content item) with tabs for different data sections.

**Type**: Mix of Server Component (data fetching) and Client Component (tab interaction)

**Props**:
```typescript
interface EntityDetailProps {
  // Header
  title: string;
  subtitle?: string;
  backLink: { href: string; label: string };

  // Tabs
  tabs: TabDef[];
  defaultTab?: string;

  // Actions sidebar
  actions?: ActionDef[];
}

interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;        // e.g., activity count
}

interface ActionDef {
  action: string;                  // action name from /meta supportedActions
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "outline";
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  params?: Record<string, unknown>;   // default params for the action
  paramsForm?: ParamFormField[];      // if action needs user input (e.g., credits amount)
}

interface ParamFormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];  // for select type
  placeholder?: string;
  defaultValue?: string | number;
}
```

**Layout**:
```
+----------------------------------------------+
| [< Back to Users]                            |
|                                              |
| [Avatar] Title                  [Actions]    |
|          Subtitle               panel on     |
|                                 the right    |
| [Tab 1] [Tab 2] [Tab 3]                     |
| --------------------------------------------|
|                                              |
| Tab content area                             |
|                                              |
+----------------------------------------------+
```

**On responsive (< md)**:
- Actions panel moves below the title
- Actions become a horizontal scrollable row of buttons
- Tabs become horizontally scrollable

**shadcn components used**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Card`, `Button`, `Dialog`

---

### 2.7 ActionPanel

**Purpose**: Renders available actions for an entity based on the product's `/meta` `supportedActions`. Executes actions via the product's API.

**Type**: Client Component (interactive buttons, forms, confirmations)

**Props**:
```typescript
interface ActionPanelProps {
  productSlug: string;
  entityType: "users" | "content" | "operations";
  entityId?: string;                 // required for users/content, not for operations
  supportedActions: string[];        // from /meta
  onActionComplete?: () => void;     // callback to refresh parent data
}
```

**How it consumes the API**:
1. Reads `supportedActions` from the product's `/meta` response (passed as prop)
2. For each supported action, renders a button with:
   - Label: derived from action name (snake_case -> Title Case)
   - Icon: mapped from a predefined set (add_credits -> CreditCard, delete -> Trash, etc.)
   - Variant: destructive actions (delete, suspend) get red variant
3. Clicking an action:
   - If action needs params: opens a form dialog
   - If action is destructive: opens a confirmation dialog
   - Executes: `POST /api/admin/v1/{entityType}/{entityId}/actions` with `{ action, params }`
4. Shows result in a toast notification

**Action icon mapping**:
| Action Pattern | Icon | Variant |
|---------------|------|---------|
| `add_credits` | CreditCard | default |
| `export_*` | Download | outline |
| `send_*` | Send | outline |
| `reset_*` | RefreshCw | outline |
| `delete_*`, `remove_*` | Trash | destructive |
| `suspend`, `ban` | Ban | destructive |
| `publish` | Globe | default |
| `unpublish` | GlobeLock | outline |
| `feature` | Star | default |
| `regenerate` | RefreshCw | default |
| `cleanup_*` | Trash2 | outline |
| `reindex_*` | Search | outline |
| (default) | Play | default |

---

### 2.8 ActivityFeed

**Purpose**: Displays a chronological list of events from `/analytics/activity`.

**Type**: Client Component (auto-refresh, pagination, real-time updates)

**Props**:
```typescript
interface ActivityFeedProps {
  productSlug: string;
  limit?: number;                // default: 10
  autoRefresh?: boolean;         // default: true
  refreshInterval?: number;      // default: 30000 (30s)
  showLoadMore?: boolean;        // default: true
  compact?: boolean;             // default: false (compact mode for sidebar use)
}
```

**How it consumes the API**:
- Fetches: `GET /analytics/activity?pageSize={limit}&page=1`
- Maps each event to a feed item:
  ```
  [event.type icon] event.description                    timeago(event.timestamp)
                     by event.actor.name (if present)
  ```
- "Load more" fetches the next page
- Auto-refresh polls the endpoint every 30s and prepends new events

**Event type icon mapping**:
| Event Type Pattern | Icon | Color |
|-------------------|------|-------|
| `user.*` | User | blue |
| `content.*` | FileText | purple |
| `credits.*` | CreditCard | green |
| `admin.*` | Shield | orange |
| `system.*` | Server | gray |
| (default) | Activity | gray |

**Compact mode** (for dashboard sidebar):
- No actor info, shorter descriptions
- Smaller text
- No load more (fixed limit)

**shadcn components used**: `Card`, `Badge`, `Button`, `Skeleton`

---

### 2.9 SearchBar

**Purpose**: Generic search input with debounce that updates URL search params.

**Type**: Client Component

**Props**:
```typescript
interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;    // from current searchParams
  paramName?: string;       // default: "search"
  debounceMs?: number;      // default: 300
}
```

**Behavior**:
1. Renders a text input with search icon
2. On input change, debounces by 300ms
3. Updates URL search param: `?search=value`
4. Resets page to 1 when search changes
5. Shows X clear button when value is non-empty
6. Follows the exact same pattern as story-creator's `UserSearch`, but generalized

**shadcn components used**: `Input`

---

### 2.10 Pagination

**Purpose**: Page navigation controls for list views.

**Type**: Client Component

**Props**:
```typescript
interface PaginationProps {
  meta: PaginationMeta;
  baseUrl: string;
  searchParams: Record<string, string>;
}
```

**Rendering logic**:
- Shows: `< 1 2 3 ... 63 >`
- Always shows first page, last page, and 2 pages around current
- Ellipsis for gaps
- "Showing X-Y of Z" text
- Page size selector dropdown

**shadcn components used**: `Button`, `Select`

---

## 3. Layout Components

### 3.1 Shell

**Purpose**: Root layout wrapping all authenticated pages. Provides sidebar, header, and content area.

**Type**: Server Component (layout)

```typescript
interface ShellProps {
  children: ReactNode;
}
```

**Structure**:
```tsx
<SidebarProvider>
  <div className="flex min-h-screen">
    <AppSidebar products={products} currentProduct={product} />
    <div className="flex-1 flex flex-col">
      <AppHeader breadcrumbs={breadcrumbs} />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  </div>
</SidebarProvider>
```

Uses the shadcn sidebar component system exactly as story-creator does.

### 3.2 AppSidebar

**Purpose**: Left sidebar with navigation.

**Type**: Mix (server data, client interactivity)

**Sections**:
1. **Header**: Freckle logo/wordmark
2. **Product Switcher**: `<ProductSwitcher />` component
3. **Global Nav**: Dashboard, Products (always visible)
4. **Product Nav**: Dynamic based on capabilities (only visible when a product is selected)
5. **Footer**: Settings link

```tsx
<Sidebar>
  <SidebarHeader>
    <Logo />
    <ProductSwitcher products={products} currentProduct={currentProduct} />
  </SidebarHeader>

  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Global</SidebarGroupLabel>
      <SidebarMenu>
        <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem href="/products" icon={Package} label="Products" />
      </SidebarMenu>
    </SidebarGroup>

    {currentProduct && (
      <SidebarGroup>
        <SidebarGroupLabel>{currentProduct.displayName}</SidebarGroupLabel>
        <SidebarMenu>
          <NavItem href={`/p/${slug}`} icon={LayoutDashboard} label="Dashboard" />
          {has("users") && <NavItem href={`/p/${slug}/users`} icon={Users} label="Users" />}
          {has("content") && <NavItem href={`/p/${slug}/content`} icon={FileText} label="Content" />}
          {has("analytics") && <NavItem href={`/p/${slug}/analytics`} icon={BarChart3} label="Analytics" />}
          {has("config") && <NavItem href={`/p/${slug}/config`} icon={Settings} label="Configuration" />}
          {has("operations") && <NavItem href={`/p/${slug}/operations`} icon={Play} label="Operations" />}
        </SidebarMenu>
      </SidebarGroup>
    )}
  </SidebarContent>

  <SidebarFooter>
    <NavItem href="/settings" icon={Settings} label="Settings" />
  </SidebarFooter>
</Sidebar>
```

### 3.3 AppHeader

**Purpose**: Top header bar with breadcrumbs and utility icons.

**Type**: Client Component

```typescript
interface AppHeaderProps {
  breadcrumbs: { label: string; href?: string }[];
}
```

```
+----------------------------------------------------------+
| [=]   Freckle > Story Creator > Users    [?] [Avatar]    |
+----------------------------------------------------------+
```

---

## 4. Standard API Error Handling

All components that fetch from product APIs handle errors consistently.

### 4.1 Error Response Pattern

Every API call returns the standard format:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable" } }
```

### 4.2 Component-Level Error Handling

```typescript
// Shared hook for product API calls
function useProductApi<T>(productSlug: string) {
  async function fetchFromProduct<T>(
    path: string,
    options?: RequestInit
  ): Promise<AdminApiResponse<T>> {
    const product = getProductConfig(productSlug);
    const response = await fetch(`${product.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${product.apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Map HTTP errors to standard format
      if (response.status === 401) {
        return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication failed" } };
      }
      if (response.status === 429) {
        return { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } };
      }
    }

    return response.json();
  }

  return { fetchFromProduct };
}
```

### 4.3 Error Display Components

**ErrorBanner** (page-level errors):
```typescript
interface ErrorBannerProps {
  error: { code: string; message: string };
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

Renders as a full-width banner at the top of the content area with the error message, a retry button, and a dismiss button.

**InlineError** (component-level errors):
```
+------------------------------------------------------+
| [!] Something went wrong: {error.message}   [Retry]  |
+------------------------------------------------------+
```

**Toast notifications** (action results):
- Success: green toast with action result message
- Error: red toast with error message
- Rate limited: yellow toast with "Please wait" message

---

## 5. Data Flow: How Components Connect to the API

### 5.1 Server-Side Data Fetching (List & Detail Pages)

```
Page (Server Component)
  |
  +-- reads URL searchParams (page, search, sort, etc.)
  |
  +-- calls product API server-side:
  |     GET {baseUrl}/users?page=2&search=john&sort=email&order=asc
  |
  +-- passes response to components:
        <DataTable data={response.data} meta={response.meta} ... />
```

The product API base URL and API key are stored in Freckle's product registry (server-side only, never exposed to the client).

### 5.2 Client-Side Data Fetching (Charts, Activity Feed, Actions)

```
Component (Client Component)
  |
  +-- calls Freckle's own proxy API route:
  |     GET /api/proxy/{productSlug}/stats/trends?period=7d
  |
  +-- Freckle proxy route:
  |     1. Looks up product config (baseUrl, apiKey) from registry
  |     2. Forwards request to product API with auth headers
  |     3. Returns response to client
  |
  +-- Component renders the data
```

The proxy pattern ensures API keys never reach the client browser.

### 5.3 Action Execution Flow

```
ActionPanel (Client Component)
  |
  +-- User clicks "Add Credits" button
  |
  +-- If action needs params: shows form dialog
  |     User fills in: amount=100, reason="Compensation"
  |
  +-- If destructive: shows confirmation dialog
  |
  +-- POST /api/proxy/{productSlug}/users/{userId}/actions
  |     Body: { action: "add_credits", params: { amount: 100, reason: "..." } }
  |
  +-- Freckle proxy forwards to product API
  |
  +-- On success: toast("100 credits added"), refresh parent data
  +-- On error: toast(error.message, "error")
```

### 5.4 Proxy API Route Pattern

```typescript
// src/app/api/proxy/[product]/[...path]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { product: string; path: string[] } }
) {
  const product = await getProductFromRegistry(params.product);
  if (!product) return notFound();

  const targetUrl = `${product.baseUrl}/${params.path.join("/")}`;
  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

  const response = await fetch(fullUrl, {
    headers: {
      "Authorization": `Bearer ${product.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
```

---

## 6. Component Patterns

### 6.1 Server Components for Data Fetching

All page-level data fetching happens in server components. This means:
- No loading spinners for initial page load (data is available before HTML is sent)
- Suspense boundaries with skeleton fallbacks for async sections
- URL search params drive filtering/pagination (no client state)

```tsx
// src/app/p/[product]/users/page.tsx (Server Component)

export default async function UsersPage({ params, searchParams }) {
  const product = await getProductFromRegistry(params.product);
  const meta = await fetchProductMeta(product);

  const usersResponse = await fetchFromProduct<AdminUser[]>(
    product,
    `/users?${buildQueryString(searchParams)}`
  );

  if (!usersResponse.success) {
    return <ErrorBanner error={usersResponse.error} />;
  }

  return (
    <DataTable<AdminUser>
      data={usersResponse.data}
      meta={usersResponse.meta!}
      columns={buildUserColumns(meta)}
      searchParams={searchParams}
      baseUrl={`/p/${params.product}/users`}
      onRowClick={/* client component handles navigation */}
    />
  );
}
```

### 6.2 Client Components for Interactivity

Interactive features (search with debounce, tab switching, action execution, chart period selection) use client components.

Pattern: Keep client components small and focused. Pass data down from server components.

```tsx
// Search updates URL, which triggers server re-render with new data
"use client";

export function SearchBar({ defaultValue, paramName = "search" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    params.set("page", "1");   // reset to first page on search
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <Input
      defaultValue={defaultValue}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### 6.3 Generic Typing for DataTable

The DataTable uses TypeScript generics so one component handles any entity:

```typescript
// The generic constraint ensures all entities have an id
interface Identifiable {
  id: string;
}

function DataTable<T extends Identifiable>({ data, columns, ... }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id} onClick={() => onRowClick?.(item)}>
            {columns.map(col => (
              <TableCell key={col.key}>{col.render(item)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 7. Component Implementation Priority

### Phase 1: Foundation (Week 1)
1. **Shell** (layout/shell.tsx) - sidebar + header + content area
2. **AppSidebar** (layout/sidebar.tsx) - navigation with hardcoded items
3. **AppHeader** (layout/header.tsx) - breadcrumbs
4. **HealthBadge** - simple display component
5. **EmptyState** - reusable empty state
6. **ErrorBanner** - error display

### Phase 2: Product Core (Week 2)
7. **ProductSwitcher** - product selection dropdown
8. **StatsGrid** - dashboard stat cards
9. **DataTable** - generic paginated table (users + content)
10. **SearchBar** - search with URL params
11. **Pagination** - page controls
12. **FilterBar** - dropdown filters

### Phase 3: Detail & Actions (Week 3)
13. **EntityDetail** - tabbed detail view
14. **ActionPanel** - action buttons from /meta
15. **ConfirmDialog** - confirmation for destructive actions
16. **ActivityFeed** - event timeline
17. **TrendsChart** - time-series charts

### Phase 4: Operations & Polish (Week 4)
18. **OperationCard** - operation with run/dry-run
19. **OperationHistory** - past operation results
20. **Breadcrumbs** - dynamic breadcrumb trail
21. RTL pass - verify all components work in Hebrew
22. Mobile pass - verify responsive behavior

---

## 8. Shared Utilities

### 8.1 API Consumer Helpers

```typescript
// lib/api/product-client.ts

// Server-side: fetch from product API with auth
export async function fetchFromProduct<T>(
  product: ProductConfig,
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<AdminApiResponse<T>>;

// Build query string from searchParams
export function buildQueryString(
  searchParams: Record<string, string | undefined>
): string;

// Convert API action names to human labels
export function actionToLabel(action: string): string;
// "cleanup_orphaned_images" -> "Cleanup Orphaned Images"

// Format API dates for display
export function formatApiDate(isoString: string): string;
export function timeAgo(isoString: string): string;
```

### 8.2 Type Definitions

```typescript
// types/admin-api.ts
// Re-export all standard types from the Freckle standard (Section 9.1)
// Plus Freckle-specific types:

interface ProductConfig {
  slug: string;
  displayName: string;
  baseUrl: string;
  apiKey: string;          // encrypted at rest
  healthStatus: HealthStatus;
  meta: MetaResponse | null;
  createdAt: string;
  lastCheckedAt: string;
}

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
```

### 8.3 Hooks

```typescript
// hooks/use-product-context.ts
// Provides current product config and capabilities to client components
export function useProductContext(): {
  product: ProductConfig;
  capabilities: string[];
  supportedActions: Record<string, string[]>;
  hasCapability: (cap: string) => boolean;
};

// hooks/use-product-api.ts
// Client-side API calls through the proxy
export function useProductApi(productSlug: string): {
  get: <T>(path: string) => Promise<AdminApiResponse<T>>;
  post: <T>(path: string, body: unknown) => Promise<AdminApiResponse<T>>;
  patch: <T>(path: string, body: unknown) => Promise<AdminApiResponse<T>>;
  del: <T>(path: string) => Promise<AdminApiResponse<T>>;
};
```

---

## 9. Internationalization (i18n) Strategy

Following the story-creator pattern with next-intl:

### 9.1 Translation Keys Structure

```json
{
  "freckle": {
    "nav": {
      "dashboard": "Dashboard",
      "products": "Products",
      "users": "Users",
      "content": "Content",
      "analytics": "Analytics",
      "configuration": "Configuration",
      "operations": "Operations",
      "settings": "Settings"
    },
    "productSwitcher": {
      "selectProduct": "Select a product...",
      "searchProducts": "Search products...",
      "registerNew": "Register new product"
    },
    "health": {
      "healthy": "Healthy",
      "degraded": "Degraded",
      "unhealthy": "Unhealthy",
      "unknown": "Unknown"
    },
    "common": {
      "search": "Search",
      "filter": "Filter",
      "export": "Export",
      "retry": "Retry",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "save": "Save",
      "delete": "Delete",
      "back": "Back",
      "showingXofY": "Showing {from}-{to} of {total}",
      "perPage": "per page",
      "noResults": "No results found",
      "loading": "Loading..."
    },
    "errors": {
      "connectionFailed": "Cannot connect to {product}",
      "authFailed": "Authentication failed for {product}. Check the API key.",
      "rateLimited": "Rate limited. Please wait a moment.",
      "unknownError": "Something went wrong"
    }
  }
}
```

### 9.2 Hebrew Translation

All UI strings will have Hebrew translations. Product-specific data (user names, content titles) remains in its original language. The admin UI chrome (navigation, labels, buttons) fully supports Hebrew RTL.

---

## 10. Testing Strategy for Components

### 10.1 Unit Tests

Each component gets a unit test file:
- Renders with expected props
- Handles empty/error states
- Keyboard navigation works
- Correct accessibility attributes

### 10.2 Integration Tests

- DataTable + SearchBar + Pagination work together
- ActionPanel executes actions and shows results
- ProductSwitcher navigates to correct product

### 10.3 Visual Regression (Future)

Storybook stories for each component, used for visual regression testing. Story-creator already has Storybook set up -- Freckle can share the same infrastructure.
