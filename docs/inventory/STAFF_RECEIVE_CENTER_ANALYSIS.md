# Staff Receive Center — Analysis & Plan

**Route:** `/staff/branch/[branchId]/inventory/receive`  
**Date:** 2026-02-22

---

## 1. Current State

### 1.1 Route & Files

| Route | File | Purpose |
|-------|------|---------|
| `/staff/branch/[branchId]/inventory/receive` | `app/staff/(larkon)/branch/[branchId]/inventory/receive/page.jsx` | Opening stock form only; links to incoming |
| `/staff/branch/[branchId]/inventory/incoming` | `app/staff/(larkon)/branch/[branchId]/inventory/incoming/page.jsx` | Incoming dispatches list; table + Receive button |
| `/staff/branch/[branchId]/inventory/incoming/[dispatchId]` | `incoming/[dispatchId]/page.jsx` | Full receive form (line items, receive/damage/short, submit) |
| `/staff/branch/[branchId]/inventory/receive/opening` | `receive/opening/page.jsx` | Dedicated opening stock page (toast, same form) |

### 1.2 APIs (Existing)

| Function | Endpoint | Returns |
|----------|----------|---------|
| `staffGetIncomingDispatches(branchId)` | `GET /api/v1/inventory/dispatches/incoming?branchId=` | Array of IN_TRANSIT dispatches for branch |
| `staffGetDispatch(dispatchId)` | `GET /api/v1/inventory/dispatches/:id` | Dispatch detail with items |
| `staffReceiveDispatch(dispatchId, body)` | `POST /api/v1/inventory/dispatches/:id/receive` | Receive (partial/full), creates GRN |
| `staffInventoryLocations()` | `GET /api/v1/inventory/locations` | Locations |
| `staffCreateOpeningStock(body)` | `POST /api/v1/inventory/opening-stock` | Opening stock entry |

### 1.3 Backend API Details

- **getIncomingDispatchesForBranch**: Returns only `status: "IN_TRANSIT"`. No status filter, search, or date params.
- **Branch scoping**: `toLocation.branchId = branchId`; user must have branch access.

### 1.4 Shared UI Components (Larkon/Staff)

- `Card` — `@/src/bpa/components/ui/Card`
- `BranchHeader` — `@/src/components/branch/BranchHeader`
- `AccessDenied` — `@/src/components/branch/AccessDenied`
- `LkFormGroup`, `LkInput`, `LkSelect` — `@larkon-ui/components`
- `Offcanvas` — `react-bootstrap` (used in owner receipts)
- `table table-sm`, `badge`, `btn btn-*` — Bootstrap

---

## 2. Plan

### 2.1 UX Wireframe

```
Receive Center
├── Header: Branch name + "Back to Inventory"
├── Tabs: [Incoming dispatches] | [Opening stock]
│
├── Tab 1: Incoming dispatches (default)
│   ├── Stats: Pending count, total qty (client-computed from list)
│   ├── Table: Dispatch # | From | To | Status | Items | Action
│   ├── Action: View (drawer) | Receive (→ /incoming/[id] or drawer)
│   ├── Empty: "No incoming dispatches" + CTA to Stock Requests
│   └── Drawer: Dispatch meta + line table + receive inputs + Submit
│
└── Tab 2: Opening stock
    ├── Warning: "Opening stock is for initial setup. For transfers, use Incoming dispatches."
    ├── Form: Location, Reference, Date, Items (variant + qty)
    └── Submit (permission: inventory.receive)
```

### 2.2 Files to Modify/Create

| File | Action |
|------|--------|
| `app/staff/(larkon)/branch/[branchId]/inventory/receive/page.jsx` | Replace with Receive Center: tabs, incoming list, opening form |
| `app/staff/(larkon)/branch/[branchId]/inventory/receive/_components/DispatchReceiveDrawer.jsx` | New: Offcanvas with receive form (extracted from [dispatchId] logic) |

### 2.3 Risks & Limitations

| Risk | Mitigation |
|------|------------|
| **API returns only IN_TRANSIT** | No status filter in v1; show pending only. Phase 2: extend backend for Partial/Received filter. |
| **Search / date filter** | Not supported by API; omit in v1 or add placeholder. |
| **Opening stock permission** | Keep `inventory.receive`; optional: gate with BRANCH_MANAGER check if needed. |
| **Drawer vs full page** | Reuse [dispatchId] receive form in Offcanvas for faster UX; "View" opens drawer, "Receive" can either open drawer or navigate to [dispatchId]. Task prefers drawer. |
| **Regressions** | Incoming page `/incoming` remains; receive page becomes hub. Links from inventory page may point to /receive or /incoming — standardize to /receive. |

### 2.4 Conflicts

**None.** APIs exist; no backend changes required for v1. `/incoming` and `/incoming/[id]` routes stay for direct navigation; Receive Center becomes the primary entry from Inventory.

---

## 3. Implementation Order

1. Create `DispatchReceiveDrawer.jsx` — Offcanvas with receive form (from [dispatchId] logic)
2. Refactor `receive/page.jsx` — Tabs (Incoming | Opening), incoming table, integrate drawer
3. Tab 2: Move opening stock form into tab, add warning
4. Empty states, polish, regression check
