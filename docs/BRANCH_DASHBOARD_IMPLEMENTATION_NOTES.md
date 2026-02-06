# Branch Dashboard – Implementation Notes

Quick reference for routes, components, permissions, and API endpoints used by the Staff Branch Dashboard. See also `docs/dashboard/BRANCH_DASHBOARD_BUILD_PLAN.md` and `docs/dashboard/BRANCH_API_MAP.md`.

---

## 1. Routes Added (bpa_web)

| Route | Permission(s) | Notes |
|-------|----------------|------|
| `/staff/branch` | — | Branch selector; redirects to first APPROVED or polls when PENDING |
| `/staff/branch/[branchId]` | `branch.view`, `dashboard.view` | Overview dashboard |
| `/staff/branch/[branchId]/inventory` | `inventory.read` | Inventory summary |
| `/staff/branch/[branchId]/inventory/receive` | `inventory.receive` | Receive stock (GRN) |
| `/staff/branch/[branchId]/inventory/adjustments` | `inventory.adjust` | Adjustments (damage/shortage) |
| `/staff/branch/[branchId]/inventory/transfers` | `inventory.transfer` | Transfers in/out |
| `/staff/branch/[branchId]/pos` | `pos.view` | POS dashboard (New Sale, History, Refunds, Cash Drawer) |
| `/staff/branch/[branchId]/services` | `services.view` or `appointments.view` | **CLINIC only** (branch.type === "CLINIC") |
| `/staff/branch/[branchId]/staff` | `staff.view` | Staff & Shifts (Staff, Invites, Shifts tabs) |
| `/staff/branch/[branchId]/reports` | `reports.view` | Reports placeholder |
| `/staff/branch/[branchId]/waiting` | — | Waiting placeholder (if present) |

Sidebar also references (placeholders or future): Tasks, Approvals, Customers — same pattern: route exists or 404, permission gates on page.

---

## 2. Components Added (bpa_web/src/components/branch)

| Component | Purpose |
|-----------|---------|
| `BranchHeader.jsx` | Branch name, type badge, role, "Switch branch" link |
| `BranchOverviewSkeleton.jsx` | Loading skeleton for overview |
| `AccessDenied.jsx` | WowDash card: title, message, missingPerm badge, Back + Select Branch |
| `PermissionGate.jsx` | requiredPerm / oneOfPerms / anyPerms; modes: hide, disable, deny-page |
| `BranchKpiRow.jsx` | KPI cards (sales, orders, low stock, etc.) |
| `BranchTodayBoard.jsx` | Today board sections (approvals, tasks, transfers, etc.) |
| `BranchAlertsPanel.jsx` | Low stock, expiry, flags |
| `BranchActivityTimeline.jsx` | Activity list (All/Me filter); safe metadata display |
| `StaffBranchSidebar.jsx` | Dynamic sidebar from `branchSidebarConfig.ts` |

Config: `src/lib/branchSidebarConfig.ts` (BRANCH_SIDEBAR, getFilteredBranchSidebar, anyPerms/featureFlag).  
Helpers: `src/lib/branchMenu.ts` (isStaffBranchRoute, getStaffBranchIdFromPath).

---

## 3. Permissions Used

- **Overview:** `branch.view`, `dashboard.view` (both required).
- **Inventory:** `inventory.read`, `inventory.receive`, `inventory.adjust`, `inventory.transfer`. Stock value card: `reports.view`.
- **POS:** `pos.view`, `pos.sell`, `pos.refund`, `pos.discount.override`; Cash drawer: `cashdrawer.open`, `cashdrawer.close`.
- **Services (Clinic):** `services.view` or `appointments.view`; manage: `appointments.manage` or `services.manage`.
- **Staff:** `staff.view`, `staff.manage`; Invites approve/reject: `staff.manage` or `approvals.manage`; Shifts: `shifts.view`, `shifts.manage`.
- **Reports:** `reports.view` (export: `reports.export` when implemented).

Sidebar hides items when user lacks the item’s `requiredPerm` (or any of `anyPerms`). Clinic group only when `branch.type === "CLINIC"`.

---

## 4. API Endpoints Mapped (actual usage)

Base: `http://localhost:3000` (API), app `3100` (Next.js). No port changes.

