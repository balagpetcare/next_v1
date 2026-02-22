# Products List UI – Implementation Notes

**Date:** 2026-02-20  
**Scope:** Phase 1 – Owner panel `/owner/products` with premium UI and reusable kit.

---

## What changed

### New: Products List UI Kit (`src/components/products-ui/`)

- **productsPermissions.ts** – `getProductsCapabilities(me)`, `buildBulkActions(capabilities)`, `filterColumnsByCapabilities()`. Role-based (OWNER / MANAGER / STAFF) with safe fallbacks.
- **productsViewState.ts** – View mode (table/grid), density (compact/comfortable), page size persisted in localStorage per user/role/org.
- **productsColumns.ts** – Column definitions; cost/margin columns hidden when user lacks permission.
- **types.ts** – `ProductListItem`, `ProductsFiltersState`, `ProductSort`, `ProductsKpiStats`.
- **ProductsPageHeader.tsx** – Sticky header: title, “Showing X of Y”, search (debounced by parent), view toggle (Table | Grid), density (table only), Export, Import link, “+ Add Product”.
- **ProductsKpiStrip.tsx** – KPI cards: Total, Active, Inactive, Low Stock (hidden if no data), Draft, Pending. Stats derived from current page when backend doesn’t provide counts.
- **ProductsFiltersPanel.tsx** – Collapsible panel: Status, Approval, Category, Brand, Sort, Reset; optional Saved Views (localStorage) hook.
- **ProductsGrid.tsx** – Card grid with thumbnail, name, variant count, status/approval badges, View/Edit/Delete (permission-gated).
- **ProductDetailsDrawer.tsx** – Right-side Offcanvas with tabs: Overview, Pricing, Inventory, Variants, Media, Activity. Uses GET `/api/v1/products/:id`; Pricing/Inventory gated by permissions; ESC closes.
- **BulkActionBar.tsx** – Shows when items selected; actions from `buildBulkActions()` (Activate/Deactivate, Submit for approval, Publish, Export, Delete). “Clear” to deselect.
- **EmptyState.tsx** – “No products found” with primary/secondary CTAs (configurable).
- **LoadingSkeleton.tsx** – Table or grid skeleton (placeholder rows/cards).
- **index.ts** – Re-exports all public API.

### Updated: Owner products page (`app/owner/(larkon)/products/page.tsx`)

- **Data:** Fetches `GET /api/v1/products` with `page`, `limit`, `search`, `status` (and optional `approvalStatus`, `categoryId`, `brandId`, `sort` for future backend).
- **Layout:** Sticky header → KPI strip → Collapsible filters → Bulk bar (when selection) → Table or Grid → Pagination (page + page size).
- **Behavior:** Debounced search 300 ms; Enter applies search immediately. View mode and density persisted via `productsViewState`. Row/card click opens ProductDetailsDrawer (no navigation). Checkbox selection for bulk actions. Quick Add modal retained (create/edit product + variants).
- **Reuse:** Uses existing `_components/ProductsTable` and existing `apiFetch`, `useMe`, owner `notify`. Categories/brands from `/api/v1/meta/categories` and `/api/v1/meta/brands`.

### Global CSS (`app/globals.css`)

- `.products-table-wrapper thead th` – sticky header.
- `.table-row-clickable` – cursor and hover for clickable rows.

### Unchanged

- Routes: `/owner/products`, `/owner/products/new`, `/owner/products/master-catalog`, `/owner/products/[id]`, etc.
- API contract: no breaking changes; optional query params added for future use.
- Master catalog, product detail, edit, variants, pricing, locations pages – not modified.

---

## How to reuse for Staff / Manager pages later

1. **Use the same kit** from `@/src/components/products-ui`:
   - Same header, KPI strip, filters panel, grid, drawer, bulk bar, empty/skeleton.
   - Pass role-specific links (e.g. `getProductLink`, `getEditLink`) and base paths (e.g. `/staff/products`, `/manager/products`).
   - Use `getProductsCapabilities(me)` so Staff/Manager get reduced actions and hidden cost/margin.

2. **Data source:** Point list fetch to the same or a role-scoped endpoint (e.g. branch-scoped products for staff). Keep the same response shape (`data[]`, `pagination`) so the same types and components work.

3. **Saved views:** `productsViewState` already keys by `userId`, `role`, `orgId`, `branchId`; staff/manager will get separate stored view/density per scope.

4. **Notify:** ProductDetailsDrawer currently imports `notify` from `@/app/owner/_components/Notification`. For staff/manager, either provide a context-based toast or pass an optional `notify` prop so a different panel can inject its own.

---

## TODOs

- [ ] Backend: Add `approvalStatus`, `categoryId`, `brandId`, `sort` to GET `/api/v1/products` and include `category`, `brand`, `media` in list response so filters and KPI match.
- [ ] Backend: Optional counts in list response (e.g. `counts: { active, inactive, draft }`) so KPI strip doesn’t rely only on current page.
- [ ] Saved Views: Phase-1 uses localStorage; add “Save current filters as view” and “Load view” in filters panel using `productsViewState` or a dedicated key.
- [ ] Staff/Manager product list pages: Create pages under `app/staff/...` and `app/manager/...` (or branch dashboard) and wire the same kit with role-specific links and capabilities.
- [ ] Bulk status: If backend adds bulk activate/deactivate, wire `handleBulkAction("activate" | "deactivate")` and set `hasBulkStatusEndpoint: true` in `buildBulkActions`.

---

## Manual test checklist (10 bullets)

1. Open `http://localhost:3104/owner/products` – list loads with sticky header, KPI strip, filters, table or grid.
2. Change view to Grid – cards show; switch back to Table – table shows; refresh – view mode persists.
3. Type in search – after ~300 ms list updates; press Enter – list updates immediately if different.
4. Change Status / Approval / Category / Brand / Sort – list and pagination update; page resets to 1.
5. Click a row (or card) – Product details drawer opens with tabs; switch tabs (Overview, Pricing, Variants, Media, Activity); press ESC – drawer closes.
6. Select several rows (or cards) – bulk action bar appears; run “Submit for approval” or “Publish” or “Export” – actions run; “Clear” – selection cleared.
7. Click “+ Add Product” – Quick Add modal opens; create product (with or without variants) – modal closes, list refreshes.
8. Edit product from Quick Add (e.g. via row action if wired) or from drawer “Edit” – behavior unchanged.
9. Pagination: change page size, click Next/Previous – list and page info update.
10. No console errors; links to New Product, Master Catalog, product detail, edit, variants, pricing, locations work.
