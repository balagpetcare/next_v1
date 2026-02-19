# Owner Sidebar Refactor — Implementation Summary

**Applied:** 2026-02-19  
**Ref:** docs/SIDEBAR_DUPLICATE_REPORT.md

---

## Diff summary (permissionMenu.ts — owner only)

| Change type | Detail |
|-------------|--------|
| **Removed** | `owner.people.staff` (People → Staff) — canonical Staff kept under Access & Staff only. |
| **Removed** | `owner.requests.notifications` — Notifications kept only as top-level entry. |
| **Removed** | `owner.requests.transfers` (Inventory Transfers from Requests) — canonical under Inventory. |
| **Removed** | `owner.requests.adjustments` (Inventory Adjustments from Requests) — canonical under Inventory. |
| **Removed** | `owner.inventory.products` (Products link from Inventory) — canonical under Products as "All Products". |
| **Removed** | `owner.products.requests` (Product Requests from Products) — canonical under Requests & Approvals. |
| **Removed** | `owner.products.inventory` (Inventory link from Products). |
| **Removed** | `owner.products.stockRequests` (Stock Requests from Products). |
| **Removed** | `owner.products.returns` (Returns from Products) — canonical under Requests as "Returns & Damages". |
| **Renamed** | Inventory → "Transfers" → **"Inventory Transfers"** (same href `/owner/inventory/transfers`). |
| **Renamed** | Products → "Transfers" → **"Product Transfers"** (same href `/owner/transfers`). |
| **Icon** | Products section: `solar:box-outline` → **`solar:box-minimalistic-outline`** (Inventory unchanged). |

Applied to both **CORE_OWNER_FALLBACK** and **REGISTRY.owner**. Staff menus unchanged.

## ownerNav.js

- Added TODO comment; file left in place (no imports found; remove when confirmed dead).

## Before/after owner menu item counts (leaf entries with href)

| Source | Before (leaf hrefs) | After (leaf hrefs) |
|--------|----------------------|---------------------|
| CORE_OWNER_FALLBACK | 48 | 39 |
| REGISTRY.owner | 51 | 42 |

(Counts exclude parent-only nodes; duplicates removed as above.)

## Flattened owner hrefs — uniqueness assertion

Every owner route below appears **at most once** per menu tree, except `/owner/dashboards/branch-manager`, which remains in multiple placeholder entries (Operations/Medical/People) by design.

**Unique owner hrefs (post-refactor):**

- `/owner/dashboard`, `/owner/workspace`, `/owner/orders`
- `/owner/dashboards/branch-manager`, `/owner/dashboards/staff`
- `/owner/organizations`, `/owner/organizations/new`
- `/owner/branches`, `/owner/branches/new`
- `/owner/staffs`, `/owner/staffs/new`
- `/owner/staff`, `/owner/access/requests`, `/owner/access/control`, `/owner/access/matrix`
- `/owner/requests`, `/owner/product-requests`, `/owner/returns`, `/owner/cancellations`
- `/owner/inventory`, `/owner/vendors`, `/owner/inventory/warehouse`, `/owner/inventory/stock-requests`, `/owner/inventory/transfers`, `/owner/inventory/receipts`, `/owner/inventory/locations`, `/owner/inventory/adjustments`, `/owner/inventory/batches`
- `/owner/catalog`, `/owner/products`, `/owner/products/new`, `/owner/product-approvals`, `/owner/transfers`
- `/owner/finance`, `/owner/reports/sales`, `/owner/reports/stock`, `/owner/reports/revenue`
- `/owner/audit`, `/owner/settings`, `/owner/team`, `/owner/teams`, `/owner/overview`, `/owner/notifications`

**No duplicate menu entries remain** for any of the above routes other than the intentional branch-manager placeholders.
