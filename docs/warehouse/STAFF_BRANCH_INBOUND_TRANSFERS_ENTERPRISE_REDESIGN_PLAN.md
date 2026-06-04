# Staff branch inbound transfers — enterprise redesign plan

**Status:** Implemented (see § Implementation notes below).  
**Scope:** `/staff/branch/[branchId]/warehouse/inbound-transfers` and all directly connected receive, dispatch session, stock request, print, discrepancy, and RBAC surfaces.  
**Related docs:** `docs/STAFF_RECEIVE_DISPATCH_CANONICAL_ROUTE_FIX.md`, `docs/STAFF_INVENTORY_CANONICAL_DETAIL_ROUTES_STABLE_PHYSICAL.md`, `docs/stock-requests-page-enterprise-redesign-plan.md`; backend truth map: `backend-api/docs/DELIVERY_SYSTEM_CODE_TRUTH_AUDIT.md`, `backend-api/docs/MASTER_FLOW_AUDIT_AND_EXECUTION_PLAN.md`.

---

## 0. Audit summary (current state)

### 0.1 Frontend routes and pages

| Area | Path / file | Role |
|------|-------------|------|
| **Inbound queue (warehouse)** | `/staff/branch/:branchId/warehouse/inbound-transfers` → `app/staff/(larkon)/branch/[branchId]/warehouse/inbound-transfers/page.tsx` | Calls `staffInboundQueue(branchId)`; table with type, from/to, status, qty, SR link, session hint, **Receive** / **Open transfers**. |
| **Receive Center (hub)** | `/staff/branch/:branchId/inventory/receive` → `inventory/receive/page.jsx` | Unified `staffGetIncomingInboundUnified`; splits enterprise vs legacy; drawer/modals. |
| **Incoming list** | `/staff/branch/:branchId/inventory/incoming` → `inventory/incoming/page.jsx` | Same API as Receive Center subset; enterprise rows link to receive workspace. |
| **Receive dispatch workspace** | `/staff/branch/:branchId/inventory/receive-dispatch/:dispatchId` → `inventory/receive-dispatch/[dispatchId]/page.jsx` | `staffGetDispatch`, controlled session (`staffReceiveDispatch` with modes), print via `dispatchPrintUrl` / `grnPrintUrl`. |
| **Dispatch print preview** | `/staff/branch/:branchId/inventory/dispatch-print/:id` → `inventory/dispatch-print/[id]/page.tsx` | Tab-style doc kinds (challan, delivery note, etc.); **URL not in** `lib/staffInventoryRoutes.js` (hardcoded in page). |
| **Stock request detail** | `/staff/branch/:branchId/inventory/stock-request-detail/:requestId` (helper: `staffStockRequestDetailPath`) | Linked from inbound table **inline** with template string, not helper. |
| **Legacy transfers** | `/staff/branch/:branchId/inventory/transfers?tab=incoming` | Used for `kind === "TRANSFER"` from inbound page. |

**Duplication:** Three staff surfaces overlap on “inbound to branch” (warehouse inbound-transfers, Receive Center, Incoming). Backend already exposes a **narrower** actionable queue (`inbound-queue`) vs **wider** unified list (`incoming-unified`).

### 0.2 Route helpers (`lib/staffInventoryRoutes.js`)

- Present: `staffStockRequestListPath`, `staffStockRequestCreatePath`, `staffStockRequestDetailPath`, `staffDispatchReceiveWorkspacePath`, `staffVendorReceiptDetailPath`.
- **Missing (plan):** `staffInboundTransfersPath(branchId)`, `staffReceiveCenterPath(branchId)`, `staffIncomingShipmentsPath(branchId)`, `staffDispatchPrintPath(branchId, dispatchId, docKind?)`, optional `staffLegacyTransfersIncomingPath(branchId)`.

### 0.3 API usage (frontend → backend)

