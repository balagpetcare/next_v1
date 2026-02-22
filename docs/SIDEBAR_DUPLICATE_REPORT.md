# Sidebar Duplicate Report — Staff & Owner Panels

**Date:** 2026-02-19  
**Scope:** Owner and Staff panel sidebars (Larkon layout).  
**Governance:** Analysis only; no code changes until report is approved.

---

## 1. Menu Configuration Files Analyzed

| File | Purpose | Used by |
|------|--------|--------|
| `src/lib/permissionMenu.ts` | Single source: `CORE_OWNER_FALLBACK`, `REGISTRY.owner`, `REGISTRY.staff`. Owner sidebar uses `getFullMenu('owner')` → CORE_OWNER_FALLBACK; permission-filtered uses REGISTRY.owner. | `panelMenus.ts` (getFullMenu), `nav.ts` (buildMenu) |
| `src/larkon-admin/menu/panelMenus.ts` | Converts permissionMenu tree to Larkon `MenuItemType[]` for owner/shop/clinic/staff. | `Manu.ts` → VerticalNavigationBar |
| `src/lib/useStaffBranchMenuItems.ts` | Staff **branch** sidebar when on `/staff/branch/[branchId]`. Uses `branchSidebarConfig.ts`. | Staff branch layout |
| `src/lib/branchSidebarConfig.ts` | Branch-scoped items (Overview, Operations, Clinic, People, Analytics). No duplicate hrefs. | Staff branch only |
| `src/lib/branchMenu.ts` | Owner **branch** menu for `/owner/branches/[branchId]`. Separate scope. | Owner branch sidebar |
| `src/lib/nav.ts` | Builds nav from `buildMenu(app, permissions)`. | Sidebar.tsx (if used) |
| `src/lib/nav/ownerNav.js` | Legacy 3-item array (Home, Branches, Product Requests). **Not imported anywhere** in codebase. | Unused (dead code) |

**Conclusion:** All owner/staff top-level sidebar items come from **permissionMenu.ts**. Staff top-level has only 2 items (Branches, Workspace)—no duplicates. Staff **branch** sidebar (`branchSidebarConfig.ts`) has no duplicate routes. Duplicates exist only in **Owner** menu (both CORE_OWNER_FALLBACK and REGISTRY.owner share the same structure and duplicates).

---

## 2. Duplicates Identified (Owner Panel Only)

### 2.1 Exact duplicate route (same href, same logical feature)

| Route | Label(s) | Icon | Parent group(s) | Id(s) | Verdict |
|-------|----------|------|------------------|-------|---------|
| `/owner/staff` | "Staff" | (none on leaf) | **People**; **Access & Staff** | `owner.people.staff`; `owner.staff.directory` | **True duplicate.** Same link and same label in two sections. Not role-based; redundant. |
| `/owner/notifications` | "Notifications" | `solar:bell-outline` (top-level); (inherit in Requests) | **Top-level**; **Requests & Approvals** | `owner.notifications`; `owner.requests.notifications` | **True duplicate.** Same route in two places. |

### 2.2 Same route, different labels (placeholder vs real)

| Route | Occurrences | Parent group | Label | Id | Verdict |
|-------|-------------|--------------|-------|-----|---------|
| `/owner/dashboards/branch-manager` | 5 in fallback, 4 in REGISTRY (Operations + Dashboards) | Operations (Appointments, POS); Medical (Patients, Prescriptions, Treatments); People (Customers); **Dashboards** (Branch Manager) | Appointments, POS, Patients, Prescriptions, Treatments, Customers → all point here; Branch Manager → same | Various | **Intentional** for fallback (placeholders). In REGISTRY, "Branch Manager" is the real entry; Operations/Medical/People items are placeholders. Consider removing placeholder duplicates or keeping under one "Dashboards" only. |

### 2.3 Same icon + overlapping labels (Inventory vs Products)

