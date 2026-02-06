## Gaps & Decisions (Design, Self-Decide)

Date: 2026-02-04

This document converts the baseline facts in `docs/master-plan/BASELINE_REPO_STATE.md` into **explicit decisions** for an incremental, safe rollout.

---

## Decision 1 — Central warehouse representation (now) and multi-warehouse evolution (later)

### Current constraints (facts)

- Inventory is per `InventoryLocation` (owned by a `Branch`): `backend-api/prisma/schema.prisma` (`InventoryLocation`, `StockBalance`, `StockLedger`, `StockLot*`).
- `InventoryLocationType` enum currently: `CLINIC | SHOP | ONLINE_HUB` (no `WAREHOUSE` value).
- Branch types are modeled via `BranchType` and links (`BranchToType` / `BranchTypeOnBranch`), and schema includes codes like `WAREHOUSE_DC` and `DELIVERY_HUB`.

### Decision (now)

- **Central warehouse for an org is represented as a normal `Branch` that has branch type code `WAREHOUSE_DC`, and one or more `InventoryLocation` rows under that branch.**
- In Phase-1, the system treats “warehouse stock” as stock at a **selected from-location** (i.e., `fromLocationId`) belonging to a `WAREHOUSE_DC` branch. No new “warehouse entity” is required.
- We do **not** change `InventoryLocationType` in Phase-1. Location “warehouse-ness” is derived from the parent branch type (`WAREHOUSE_DC`) + location naming.

### Evolution path (multi-warehouse, later)

- Allow multiple `WAREHOUSE_DC` branches per org.
- Add routing rules (Phase-3) so requests/dispatches can prefer a warehouse automatically:
  - Proposed table: `WarehouseRoutingRule` (orgId, destBranchId, warehouseBranchId, priority, isActive, optional geo constraints).
- Optionally (Phase-3) add `InventoryLocationType.WAREHOUSE` if type-level UX/validation is needed, but keep old types valid.

---

## Decision 2 — Owner Team delegation model (roles + permission scope)

### Current constraints (facts)

- RBAC models exist (`Role`, `Permission`, `RolePermission`, `OrgMemberRole`, `BranchMemberRole`, `UserGlobalRole`, `UserCountryRole`): `backend-api/prisma/schema.prisma`.
- Permission resolution exists and already aggregates DB-backed roles + legacy fallbacks: `backend-api/src/api/v1/utils/permissions.js` (`resolvePermissionsForUser`).
- Owner panel access is currently tied to `panels.owner === true` from `GET /api/v1/auth/me`, which is computed as **ownerProfile or ownedOrgs** only: `backend-api/src/api/v1/modules/auth/auth.controller.ts` (`panels.owner`).

### Decision (now)

- **Owner Team delegation uses DB-backed roles (`Role`) assigned through `OrgMemberRole` and `BranchMemberRole`.**
- We introduce/seed new org/branch scoped role keys (Phase-1 or Phase-2, depending on rollout risk):
  - ORG scope: `OWNER_ADMIN`, `CATALOG_MANAGER`, `INVENTORY_MANAGER`, `FINANCE`, `AUDITOR`
  - BRANCH scope: `WAREHOUSE_STAFF` (assigned on warehouse branch), optionally `BRANCH_INVENTORY_STAFF`
- We keep permission keys compatible with the current permission resolver (examples already exist: `inventory.read`, `inventory.write`, `product.*`, `owner.products.manage`).

### Panel access (Owner Team)

- Add a **single permission gate** for Owner panel access, e.g. `panel.owner`.\n+  - `panels.owner` becomes true if either:\n+    - user is the owner (current behavior), or\n+    - user has `panel.owner` via org/branch role permissions.\n+  - This change is additive and keeps existing owners working.\n+- Owner API route guard evolves from strict `roleGuard(['OWNER'])` to an **OwnerPanelGuard** that checks `panels.owner` or `panel.owner` permission (and still allows OWNER).\n+
### Scope-by-location requirement

- For Phase-1/2, **branch-scoped roles are the primary scoping mechanism** for warehouse operations because each warehouse is a `Branch`.\n+- If later we need location-level granularity within the same branch, introduce `LocationAccessPermission` (Phase-3/4).

---

## Decision 3 — Status mapping for request flows & transfer flows

Below are “mapping tables” in text form (kept table-free for portability).

### 3A) Catalog/Product-change approvals (`ProductChangeRequest`)

Source of truth:\n+- Model: `ProductChangeRequest` (`ChangeRequestStatus`): `backend-api/prisma/schema.prisma`\n+- Endpoints: `GET/PATCH /api/v1/owner/product-change-requests*`: `backend-api/src/api/v1/modules/owner/owner.routes.ts`