| Client function | HTTP | Backend notes |
|-----------------|------|---------------|
| `staffInboundQueue` | `GET /api/v1/staff/branch/:branchId/inbound-queue` | `staffBranchQueues.controller` — **auth only**; branch allow-list via `getAllowedBranchIdsForInboundReceive`; **no** `requirePermission` on route. |
| `staffGetIncomingInboundUnified` | `GET /api/v1/inventory/receipts/incoming-unified?branchId=` | `requirePermission("inventory.read", "org.read")` + same branch allow-list in controller. |
| `staffGetDispatch` | `GET /api/v1/inventory/dispatches/:id` | **No inventory.receive** — `canUserAccessDispatchReadOrPrint` (org member, source/dest branch, warehouse assignment, delivery assignment). |
| Receive session / submit / confirm | `/dispatches/:id/receive-session*` | `assertDispatchReceiveAccess` → `canUserAccessDispatchReceive` (destination branch membership / org owner). |
| `staffReceiveDispatch` | `POST .../receive` | Session-first flow; permissions also checked in service layer (verify vs confirm keys). |
| Print HTML | `GET .../dispatches/:id/print/...` | `assertDispatchAccessibleForPrint` (same family as read/print). |

**Shape (inbound-queue):** `branchInboundQueue.service.ts` exposes rich fields: `lineCount`, `receiveActionable`, `effectiveStatus`, `effectiveStatusDisplay`, `items[]`, `createdAt`, `nextReceiveAction`, `dispatchReceiveSession`, etc. **Current UI uses a subset** and types omit several fields.

### 0.4 Why the page shows “Forbidden” / AccessDenied

The inbound-transfers page (`page.tsx` lines 92–98) returns `AccessDenied` when **any** of:

1. `errorCode === "forbidden"` — `GET /api/v1/branches/:id/me` returned 403 (no branch access / not approved).
2. `!hasViewPermission` — from `useBranchContext`: requires **both** `branch.view` and `dashboard.view` (`lib/useBranchContext.js`).
3. `!canReceive` — requires `inventory.receive`.

**Sidebar mismatch (`src/lib/branchSidebarConfig.ts`):** “Inbound transfers” is visible if `inventory.receive` **OR** `inbound.read` **OR** `inventory.read` (`anyPerms`). Example: **DISPATCH_STAFF** has `inventory.read` but **not** `inventory.receive` → **nav shows the link, page shows AccessDenied** — poor enterprise UX and looks like a “bug”.

**Secondary mismatch:** Backend `GET inbound-queue` does **not** require `inventory.receive`; a user with only `inventory.read` could theoretically get 200 from API if branch allow-list passes, while UI never calls it because of gate 3.

**Conclusion:** The Forbidden/AccessDenied state is **often a deliberate coarse gate** (`inventory.receive`) but **partly invalid** for roles that should **see** the queue read-only (operations visibility), and **misaligned** with sidebar and backend for listing vs acting.

---

## A. Business flow (target end-to-end)

### A.1 Canonical lifecycle

1. **Demand:** Branch raises **stock request** (or owner/warehouse drives fulfillment).
2. **Allocation / fulfillment:** Allocation plan, pick lists, pack — **StockDispatch** created (enterprise) or legacy **StockTransfer** path.
3. **Ship / in transit:** Dispatch status `PACKED` → `IN_TRANSIT`; transport and delivery assignments optional.
4. **Branch inbound queue:** Destination branch sees row on **Inbound transfers** (and aligned widgets elsewhere).
5. **Receive:** Controlled **DispatchReceiveSession**: draft verify (`dispatch.receive.verify`) → submit → manager confirm (`dispatch.receive.confirm.branch_manager`) → ledger post / GRN linkage where applicable.
6. **Discrepancy / shortage / damage:** Captured on lines (reason codes, excess, notes); **discrepancy** print and owner/exception queues per existing services.
7. **Settlement:** Stock request derived status moves to received / partial; any follow-up tasks visible on SR detail and ops summaries.

### A.2 Stock dispatch vs legacy transfer

