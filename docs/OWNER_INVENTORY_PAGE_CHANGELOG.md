# Owner Inventory Page — Changelog

## Summary

The Owner Inventory page (`/owner/inventory`, port 3104) was upgraded to a Larkon-style UI with filters, KPI cards, table, empty state, row actions dropdown, and wiring to existing APIs. No new design system; only existing components and Bootstrap/Larkon patterns were used.

## What changed

### File modified

- **`app/owner/(larkon)/inventory/page.tsx`** — Full redesign and wiring (single file).

### Layout and structure

- **PageHeader** — Breadcrumb (Owner → Inventory), title "Stock", subtitle "Ledger-based stock (adjust via request)". Reuses `@/app/owner/_components/shared/PageHeader`.
- **Filter bar** — Single card with Branch (from `GET /api/v1/owner/branches`), Search (name/SKU), Status (All / Low stock / Out of stock), Reset and Refresh buttons. Same pattern as stock-requests and expiry pages.
- **KPI summary row** — Four cards: Total SKUs, Total Stock Qty, Low Stock, Out of Stock. Data from `GET /api/v1/inventory/dashboard` when available (branchId optional); placeholders "—" until wired. Uses `card radius-12`, `ri-*` icons.
- **Main table** — Columns: Product, SKU, Branch, Available, Reserved, In Transit (— with tooltip), Reorder level, Status (badge), Actions (dropdown). Table wrapped in `table-responsive` inside card; `table table-hover align-middle`, `thead.bg-light`. Status badges: `badge radius-12` with `bg-success`, `bg-warning`, `bg-danger`.

### Empty state

- Replaced plain "No inventory items found." with Larkon-style block: icon (`ri-box-3-line`), heading, explanation ("Inventory is calculated from Stock Ledger entries…"), primary CTA "View Stock Requests" → `/owner/inventory/stock-requests`, secondary "Go to Products" → `/owner/products`. Optional "Select a branch" state left in code (noBranchSelected) for future use.

### Data and API

- **List** — `ownerGet("/api/v1/inventory?page=&limit=&branchId=&search=&lowStockOnly=")` instead of `apiFetch`. Pagination from response; page/limit in state.
- **Dashboard** — `ownerGet("/api/v1/inventory/dashboard?branchId=")` for KPI cards (totalSkus, totalStockQty, lowStockCount, outOfStockCount). Rendered with "—" when missing.
- **Branches** — `ownerGet("/api/v1/owner/branches")` for Branch filter.
- **Adjustment request** — Still `ownerPost("/api/v1/inventory/adjustment-requests", body)` (via ownerPost). Toast on success/error via `useToast` and `getMessageFromApiError`.

### Row actions (Larkon dropdown)

- **Actions column** — `react-bootstrap` `Dropdown` (same as owner products table): View in Warehouse, Create Adjustment Request (opens existing modal), Create Transfer Request (link to `/owner/inventory/transfers/new`), View Product (link to `/owner/products/[id]` when productId exists).
- Inline adjustment modal kept; no removal of existing flow.

### Pagination and loading

- **Pagination** — Shared `Pagination` from `@/src/components/common/Pagination` when `totalPages > 1`; align "end".
- **Loading** — Spinner (unchanged pattern) inside card body.

### Behaviour and compatibility

- **Reserved / In Transit** — Available and Reserved from API (`availableQty`, `reservedQty`); In Transit shown as "—" with tooltip (not in summary API).
- **Out of stock filter** — Status "Out of stock" filters current page client-side to `quantity === 0` (backend has no out-only param).
- **No direct stock editing** — Adjustments only via request (modal + API). No other pages or global styles changed.

## Regression risks (mitigated)

- Only `app/owner/(larkon)/inventory/page.tsx` touched; no shared layout or CSS changes.
- Other owner pages (products, stock-requests, transfers, etc.) unchanged.
- API usage aligned with existing owner panel (`ownerGet`/`ownerPost`).

## Docs added

- **`docs/OWNER_INVENTORY_PAGE_PLAN.md`** — Discovery, APIs, components to reuse, files to change, regression risks.
- **`docs/OWNER_INVENTORY_PAGE_CHANGELOG.md`** — This file.
