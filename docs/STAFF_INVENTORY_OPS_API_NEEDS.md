# Staff Inventory Operations — API Needs & Mapping

Used by staff branch context pages: Receive Center, Adjustments, Transfers.

## Existing endpoints in use

| Page        | List / Detail | Create / Action | Notes |
|------------|----------------|-----------------|--------|
| **Transfers** | `GET /api/v1/transfers` (params: status, fromLocationId, toLocationId, page, limit) | `POST /api/v1/transfers` (body: fromLocationId, toLocationId, **allocations**: [{ lotId, variantId, quantity }]), `POST /api/v1/transfers/:id/send`, `POST /api/v1/transfers/:id/receive` | Lot-backed create only. Use FEFO for lot picker. |
| **Receive (GRN)** | `GET /api/v1/grn` (query: orgId, locationId, status, dateFrom, dateTo, page, limit) | `POST /api/v1/grn`, `POST /api/v1/grn/:id/receive` | Org + location scoped. Staff needs branch-scoped list (see below). |
| **Adjustments** | — | `POST /api/v1/inventory/adjustment-requests`, `PATCH /api/v1/inventory/adjustment-requests/:id` (approve/reject) | No list endpoint yet. |
| **Opening stock** | — | `POST /api/v1/inventory/opening` | Unchanged; form at `/staff/branch/[branchId]/inventory/receive/opening`. |
| **Dispatches** | `GET /api/v1/inventory/dispatches/incoming?branchId=` | `POST /api/v1/inventory/dispatches/:id/receive` | Incoming + receive by document. |

## Optional / pending backend support

### 1. GRN list by branch (Receive Center)

- **Need:** Staff Receive Center lists receipts (GRNs) for the current branch.
- **Current:** `GET /api/v1/grn` is org + optional `locationId` scoped. Staff has `branchId` and gets locations via `GET /api/v1/inventory/locations` (then filter by branch).
- **Options:**
  - **A)** Frontend: resolve branch’s `locationId`s, then call `GET /api/v1/grn?orgId=…&locationId=X` per location and merge (or backend accepts multiple locationIds).
  - **B)** Backend: add `branchId` to `GET /api/v1/grn` and filter by locations in that branch.
- **Stub:** `staffGrnList(branchId, opts)` — if backend does not support `branchId`, stub returns `{ items: [], pagination }` or implement (A). See `lib/api.ts`.

### 2. Adjustment requests list (Adjustments page)

- **Need:** `GET /api/v1/inventory/adjustment-requests` with branch (or location) scope.
- **Suggested contract:**  
  `GET /api/v1/inventory/adjustment-requests?branchId=2&status=&dateFrom=&dateTo=&page=1&limit=20`  
  Response: `{ data: AdjustmentRequest[], pagination: { page, limit, total, totalPages } }`.
- **Until then:** UI keeps in-session “Recent adjustments” and shows an info banner: “Server list pending; only recent session adjustments shown.”

## FEFO for transfer create

- **Endpoint:** `GET /api/v1/inventory/fefo?locationId=&variantId=`
- **Use:** In transfer create form, for each selected variant at “from” location, call FEFO to get lots (earliest expiry first). Auto-select first lot; allow user to override. Send `allocations: [{ lotId, variantId, quantity }]` to `POST /api/v1/transfers`.

## StockLedger

All stock changes go through ledger (opening, GRN receive, adjustment approve, transfer send/receive). No ad-hoc stock fields; UI only triggers existing APIs.