| Kind | UX label (target) | Open action | Receive semantics |
|------|-------------------|-------------|-------------------|
| `DISPATCH` | Inter-branch dispatch (enterprise) | Primary: receive workspace | Session-based; statuses `PACKED` / `IN_TRANSIT` drive `nextReceiveAction` from backend. |
| `TRANSFER` | Legacy transfer | Deep-link to **Transfers → incoming** (or dedicated legacy modal if later) | `OPEN_LEGACY_TRANSFER_RECEIVE`; no `DispatchReceiveSession`. |

### A.3 Partial receive

- **List:** Show `quantitiesReceived / quantitiesExpected`, line count, and **effective** stock-request status badge when `linkedStockRequestId` present (`effectiveStatusDisplay` from API).
- **Detail (receive workspace):** Show remaining qty per line, session state; allow resume when session `DRAFT` or dispatch still receivable.
- **Row CTA:** Label by `nextReceiveAction` (e.g. “Continue receive”, “Submit for confirmation”, “Awaiting manager”) — **use backend hint**, do not fork rules in UI.

### A.4 Completed receive

- Session `POSTED` or dispatch `DELIVERED`: list row shows **Completed** (read-only); primary CTA becomes **View** / **Print** (not “Receive”).
- Receive workspace: existing `isPosted` pattern — inputs disabled; print confirmation / discrepancy available.

### A.5 Blocked / forbidden states (target behavior)

| Condition | List page | Receive workspace | Print |
|-----------|-----------|-------------------|-------|
| No branch access | Full-page access denied (branch) | Same | N/A |
| Can view queue, cannot receive | **Show list**; Receive disabled / hidden; copy explains role | Optional: allow **read-only** dispatch summary if API allows read/print | If `canUserAccessDispatchReadOrPrint` |
| Can receive | Full actions | Full verify/submit per permissions | As today |
| Manager confirm only | N/A | Submit disabled for verify-only; confirm enabled if `dispatch.receive.confirm.branch_manager` | Same |

---

## B. RBAC and action matrix (branch + warehouse roles)

Permissions referenced: `branch.view`, `dashboard.view`, `inventory.read`, `inventory.receive`, `inbound.read`, `inbound.receive`, `dispatch.view`, `dispatch.receive.verify`, `dispatch.receive.confirm.branch_manager`, `warehouse.view`, `warehouse.operations`, `warehouse.manage`, `delivery.view`, `org.read` (owner-style).

| Role / persona | See inbound queue | Open SR detail | Open dispatch (read) | Verify receive (draft) | Submit session | Manager confirm / post | Print challan / DN / worksheet | Print confirmation / discrepancy |
|----------------|-------------------|----------------|------------------------|-------------------------|------------------|-------------------------|------------------------------|-----------------------------------|
| **BRANCH_MANAGER** | Yes | Yes | Yes | Yes (if also has verify) | Yes | Yes (confirm key) | Yes | After post / as policy |
| **WAREHOUSE_MANAGER** (at hub) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **RECEIVING_STAFF** | Yes | Yes | Yes | Yes | Yes | No (unless given confirm) | Yes | When allowed by dispatch state |
| **DISPATCH_STAFF** | **Read-only queue** (no receive CTA) | If `inventory.read` | Yes (read/print family) | No | No | No | Yes (source/dest rules) | No until posted (policy) |
| **DELIVERY_STAFF** | Optional minimal (in-transit only) — **product decision** | Optional link | Read if delivery assignment | No | No | No | POD-related only | No |
| **BRANCH_STAFF** (inventory.read only) | Read-only if shown at all | Yes | No dispatch receive | No | No | No | No | No |
| **Org owner** (not branch member) | Via owner panel, not this page | N/A | Backend may allow | Backend `canUserAccessDispatchReceive` true if org owner pattern | Same | Same | Same | Same |

**Rules:**

