# Owner inventory (Stock) — enterprise upgrade plan

## 1. Current-state audit

### 1.1 Route and page

- **URL:** `/owner/inventory` (Larkon owner panel, port 3104 in dev).
- **File:** `app/owner/(larkon)/inventory/page.tsx` (single client component; no dedicated child components).
- **Data access:** `ownerGet` from `app/owner/_lib/ownerApi.ts` (cookie auth, same-origin `/api/v1/...`).

### 1.2 APIs used by the page

| Call | Endpoint | Purpose |
|------|----------|---------|
| Branches | `GET /api/v1/owner/branches` | Branch filter dropdown |
| Dashboard cards | `GET /api/v1/inventory/dashboard?branchId=` | KPI strip |
| Stock table | `GET /api/v1/inventory?page=&limit=&branchId=&search=&lowStockOnly=` | Paginated rows |

**Not used today (but relevant):** `GET /api/v1/inventory/locations` — useful for location filter and aligning with Warehouse page.

### 1.3 Backend behavior (inventory module)

- **`GET /api/v1/inventory`** (`inventory.controller.getInventory` → `getInventorySummaryV2`):
  - Resolves `branchId` as: **first active `branchMember.branchId` OR `query.branchId`**.
  - List rows come from **`StockBalance`** (composite key `locationId` + `variantId`), not from legacy `Inventory` rows or product master alone.
  - Includes `location` (with `branch`), `variant`, `product` (name/slug only today).

- **`GET /api/v1/inventory/dashboard`** (`getInventoryDashboardCards`):
  - Uses **only query params** (`branchId`, `locationId`, `orgId`). It does **not** apply `branchMember` default.
  - Returns **`totalSkus`, `lowStockCount`, `expiringCount`** only (7-day expiring lots).

### 1.4 Response-shape gaps vs frontend

- Frontend `DashboardCards` expects **`totalStockQty`** and **`outOfStockCount`**; backend never sends them → UI shows **"—"** for those cards.
- `expiringCount` exists but is **not shown** on the owner page.

### 1.5 Product master vs physical stock

- **Master catalog / SKUs** live on `Product` / `ProductVariant`.
- **Physical stock** is **`StockBalance`** (+ lot layer `StockLotBalance`), updated via ledger-driven flows (receipts, transfers, adjustments, etc.).
- A product in the catalog **without** any `StockBalance` row **does not appear** on `GET /api/v1/inventory` — correct for a stock view, but the empty state must explain that (not imply “ledger entries” generically only).

---

## 2. Root causes (exact)

### 2.1 “Total SKUs” populated but table empty

- **Dashboard** with no `branchId` counts **`StockBalance` rows with `onHandQty > 0`** across **unscoped** filters (unless `orgId`/`branchId` passed) → can reflect **global or broad** counts.
- **List** for a user who is also **`branchMember`**: **`branchId` is forced** to that member’s branch **even when the UI selects “All branches”** (no `branchId` query param). Stock may live under **other branches / hub locations** of the same org → **table empty** while dashboard still shows non-zero totals.

### 2.2 Owner org not scoped on list

- **`getExpiringItems`** already resolves `ownerOrg` and passes `orgId` into the service. **`getInventory` does not** — owners without a branch membership (or with wrong forced branch) see inconsistent or empty data.

### 2.3 Summary cards blank

- **`totalStockQty`** and **`outOfStockCount`** are **frontend-only fields** with **no API backing** → permanent dashes.
- **`lowStockCount`** in service used `onHandQty: { lte: 10 }`, which **includes true zero** → misleading “low” counts.

### 2.4 Client-side “out of stock” filter

- Table applies **out-of-stock filter in the browser** after one page fetch → **wrong totals/pagination** and can show empty page while other pages have stock.

### 2.5 Misleading copy

- Subtitle and empty state refer to **“Stock Ledger entries”**; the list is actually **`StockBalance`**-driven (ledger is the mechanism, not the row source users care about).

---

