# UX Analysis: Accessibility, Responsiveness, and i18n/RTL

**Analyst:** a11y-analyst
**Date:** 2026-02-13
**Scope:** Full audit of all components, pages, layouts, and translation files

---

## Executive Summary

The Freckle Console has a **strong accessibility and i18n foundation**. The root layout correctly sets `lang` and `dir` attributes, a skip-to-content link is present, ARIA attributes are used liberally across components (62 instances across 20 files), translations are 100% complete between en/he, and RTL is handled via logical properties in most custom code. The main issues are: (1) hardcoded English strings in dynamic/generic views, (2) physical direction classes in shadcn/ui primitives that break RTL, (3) some missing ARIA patterns for complex widgets, and (4) a few responsive edge cases in tables and forms.

---

## 1. Accessibility (a11y)

### 1.1 Strengths

| Pattern | Where | Assessment |
|---------|-------|------------|
| Skip-to-content link | `src/app/layout.tsx:30-35` | Correctly implemented with `sr-only` + focus-visible, uses logical `start-4` |
| `main` landmark with `id="main-content"` | `src/components/layout/shell.tsx:24` | Matches skip link target |
| `aria-label` on tables | `data-table.tsx:249`, `products/page.tsx:120` | Tables have descriptive labels |
| `scope="col"` on table headers | `data-table.tsx:260`, `products/page.tsx:123-128` | Correct semantic markup |
| `aria-sort` on sortable columns | `data-table.tsx:254-266` | Dynamically set to ascending/descending |
| `role="alert"` for errors | `error-banner.tsx:24`, `login/page.tsx:40`, `operation-panel.tsx:205` | Assertive live region |
| `aria-live="assertive"` + `aria-atomic="true"` | `error-banner.tsx:25-26` | Correct live region pattern |
| `role="feed"` + `aria-label` for activity | `activity-feed.tsx:169` | Correct feed pattern with `<article>` children |
| `role="search"` on search container | `search-bar.tsx:73` | Correct landmark role |
| `aria-hidden="true"` on decorative icons | Throughout (sort arrows, trend icons, play icons, etc.) | Consistently applied |
| `aria-label` on icon-only buttons | Theme toggle, pagination, delete, edit buttons | All have labels |
| `aria-pressed` on toggle buttons | `trends-chart.tsx:99` | Period selector buttons |
| `aria-current="page"` on pagination | `pagination.tsx:135` | Current page marked |
| `aria-expanded` on combobox | `product-switcher.tsx:47` | Popover trigger |
| `role="group"` for action groups | `operation-panel.tsx:182`, `trends-chart.tsx:92` | Grouped operations |
| `aria-invalid` + `aria-describedby` on login | `login/page.tsx:35-36` | Error association |
| Form labels with `htmlFor` | `schema-form.tsx`, `settings-form.tsx`, `new-product-form.tsx` | Consistent label-input binding |
| Required field indicators | `schema-form.tsx:61,101,170,222,250,267,293,311,331` | Visual `*` with descriptive labels |
| Chart accessibility | `trends-chart.tsx:113-116` | `role="img"` + sr-only text description |
| Keyboard navigation on table rows | `data-table.tsx:222-230, 301-310` | `tabIndex`, Enter/Space handlers |
| `<time dateTime>` for timestamps | `activity-feed.tsx:212` | Correct semantic element |

### 1.2 Issues

#### 1.2.1 [HIGH] Missing `aria-label` on audit log filter selects

**File:** `src/app/audit-log/audit-log-table.tsx:75, 94`

The `<SelectTrigger>` elements lack `aria-label`. Comparison: `data-table.tsx:168-169` correctly uses `aria-label={filter.label}`.

```tsx
// Current (line 75):
<SelectTrigger size="sm" className="w-auto">

// Fix:
<SelectTrigger size="sm" className="w-auto" aria-label={t("filterByProduct")}>
```

Same for the action filter at line 94.

#### 1.2.2 [HIGH] Clickable cards missing accessible role for mobile cards in products page

**File:** `src/app/products/page.tsx:64-115`

The mobile product cards in the products list are visually clickable (they contain links) but the card itself is not the interactive element -- only nested links/buttons are. This is actually fine, but the cards don't have a clear visual focus indicator when navigated with keyboard. The nested `<Link>` elements should be the primary interactive elements. Consider making the product name link the full-card click target on mobile instead of relying on nested interactions.