- **Gate “view page”** with: branch context OK + **any** of (`inbound.read`, `inventory.read`, `dispatch.view`, `inventory.receive`, `warehouse.view` for hub — exact OR list to be finalized in implementation to match matrix doc).
- **Gate “receive actions”** with: `inventory.receive` **or** (`inbound.receive` if adopted as alias in seeds) + `dispatch.receive.verify` for draft saves where split verify is used.
- **Gate “manager post”** with: `dispatch.receive.confirm.branch_manager` (existing).
- **Hide vs disable:** Hide CTAs the user can never use; disable with tooltip when state prevents action (e.g. awaiting `IN_TRANSIT`).

---

## C. Information architecture — Inbound transfers (final page)

### C.1 Header

- Title: **Inbound to branch** (consistent verb; subtitle clarifies “Stock dispatch and legacy transfer shipments destined for this branch”).
- Breadcrumb: Warehouse dashboard → Inbound (use stable paths).

### C.2 Summary cards (KPI strip)

Derive from queue payload + optional second fetch to `inventoryOperationsExceptionSummary` if already used on warehouse dashboard (avoid duplicate if KPI exists on parent):

- **Action required:** count rows where `nextReceiveAction` in actionable set (not `COMPLETED`, not pure `REVIEW_INBOUND` stuck).
- **In transit:** `status === IN_TRANSIT` (dispatch) / equivalent transfer.
- **Awaiting manager:** session `AWAITING_CONFIRMATION`.
- **Completed (7d optional):** collapsed or link to filter.

### C.3 Filter bar

- Text search: dispatch id, SR id, source name (client-side first; server-side if API extended).
- **Type:** All / Dispatch / Legacy transfer.
- **Status:** Packed, In transit, Delivered, Session states (mapped from `nextReceiveAction` groups).
- **Date:** created / updated (if API returns; else client on `createdAt`).

### C.4 Result table

- Sortable columns (implementation order): Type + ref, **Dispatch / transfer #**, source, destination, **SR link**, dispatch status, **effective SR status** (if linked), expected/received qty, line count, **session** badge, **next step** (human label mapped from `nextReceiveAction`), **updated** (`createdAt` until more timestamps exposed).
- **Row-level actions:** primary button (Receive / Continue / View / Print menu), overflow menu for print links (open in new tab).

### C.5 Bulk / secondary actions

- **Refresh** (keep).
- **Export CSV** (optional phase 2; client-side from loaded rows).
- Link **Receive PO** (vendor path) — keep as secondary, not primary.

### C.6 States

- **Loading:** Spinner + skeleton rows (match warehouse pages).
- **Empty:** Differentiate “none” vs “filters matched nothing”; link to Receive Center / SR list.
- **Error:** Show API message; 403 from queue → “You can view this branch but inbound queue is restricted” vs branch 403.
- **Forbidden (no branch):** existing `AccessDenied` for branch/me failures only.
- **Read-only notice:** Single alert when user lacks receive but has view — **do not** use same component as “no branch permission” (copy distinction).

---

## D. Data model and UI fields (enterprise columns)

Use **`BranchInboundQueueItem`** from `branchInboundQueue.service.ts` as source of truth.

| Field | Source | Display |
|-------|--------|---------|
| Kind | `kind` | Badge DISPATCH / TRANSFER |
| Reference | `inboundId` | `#123` with tooltip “Dispatch id” vs “Transfer id” |
| From | `fromLocation.name` | Text |
| To | `toLocation.name`, `toLocation.branchId` | Text + verify matches current branch |
| Dispatch status | `status` | Badge (color map shared with receive workspace) |
| SR | `linkedStockRequestId` | Link via `staffStockRequestDetailPath` |
| Effective SR status | `effectiveStatusDisplay` | Pill (label + color) |
| Lines | `lineCount` | Number |
| Qty | `quantitiesExpected`, `quantitiesReceived` | `x / y` + progress indicator if partial |
| Session | `dispatchReceiveSession` | Status + submitted/confirmed timestamps when present |
| Next step | `nextReceiveAction` | Mapped human string (centralize map in `src/lib/inboundTransfersUi.ts` or similar) |
| Created | `createdAt` | Formatted |
| Items preview | `items[]` | Optional expand row / popover (SKU, title, qty) — phase 2 |
| Discrepancy indicator | If API adds aggregate flag later; until then derive from receive workspace only | “Has open discrepancy” when field exists |