| Area | Method | Endpoint | Notes |
|------|--------|----------|--------|
| Branch access | GET | `/api/v1/branch-access/check/:branchId` | hasAccess |
| Branch access | GET | `/api/v1/branch-access/my-requests` | For selector + summary mapping |
| Branch access | GET | `/api/v1/branch-access/pending` | Manager pending requests |
| Branch access | GET | `/api/v1/branch-access/branch/:branchId` | Permissions for branch |
| Branch access | POST | `/api/v1/branch-access/:id/approve` | Approve request |
| Branch access | POST | `/api/v1/branch-access/:id/revoke` | Reject/revoke |
| Branches | GET | `/api/v1/branches/:id` | Branch details |
| Branches | GET | `/api/v1/branches/:branchId/manager/staff` | Staff list |
| Inventory | GET | `/api/v1/inventory?branchId=...` | List items |
| Inventory | GET | `/api/v1/inventory/alerts?branchId=...` | Low stock |
| Inventory | GET | `/api/v1/inventory/locations` | Locations |
| Inventory | POST | `/api/v1/inventory/opening` | Receive (opening stock) |
| Inventory | POST | `/api/v1/inventory/adjustment-requests` | Adjustments |
| Transfers | GET | `/api/v1/transfers?...)` | List; filter by branch client-side |
| Transfers | POST | `/api/v1/transfers` | Create |
| Transfers | POST | `/api/v1/transfers/:id/send` | Dispatch |
| Transfers | POST | `/api/v1/transfers/:id/receive` | Receive |
| POS | GET | `/api/v1/pos/products?branchId=...` | Products for POS |
| POS | POST | `/api/v1/pos/sale` | Create sale |
| POS | GET | `/api/v1/pos/receipt/:orderId` | Receipt |
| Orders | GET | `/api/v1/orders?branchId=...` | Sales history |
| Orders | GET | `/api/v1/orders/:id` | Order detail |
| Orders | POST | `/api/v1/orders/:id/cancel` | Refund (cancel) |
| Reports | GET | `/api/v1/reports/sales?branchId=...` | Used in fetchBranchSummary |
| Clinic | GET | `/api/v1/services/branches/:branchId/queue/today` | Placeholder (may 404) |
| Clinic | GET | `/api/v1/services/branches/:branchId/appointments?...)` | Placeholder (may 404) |
| Clinic | POST/PATCH | `.../appointments`, `.../appointments/:id` | Placeholder (may 404) |
| Services catalog | GET | `/api/v1/services?branchId=...` | Service types for clinic |

All branch-scoped calls pass `branchId`; no cross-branch data leak.

---

## 5. Data Hook

- **`useBranchContext(branchId)`** (`lib/useBranchContext.js`): Fetches composed branch summary (check + branch + my-requests + KPIs/alerts from reports/orders/inventory). Cached by branchId (TTL). Returns: branch, myAccess, kpis, todayBoard, alerts, activity, isLoading, errorCode, hasViewPermission, refetch. On 403, clears `lastActiveBranchId` for that branch so selector does not auto-redirect.

---

## 6. Branch Selector & Access States

- **APPROVED:** User can click "Enter branch"; lastActiveBranchId stored; redirect on load if only one approved.
- **PENDING:** Message "Approval Pending"; poll every 10s; redirect when one becomes APPROVED. No redirect to dashboard until approved.
- **REJECTED:** Hint shown; no Enter button; no polling (poll only when at least one PENDING).
- **SUSPENDED:** Hint "Access suspended"; no Enter button.
- **lastActiveBranchId:** Only used if it is in the current approved list; otherwise first approved branch is used. Cleared when 403 on that branch.

---

## 7. How to Test Quickly

1. **Selector:** Go to `/staff/branch` — see list; with APPROVED, redirect to `/staff/branch/:id` or click Enter.
2. **Overview:** Open `/staff/branch/:id` — requires branch.view + dashboard.view; 403 → AccessDenied and clear lastActiveBranchId for that branch.
3. **Direct URL without permission:** e.g. `/staff/branch/:id/inventory` without `inventory.read` → AccessDenied.
4. **POS:** Create sale (pos.sell), view history, refund (pos.refund); discount override (pos.discount.override).
5. **Staff:** As manager, open Invites tab, approve/reject; as staff (no staff.manage), list only, no actions.
6. **Clinic:** Services page only for branch.type === "CLINIC"; non-CLINIC → "Not a clinic branch".
7. **Switch branch:** BranchHeader "Switch branch" → `/staff/branch`; pick another branch.
8. **Activity:** Overview timeline shows activity when dashboard.view; safe render for missing actor/metadata.

---

## 8. Lint / Types

- Run project lint (e.g. `npm run lint`) and fix any reported issues in branch dashboard files.
- No circular imports; BranchHeader and shared components used only once per page.
