# Staff Inventory Operations — QA Checklist

Use this after implementing the unified Inventory Operations UX for staff branch context.

## Routes

- `/staff/branch/[branchId]/inventory` — Summary; links to Receive Center, Opening stock, Adjustments, Transfers, Incoming.
- `/staff/branch/[branchId]/inventory/receive` — **Receive Center**: list (GRNs by branch location), filters, table, row-click drawer, KPIs, actions (Opening stock, Incoming dispatches).
- `/staff/branch/[branchId]/inventory/receive/opening` — **Opening stock** form only; success toast and redirect to Receive Center.
- `/staff/branch/[branchId]/inventory/adjustments` — List (in-session recent + server when API exists), filters, table, drawer, Create form; info banner when server list is pending.
- `/staff/branch/[branchId]/inventory/transfers` — List (outgoing/incoming tabs), filters, table, row-click drawer, lot-aware Create (FEFO + override), Receive modal.

## Manual tests

### Navigation and branch isolation

- [ ] For `branchId = 2` (and another branch), open each of the three main pages (receive, adjustments, transfers). Confirm URL stays on that branch and data is scoped (no cross-branch data).
- [ ] From Inventory summary, "Receive Center" goes to receive; "Opening stock" goes to receive/opening; "Adjustments" and "Transfers" go to the correct list pages.
- [ ] From Receive Center, "Opening stock" goes to receive/opening; "Incoming dispatches" goes to incoming list.

### Receive Center

- [ ] Receive Center shows breadcrumb (Branch → Inventory → Receive), branch label, KPI chips (may be placeholders), and actions (Opening stock, Incoming dispatches).
- [ ] Filters: date from/to, status (All, Draft, Received). Changing them refreshes the list when `staffGrnList` is called with first branch location.
- [ ] Table shows Ref (GRN #), Date, Location, Vendor, Status. If no GRNs, empty message is shown.
- [ ] Row click opens right-side drawer. Drawer shows summary then loads detail (skeleton then content). Print button prints GRN content.

### Opening stock

- [ ] Opening stock page has Back to Receive Center, form (location, reference, date, items grid). Submit records opening stock and shows success toast; redirects to Receive Center after short delay.
- [ ] Errors show as toasts (no inline alert).

### Adjustments

- [ ] Info banner "Server list pending; only recent session adjustments shown." appears when server list is empty.
- [ ] Create adjustment: type, location, variant, qty, reason. Submit shows success toast and adds row to "Adjustment requests" table (in-session).
- [ ] Table shows Date, Type, Variant, Qty delta, Reason, Status. Row click opens drawer with details and Print.

### Transfers

- [ ] Create transfer: From (this branch), To (other branch), Items. Each line has **Variant** → **Lot** (FEFO: select variant first, lot dropdown fills; user can override lot) and **Qty**. Submit sends `allocations: [{ lotId, variantId, quantity }]` and succeeds (no "lotId required" error).
- [ ] List shows Outgoing/Incoming tabs, status filter. Row click opens drawer (summary + detail fetch). Drawer has Dispatch (for draft outgoing) and Receive (for in-transit incoming) when permitted.
- [ ] Success/error for create, dispatch, receive use toasts (no inline alerts).

### Toasts

- [ ] Success, error, and warning toasts appear (e.g. after create adjustment, after transfer create). Toasts auto-dismiss (about 4 s), have close button, and stack top-right.

### Permissions

- [ ] With staff that has only `inventory.receive`: Receive Center and Opening stock are accessible; Create transfer / Adjustments create may be hidden or denied as per existing permission checks.
- [ ] With manager/approver permissions: Approve/Post or Dispatch/Receive actions appear in drawer where applicable.

### Posted records

- [ ] Where backend marks records as posted/received, drawer does not show edit/approve actions for those records (read-only).

## Follow-up improvements

- Backend: add `GET /api/v1/inventory/adjustment-requests?branchId=...` and wire Adjustments list to it; remove or hide "Server list pending" when list is available.
- Backend: optional `GET /api/v1/grn?branchId=...` to simplify Receive Center list (otherwise list uses first branch location).
- KPIs (Today In, Today Out, Net Adjust, Low Stock): wire to real counts when backend endpoints or aggregates exist.
- Print: consider a shared printable layout component and `window.print()` on a dedicated print-only div for GRN, Challan, and Adjustment Note.