---

## E. Route architecture (canonical, helper-generated)

| User journey | Canonical URL | Helper |
|--------------|---------------|--------|
| Inbound queue (warehouse context) | `/staff/branch/:branchId/warehouse/inbound-transfers` | `staffInboundTransfersPath(branchId)` |
| Receive Center | `/staff/branch/:branchId/inventory/receive` | `staffReceiveCenterPath(branchId)` |
| Incoming list | `/staff/branch/:branchId/inventory/incoming` | `staffIncomingShipmentsPath(branchId)` |
| Receive dispatch | `/staff/branch/:branchId/inventory/receive-dispatch/:dispatchId` | `staffDispatchReceiveWorkspacePath` (exists) |
| Stock request detail | `/staff/branch/:branchId/inventory/stock-request-detail/:requestId` | `staffStockRequestDetailPath` (exists) |
| Dispatch print preview | `/staff/branch/:branchId/inventory/dispatch-print/:id?doc=` | **New** `staffDispatchPrintPath(branchId, dispatchId, doc?)` |
| Legacy incoming | `/staff/branch/:branchId/inventory/transfers?tab=incoming` | **New** helper |

**Redirects:** Keep `next.config.js` / `proxy.ts` legacy paths as today; no new rewrites for canonical URLs.

**Breadcrumbs:** All inbound-related pages should link upward using helpers (Inbound → Warehouse; Receive dispatch → Inbound **or** Receive Center — pick one canonical parent; recommend **Inbound** for warehouse hub, **Receive Center** for non-hub to avoid double parent).

---

## F. UX standards

### F.1 Buttons

- Primary: **Receive**, **Continue receive**, **View dispatch**, **Open stock request** (secondary outline).
- Legacy: **Open legacy transfer** (outline, de-emphasized).

### F.2 Badges

- Dispatch: `PACKED`, `IN_TRANSIT`, `DELIVERED` — same color map as `receive-dispatch/page.jsx` `statusBadge`.
- Session: `DRAFT`, `AWAITING_CONFIRMATION`, `POSTED`, `CANCELLED` — neutral / warning / success / secondary.

### F.3 Copy blocks (draft)

- **Read-only banner:** “You can track inbound shipments for this branch. Ask a branch manager to grant **Receive stock** if you need to post receipts.”
- **Empty:** “No inbound shipments are waiting for this branch. When a warehouse dispatches stock to you, it will appear here.”
- **403 queue (rare):** “Inbound queue is unavailable for this account on this branch.”

### F.4 Table actions

- Primary action rightmost; overflow “⋮” for Print submenu (mirrors receive workspace doc names).

### F.5 Mobile / responsive

- Table → stacked cards below `md`; KPI strip stacks; filters collapse to offcanvas or single dropdown (WowDash patterns — no visual redesign beyond responsive behavior).

### F.6 Template consistency

- Reuse `BranchHeader`, `Card` where other warehouse pages use them; avoid new color system.

---

## G. Technical implementation plan (files likely to change)

### G.1 Pages / routes (`bpa_web`)

- `app/staff/(larkon)/branch/[branchId]/warehouse/inbound-transfers/page.tsx` — main redesign: tiered gates, columns, states, helpers.
- `app/staff/(larkon)/branch/[branchId]/inventory/receive/page.jsx` — cross-links copy + optional “Open in warehouse inbound” for hub users.
- `app/staff/(larkon)/branch/[branchId]/inventory/incoming/page.jsx` — align CTAs/links with helpers; optional deprecation notice pointing to warehouse inbound for hub branches.
- `app/staff/(larkon)/branch/[branchId]/inventory/receive-dispatch/[dispatchId]/page.jsx` — breadcrumb parent link, read-only mode if product allows view-without-receive (optional phase); align back navigation to inbound when entered from there (query `?from=inbound` or referrer state).
- `app/staff/(larkon)/branch/[branchId]/inventory/dispatch-print/[id]/page.tsx` — consume route helper for internal links.

