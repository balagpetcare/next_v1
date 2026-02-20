# Owner Products Page Redesign (Option A)

## Summary

The `/owner/products` page (port 3104) was redesigned with a toolbar, modern table, Quick View drawer, filters, sort, pagination, bulk actions, and improved empty/loading/error states.

## Backend (backend-api)

### List API extended

- **GET /api/v1/products** now supports:
  - `approvalStatus` – filter by DRAFT | PENDING_APPROVAL | APPROVED | PUBLISHED
  - `categoryId`, `brandId` – filter by category/brand
  - `sort` – `updated_desc` | `updated_asc` | `name_asc` | `name_desc`
  - Search (`search`) now also matches variant SKU and barcode
- List response includes per product:
  - `category: { id, name }`, `brand: { id, name }`
  - `media` – first image only: `[{ id, media: { id, url } }]` for table thumbnails

### Files touched

- `src/api/v1/modules/products/products.service.ts` – getProducts: approvalStatus, categoryId, brandId, sort, search (sku/barcode), include category, brand, media (first with url)
- `src/api/v1/modules/products/products.controller.ts` – pass approvalStatus, categoryId, brandId to service

## Frontend (bpa_web)

### New components (under `app/owner/(larkon)/products/_components/`)

- **products.types.ts** – `ProductListItem`, `ProductsFilters`, `ProductSort`
- **ProductsToolbar.tsx** – Search (debounced by parent), Status / Approval / Category / Brand filters, Sort, Bulk actions (Submit for approval, Publish, Export CSV), New Product + Browse Catalog
- **ProductsTable.tsx** – Sticky header, row click → Quick View, checkboxes, columns: Product (thumb + name), SKU, Variants, Stock (—), Price (—), Status badges, Updated, Actions (View, Edit, Variants, Full page, Delete). Mobile: card list
- **ProductQuickViewDrawer.tsx** – Right Offcanvas: summary, first image, status badges, variants mini-table, CTAs (Manage Variants, Edit, Pricing, Stock, Submit/Publish, View full page)
- **ProductsTableSkeleton.tsx** – Table skeleton loader
- **ProductsEmptyState.tsx** – Empty state with “Create product” and “Browse catalog” CTAs
- **ProductsErrorState.tsx** – Error message + “Try again” button

### Page (`app/owner/(larkon)/products/page.tsx`)

- Uses GET /api/v1/products with `page`, `limit`, `search`, `status`, `approvalStatus`, `categoryId`, `brandId`, `sort`
- Debounced search (300ms)
- Pagination (Previous/Next) when totalPages > 1
- Quick Add modal kept (create/inline edit product name, status, variants)
- Quick View drawer opens on row click or eye icon
- Bulk: select rows → Submit for approval / Publish (per-item API calls) or Export CSV (client-side)
- Responsive: mobile uses card list and compact toolbar
- Styling: `radius-12`, existing card/btn/badge, sticky table header and row hover in `app/globals.css`

### Global CSS (`app/globals.css`)

- `.products-table-wrapper thead th` – sticky header when scrolling
- `.table-row-clickable` – cursor and hover style for table rows

## Routes unchanged

- `/owner/products` – list (redesigned)
- `/owner/products/new` – create product
- `/owner/products/master-catalog` – browse catalog
- `/owner/products/[id]` – detail
- `/owner/products/[id]/edit` – edit
- `/owner/products/[id]/variants` – variants
- `/owner/products/[id]/pricing` – pricing
- `/owner/products/[id]/locations` – locations

## Regression check

1. Open http://localhost:3104/owner/products – list loads with toolbar, table, pagination.
2. Search, change filters, sort – list updates; page resets to 1 when filters change.
3. Click a row or eye icon – Quick View drawer opens with product and variants.
4. From drawer: Manage Variants, Edit, Pricing, Stock, Submit/Publish, View full page – navigate correctly.
5. Select rows → Submit for approval / Publish / Export CSV – bulk actions run.
6. Quick Add – create product; table refreshes.
7. /owner/products/new, /owner/products/[id], /owner/products/[id]/edit – unchanged; all links work.
8. Mobile width – cards list and wrapping toolbar.

## Optional follow-ups

- Stock column: backend could add inventory sum per product to list response; then show sum + “Low” badge.
- Price column: backend could add min/max price from pricing table to list response.
- Assign category bulk: modal to pick category and PATCH selected product IDs (backend could add bulk PATCH).
- Filter sheet on mobile: replace inline filters with a “Filters” button that opens a bottom sheet.
