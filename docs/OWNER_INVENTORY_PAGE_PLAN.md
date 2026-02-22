# Owner Inventory Page Upgrade — Plan

## Phase 0 — Discovery Summary

### 1. Owner Inventory route and files

| Item | Location |
|------|----------|
| **Route** | `/owner/inventory` (App Router) |
| **Page** | `app/owner/(larkon)/inventory/page.tsx` |
| **Styles** | None (uses global `dashboard-main-body`, `card radius-12`, Bootstrap) |
| **API fetches** | `apiFetch("/api/v1/inventory")`, `apiFetch("/api/v1/inventory/alerts")`, `apiFetch("/api/v1/inventory/adjustment-requests" POST)` |

Current page: single card with title/subtitle, Low Stock Alerts button, error alert, loading spinner, empty message ("No inventory items found."), or table (Product, Variant, Branch, Stock, Min Stock, Status, Actions). Adjustment modal for "Request stock adjustment". Uses `apiFetch` (not `ownerGet`).

### 2. Existing shared UI patterns (Larkon-style)

- **PageHeader**: `app/owner/_components/shared/PageHeader.jsx` — breadcrumb, title, subtitle, optional actions. Used in expiry, stock-requests, locations, warehouse, adjustments, receipts.
- **Cards**: `card radius-12`, `card-body`; filter bars in `card radius-12 mb-3` with `row g-3 align-items-end` (stock-requests, expiry, warehouse).
- **Tables**: `table table-hover`, `table-responsive`, `thead`/`tbody`, badges `badge radius-12`, `bg-success-focus`, `bg-warning-focus`, `bg-danger-focus` (existing inventory page).
- **Icons**: `ri-*` (Remix), e.g. `ri-alert-line`, `ri-edit-line`, `ri-box-3-line` (products empty state).
- **Pagination**: `src/components/common/Pagination.tsx` — `currentPage`, `totalPages`, `onPageChange`, `align` ("center" \| "end").
- **Empty state**: Products use icon + title + message + primary/secondary/reset CTAs (`btn btn-primary radius-12`, `btn btn-outline-*`). Stock-requests: simple card body text.
- **Dropdown actions**: Bootstrap `Dropdown`, `DropdownToggle`, `DropdownMenu`, `DropdownItem` (e.g. purchase-returns, role-list). Or single "…" button with dropdown (products table).

### 3. API endpoints (existing)

| Endpoint | Params | Use |
|----------|--------|-----|
| **GET /api/v1/inventory** | branchId, locationId, search, lowStockOnly, page, limit | List (ledger-derived). Uses req.user; branchMember or query.branchId. |
| **GET /api/v1/inventory/summary** | Same as above | Same list contract. |
| **GET /api/v1/inventory/dashboard** | branchId, locationId, orgId | Cards: totalSkus, lowStockCount, expiringCount. |
| **GET /api/v1/inventory/locations** | — | List locations (user-accessible). |
| **GET /api/v1/inventory/alerts** | branchId | Low stock alerts. |

Owner panel uses `ownerGet` from `app/owner/_lib/ownerApi.ts` (same-origin fetch with credentials). Warehouse page calls `ownerGet("/api/v1/inventory?locationId=...&limit=100")`. So backend accepts owner auth for these routes.

### 4. Files to change

| File | Change |
|------|--------|
| `app/owner/(larkon)/inventory/page.tsx` | Only file to modify: full UI/wiring/actions. |

No new design system; no new global styles. Reuse: PageHeader, Pagination, card/table/badge/form-select/btn classes, ri-* icons.

### 5. Components to reuse

- **PageHeader** — breadcrumb (Owner → Inventory), title "Stock" (or "Inventory"), subtitle "Ledger-based stock (adjust via request)".
- **Pagination** — when `totalPages > 1`; align "end".
- **Card + table** — `card radius-12`, `table-responsive`, `table table-hover`, `badge radius-12` for status.
- **Empty state** — inline block with icon (`ri-box-3-line` or similar), message, primary CTA "View Stock Requests" → `/owner/inventory/stock-requests`, secondary "Go to Products" → `/owner/products`.
- **Filter bar** — same pattern as stock-requests/expiry: card with row of form-select/form-control (Branch, Search, Status, optional Category/Date), Reset.
- **KPI strip** — summary cards row (Total SKUs, Total Stock Qty, Low Stock, Out of Stock); values from GET /api/v1/inventory/dashboard when available, else placeholder then wire.

### 6. Regression risks

- Changing `apiFetch` to `ownerGet` for inventory/alerts/dashboard — low risk (owner panel already uses ownerGet elsewhere; same cookies).
- Adding filters/query params — ensure backend supports branchId/locationId/search/lowStockOnly for owner context (already does).
- Row actions dropdown — no removal of existing "Request adjustment" flow; add dropdown that includes it.
- Other owner pages — no shared layout/global CSS changes; only inventory page.tsx touched.

### 7. Routes for CTAs and actions

| Purpose | Route |
|---------|--------|
| Stock Requests list | `/owner/inventory/stock-requests` |
| Create Adjustment Request | `/owner/inventory/adjustments/new` |
| Adjustments list | `/owner/inventory/adjustments` |
| Transfers list | `/owner/inventory/transfers` |
| New Transfer | `/owner/inventory/transfers/new` |
| Warehouse (location-based stock) | `/owner/inventory/warehouse` |
| Products | `/owner/products` |
| Product detail | `/owner/products/[id]` (if exists) |

No dedicated "inventory ledger" page found; "View Ledger" can link to Warehouse (location-scoped) or be omitted / left as TODO.

---

## Implementation order

1. **Phase 1** — Layout: PageHeader, breadcrumb, filter card (Branch, Search, Status), KPI cards row (placeholders), main card with table (columns: Product, SKU, Available, Reserved, In Transit, Reorder Level, Status, Actions), empty state (icon + message + CTAs), responsive table wrapper.
2. **Phase 2** — Wire: ownerGet for list (and dashboard if available), searchParams or local state for filters, pagination, loading skeleton/spinner, toast/error pattern.
3. **Phase 3** — Row actions: dropdown (View in Warehouse, Create Adjustment Request, Create Transfer, View Product), keep existing adjustment modal or link to adjustments/new with state.
4. **Phase 4** — Changelog, typecheck/build, fix any issues.