### G.2 Shared components (`bpa_web`)

- New (small): `src/components/warehouse/InboundTransfersTable.tsx` or `src/components/branch/inbound/InboundQueueTable.tsx` — table + empty/error.
- New: `src/lib/inboundTransfersUi.ts` — `nextReceiveActionLabel`, status maps, `canViewInboundQueue(permissions)`, `canReceiveInbound(permissions)`.
- Optional: `PermissionGate`-style wrapper for tiered access (if not duplicating `AccessDenied`).

### G.3 Route helpers

- `lib/staffInventoryRoutes.js` (+ `.d.ts` if needed) — add paths listed in section E.

### G.4 API calls / hooks (`bpa_web`)

- `lib/api.ts` — ensure `staffInboundQueue` returns full typed shape; consider typed interface file `types/inbound-queue.ts`.
- Optional hook `useStaffInboundQueue(branchId, enabled)` for loading/error and refetch.

### G.5 Permission utilities

- `src/lib/branchSidebarConfig.ts` — tighten **visibility** for inbound: require **view** set consistent with page (e.g. show nav only if `canViewInboundQueue`); keep receive-only items under separate sub-label if needed.
- `lib/useBranchContext.js` — **evaluate** whether `hasViewPermission` should remain `branch.view` + `dashboard.view` for all pages or be split per surface (large change — phase separately; document if inbound should use lighter gate).

### G.6 Backend (`backend-api`) — optional but recommended

- `staffBranchQueues.routes.ts` — add `requirePermission` aligned with list vs receive (e.g. allow `GET` with `inbound.read` OR `inventory.read` OR `inventory.receive`) to match frontend tiers.
- `branchInboundQueue.service.ts` — optional: add `reference` (human dispatch code), `updatedAt`, discrepancy flags when schema supports.
- `seedRolesPermissions.ts` / `branchRoles.ts` — resolve duplicate `CLINIC_INVENTORY_STAFF` entries if still conflicting; ensure `inbound.read` assigned where “see queue” is desired.

### G.7 Tests

- `bpa_web/tests/e2e/delivery-flow.spec.ts` — extend assertions for warehouse inbound path if scenarios exist.
- New unit tests for `inboundTransfersUi.ts` (pure functions).
- Backend: optional integration test for `GET /staff/branch/:id/inbound-queue` permissions.

### G.8 Docs

- This file (maintain as SSOT for inbound UI).
- Short cross-link from `docs/DELIVERY_SYSTEM_GAP_ANALYSIS.md` or master plan (one line) pointing here — **only if** those files are already being edited for release notes.

---

## H. Verification checklist

- [ ] **Page loads** for WAREHOUSE_MANAGER, RECEIVING_STAFF, BRANCH_MANAGER with expected columns.
- [ ] **DISPATCH_STAFF** (or inventory.read-only): sees **list OR** clear empty state — **not** misleading AccessDenied for `inventory.receive` alone.
- [ ] **Forbidden** only when branch `/me` forbids or user truly has zero view entitlements.
- [ ] **Receive dispatch** opens from row CTA with correct `dispatchId`.
- [ ] **Stock request** link uses helper and opens detail.
- [ ] **Print** links work for permitted user; open in new tab unchanged.
- [ ] **Statuses** match backend (`nextReceiveAction`, session status, dispatch status).
- [ ] **Partial receive** resumable: session `DRAFT` + `IN_TRANSIT` shows Continue.
- [ ] **Completed** rows: read-only / View + print only.
- [ ] **No broken links** after moving breadcrumbs (grep for hardcoded `/staff/branch/` in inbound flow).
- [ ] **Regression:** warehouse dashboard, fulfillment requests, stock requests list/detail, vendor receipts, pick lists — smoke after changes.

