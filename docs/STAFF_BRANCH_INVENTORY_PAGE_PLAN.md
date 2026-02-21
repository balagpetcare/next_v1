# Staff Branch Inventory Page — Plan (Larkon UX)

## Page goal

**Route:** `/staff/branch/[branchId]/inventory`  
**Purpose:** Single-branch operational inventory screen for staff — quick stock check, low/out of stock visibility, pending request/transfer follow-up, ledger drill-down. **No direct stock edit**; all changes via Stock Request / Transfer / Adjustment request.

---

## Information hierarchy

1. Branch identity + quick status (context bar)
2. Search + essential filters (compact)
3. Summary cards (Total Items, Available Qty, Low Stock, Out of Stock) — clickable to filter table
4. Main table (action-first)
5. Pending tasks (optional side panel: Today’s Tasks)
6. Drill-down: row click → drawer (breakdown, batches, last 10 ledger entries)

---

## Layout (Larkon style)

### A) Top header

- **Title:** Branch Inventory  
- **Subtitle:** Ledger-based stock • Adjust via request  
- **Breadcrumb:** Staff > Branches > Branch #[id] > Inventory  
- **Right chips:** Branch: [name] (ID: [id]), Low stock: [n], Out: [n]  
- (Optional) Last sync time if API provides it

### B) Branch context bar

- Reuse existing **BranchHeader**: branch name, type badge, role badge, **Switch branch** link.  
- Optionally show branch address/contact if available (mini).  
- Ensures staff always know which branch they are viewing.

### C) Top controls (one card, compact)

- Search (name / SKU / barcode)  
- Status filter: All | Low | Out | Negative | Expiring  
- Sort: Qty low→high | Recently moved | Name  
- (Optional) Category, Stock type if in system — keep staff filters “essential only”.

### D) Summary cards (3–4 max, staff version)

- **Total Items** (SKU count)  
- **Available Qty** (sum)  
- **Low Stock** (count)  
- **Out of Stock** (count)  
- Cards clickable → apply filter to table (e.g. click “Low Stock” → status = Low).

### E) Main table (Larkon: striped/hover, badges, numbers right-aligned)

| Product       | SKU  | Available | Reorder | Status | Last Move   | Actions |
|---------------|------|----------:|--------:|--------|-------------|---------|
| Name + thumb? | sku  | number    | min     | badge  | “2h ago • In”| ⋮       |

- **Product:** name + optional thumbnail.  
- **Available:** ledger-derived (from list/summary API).  
- **Reorder:** min level (branch/location).  
- **Status:** badge (Normal / Low / Out / Negative / Expiring).  
- **Last Move:** short hint if API supports; else “—” or “View ledger”.  
- **Actions:** dropdown (View Ledger, Create Stock Request, Request Transfer, Report Damage/Return if module exists, Open Product). No “Edit quantity”.

### F) Row actions (permissions-aware)

1. **View Ledger** (priority)  
2. **Create Stock Request** (if staff allowed)  
3. **Request Transfer** (if branch-to-branch flow exists)  
4. **Report Damage / Return** (if module exists)  
5. **Open Product** (detail page)  
- ❌ No direct “Edit quantity”.  
- ✔ “Adjust via request” only.

### G) Drill-down drawer (row click or “View Ledger”)

- Current stock: Available / Reserved / In transit.  
- Batches (if enabled): batch no, expiry, qty.  
- **Last 10 ledger entries** (timeline).  
- Quick actions (same as row dropdown).  
- Keeps staff on same page for fast decisions.

### H) Empty state (staff version)

- **Message:** “No stock movements yet for this branch.”  
- **Subtext:** “Inventory is calculated from ledger entries.”  
- **CTAs:**  
  - Create Stock Request  
  - Go to Stock Requests (Pending)  
  - (Optional) Contact Admin  

### I) Optional: “Today’s Tasks” side panel

- Pending stock requests (count + link)  
- Pending transfers (count + link)  
- Low stock items (quick jump)  
- Expiring soon (quick jump)  
- Reuse **BranchTodayBoard** if data available on this page.

---

## APIs (existing / to use)

| Use              | Endpoint / helper                         | Notes |
|------------------|-------------------------------------------|--------|
| List             | `GET /api/v1/inventory?branchId=&search=&lowStockOnly=&page=&limit=` | staffInventoryList |
| Alerts           | `GET /api/v1/inventory/alerts?branchId=`  | staffInventoryAlerts |
| Dashboard cards  | `GET /api/v1/inventory/dashboard?branchId=` | totalSkus, lowStockCount, etc. — add in lib if needed |
| Ledger           | `GET /api/v1/inventory/ledger?locationId=&variantId=&page=&limit=` | For drawer; add staffInventoryLedger in lib |
| Locations        | `GET /api/v1/inventory/locations`         | staffInventoryLocations (for context) |
| Stock requests   | `GET /api/v1/stock-requests?branchId=&status=` | For Today’s Tasks counts |
| Transfers        | `GET /api/v1/transfers?…`                 | For Today’s Tasks counts |

---

## Files to touch

| File | Change |
|------|--------|
| `app/staff/(larkon)/branch/[branchId]/inventory/page.jsx` | Full redesign: header, context bar, filters, summary cards, table, drawer, empty state, optional Today panel. |
| `lib/api.ts` | Add `staffInventoryLedger(locationId, variantId, page?, limit?)`, optionally `staffInventoryDashboard(branchId)` if not already staff-callable. |
| `docs/STAFF_BRANCH_INVENTORY_PAGE_PLAN.md` | This plan. |
| `docs/STAFF_BRANCH_INVENTORY_PAGE_CHANGELOG.md` | Short changelog after implementation. |

---

## Rules and guardrails

- Inventory is **read-only** (calculated view).  
- Adjustments only via: Stock Request, Transfer, Return/Damage flow, admin-approved adjustment.  
- Negative stock: show warning + prominent “View ledger”.  
- Reuse Larkon/BPA patterns: `card`, `table`, `badge`, `dropdown`, `btn`, `ri-*` / `solar:*` icons, `radius-12`, `table-responsive`.  
- Staff vs Owner: Staff = one branch, action/task focused, simpler filters, fast ledger drill-down. Owner = multi-branch, analytics-heavy.

---

## Staff vs Owner (summary)

| Aspect        | Owner Inventory           | Staff Branch Inventory        |
|---------------|---------------------------|-------------------------------|
| Scope         | Multi-branch              | Single branch (from URL)      |
| Focus         | Analytics, admin actions  | Operations, tasks, ledger     |
| Filters       | Deeper (category, brand…) | Essential only                |
| Summary cards | 6 possible                | 3–4 max                       |
| Row actions   | View Warehouse, Adjustment, Transfer, Product | View Ledger, Stock Request, Transfer, Damage/Return, Product |
| Drill-down    | Optional                  | Core (drawer + last 10 ledger)|
