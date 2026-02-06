## Baseline Repo State (Factual)

Date: 2026-02-04

This document is a **no-guessing baseline** of the current codebase (Next.js multi-app + Express API) relevant to:
- Unified catalog + product change requests
- Per-location inventory (ledger/lot/expiry)
- Stock requests + transfers/dispatch/receiving
- Owner requests hub + notifications
- Roles/permissions + scoping

### Repositories in this workspace

- **Backend API (Express + Prisma)**: `D:/BPA_Data/backend-api`
  - Base path: `/api/v1`
  - Fixed port: `3000`
- **Frontend (Next.js multi-app)**: `D:/BPA_Data/bpa_web`
  - Owner panel fixed port: `3104` (`npm run dev:owner`)

### Existing plan artifacts & inventory docs (Step-0 baseline)

- Existing Cursor plans (workspace): `D:/BPA_Data/backend-api/.cursor/plans/`
  - `inventory-requests-upgrade_38f82c9f.plan.md`
  - `owner_dashboard_roadmap_8de0a3bf.plan.md`
  - `location_system_audit_and_integration_plan_ddd04571.plan.md`
- Existing inventory doc(s) in UI repo:
  - `bpa_web/docs/inventory/STOCK_REQUEST_UI_OWNER.md`

---

## Backend API (Express) — Relevant APIs & Patterns

### Route registration (high-signal)

- API router mount map: `backend-api/src/api/v1/routes.ts`
  - Inventory: `router.use("/inventory", countryScopeGuard, ...inventory.routes)`
  - Stock requests: `router.use("/stock-requests", countryScopeGuard, ...stock_requests.routes)`
  - Transfers: `router.use("/transfers", countryScopeGuard, ...transfers.routes)`
  - Owner namespace: `router.use("/owner", countryScopeGuard, ...owner.routes)`
  - Notifications: `router.use("/notifications", ...notifications.routes)`
  - Admin RBAC endpoints: `/admin/roles`, `/admin/permissions`, `/admin/user-roles`, `/admin/branch-types`

### Inventory (ledger/lot-based)

- Routes: `backend-api/src/api/v1/modules/inventory/inventory.routes.ts`
- Controller: `backend-api/src/api/v1/modules/inventory/inventory.controller.ts`
- Service: `backend-api/src/api/v1/modules/inventory/inventory.service.ts`
- Ledger core (immutable writes + balance updates): `backend-api/src/api/v1/modules/inventory/ledger.service.ts`

**Notable endpoints (implemented):**
- `GET /api/v1/inventory` (ledger-derived summary)
- `GET /api/v1/inventory/alerts`
- `GET /api/v1/inventory/expiring`
- `GET /api/v1/inventory/locations`
- `GET /api/v1/inventory/lots`
- `GET /api/v1/inventory/fefo`
- `POST /api/v1/inventory/opening` (OPENING ledger + lot required)
- `POST /api/v1/inventory/adjustment-requests` (creates `StockAdjustmentRequest`)

**Explicitly blocked legacy endpoints (return 410):**
- `POST /api/v1/inventory` (legacy upsert)
- `POST /api/v1/inventory/adjust` / `POST /api/v1/inventory/:id/adjust` / `POST /api/v1/inventory/:id/transfer`

### Stock Requests (branch request → owner fulfill/dispatch → receive)

- Routes: `backend-api/src/api/v1/modules/stock_requests/stock_requests.routes.ts`
- Controller: `backend-api/src/api/v1/modules/stock_requests/stock_requests.controller.ts`
- Service: `backend-api/src/api/v1/modules/stock_requests/stock_requests.service.ts`

**Endpoints (implemented):**
- `POST /api/v1/stock-requests` (create DRAFT)
- `GET /api/v1/stock-requests` (list; supports `orgId` owner filter)
- `GET /api/v1/stock-requests/:id` (detail; supports `fromLocationId` to include `availableLotsByVariant`)
- `PATCH /api/v1/stock-requests/:id` (update items; DRAFT only)
- `POST /api/v1/stock-requests/:id/submit`
- `POST /api/v1/stock-requests/:id/cancel`
- `POST /api/v1/stock-requests/:id/dispatch` (creates linked transfer + sends it)

**Notes from current implementation (factual):**
- `dispatch` creates a `StockTransfer` (DRAFT) and then calls `transfersService.sendTransfer()`; request is then marked `DISPATCHED`.
- Stock request enum includes `FULFILLED_PARTIAL` / `FULFILLED_FULL`, but current dispatch flow does not persist those states (status jumps to `DISPATCHED`).

### Transfers (lot-backed dispatch/receive + discrepancy)