---

## Implementation phases

| Phase | Goal | Deliverables |
|-------|------|--------------|
| **1** | **RBAC + gates** | `inboundTransfersUi` permission helpers; sidebar filter alignment; inbound page tiered view vs receive; optional backend `requirePermission` on inbound-queue. |
| **2** | **IA + table** | Summary strip, filters, expanded columns using API fields; row CTAs driven by `nextReceiveAction`; completed vs active. |
| **3** | **Routes + navigation** | New helpers; replace hardcoded URLs; breadcrumb/query param from inbound → receive-dispatch. |
| **4** | **Convergence** | Decide single “primary” hub UX for warehouse branches (inbound-transfers vs receive center); cross-links; docs update. |
| **5** | **Tests + hardening** | E2E / unit tests; copy review; accessibility (table captions, aria on filters). |

---

## Open product decisions (resolve during implementation)

1. Should **DISPATCH_STAFF** see branch inbound at all, or only warehouse-outbound screens?
2. Should **receive-dispatch** allow read-only entry for users with `dispatch.view` but not `inventory.receive` (matches API `getDispatch`)?
3. Single canonical **parent** nav for receive workspace: Receive Center vs Inbound transfers (may differ for hub vs non-hub).

---

## Implementation notes (2026)

**What shipped**

- **`lib/inboundTransfersUi.js`** — `canViewInboundTransfersQueue`, `canReceiveStockAtBranch`, `canSeeDispatchPrintMenu`, `canViewReceiveDispatchWorkspace`, labels, status badge helpers, timestamp formatting.
- **`lib/staffInventoryRoutes.js`** — `staffInboundTransfersPath`, `staffReceiveCenterPath`, `staffIncomingShipmentsPath`, `staffDispatchPrintPath`, `staffLegacyTransfersIncomingPath`, `staffWarehouseDashboardPath`, `staffWarehouseReceivePoPath`; `staffDispatchReceiveWorkspacePath(branchId, dispatchId, { from })` optional query.
- **`warehouse/inbound-transfers/page.tsx`** — Tiered access: branch `/me` vs inbound visibility vs read-only banner; KPI cards; filters; enterprise table; `AccessDenied` with clear copy; links and prints via helpers.
- **`inventory/receive-dispatch/[dispatchId]/page.jsx`** — Read-only workspace when user has read/dispatch visibility but not receive; breadcrumb uses `?from=inbound`; route helpers for navigation and redirects.
- **`inventory/dispatch-print/[id]/page.tsx`** — `staffDispatchPrintPath` for doc tabs; back link via `staffDispatchReceiveWorkspacePath`.
- **`inventory/receive/page.jsx`** — Redirect cleanup using `staffReceiveCenterPath`.
- **`src/lib/branchSidebarConfig.ts`** — Inbound sidebar entries: added `dispatch.view` and warehouse anyPerms for hub alignment.
- **Tests:** `lib/inboundTransfersUi.test.js`, `lib/staffInventoryRoutes.test.js`; npm script `test:unit:inbound`.

**Not changed (follow-up)**

- Backend `GET /staff/branch/:id/inbound-queue` still auth + branch allow-list only.
- Receive Center / Incoming list pages not fully converted to read-only tier (only receive redirect).

Open product decision **#2** resolved: receive-dispatch allows read-only view when `canViewReceiveDispatchWorkspace` is true without `inventory.receive`.

---

**Implementation report:** `bpa_web/docs/warehouse/STAFF_INBOUND_TRANSFERS_IMPLEMENTATION_REPORT.md`

---

*Document path:* `bpa_web/docs/warehouse/STAFF_BRANCH_INBOUND_TRANSFERS_ENTERPRISE_REDESIGN_PLAN.md`
