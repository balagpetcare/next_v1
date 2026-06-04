# Staff inbound receiving — permission tiers (web)

Aligned with **Inbound transfers** (`/staff/branch/[branchId]/warehouse/inbound-transfers`), **Receive Center** (`/inventory/receive`), **Incoming shipments** (`/inventory/incoming`), and **Receive dispatch** (`/inventory/receive-dispatch/[dispatchId]`).

## Tiers (frontend)

| Tier | Meaning | Typical JWT permissions |
|------|---------|-------------------------|
| **View queue** | See unified inbound list (dispatches + legacy transfers) | `inbound.read`, `inventory.read`, `inventory.receive`, `dispatch.view`, or hub: `warehouse.view` / `warehouse.operations` / `warehouse.manage` |
| **View dispatch workspace** | Open receive-dispatch page read-only (lines, print affordances per API) | Above read set **or** receive: `inventory.receive` / `inbound.receive` |
| **Receive** | Post quantities, submit drafts, legacy transfer receive | `inventory.receive` or `inbound.receive` |
| **PO queue load** | Call pending PO receipts API | `purchase.receive`, `grn.post`, `grn.create`, `inbound.grn`, or `inventory.receive` |
| **Print** (UI hint) | `canSeeDispatchPrintMenu` in `lib/inboundTransfersUi.js` | Heuristic only — **server enforces** print URLs |

## Read-only compatible screens

- **Inbound transfers** — queue + actions gated separately (unchanged redesign).
- **Receive Center** — shell when **view queue**; read-only banner if no receive; Opening stock tab disabled; PO table hidden or non-actionable without PO perms; dispatch **Receive** / legacy **Receive** / PO **Receive** disabled without receive perm; **Transfer** drawer respects `allowReceiveSubmit`.
- **Incoming shipments** — same shell as Receive Center; **View** always opens canonical workspace (`?from=incoming` for breadcrumb).
- **Receive dispatch** — `canViewReceiveDispatchWorkspace`; `readOnlyWorkspace` when view but not receive; mutations disabled.

## Navigation

- `incoming/[dispatchId]` redirects to `receive-dispatch/[id]?from=incoming` (breadcrumb → Incoming shipments).
- Inbound transfers continues to use `?from=inbound` where applicable.

## Known API / JWT risks (not all fixable in web-only PR)

- **`staffGetDispatch`** may still return **403** for some tokens even when menu/navigation suggests access — UI shows error state; align backend `dispatch.view` / branch scope with `canViewReceiveDispatchWorkspace` when tightening contracts.
- **`staffGetIncomingInboundUnified`** vs **`staffInboundQueue`** may use different guards — if one succeeds and the other fails, lists can differ between Receive Center and Inbound transfers.
- **Print** (`dispatchPrintUrl`, dispatch print page): UI may show print entry points while API returns 403 — document for ops; fix requires backend alignment on print permissions.

## QA note

End-to-end QA is **ready for role-matrix passes** once backend JWTs match the intended matrix above; run flows for: view-only hub staff, receive-only branch staff, and PO receiver without dispatch receive.