| Icon | Parent groups | Issue |
|------|----------------|-------|------|
| `solar:box-outline` | **Inventory**; **Products** | Two top-level groups share the same icon. Within them, several **routes appear in both** (see 2.4). |

### 2.4 Same route in multiple sections (Inventory + Products + Requests)

| Route | In Inventory | In Products | In Requests & Approvals | Verdict |
|-------|--------------|-------------|--------------------------|---------|
| `/owner/products` | "Products" | "All Products" | — | **Duplicate.** One canonical: e.g. under **Products** only. |
| `/owner/inventory` | "Stock" | "Inventory" | — | **Duplicate.** One canonical: e.g. under **Inventory** only. |
| `/owner/inventory/stock-requests` | "Stock Requests" | "Stock Requests" | — | **Duplicate.** Keep under **Inventory** only. |
| `/owner/inventory/transfers` | "Transfers" | — | "Inventory Transfers" (badge) | **Duplicate.** Same route in Inventory and Requests; keep in **Inventory** and in **Requests** as alias (badge) is acceptable, or single entry under Inventory. |
| `/owner/inventory/adjustments` | "Adjustments" | — | "Inventory Adjustments" (badge) | Same route in two groups; keep one or keep Requests as approval-focused alias. |
| `/owner/returns` | — | "Returns" | "Returns & Damages" (badge) | **Duplicate.** Same route in Products and Requests. |
| `/owner/product-requests` | — | "Product Requests" | "Product Requests" (badge) | **Duplicate.** Same route in Products and Requests. |

### 2.5 Two different “Transfers” routes

| Route | Label | Parent | Note |
|-------|--------|--------|------|
| `/owner/transfers` | "Transfers" | **Products** | Main transfers UI (app exists). |
| `/owner/inventory/transfers` | "Transfers" / "Inventory Transfers" | **Inventory**; **Requests & Approvals** | Inventory transfers. |

Both are valid routes; refactor rule: do not change route paths. Recommendation: show **one** “Transfers” in sidebar (e.g. under Inventory → `/owner/inventory/transfers`) and optionally one “Transfers (legacy)” or merge UX later; or keep both with distinct labels (e.g. “Transfers” vs “Inventory Transfers”) and place under one section.

---

## 3. Per-item table (Owner — leaf items with href)

Flattened for audit. **Source:** `permissionMenu.ts` (CORE_OWNER_FALLBACK and REGISTRY.owner). Only duplicate/overlap rows are summarized below.