#### 1.2.3 [MEDIUM] `role="link"` on table rows is non-standard

**File:** `src/components/freckle/data-table.tsx:223, 303`

Using `role="link"` on `<Card>` and `<TableRow>` is non-standard. While keyboard support (Enter/Space) is correctly added, screen readers may not announce these as expected. Consider using `role="row"` (already implied) and instead making the first cell's content a link, or wrapping the entire row in an anchor.

Alternatively, at minimum keep the current approach but ensure the `aria-label` reflects where clicking will navigate to.

#### 1.2.4 [MEDIUM] Missing `aria-label` on image in entity-table

**File:** `src/app/p/[slug]/[capability]/entity-table.tsx:58`

```tsx
<img src={value} alt="" className="size-8 rounded-full object-cover" />
```

The `alt=""` is technically correct for decorative images, but if these are user avatars/thumbnails in a data table, they should have descriptive alt text like `alt={item.name || 'User avatar'}` for screen reader context.

#### 1.2.5 [MEDIUM] Sub-resource table missing `aria-label`

**File:** `src/components/freckle/sub-resource-tab.tsx:96`

```tsx
<table className="w-full text-sm">
```

This `<table>` has no `aria-label` or `<caption>`. Add: `aria-label="Sub-resource data"` or derive from context.

#### 1.2.6 [LOW] Loading states lack screen reader announcements

**Files:** `sub-resource-tab.tsx:50-54`, `activity-feed.tsx:152-162`

Loading spinners use visual-only `<Loader2>` or `<Skeleton>` without `aria-live` regions or sr-only text. Add `role="status"` with sr-only "Loading..." text.

```tsx
// Fix for sub-resource-tab.tsx:50-54:
<div className="flex items-center justify-center py-12" role="status">
  <Loader2 className="size-6 animate-spin text-muted-foreground" />
  <span className="sr-only">Loading...</span>
</div>
```

#### 1.2.7 [LOW] Dialog forms lack required field announcements

**File:** `src/components/freckle/operation-panel.tsx:227-235`

The dialog's `SchemaForm` shows required fields with visual `*` indicators but doesn't use `aria-required` on inputs. The `<Input>` component should receive `required` when the field is required in the schema.

#### 1.2.8 [LOW] Focus management after operations

**File:** `src/components/freckle/operation-panel.tsx:155-166`

After executing a destructive operation (delete), the dialog closes and focus returns to the triggering button, but if the entity is deleted, that button may no longer exist. Consider moving focus to a safe target (e.g., the page heading or back link).

---

## 2. Responsiveness

### 2.1 Strengths

| Pattern | Where | Assessment |
|---------|-------|------------|
| Mobile-first card layout + desktop table | `data-table.tsx:211-245 (cards), 248-327 (table)` | Proper `md:hidden` / `hidden md:block` pattern |
| Products page dual layout | `products/page.tsx:63-184` | Cards on mobile, table on desktop |
| Responsive padding on main content | `shell.tsx:24` | `p-3 sm:p-4 md:p-6` progressive padding |
| Responsive text sizing | `page.tsx:85`, `products/page.tsx:36` | `text-xl sm:text-2xl` |
| Responsive grid columns | `stats-grid.tsx:141` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| Chart height responsive | `trends-chart.tsx:118` | `h-[200px] sm:h-[300px]` |
| Pagination responsive | `pagination.tsx:117-146` | Page numbers hidden on mobile, compact indicator shown |
| Sidebar mobile sheet | `sidebar.tsx` (shadcn) | Mobile: sheet overlay, desktop: collapsible |
| Breadcrumb truncation | `header.tsx:55,64,67` | `flex-nowrap` + `truncate` on items |
| Form layout responsive | `new-product-form.tsx:60` | `max-w-2xl` container |
| Dialog responsive | `operation-panel.tsx:217` | `sm:max-w-lg` |
| Buttons full-width on mobile | `page.tsx:90`, `products/page.tsx:41` | `w-full sm:w-auto` |
| Tab list scrollable | `entity-detail.tsx:64` | `overflow-x-auto` |
| Mobile page-size selector | `pagination.tsx:159-173` | Compact dropdown |

### 2.2 Issues

#### 2.2.1 [HIGH] Audit log table not responsive on mobile

**File:** `src/app/audit-log/audit-log-table.tsx:111-154`

The audit log table uses `overflow-x-auto` but does **not** have a mobile card layout like `DataTable` and `products/page.tsx` do. On small screens, users must horizontally scroll a 6-column table with potentially long content. The table has columns: Timestamp, Product, Action, Entity, Result, Details.