```\n+Statuses:\n+  PENDING -> (APPROVED | REJECTED)\n+\n+Actors & actions:\n+  BranchManager: creates request (PENDING)\n+  OwnerTeam(CATALOG_MANAGER/OWNER_ADMIN): approve/reject\n+```

### 3B) Stock Requests (`StockRequest`)

Source of truth:\n+- Model: `StockRequestStatus`: `backend-api/prisma/schema.prisma`\n+- Endpoints: `/api/v1/stock-requests/*`: `backend-api/src/api/v1/modules/stock_requests/*`

```\n+Current implemented transitions:\n+  DRAFT --submit--> SUBMITTED --dispatch--> DISPATCHED --receive(transfer)--> RECEIVED_FULL|RECEIVED_PARTIAL\n+  DRAFT|SUBMITTED --cancel--> CANCELLED\n+\n+Planned (Phase-1) refinements:\n+  SUBMITTED -> OWNER_REVIEW (owner opens/locks for review)\n+  SUBMITTED|OWNER_REVIEW --decline--> CANCELLED (but with reason+source fields)\n+  DISPATCHED -> CLOSED (optional explicit close)\n+\n+Key rule:\n+  Fulfillment is represented by the linked StockTransfer + ledger entries.\n+```

### 3C) Transfers (`StockTransfer`)

Source of truth:\n+- Model: `StockTransferStatus`: `backend-api/prisma/schema.prisma`\n+- Endpoints: `/api/v1/transfers/*`: `backend-api/src/api/v1/modules/transfers/*`

```\n+Current implemented transitions:\n+  DRAFT --send--> IN_TRANSIT\n+  IN_TRANSIT --receive--> COMPLETED | PARTIAL_RECEIVED | DISPUTED\n+  DISPUTED --resolve-dispute--> COMPLETED\n+\n+Notes:\n+  receive() supports SENT for backward compatibility.\n+  lotId is mandatory for transfer items (lot-backed transfers).\n+```

---

## Decision 4 — Minimal DB changes now vs later

### Must-have now (Phase-1)

To satisfy: “decline with clear reason/source” for stock requests while keeping backward compatibility:
- Add to `StockRequest` (additive fields):\n+  - `cancelledAt DateTime?`\n+  - `cancelledByUserId Int?`\n+  - `cancelSource StockRequestCancelSource?` (enum: `BRANCH|OWNER`)\n+  - `cancelReason String?` (text/varchar)\n+\n+Rationale: `CANCELLED` currently conflates branch cancel + owner decline and stores no reason.

### Next (Phase-2)

- Add `GoodsReceipt` / `GRN` models instead of relying on `OPENING` ledger for all inbound stock:\n+  - `GoodsReceipt` header + items, vendor, cost, audit fields\n+  - Map to ledger entries (`OPENING` or a new `RECEIPT_IN` type)\n+- Add request notes/audit log tables if needed for compliance:\n+  - `RequestNote` (refType/refId, createdByUserId, body)\n+
### Later (Phase-3/4)

- Multi-warehouse routing:\n+  - `WarehouseRoutingRule`\n+- Workforce queues:\n+  - `WorkQueueTask` (PICK/PACK/DISPATCH/RECEIVE)\n+- Optional location-level access:\n+  - `LocationAccessPermission` (if branch-level scope becomes insufficient)

---

## Decision 5 — Risks & mitigations

### Risk: Decline vs cancel ambiguity for stock requests
- **Mitigation**: additive cancel fields (`cancelSource`, `cancelReason`, `cancelledByUserId`, `cancelledAt`).

### Risk: Response shape stability (Owner UI depends on certain shapes)
- **Mitigation**: keep existing endpoints working; when replacing mock `/api/v1/owner/requests`, match the current `meta.pendingCounts` shape used by `bpa_web/app/owner/_hooks/useEntityCounts.js`.

### Risk: Lot enforcement everywhere
- Transfers are lot-backed; some UI paths still attempt variant-only operations.\n+- **Mitigation**: in Phase-2, ensure any “create transfer” UI collects lot allocations (from `GET /api/v1/inventory/fefo` or `GET /api/v1/inventory/lots`). Keep server-side validation strict.

### Risk: InventoryLocationType lacks WAREHOUSE
- **Mitigation**: infer warehouse from branch type `WAREHOUSE_DC` initially; optionally add `InventoryLocationType.WAREHOUSE` later (Phase-3).

### Risk: Owner Team cannot access Owner panel today
- **Mitigation**: introduce `panel.owner` permission and extend `panels.owner` computation in `/api/v1/auth/me` (additive), plus an OwnerPanelGuard on `/api/v1/owner/*`.