| # | File | Id | Label | Route | Icon | Parent group | Duplicate? |
|---|------|-----|-------|-------|------|----------------|------------|
| 1 | permissionMenu.ts | owner.people.staff | Staff | /owner/staff | — | People | **Yes** (see 2.1) |
| 2 | permissionMenu.ts | owner.staff.directory | Staff | /owner/staff | — | Access & Staff | **Yes** (see 2.1) |
| 3 | permissionMenu.ts | owner.notifications | Notifications | /owner/notifications | solar:bell-outline | (root) | **Yes** (see 2.1) |
| 4 | permissionMenu.ts | owner.requests.notifications | Notifications | /owner/notifications | — | Requests & Approvals | **Yes** (see 2.1) |
| 5 | permissionMenu.ts | owner.inventory.products | Products | /owner/products | — | Inventory | **Yes** (see 2.4) |
| 6 | permissionMenu.ts | owner.products.list | All Products | /owner/products | — | Products | **Yes** (see 2.4) |
| 7 | permissionMenu.ts | owner.inventory.overview | Stock | /owner/inventory | — | Inventory | **Yes** (see 2.4) |
| 8 | permissionMenu.ts | owner.products.inventory | Inventory | /owner/inventory | — | Products | **Yes** (see 2.4) |
| 9 | permissionMenu.ts | owner.inventory.stockRequests | Stock Requests | /owner/inventory/stock-requests | — | Inventory | **Yes** (see 2.4) |
| 10 | permissionMenu.ts | owner.products.stockRequests | Stock Requests | /owner/inventory/stock-requests | — | Products | **Yes** (see 2.4) |
| 11 | permissionMenu.ts | owner.inventory.transfers | Transfers | /owner/inventory/transfers | — | Inventory | **Yes** (see 2.4) |
| 12 | permissionMenu.ts | owner.requests.transfers | Inventory Transfers | /owner/inventory/transfers | — | Requests & Approvals | **Yes** (see 2.4) |
| 13 | permissionMenu.ts | owner.inventory.adjustments | Adjustments | /owner/inventory/adjustments | — | Inventory | **Yes** (same route in Requests) |
| 14 | permissionMenu.ts | owner.requests.adjustments | Inventory Adjustments | /owner/inventory/adjustments | — | Requests & Approvals | **Yes** |
| 15 | permissionMenu.ts | owner.products.returns | Returns | /owner/returns | — | Products | **Yes** (see 2.4) |
| 16 | permissionMenu.ts | owner.requests.returns | Returns & Damages | /owner/returns | — | Requests & Approvals | **Yes** |
| 17 | permissionMenu.ts | owner.products.requests | Product Requests | /owner/product-requests | — | Products | **Yes** (see 2.4) |
| 18 | permissionMenu.ts | owner.requests.product | Product Requests | /owner/product-requests | — | Requests & Approvals | **Yes** |

**Staff panel:** REGISTRY.staff has only 2 items (Branches → `/staff/branch`, Workspace → `/staff/workspace`). No duplicates. Branch sidebar (`branchSidebarConfig.ts`) has unique keys/hrefs per group.

---

## 4. Proposed New Sidebar Structure (Owner)

- **Single canonical location per route:** Each of `/owner/staff`, `/owner/notifications`, `/owner/products`, `/owner/inventory`, `/owner/inventory/stock-requests`, `/owner/inventory/transfers`, `/owner/inventory/adjustments`, `/owner/returns`, `/owner/product-requests` appears **once** in the sidebar.
- **People vs Access & Staff:** Keep **one** “Staff” link at `/owner/staff`. Prefer under **Access & Staff** (with Access Requests, Access Control, Access Map); remove from **People** (People can keep only “Customers” or be merged into My Business / Access later).
- **Notifications:** Keep **one** “Notifications” at `/owner/notifications`. Prefer **top-level** entry; remove from Requests & Approvals. If “Requests & Approvals” should open an inbox that includes notifications, use a single “Inbox” or “Requests” that goes to `/owner/requests` and do not add a second Notifications link.
- **Inventory vs Products:**  
  - Use **one** “Inventory” group with icon `solar:box-outline` and **one** “Products” group with a **different** icon (e.g. `solar:box-minimalistic-outline` or `solar:tag-outline`) to avoid same icon for two sections.  
  - Under **Inventory:** Stock (`/owner/inventory`), Products (`/owner/products`), Vendors, Warehouse, Stock Requests, Transfers (`/owner/inventory/transfers`), Receipts, Locations, Adjustments, Batches.  
  - Under **Products:** Catalog, All Products, New Product, Approvals, Product Requests (link once), and **no** duplicate “Inventory”, “Stock Requests”, “Transfers”, “Returns”. Either remove those from Products and keep only product-catalog–related links, or make Products a **submenu under Inventory** (e.g. “Inventory” → Products, Stock, …).  
  - **Transfers:** One entry “Transfers” → `/owner/inventory/transfers` under Inventory. Remove “Transfers” from Products that points to `/owner/transfers` **or** keep `/owner/transfers` as a single entry under Inventory with label “Transfers (list)” if both routes must stay (no path changes).