**Recommended fix:** Add a mobile card layout (like `DataTable`'s `md:hidden` cards) or at minimum hide less important columns (Details, Entity) on small screens.

#### 2.2.2 [MEDIUM] Dashboard list view table not responsive

**File:** `src/app/page.tsx:163-192`

`ProductListView` renders a `<Table>` without mobile-specific handling. On small screens this table would overflow. Currently, the default dashboard layout is "grid" (cards) which works fine, but users who switch to "list" layout via settings will see a non-responsive table.

**Recommended fix:** Either disable "list" layout on mobile or add a mobile card fallback.

#### 2.2.3 [MEDIUM] Sub-resource table overflow

**File:** `src/components/freckle/sub-resource-tab.tsx:95-121`

The `SubResourceList` table has `overflow-x-auto` but shows up to 6 columns. On mobile this creates a wide scrollable area. Consider a mobile card layout for consistency with the rest of the app.

#### 2.2.4 [MEDIUM] New product form connection result grid not responsive

**File:** `src/app/products/new/new-product-form.tsx:158`

```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
```

This `grid-cols-2` works on desktop but on very narrow screens (< 320px) the labels and values can overlap. Use `sm:grid-cols-2 grid-cols-1` for safety.

#### 2.2.5 [LOW] Touch target sizes on icon-xs buttons

**Files:** Various uses of `size="icon-xs"` (defined as `size-6` = 24px in `button.tsx:29`)

The minimum recommended touch target size is 44x44px (WCAG 2.5.5) or at least 24x24px (WCAG 2.5.8). At `size-6` (24px), these buttons meet the minimum AAA requirement but not the enhanced AAA target. They have adequate spacing between them which helps.

Affected locations:
- Delete/edit buttons in products list (`products/page.tsx:103,108`)
- Audit log pagination buttons (`audit-log-table.tsx:166,180`)
- Search clear button (`search-bar.tsx:84-92`)

This is not a blocker but worth noting for future improvement.

#### 2.2.6 [LOW] Entity detail tabs can overflow without visual scroll indicator

**File:** `src/components/freckle/entity-detail.tsx:64`

`overflow-x-auto` is set but there's no visual indicator (gradient/fade/arrow) that more tabs exist off-screen. Users may not realize they can scroll.

---

## 3. i18n and RTL

### 3.1 Translation Completeness

**Result: 100% parity between en.json and he.json**

Both files contain **identical key structures** across all 12 namespaces:
- `common` (22 keys) -- match
- `nav` (18 keys) -- match
- `dashboard` (7 keys) -- match
- `products` (28 keys) -- match
- `settings` (15 keys) -- match
- `auth` (7 keys) -- match
- `errors` (9 keys) -- match
- `operationPanel` (2 keys) -- match
- `trends` (1 key) -- match
- `activity` (4 keys) -- match
- `pagination` (6 keys) -- match
- `health` (5 keys) -- match
- `auditLog` (12 keys) -- match

**Total: 136 keys in each file, all matching.**

ICU message format with pluralization is correctly used (e.g., `dashboard.description` uses `{count, plural, ...}` in both languages).

### 3.2 RTL Layout (Logical Properties)

#### 3.2.1 Strengths

| Pattern | Where | Assessment |
|---------|-------|------------|
| Root `dir` attribute | `layout.tsx:28` | Correctly set based on locale |
| Skip link uses `start-4` | `layout.tsx:32` | Logical property |
| Sidebar trigger uses `ms-1` | `header.tsx:50` | Logical property |
| Separator uses `me-2` | `header.tsx:51` | Logical property |
| Search icon uses `start-3` | `search-bar.tsx:74` | Logical property |
| Search input uses `ps-9 pe-9` | `search-bar.tsx:80` | Logical properties |
| Clear button uses `end-2` | `search-bar.tsx:87` | Logical property |
| Sort icon uses `ms-1` | `data-table.tsx:279,282,284` | Logical property |
| Sort button uses `ms-3` | `data-table.tsx:272` | Logical property |
| Breadcrumb auto-separator | `header.tsx:61` | Uses shadcn `BreadcrumbSeparator` |
| Chevron uses `ms-auto` | `product-switcher.tsx:62` | Logical property |
| Activity feed uses `text-end` | `data-table.tsx:238` | Logical property |
| Back button uses `ms-2` | `entity-detail.tsx:41` | Logical property |
| Required asterisk uses `ms-1` | `schema-form.tsx:61,101,170` | Logical property |
| Sidebar group labels | All navigation | Correct rendering |
| Header layout uses `ms-auto` | `header.tsx:78` | Logical property |
| Logout button uses `justify-start` | `sidebar.tsx:147` | Works in both directions |

#### 3.2.2 Issues

#### 3.2.2.1 [HIGH] Hardcoded English strings in generic/dynamic views

Multiple components render English-only strings that are **not** in the translation files:

| File | Line(s) | Hardcoded String(s) |
|------|---------|---------------------|
| `entity-table.tsx` | 133 | `"Search ${capability}..."` |
| `entity-table.tsx` | 137 | `"No ${capability} found"` |
| `entity-table.tsx` | 138 | `"Try adjusting your search or filters."` |
| `[capability]/page.tsx` | 522 | `"Manage ${capability} for ${product.name}"` |
| `[capability]/page.tsx` | 369 | `"No data available for this resource."` |
| `[capability]/page.tsx` | 308 | `"endpoints"` |
| `[id]/page.tsx` | 192 | `"Info"`, `"Stats"`, `"Metadata"`, `"Replies"` |
| `[id]/page.tsx` | 300 | `"Back to ${toTitleCase(capability)}"` |
| `[id]/page.tsx` | 110 | `"No metadata available."` |
| `[id]/page.tsx` | 133 | `"No stats available."` |
| `sub-resource-tab.tsx` | 65 | `"No data available."` |
| `sub-resource-tab.tsx` | 72 | `"No items found."` |
| `schema-form.tsx` | 138 | `"Remove"` |
| `schema-form.tsx` | 155 | `"+ Add entry"` |
| `schema-form.tsx` | 200 | `"Remove"` |
| `schema-form.tsx` | 210 | `"+ Add ${name}"` |
| `schema-form.tsx` | 406 | `"Enabled"` / `"Disabled"` |
| `activity-feed.tsx` | 62-73 | `"just now"`, `"m ago"`, `"h ago"`, `"d ago"`, `"mo ago"` |
| `activity-feed.tsx` | 202 | `"by "` |
| `data-table.tsx` | 274 | `"Sort by ${col.header}"` |
| `page.tsx` (dashboard) | 168 | `"Stats"` (table header) |

**Recommended fix:** Add these to both `en.json` and `he.json` under appropriate namespaces (e.g., `generic`, `entity`, `form`). For dynamically generated strings like `"Manage ${capability}"`, use ICU message format with interpolation.

#### 3.2.2.2 [HIGH] Physical direction classes in shadcn/ui components

These shadcn/ui components use physical `left-`, `right-`, `pl-`, `pr-`, `ml-`, `mr-` classes instead of logical equivalents. While shadcn ships these by default, they break RTL layout:

| File | Specific Classes | Impact |
|------|-----------------|--------|
| `sheet.tsx:65-67` | `right-0`, `left-0`, `border-l`, `border-r`, `slide-out-to-right`, `slide-in-from-right`, etc. | Sheet panels appear on wrong side in RTL |
| `sheet.tsx:78` | `right-4` | Close button mispositioned in RTL |
| `select.tsx:112` | `pr-8 pl-2` | Select item padding reversed |
| `select.tsx:119` | `right-2` | Checkmark on wrong side |
| `command.tsx:166` | `ml-auto` | Shortcut text alignment wrong |
| `dropdown-menu.tsx:95,131` | `pr-2 pl-8` | Menu item padding reversed |
| `dropdown-menu.tsx:101,136` | `left-2` | Indicator on wrong side |
| `dropdown-menu.tsx:158` | `pl-8` | Label padding reversed |
| `dropdown-menu.tsx:187,220` | `ml-auto` | Shortcut/chevron alignment wrong |
| `dialog.tsx:64` | `left-[50%]` | Dialog positioning (less impactful, centered) |
| `dialog.tsx:73` | `right-4` | Close button mispositioned |
| `dialog.tsx:88` | `sm:text-left` | Text alignment wrong in RTL |
| `table.tsx:73` | `text-left` | Table header alignment wrong in RTL |
| `table.tsx:73,86` | `pr-0` | Checkbox padding wrong |
| `sidebar.tsx:234-235` | `left-0`, `right-0` | Sidebar positioning wrong in RTL |
| `sidebar.tsx:294-299` | `right-4`, `left-0`, `left-full`, `right-2`, `left-2` | Rail positioning wrong |
| `sidebar.tsx:313` | `ml-0`, `ml-2` | Inset margin wrong |
| `sidebar.tsx:429` | `right-3` | Close button wrong |
| `sidebar.tsx:564,589` | `right-1` | Menu action/badge positioning wrong |
| `popover.tsx:33` | `slide-in-from-right-2`, `slide-in-from-left-2` | Animation directions swapped |
| `tooltip.tsx:45` | `slide-in-from-right-2`, `slide-in-from-left-2` | Animation directions swapped |
| `tabs.tsx:70` | `-right-1` | Active indicator wrong side |

**Recommended fix:** Convert physical properties to logical equivalents in the shadcn components. Key mappings:
- `left-*` -> `start-*`, `right-*` -> `end-*`
- `pl-*` -> `ps-*`, `pr-*` -> `pe-*`
- `ml-*` -> `ms-*`, `mr-*` -> `me-*`
- `text-left` -> `text-start`, `text-right` -> `text-end`
- `border-l` -> `border-s`, `border-r` -> `border-e`

Note: Some of these (like `dialog.tsx` centering with `left-[50%]`) are directionally neutral and don't need changing.

#### 3.2.2.3 [MEDIUM] `text-right` used in custom code

**Files:**
- `src/app/page.tsx:168` - `"text-right"` on Stats table header
- `src/app/page.tsx:184` - `"text-right"` on Stats table cell
- `src/components/freckle/data-table.tsx:263,317` - `text-right` for right-aligned columns

These should use `text-end` instead for proper RTL support.

#### 3.2.2.4 [MEDIUM] `timeAgo()` function returns English-only relative times

**File:** `src/components/freckle/activity-feed.tsx:60-73`

The `timeAgo()` function returns hardcoded English strings like "just now", "5m ago", "2h ago". These should use ICU `RelativeTimeFormat` or at minimum be translated via the i18n system.

```tsx
// Fix: Use Intl.RelativeTimeFormat or translation keys
const t = useTranslations("activity")
// Add to en.json/he.json:
// "justNow": "just now" / "הרגע"
// "minutesAgo": "{count}m ago" / "לפני {count} דק'"
// etc.
```

#### 3.2.2.5 [MEDIUM] Pagination separator `"-"` may need bidi handling

**File:** `src/components/freckle/pagination.tsx:95`

The `{"-"}` between "from" and "to" numbers renders fine in LTR but could be visually confusing in RTL number ranges. Consider using an en-dash with proper bidi formatting.

#### 3.2.2.6 [LOW] Skip-to-content link not translated

**File:** `src/app/layout.tsx:34`

```tsx
>Skip to main content</a>
```

This should use a translation key since Hebrew users see English text if they Tab.

#### 3.2.2.7 [LOW] Boolean values "Yes"/"No" not translated

**Files:** `entity-table.tsx:91`, `[id]/page.tsx:77`, `sub-resource-tab.tsx:160`

Boolean rendering shows English "Yes"/"No". Add these to translation files.

#### 3.2.2.8 [LOW] Product layout breadcrumb has hardcoded "Freckle"

**File:** `src/app/p/[slug]/layout.tsx:33`

```tsx
{ label: "Freckle", href: "/" },
```

This is a brand name so it's acceptable, but could be confusing in RTL if it appears alongside Hebrew text without bidi isolation.

---

## 4. Color Contrast

### 4.1 Assessment

The application uses oklch color tokens with good contrast ratios in both light and dark themes:

- **Primary text** (foreground on background): High contrast in both themes
- **Muted foreground** (`oklch(0.554 0.046 257.417)` on white): ~4.9:1 contrast ratio -- passes AA for normal text
- **Destructive** (red on light bg): Good visibility
- **Health status colors**: Green/yellow/red/gray with text labels -- not relying on color alone

### 4.2 Potential Issues

#### 4.2.1 [LOW] Muted foreground in dark mode

`--muted-foreground: oklch(0.704 0.04 256.788)` on `--background: oklch(0.129 0.042 264.695)` is approximately 6.8:1 -- good.

#### 4.2.2 [LOW] Chart colors in high-contrast mode

The `LINE_COLORS` in `trends-chart.tsx:30-36` are hardcoded HSL values. In some scenarios (e.g., Windows High Contrast mode), these may not be visible. The chart does include a legend, which helps.

---

## 5. Summary of Findings

### By Priority

| Priority | Count | Category |
|----------|-------|----------|
| HIGH | 3 | Hardcoded English strings (3.2.2.1), Physical RTL classes in shadcn (3.2.2.2), Missing aria-labels on audit filters (1.2.1) |
| MEDIUM | 7 | Non-standard role="link" (1.2.3), Missing img alt text (1.2.4), Sub-resource table no aria-label (1.2.5), Audit log table not responsive (2.2.1), Dashboard list view not responsive (2.2.2), Sub-resource table overflow (2.2.3), text-right in custom code (3.2.2.3), timeAgo not translated (3.2.2.4), Pagination bidi (3.2.2.5), New product form grid (2.2.4) |
| LOW | 7 | Loading state announcements (1.2.6), aria-required on schema fields (1.2.7), Focus management after operations (1.2.8), Touch targets (2.2.5), Tab scroll indicator (2.2.6), Skip link translation (3.2.2.6), Boolean Yes/No translation (3.2.2.7), Breadcrumb brand name (3.2.2.8) |

### Quick Wins (High Impact, Low Effort)

1. Add `aria-label` to audit log filter selects (1 line each, 2 places)
2. Change `text-right` to `text-end` in custom code (4 occurrences)
3. Add `role="status"` + sr-only text to loading spinners
4. Add missing strings to en.json and he.json for generic views
5. Convert physical direction classes in shadcn `table.tsx` (`text-left` -> `text-start`)

### Larger Efforts

1. Add mobile card layout to audit log table (follows existing patterns in DataTable)
2. Convert all shadcn/ui component physical classes to logical equivalents (systematic but many files)
3. Translate all hardcoded dynamic strings (new i18n keys needed)
4. Replace `timeAgo()` with `Intl.RelativeTimeFormat` or translation-based approach

---

## 6. Detailed Fix Recommendations

### 6.1 Add Missing Translation Keys

Add to both `en.json` and `he.json`:

```json
{
  "generic": {
    "search": "Search {entity}...",
    "noResults": "No {entity} found",
    "noResultsDescription": "Try adjusting your search or filters.",
    "manage": "Manage {entity} for {product}",
    "noData": "No data available for this resource.",
    "backTo": "Back to {entity}",
    "info": "Info",
    "stats": "Stats",
    "metadata": "Metadata",
    "replies": "Replies",
    "noMetadata": "No metadata available.",
    "noStats": "No stats available.",
    "noItems": "No items found.",
    "endpoints": "{count, plural, =1 {1 endpoint} other {# endpoints}}",
    "sortBy": "Sort by {column}",
    "skipToContent": "Skip to main content",
    "yes": "Yes",
    "no": "No",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "remove": "Remove",
    "addEntry": "Add entry",
    "addItem": "Add {name}"
  },
  "time": {
    "justNow": "just now",
    "minutesAgo": "{count}m ago",
    "hoursAgo": "{count}h ago",
    "daysAgo": "{count}d ago",
    "monthsAgo": "{count}mo ago"
  }
}
```

### 6.2 Convert shadcn/ui Physical Classes

Priority files for RTL conversion:
1. `table.tsx` - `text-left` -> `text-start` (most visible)
2. `dialog.tsx` - `right-4` -> `end-4`, `sm:text-left` -> `sm:text-start`
3. `select.tsx` - `pr-8 pl-2` -> `pe-8 ps-2`, `right-2` -> `end-2`
4. `sheet.tsx` - Complex, may need conditional rendering based on direction
5. `dropdown-menu.tsx` - `pl-8` -> `ps-8`, `left-2` -> `start-2`, `ml-auto` -> `ms-auto`
6. `sidebar.tsx` - Most complex, sidebar positioning needs careful RTL handling

### 6.3 Audit Log Mobile Layout

Follow the pattern from `data-table.tsx:211-245`:

```tsx
{/* Mobile card layout */}
<div className="space-y-3 md:hidden">
  {logs.map((log) => (
    <Card key={log.id}>
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
          <Badge variant={log.result === "success" ? "secondary" : "destructive"} className="text-xs">{log.result}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
        {log.entityType && <p className="text-xs">{log.entityType}: {log.entityId}</p>}
      </CardContent>
    </Card>
  ))}
</div>
{/* Desktop table */}
<div className="hidden overflow-x-auto md:block">
  {/* ... existing table ... */}
</div>
```