- Routes: `backend-api/src/api/v1/modules/transfers/transfers.routes.ts`
- Controller: `backend-api/src/api/v1/modules/transfers/transfers.controller.ts`
- Service: `backend-api/src/api/v1/modules/transfers/transfers.service.ts`

**Endpoints (implemented):**
- `POST /api/v1/transfers` (create DRAFT) — **lot-backed**: requires `lotId` for each item
- `GET /api/v1/transfers` (list)
- `GET /api/v1/transfers/:id` (detail)
- `POST /api/v1/transfers/:id/send` (creates `TRANSFER_OUT` ledger entries; sets status `IN_TRANSIT`)
- `POST /api/v1/transfers/:id/receive` (creates `TRANSFER_IN` and optional `DAMAGE`/`EXPIRED`; can raise `StockDiscrepancy` and set `DISPUTED`)
- `POST /api/v1/transfers/:id/resolve-dispute` (e.g. `ACCEPT_LOSS` creates `LOSS` ledger entries)

### Catalog/Product change approvals (real) vs “Owner Product Requests” (mock)

**Real (DB-backed):**
- Branch creates product change request:
  - `POST /api/v1/branches/:branchId/product-change-requests`
  - Controller: `backend-api/src/api/v1/modules/branches/branches.controller.ts` (`createProductChangeRequest`)
- Owner reviews product change requests:
  - `GET /api/v1/owner/product-change-requests`
  - `PATCH /api/v1/owner/product-change-requests/:id/approve`
  - `PATCH /api/v1/owner/product-change-requests/:id/reject`
  - Routes: `backend-api/src/api/v1/modules/owner/owner.routes.ts`
  - Implementation: `backend-api/src/api/v1/modules/owner/owner.controller.ts` (`listProductChangeRequests`, `approveProductChangeRequest`, `rejectProductChangeRequest`)

**Mock placeholders (not DB-backed):**
- Owner requests inbox:
  - `GET /api/v1/owner/requests`
  - Currently returns mock data: `backend-api/src/api/v1/modules/owner/owner.controller.ts` (`getOwnerRequestsInbox`, `buildMockInboxRequests`)
- Owner “product requests”:
  - `GET/POST /api/v1/owner/product-requests`, plus approve/reject/create-transfer mock endpoints
  - Implemented as mock responses in `backend-api/src/api/v1/modules/owner/owner.controller.ts`

### Notifications (in-app)

- Routes: `backend-api/src/api/v1/modules/notifications/notifications.routes.ts`
- Creation service (dedupe + deliveries + optional realtime): `backend-api/src/api/v1/services/notification.service.ts`

### Auth, roles, permissions, scoping (key pieces)

**Auth middlewares in use:**
- `backend-api/src/middleware/auth.middleware.ts` (`authenticateToken`) attaches `req.user` and resolves `req.user.permissions` (via `resolvePermissionsForUser` if not present in token).
- `backend-api/src/middlewares/auth.ts` (`auth`) sets `req.user.role` (OWNER/ADMIN/STAFF etc.) and is used by `owner.routes.ts` together with `roleGuard`.
- Owner route guard:
  - `backend-api/src/middlewares/roleGuard.ts` checks `req.user.role` against allowed roles.
  - `backend-api/src/api/v1/modules/owner/owner.routes.ts` uses `router.use(auth, roleGuard(['OWNER']))`.
- Permission guard:
  - `backend-api/src/middlewares/requirePermission.ts` checks `req.user.permissions` / `req.user.perms` keys.
- Permission resolver:
  - `backend-api/src/api/v1/utils/permissions.js` (`resolvePermissionsForUser`) aggregates DB-backed roles + legacy `MemberRole` fallbacks and adds canonical aliases (`branches.read` → `branch.read`).
- Country scope guard (org/branch consistency by country): `backend-api/src/middlewares/countryScopeGuard.ts`

**Admin RBAC endpoints (present):**
- Roles CRUD/clone/replace-permissions: `backend-api/src/api/v1/modules/admin_roles/*`
- Permissions list: `backend-api/src/api/v1/modules/admin_permissions/*`
- Global/country role assignments: `backend-api/src/api/v1/modules/admin_user_roles/*`
- Branch types admin: `backend-api/src/api/v1/modules/admin_branch_types/*`
- Seeds: `backend-api/prisma/seeders/seedRolesPermissions.ts`

---

## Frontend (Next.js) — Relevant Owner/Staff Routes & Patterns

### Owner navigation & layout (WowDash)

- Permission-driven sidebar registry: `bpa_web/src/lib/permissionMenu.ts`
- Sidebar render + dropdown behavior + badge injection: `bpa_web/src/masterLayout/MasterLayout.jsx`
- Owner panel auth gate (checks `/api/v1/auth/me` and `panels.owner`): `bpa_web/app/owner/layout.jsx`
- Menu badge counts hook (calls `/api/v1/owner/requests?summary=1`): `bpa_web/app/owner/_hooks/useEntityCounts.js`