- **Requests & Approvals:** Keep as approval-focused group. Include: Inbox (`/owner/requests`), Product Requests (link), Inventory Transfers (link), Inventory Adjustments (link), Returns & Damages (link), Cancellations, and **remove** duplicate “Notifications” (link only once at top level).
- **Dashboards / Operations:** In REGISTRY, keep “Dashboards” with Branch Manager and General Staff. In CORE_OWNER_FALLBACK, consider adding same “Dashboards” group and reducing Operations/Medical/People placeholders that all point to branch-manager (or leave as-is for fallback only).

Resulting high-level owner structure (concise):

1. Dashboard  
2. Workspace (REGISTRY only)  
3. Operations (optional: keep or fold into Dashboards)  
4. Medical (optional)  
5. Dashboards (Branch Manager, General Staff)  
6. My Business (Orgs, Branches, Staffs)  
7. People (Customers only; **Staff** removed — single Staff under Access & Staff)  
8. Access & Staff (Access Requests, **Staff**, Access Control, Access Map)  
9. Requests & Approvals (Inbox, Product Requests, Inventory Transfers, Adjustments, Returns, Cancellations; **no** Notifications)  
10. Inventory (Stock, Products, Vendors, Warehouse, Stock Requests, Transfers, Receipts, Locations, Adjustments, Batches)  
11. Products (Catalog, All Products, New Product, Approvals, Product Requests; **no** Inventory, Stock Requests, Transfers, Returns)  
12. Finance, Reports, Audit & System, Settings, Teams & Delegation  
13. **Notifications** (single top-level)

Icons: Inventory = `solar:box-outline`, Products = different icon (e.g. `solar:box-minimalistic-outline` or `solar:tag-outline`).

---

## 5. File List to Change (After Approval)

| File | Change |
|------|--------|
| `src/lib/permissionMenu.ts` | Remove duplicate entries in CORE_OWNER_FALLBACK and REGISTRY.owner per §4; ensure one href per route; give Products group a distinct icon; optionally add Workspace to CORE_OWNER_FALLBACK for parity. |
| `src/lib/nav/ownerNav.js` | Optional: remove or document as dead code (no imports found). |

No changes to:

- `src/larkon-admin/menu/panelMenus.ts` (consumes tree as-is)
- `src/lib/branchSidebarConfig.ts`, `useStaffBranchMenuItems.ts`, `branchMenu.ts` (no duplicates)
- Route paths or permission keys (per refactor rules)

---

## 6. Before/After Summary

| Metric | Before | After (proposed) |
|--------|--------|-------------------|
| Owner: entries for `/owner/staff` | 2 (People, Access & Staff) | 1 (Access & Staff) |
| Owner: entries for `/owner/notifications` | 2 (root, Requests) | 1 (root) |
| Owner: “Products” / “All Products” → `/owner/products` | 2 | 1 |
| Owner: “Stock” / “Inventory” → `/owner/inventory` | 2 | 1 |
| Owner: Stock Requests, Transfers, Adjustments, Returns, Product Requests | 2 each in Inventory/Products or Inventory/Requests | 1 canonical each; optional alias in Requests for approval context |
| Owner: Inventory vs Products same icon | Both `solar:box-outline` | Inventory one icon, Products different icon |
| Staff (top-level) | 2 items, no duplicates | No change |
| Staff (branch sidebar) | No duplicates | No change |

---

## 7. Permission Logic

- **permissionMenu.ts:** `required` arrays and `filterTree` unchanged; only duplicate **menu entries** removed. Same permissions apply to the single canonical entry for each route.
- **buildMenu** fallback (owner auth + empty/missing My Business): still merges from CORE_OWNER_FALLBACK; after refactor, fallback tree will have the same routes but no duplicate links.
- **Role-specific items:** No removal of role-specific entries; only duplicate links for the same route consolidated.

---

**Next step:** Once this report is approved, apply the refactor to `permissionMenu.ts` (and optionally clean `ownerNav.js`) and re-test owner sidebar in both “full menu” and “permission-filtered” modes.
