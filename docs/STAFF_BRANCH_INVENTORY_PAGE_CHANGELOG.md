# Staff Branch Inventory Page — Changelog

## Summary

The Staff Branch Inventory page (`/staff/branch/[branchId]/inventory`) was redesigned as a **single-branch operational screen** in Larkon style: clear branch context, essential filters, clickable summary cards, action-first table, row drill-down drawer (ledger), empty state with CTAs, and an optional “Today’s Tasks” side panel. No direct stock edit; adjustments only via Stock Request / Transfer / Adjustments.

## What changed

### File modified

- **`app/staff/(larkon)/branch/[branchId]/inventory/page.jsx`** — Full redesign (single file).

### New/updated in `lib/api.ts`

- **`staffInventoryDashboard(branchId)`** — `GET /api/v1/inventory/dashboard?branchId=` for summary cards (totalSkus, lowStockCount, outOfStockCount, etc.).
- **`staffInventoryLedger(opts)`** — `GET /api/v1/inventory/ledger?locationId=&variantId=&page=&limit=` for drawer “last 10 ledger entries”.

### Layout and structure

- **Branch context bar** — Existing **BranchHeader** kept: branch name, type badge, role badge, “Switch branch” link.
- **Page header** — Breadcrumb (Staff > Branches > Branch #X > Inventory), title “Branch Inventory”, subtitle “Ledger-based stock • Adjust via request”, right-side chips (Branch name + ID, Low count, Out count).
- **Quick actions** — Receive Stock, Adjustments, Transfers, Stock Requests (permission-aware, same as before).
- **Filters card** — One compact row: Search (name/SKU/barcode), Status (All | Low | Out | Negative | Expiring), Sort (Qty low→high, Qty high→low, Name A–Z/Z–A), Reset.
- **Summary cards (4)** — Total Items, Available Qty, Low Stock, Out of Stock. Low and Out cards are clickable and set table filter. Data from dashboard API when available, else derived from list.
- **Main table** — Columns: Product, SKU, Available, Reorder, Status (badge), Last Move (—), Actions (dropdown). Striped/hover, numbers right-aligned. Row click opens drawer.
- **Row actions dropdown** — View Ledger, Create Stock Request, Request Transfer (if canTransfer), Adjustments (if canAdjust), Open Product (owner product in new tab). No “Edit quantity”.
- **Drawer (offcanvas)** — Opened by row click or “View Ledger”. Shows: stock (Available, Reserved, In transit), last 10 ledger entries via `staffInventoryLedger`, and quick action buttons. Backdrop closes drawer.
- **Empty state** — Icon, “No stock movements yet for this branch.”, “Inventory is calculated from ledger entries.”, CTAs: Create Stock Request, Go to Stock Requests (Pending).
- **Today’s Tasks panel** — Right column (col-lg-3): links to Stock Requests, Transfers, Low stock (click applies filter), Receive. Reuses existing routes.

### Behaviour

- **Status filter** — “Low” uses API `lowStockOnly`; “Out” and “Negative” filter current list client-side; “Expiring” filters on `expiringSoon` if present.
- **Sort** — Client-side: qty_asc, qty_desc, name_asc, name_desc.
- **Pagination** — Shared `Pagination` component when `totalPages > 1`.
- **Negative stock** — Status badge “Negative” (danger) and ⚠ hint; “View Ledger” emphasized in dropdown and drawer.
- **Permissions** — Same as before: `inventory.read` required; Receive / Adjust / Transfer / Stock Requests visibility by permission.

### Docs added

- **`docs/STAFF_BRANCH_INVENTORY_PAGE_PLAN.md`** — Goal, hierarchy, layout (Larkon), APIs, files, rules, Staff vs Owner.
- **`docs/STAFF_BRANCH_INVENTORY_PAGE_CHANGELOG.md`** — This file.

## Staff vs Owner

| Aspect        | Owner Inventory           | Staff Branch Inventory        |
|---------------|---------------------------|-------------------------------|
| Scope         | Multi-branch              | Single branch (URL)           |
| Focus         | Analytics, admin          | Operations, tasks, ledger     |
| Filters       | Deeper                    | Essential only                |
| Summary       | 6 possible                | 4 cards, clickable            |
| Drill-down    | Optional                  | Drawer + last 10 ledger       |
| Side panel    | —                         | Today’s Tasks                 |

## Regression

- Only `app/staff/(larkon)/branch/[branchId]/inventory/page.jsx` and `lib/api.ts` (additions) touched. BranchHeader, AccessDenied, Card, Pagination, and staff API helpers unchanged in behaviour. Other staff pages and Owner inventory unchanged.