### Owner: Requests Hub + Catalog Requests

- Requests hub page: `bpa_web/app/owner/requests/page.tsx` (calls `GET /api/v1/owner/requests`)
- Catalog/product requests UI (currently wired to mock endpoints):
  - List: `bpa_web/app/owner/product-requests/page.jsx` (calls `GET /api/v1/owner/product-requests`)
  - Detail: `bpa_web/app/owner/product-requests/[id]/page.jsx`
- Real product-change approvals UI (wired to real endpoint):
  - `bpa_web/app/owner/product-approvals/page.jsx` (calls `GET/PATCH /api/v1/owner/product-change-requests`)

### Owner: Inventory → Stock Requests

- Inventory overview page: `bpa_web/app/owner/inventory/page.tsx` (calls `/api/v1/inventory`, `/api/v1/inventory/alerts`)
- Stock request list: `bpa_web/app/owner/inventory/stock-requests/page.tsx`
- Stock request detail + dispatch UI: `bpa_web/app/owner/inventory/stock-requests/[id]/page.tsx`
- Owner stock request UI doc: `bpa_web/docs/inventory/STOCK_REQUEST_UI_OWNER.md`

### Owner: Transfers & Adjustments

- Transfers (main): `bpa_web/app/owner/transfers/*` (calls `/api/v1/transfers`)
- Inventory transfers wrappers: `bpa_web/app/owner/inventory/transfers/*`
- Inventory adjustments list (currently sample rows / “coming soon”): `bpa_web/app/owner/inventory/adjustments/page.tsx`

### Staff (Branch) Stock Requests

- Stock requests list/create/detail:
  - `bpa_web/app/staff/branch/[branchId]/inventory/stock-requests/page.jsx`
  - `bpa_web/app/staff/branch/[branchId]/inventory/stock-requests/new/page.jsx`
  - `bpa_web/app/staff/branch/[branchId]/inventory/stock-requests/[id]/page.jsx`

---

## Database (Prisma) — Relevant Models/Enums

Prisma schema file: `backend-api/prisma/schema.prisma`

### Catalog / Product domain (org-scoped)

- `Product`, `ProductVariant`
- `MasterProductCatalog`, `MasterProductVariant` (global-ish master data)
- `ProductChangeRequest` (`ChangeRequestType`, `ChangeRequestStatus`)

### Inventory (per location, ledger-auditable)

- `InventoryLocation` (per `Branch`) with enum `InventoryLocationType` = `CLINIC | SHOP | ONLINE_HUB`
- `StockLedger` (immutable) + `StockBalance` (aggregated) + `StockLot` + `StockLotBalance`
- Expiry/batch support is via `StockLot.expDate` and lot balances

### Stock movement / dispatch

- `StockRequest`, `StockRequestItem` (enum `StockRequestStatus`)
- `StockTransfer`, `StockTransferItem` (enum `StockTransferStatus`)
- `StockDiscrepancy` (enum `StockDiscrepancyStatus`)
- `StockAdjustmentRequest` (enum `StockAdjustmentStatus`)

### Roles, permissions, scoping (RBAC)

- `Role` (enum `RoleScope` includes `GLOBAL|COUNTRY|STATE|ORG|BRANCH`)
- `Permission`, `RolePermission`
- Assignments:
  - `OrgMemberRole`, `BranchMemberRole`
  - `UserGlobalRole`, `UserCountryRole`, `UserStateRole`
- Legacy membership enums:
  - `MemberRole` (`OWNER|ORG_ADMIN|BRANCH_MANAGER|...`) used as fallback in permission resolver
- Branch access approvals:
  - `BranchAccessPermission` (status `PENDING|APPROVED|REVOKED|EXPIRED|SUSPENDED`)

### Warehouse/Hub representation (existing)

- Branch types are modeled via:
  - `BranchType` (table `branch_types`) with codes including `DELIVERY_HUB` and `WAREHOUSE_DC` (seen in schema enum list usage + branch types checks in controllers)
  - Links: `BranchToType` / `BranchTypeOnBranch`

---

## Known placeholders & mismatches (factual)

- `/api/v1/owner/requests` returns **mock inbox data** (needs real aggregation).
- `/api/v1/owner/product-requests*` endpoints return **mock** responses (separate from real `ProductChangeRequest` flow).
- Owner “New Transfer” UI (`bpa_web/app/owner/transfers/new/page.tsx`) does not collect `lotId`, but backend transfer creation requires `lotId` per item.
- Owner inventory adjustments list page is currently sample data and not wired to backend list endpoints.

