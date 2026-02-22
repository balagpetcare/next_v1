# New Stock Request — Product Picker UI

## Route

- **Create:** `/staff/branch/[branchId]/inventory/stock-requests/new`

## How to use

1. Go to **Staff → Branch → Inventory → Stock Requests** and click **Create Stock Request** (or open `/staff/branch/{branchId}/inventory/stock-requests/new`).
2. **Left panel (Product Picker):**
   - Use **Search** (name / SKU / barcode) — debounced 400ms; server-side.
   - **Sort:** Recommended (low stock + high usage first), Low stock first, Most used, A–Z.
   - **Stock filter:** All / Low / Out.
   - **Only show selected** — filters the left list to items already in the right panel.
   - **Page size:** 20 / 30 / 50. **Select all on page** adds every product’s chosen variant on the current page to the selection.
   - Each row: checkbox, thumbnail placeholder, product name + SKU + category/brand, **variant dropdown**, stock badge (OK / Low / Out), usage (requested in last 30d). Check the box to add the **currently selected variant** to the right panel.
3. **Right panel (Selected Items):**
   - Lists selected product + variant with qty stepper (+/− and number), optional note, stock badge, and Remove.
   - **Save draft** — stores selection in `localStorage` for this branch (key: `staff-stock-request-draft-{branchId}`). **Restore** — if a draft exists, it loads on page open and a banner appears.
   - **Clear all** — clears selection and removes draft.
   - **Submit** — creates the stock request via `POST /api/v1/stock-requests` and redirects to the request detail; draft is cleared on success.
4. **Validation:** Variant is chosen per product; qty must be ≥ 1 (integer). Invalid rows are highlighted in the selected panel; Submit is disabled until all are valid.

## API

- **Product list (picker):** `GET /api/v1/inventory/stock-request-products?branchId=&search=&page=&limit=&sort=&stockStatus=`
  - Query: `branchId` (required), `search`, `page`, `limit` (20–50), `sort` (recommended | low_stock | most_used | name_asc), `stockStatus` (all | low | out).
  - Returns: `{ data: products[], pagination: { page, limit, total, totalPages } }`. Each product has `variants[]` with `id`, `sku`, `title`, `barcode`, `stockOnHand`, `lowStockThreshold`, `usageMetric` (requested qty in last 30d for that branch).
- **Create request:** `POST /api/v1/stock-requests` with `{ branchId, items: [{ productId, variantId, requestedQty, note? }] }` (unchanged).

## Environment / config

- No extra env vars. API base URL and auth follow existing staff branch setup (cookies, same-origin or `NEXT_PUBLIC_API_BASE_URL`).
- Draft is stored in browser `localStorage` only; key includes `branchId` (user-specific storage can be added later with userId if available in client).

## Files

- **Page:** `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/new/page.jsx`
- **API client:** `lib/api.ts` — `staffStockRequestProducts()`, `staffStockRequestCreate()`
- **Shared:** `src/components/common/Pagination.tsx`, `src/hooks/useToast`
- **Backend:** `backend-api` — `GET /api/v1/inventory/stock-request-products` (inventory module); see backend docs for DTO and sort/filter behaviour.
