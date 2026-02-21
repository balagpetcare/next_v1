# Products List UI – Scan Summary

**Date:** 2026-02-20  
**Scope:** Owner panel `/owner/products` (Phase 1). Reusable kit for future Staff/Manager product list pages.

---

## A) Current products list pages

| Route | File | Status |
|-------|------|--------|
| **Owner** | `app/owner/(larkon)/products/page.tsx` | Simple list: single fetch, no pagination/filters; inline table + Quick Add modal. **Does not use** existing Larkon _components. |
| Staff products | — | Not found under `app/staff/**/products`. |
| Manager products | — | Not found under `app/manager/**/products`. |
| Branch products | `app/owner/(larkon)/branches/[id]/products/page.jsx` | Separate flow (branch-scoped). |

**Finding:** Existing rich components live under `app/owner/(larkon)/products/_components/` but are **not** used by the main products page: `ProductsToolbar`, `ProductsTable`, `ProductQuickViewDrawer`, `ProductsTableSkeleton`, `ProductsEmptyState`, `ProductsErrorState`, `products.types.ts`. The main page is a simpler implementation.

---

## B) Existing list/table/grid components and patterns

- **ProductsTable.tsx** – Checkboxes, row click → quick view, columns: Product (thumb + name), SKU, Variants, Stock (—), Price (—), Status, Updated, Actions. Mobile: card list. Uses `ProductListItem` from `products.types.ts`.
- **ProductsToolbar.tsx** – Search, Status/Approval/Category/Brand/Sort filters; bulk actions (Submit for approval, Publish, Export CSV); New Product, Browse Catalog. Uses `ProductsFilters`, `ProductSort`. Loads categories/brands from `/api/v1/meta/categories`, `/api/v1/meta/brands`.
- **ProductQuickViewDrawer.tsx** – Bootstrap `Offcanvas` right-side; product summary, image, status badges, variants table; CTAs: Manage Variants, Edit, Pricing, Stock, Submit/Publish, View full. Uses `apiFetch(`/api/v1/products/${id}`)`, `notify` from `@/app/owner/_components/Notification`.
- **ProductsTableSkeleton.tsx** – Table placeholder rows (Bootstrap placeholders).
- **ProductsEmptyState.tsx** – Icon, “No products found”, Create product + Browse catalog links.
- **ProductsErrorState.tsx** – Alert + “Try again” button.
- **Design tokens** – `radius-12`, `btn btn-primary radius-12`, `badge bg-success-focus text-success-main radius-12`, `card radius-12`, Remix icons (`ri-*`). Toolbar CSS: `ProductsToolbar.module.css` (flex, wrap, responsive).

---

## C) Data source and API

- **Endpoint:** `GET /api/v1/products`
- **Current query params (backend):** `page`, `limit`, `status`, `search`. Optional: `branchId`, `orgId` (server-derived from auth).
- **Backend does not yet support (controller):** `approvalStatus`, `categoryId`, `brandId`, `sort`. Product model has `approvalStatus`; list response does not include category, brand, or media in current service.
- **Response shape:**  
  `{ success: true, data: Product[], pagination: { page, limit, total, totalPages } }`  
  No `counts` or analytics in response; KPIs must be derived from current page data or omitted.
- **Frontend types (`products.types.ts`):** `ProductListItem` includes `approvalStatus`, `category`, `brand`, `media` for when backend is extended.

**Decision:** Use existing params only; send optional `approvalStatus`, `categoryId`, `brandId`, `sort` in query string for future backend support. If backend ignores them, filters/sort can be applied client-side for current page only (or filters disabled until backend supports). KPI strip: derive from `items` on current page or hide cards when no counts.

---

## D) Refactor approach (minimal impact)

1. **Reuse:** Keep and use existing `_components`: ProductsTable, ProductQuickViewDrawer, ProductsToolbar, ProductsTableSkeleton, ProductsEmptyState, ProductsErrorState. Extend where needed (e.g. density, view toggle).
2. **New shared kit:** Add `src/components/products-ui/` with:  
   - Utilities: `productsPermissions.ts`, `productsViewState.ts`, `productsColumns.ts`  
   - New layout components: ProductsPageHeader (sticky), ProductsKpiStrip, ProductsFiltersPanel (collapsible), ProductsGrid, BulkActionBar, shared EmptyState/LoadingSkeleton  
   - ProductDetailsDrawer: wrap/enhance ProductQuickViewDrawer with tabbed sections and ESC handling.
3. **Owner page:** Refactor `app/owner/(larkon)/products/page.tsx` to:  
   - Fetch with `page`, `limit`, `search`, `status` (and optional params when supported).  
   - Use sticky header (ProductsPageHeader), KPI strip (derived from current data), filters panel (existing toolbar filters in collapsible panel), Table + Grid view (same data), right-side drawer (ProductQuickViewDrawer), bulk action bar, pagination.  
   - Keep Quick Add modal and existing create/edit/delete behavior; no route or API changes.
4. **Styling:** Use existing `radius-12`, Bootstrap utilities, `ProductsToolbar.module.css` patterns; add minimal CSS only for sticky header and grid cards.

---

## E) Touch points (confirmed)

- **Modified:** `app/owner/(larkon)/products/page.tsx`
- **New:** `src/components/products-ui/*` (utilities + components), `docs/PRODUCTS_UI_SCAN_SUMMARY.md`, `docs/PRODUCTS_UI_IMPLEMENTATION_NOTES.md`
- **Unchanged:** Routes, API contract, `_components` (ProductsTable, ProductsToolbar, ProductQuickViewDrawer, etc.) – used as-is or via thin wrappers; master-catalog, new, [id], edit, variants, pricing, locations pages untouched.