## 3. Desired enterprise behavior

1. **Single coherent scope:** Dashboard and table use the **same** branch/org/location rules.
2. **Owner default scope:** When the user **owns an organization** and does not pass `branchId`, scope to **`branch.orgId = owner org`** (all branches/hubs under that org), **not** a random staff `branchMember` branch.
3. **Staff / non-owner:** Keep **`branchMember.branchId`** default when not owner (or when query does not override).
4. **Stock table** shows **location + branch + product + SKU + qty + reserved + reorder signal + batch/expiry hints + last movement** where data exists.
5. **Filters:** branch, location, search (name/sku/barcode), stock status (in / low / out), hub vs branch (location type), with server-side filtering and correct pagination.
6. **Empty states:** Distinguish **no stock anywhere** vs **filters excluded everything** vs **products exist but no receipts yet**.

---

## 4. Data model mapping

| UI concept | Primary source |
|------------|----------------|
| On-hand / available | `StockBalance.onHandQty`, `reservedQty` |
| Branch | `InventoryLocation.branch` |
| Location / hub vs branch | `InventoryLocation.name`, `InventoryLocation.type` |
| Reorder / min | `LocationVariantConfig.minStock` / `reorderPoint` (fallback 10) |
| Category | `Product.category` |
| Last movement | `max(StockLedger.createdAt)` per `(locationId, variantId)` |
| Active batches | Count `StockLotBalance` with `onHandQty > 0` for that location + variant’s lots |
| Near / expired | `StockLotBalance` + `StockLot.expDate` (aggregated on dashboard) |

---

## 5. Backend / client changes

### 5.1 Controller (`inventory.controller.ts`)

- Add **`resolveInventoryScope(userId, query)`**:
  - If `locationId` in query → use it (plus optional `branchId` if also passed).
  - Else if `branchId` in query → use it.
  - Else if user **owns** an org (`organization.ownerUserId`) → set **`orgId`** for that org.
  - Else → `branchMember.branchId` (existing behavior).
- **`getInventory`:** pass `orgId`, `locationTypes` (from `locationScope=hub|branch`), `outOfStockOnly`, refined `lowStockOnly`.
- **`getInventoryDashboard`:** if no `branchId`/`locationId`/`orgId` in query, auto-set **`orgId`** for owner (same as list).

### 5.2 Service (`inventory.service.ts`)

- **`getInventorySummaryV2`:** support `orgId`, `locationTypes`, search on **SKU/barcode/product**, `outOfStockOnly`, fix **low stock** to `gt: 0` AND `lte` threshold; include **product.category**; optional post-query enrichment: **minStock**, **lastMovementAt**, **activeBatchCount**.
- **`getInventoryDashboardCards`:** add **`totalStockQty`** (sum `onHandQty`), **`outOfStockCount`** (`onHandQty === 0`), **`nearExpiry30d`**, **`expiredLotsCount`** (lot still on hand past `expDate`), fix low-stock definition; keep **`expiringCount`** as 7d for backward compatibility.

### 5.3 Frontend (`page.tsx`)

- Load **`/api/v1/inventory/locations`** for location filter (owner-accessible list).
- Pass **`branchId` / `locationId` / `locationScope` / `stockStatus`** as query params (no client-only out-of-stock slice).
- **Summary cards:** map all backend fields; show **0** instead of em dash when API returns numbers.
- **Table columns:** product, SKU, category, branch, location (+ type badge), batches, expiry hint, available, reserved, reorder, status, last movement, actions.
- **Empty state:** contextual copy + links: Bulk receipt, Warehouse, Stock requests, Products (existing routes).

---

## 6. UX / filters

- **Branch:** `All` + owner branches (existing).
- **Location:** `All` + locations (from API); optional auto-reset when branch changes.
- **Search:** debounced or Apply + Refresh (keep Refresh; add small debounce on search optional — start with Refresh + effect on filter change).
- **Stock status:** All / In stock / Low / Out.
- **Location scope:** All / Hub (CENTRAL_WAREHOUSE, ONLINE_HUB) / Branch (other types).

