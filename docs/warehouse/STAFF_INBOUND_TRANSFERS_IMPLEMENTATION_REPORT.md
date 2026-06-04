# Staff inbound transfers — implementation report

**Date:** 2026-04-14 (finishing pass included)  
**Area:** Staff branch warehouse inbound queue, receive-dispatch workspace, dispatch print preview, route helpers, RBAC copy.

---

## Business outcome

- Branch staff with **visibility-only** roles (e.g. `inventory.read`, `dispatch.view`, hub `warehouse.view`) can **open the inbound queue** and **view dispatch detail** without a misleading full-page “forbidden” when they lack `inventory.receive`.
- Users who **can receive** keep the same posting flow; CTAs and `nextReceiveAction` hints remain backend-aligned.
- **Navigation and print** entry points use **canonical path helpers**, reducing drift and broken bookmarks when routes change.

---

## Files changed (cumulative + finishing pass)

| Path | Role |
|------|------|
| `lib/inboundTransfersUi.js` | Permission helpers, dispatch/session badge classes, timestamps, action labels; **+** `receiveSessionStatusBadgeClass`, `receiveSessionStatusLabel`. |
| `lib/inboundTransfersUi.test.js` | Unit tests for helpers. |
| `lib/staffInventoryRoutes.js` | Canonical paths incl. `staffBranchPickerPath`; merged duplicate JSDoc on receive workspace helper. |
| `lib/staffInventoryRoutes.test.js` | Route tests incl. branch picker. |
| `package.json` | `test:unit:inbound` script. |
| `app/.../warehouse/inbound-transfers/page.tsx` | Enterprise UI, tiered RBAC, KPI cards (`InboundKpiCard`), filters, table + caption, standardized copy, session badges via shared helpers. |
| `app/.../receive-dispatch/[dispatchId]/page.jsx` | Read-only mode, shared dispatch/session badges + timestamps, breadcrumb `from=inbound`, `staffBranchPickerPath`, lint suppression on `canSubmitAny`, alert spacing, **Print GRN** label. |
| `app/.../dispatch-print/[id]/page.tsx` | Helper-based tab URLs; back link; invalid ID copy. |
| `app/.../inventory/receive/page.jsx` | `staffReceiveCenterPath` for redirect (prior pass). |
| `src/lib/branchSidebarConfig.ts` | Sidebar visibility for inbound (prior pass). |
| `docs/warehouse/STAFF_BRANCH_INBOUND_TRANSFERS_ENTERPRISE_REDESIGN_PLAN.md` | Plan + implementation notes. |
| `docs/warehouse/STAFF_INBOUND_TRANSFERS_IMPLEMENTATION_REPORT.md` | This report. |

---

## Route map (canonical helpers)

| Helper | URL pattern |
|--------|-------------|
| `staffInboundTransfersPath(id)` | `/staff/branch/:id/warehouse/inbound-transfers` |
| `staffReceiveCenterPath(id)` | `/staff/branch/:id/inventory/receive` |
| `staffIncomingShipmentsPath(id)` | `/staff/branch/:id/inventory/incoming` |
| `staffDispatchReceiveWorkspacePath(id, dispatchId, { from })` | `/staff/branch/:id/inventory/receive-dispatch/:dispatchId` optional `?from=inbound` |
| `staffDispatchPrintPath(id, dispatchId, doc)` | `/staff/branch/:id/inventory/dispatch-print/:dispatchId?doc=…` |
| `staffLegacyTransfersIncomingPath(id)` | `/staff/branch/:id/inventory/transfers?tab=incoming` |
| `staffWarehouseDashboardPath(id)` | `/staff/branch/:id/warehouse` |
| `staffWarehouseReceivePoPath(id)` | `/staff/branch/:id/warehouse/receive-po` |
| `staffStockRequestDetailPath(id, requestId)` | `/staff/branch/:id/inventory/stock-request-detail/:requestId` |
| `staffStockRequestListPath(id)` | `/staff/branch/:id/inventory/stock-requests` |
| `staffBranchPickerPath()` | `/staff/branch` |

**Intentionally not wrapped:** `/staff/login` (global auth).

---

## Permission model (frontend)

| Check | Grants |
|--------|--------|
| `hasViewPermission` (`useBranchContext`) | `branch.view` + `dashboard.view` — branch shell. |
| `canViewInboundTransfersQueue` | `inbound.read` \| `inventory.read` \| `inventory.receive` \| `dispatch.view` \| (hub && (`warehouse.view`\|`operations`\|`manage`)). |
| `canReceiveStockAtBranch` | `inventory.receive` \| `inbound.receive`. |
| `canViewReceiveDispatchWorkspace` | receive **or** `dispatch.view` \| `inventory.read` \| `inbound.read`. |
| `canSeeDispatchPrintMenu` | receive \| `inbound.read` \| `inventory.read` \| `dispatch.view` (UI only; API still enforces print). |

---

## Verification completed

- `npm run test:unit:inbound` — all tests pass (helpers + routes incl. `staffBranchPickerPath`).
- Manual consistency pass: duplicated session badge logic removed from inbound page; receive-dispatch uses shared `dispatchStatusBadgeClass` / session helpers / `formatInboundTimestamp`.
- Grep: no stray `/staff/branch/${branchId}/inventory/receive` in receive-dispatch; branch picker uses `staffBranchPickerPath()`.

---

## Finishing pass (same release)

- **DRY:** Session row badges and labels use `receiveSessionStatusBadgeClass` / `receiveSessionStatusLabel` from `lib/inboundTransfersUi.js`; receive-dispatch reuses `dispatchStatusBadgeClass` and `formatInboundTimestamp` (removed duplicate `statusBadge` / `formatTs`).
- **Copy / UX:** Aligned “Receive center”, read-only alerts (incl. `inbound.receive`), KPI labels (“Rows in table”), empty state, partial receive hint, primary CTA “View dispatch”, print row “Delivery note” + “Print preview”, table `caption`, consistent alert vertical spacing (`mb-16`).
- **Routes:** `staffBranchPickerPath()` for `/staff/branch`; receive-dispatch branch `AccessDenied` back navigation uses it.
- **Lint:** `canSubmitAny` `useMemo` uses an inline `eslint-disable-line` for `exhaustive-deps` (same logical deps as `getRowError`). IDE `read_lints` clean; isolated CLI `eslint` on single `.tsx` paths may still lack the project TS parser in some setups — use full `npm run lint` in CI.

---

## Known follow-ups

1. **Receive center / Incoming** pages still gate on `inventory.receive` only — optional alignment with tiered “view queue”.
2. **Backend** `GET /staff/branch/:id/inbound-queue` has no `requirePermission` — optional hardening with an OR-list matching frontend.
3. **Dispatch status** badges still show raw enum (`PACKED`); optional title-case label helper for display-only.