---

## 7. Empty / loading / error

- Loading: keep spinner in table card.
- Error: keep alert; ensure dashboard failures set explicit **fallback copy** (“Metrics unavailable”) not silent dashes for numeric slots.
- **Zero stock org:** explain receive/transfer path; **no locations:** link to ensure defaults / locations doc.

---

## 8. Acceptance checklist

- [ ] `/owner/inventory` lists **StockBalance** rows scoped to **owner org** when “All branches” and user is owner.
- [ ] Dashboard **matches** list scope (same branch/org filters).
- [ ] **totalStockQty** and **outOfStockCount** show real numbers when data exists.
- [ ] Low stock **excludes** zero on-hand.
- [ ] Out-of-stock filter **server-side** with correct pagination total.
- [ ] Location + hub/branch filters work.
- [ ] Search matches **SKU/barcode** and product name.
- [ ] Empty states are **specific** and actionable.
- [ ] No new compile/runtime errors; warehouse/receipts/stock-requests routes unchanged.

---

## 9. Rollout notes

- Backend changes are **additive** (new query params + extra JSON fields). Existing clients ignoring new fields remain valid.
- Verify **multi-org owners**: plan uses **`findFirst`** owned org (consistent with other MVP endpoints); document limitation if multiple orgs per user need explicit org picker later.

---

## 10. Implementation status

| Area | Status |
|------|--------|
| Plan | Complete (this document) |
| Backend scope + metrics + list | Done |
| Owner page UI | Done |

---

## 11. Implementation report

### Audit findings (short)

- List used `branchMember.branchId` even for owners browsing “all branches”; dashboard did not — caused SKU cards vs empty table.
- Dashboard API omitted `totalStockQty` / `outOfStockCount`; UI showed dashes.
- Low-stock counts included `onHandQty === 0`.

### Root causes (short)

- Divergent default scope between `GET /inventory` and `GET /inventory/dashboard`.
- Dashboard payload incomplete vs UI contract.
- Client-side “out of stock” filter broke pagination.

### Files changed

- `backend-api/src/api/v1/modules/inventory/inventory.controller.ts` — `resolveInventoryScope`, `getInventory`, `getInventorySummary`, `getInventoryDashboard`.
- `backend-api/src/api/v1/modules/inventory/inventory.service.ts` — `getInventorySummaryV2` (org scope, filters, search, enrichment), `getInventoryDashboardCards` (extended metrics, locationScope), helpers.
- `bpa_web/app/owner/(larkon)/inventory/page.tsx` — enterprise filters, cards, table, empty states.
- `bpa_web/docs/owner-inventory-enterprise-stock-plan.md` — this plan.

### UI / logic improvements

- Owner org-wide default scope; explicit branch/location still override.
- Six KPI cards with real totals, low/out, near/expired lot lines.
- Table: category, location type, batches, expiry summary, last movement, clearer actions.
- Search debounced; stock status and hub/branch filters server-side.

### Dependencies

- Requires `inventory.read` / cookie session; `GET /inventory/locations` for location dropdown.
- Lot/expiry columns depend on `StockLotBalance` + `LocationVariantConfig` where present.

### Pending / limitations

- Owners with **multiple** orgs still resolve `findFirst` owned org (existing MVP pattern).
- Non-owner users with **no** branch membership still hit **unscoped** list (legacy; not worsened).

### Manual test checklist

1. Log in as owner → `/owner/inventory` loads rows across all branches when “All branches” selected.
2. Dashboard numbers change when branch filter changes; no permanent dashes for qty/out counts when API succeeds.
3. Location filter + hub/branch scope narrow rows and cards together.
4. Low / out / in stock filters paginate correctly.
5. Search by SKU and product name returns expected rows.
6. Empty state shows correct variant (no stock vs filtered out vs no access).
7. Warehouse / bulk receipt / stock request links navigate correctly.
