# Bulk Receive UX Redesign — Analysis & Plan

**Page:** `/owner/inventory/receipts/bulk`  
**Goal:** Product browser + multi-select, split-view layout (Larkon style).  
**Date:** 2026-02-22

---

## 1. Current State

### 1.1 Route & Files

| Item | Location |
|------|----------|
| **Route** | `/owner/inventory/receipts/bulk` |
| **Page** | `app/owner/(larkon)/inventory/receipts/bulk/page.tsx` |
| **Shared components** | `PageHeader` (`_components/shared/PageHeader.jsx`), `VariantSelector`, `LotSection`, `BulkReceiveDrawer` |
| **Layout** | Owner layout (`app/owner/layout.jsx`) wraps with auth + KYC guards |

### 1.2 API Calls (Current)

| API | Purpose |
|-----|---------|
| `GET /api/v1/inventory/locations` | Load locations dropdown |
| `GET /api/v1/inventory/variants/search?q=&limit=25` | Variant typeahead (per-row search, debounced 200ms) |
| `GET /api/v1/vendors/lookup?orgId=&q=&limit=15` | Vendor search (debounced 200ms) |
| `GET /api/v1/inventory/receipts/bulk-template` | CSV template download |
| `POST /api/v1/inventory/receipts/bulk` | Submit bulk receive |

**Variants search response:** Array of `{ id, sku, title, barcode, productId, requiresLot, requiresExpiry, requiresMfg, product: { id, name, slug } }`. Flat list; no unit cost.

### 1.3 Shared Table/Grid Patterns

- **Receipts list page** (`receipts/page.tsx`): `card radius-12`, `table-responsive`, `table table-hover`, Bootstrap `Offcanvas` for GRN drawer
- **Stock counts** (`stock-counts/page.tsx`): `card radius-12 mb-3`, `form-select form-select-sm`, `form-control form-control-sm`, `btn btn-* btn-sm`
- **Bulk page (current):** `table table-sm table-bordered`, `form-control form-control-sm`, inline variant search per row

No shared data grid component; tables are inline. No virtualization utility.

### 1.4 Larkon Design Classes

From existing inventory pages:

- `card radius-12`, `card-body p-24`
- `form-select form-select-sm`, `form-control form-control-sm`
- `btn btn-primary`, `btn btn-outline-secondary btn-sm`, `btn btn-outline-danger btn-sm`
- `badge bg-secondary`, `badge bg-success`, etc.
- `list-group`, `list-group-item list-group-item-action`
- `alert alert-info radius-12`, `alert alert-success radius-12`
- `table table-sm table-bordered`, `table-responsive`
- `Offcanvas` (Bootstrap) for drawer

---

## 2. Plan

### 2.1 Files to Create

| File | Purpose |
|------|---------|
| `app/owner/(larkon)/inventory/receipts/bulk/types.ts` | Row types, VariantOption, etc. |
| `app/owner/(larkon)/inventory/receipts/bulk/ProductBrowserPanel.tsx` | Left panel: search, filters (placeholders), grouped product list with checkboxes |
| `app/owner/(larkon)/inventory/receipts/bulk/SelectedReceiveGrid.tsx` | Right panel: editable grid with validations, keyboard shortcuts |
| `app/owner/(larkon)/inventory/receipts/bulk/BulkReceivePage.tsx` | Container: split layout, mode toggle, header, summary, submit |

### 2.2 Files to Modify

| File | Change |
|------|--------|
| `app/owner/(larkon)/inventory/receipts/bulk/page.tsx` | Replace with import/re-export of `BulkReceivePage` (keeps route) |

### 2.3 Layout (Split View)

- **Desktop:** `row g-3` with `col-lg-4` (Product Browser) + `col-lg-8` (Selected Items)
- **Mobile:** Product Browser in Offcanvas/drawer; toggle button to open. Selected grid full width.
- Header (Location, Vendor, Invoice, Notes) — **sticky within card** using `position-sticky` + Bootstrap utilities

### 2.4 Feature Matrix

| Feature | Approach |
|---------|----------|
| Product Browser | Debounced search → `GET /variants/search` → group by `product.name` client-side |
| Filters | UI placeholders: Category, Brand, Status, Verified — no backend wiring |
| Grouped list | Group variants by `productId`; collapsible product rows, variant checkboxes |
| Select all visible / Clear | Buttons in Product Browser header |
| Add to grid | On variant checkbox select: add row if not present; else focus + flash |
| Dedupe | Same variantId already in grid → focus row, add `animate` class |
| Selected Grid | Same columns as current; inline edits; Enter/Tab flow; Ctrl+D duplicate; Ctrl+Enter submit |
| Location change | If `rows.length > 0` and location changes → confirm dialog "Changing location will reset selected lines. Continue?" |
| Summary bar | Sticky footer: Total items, Total qty, Estimated cost; Submit button right |
| Mode toggle | "Visual Select" (default) vs "Spreadsheet" — Spreadsheet shows paste/import UI (current behavior) |
| CSV / Paste | Keep existing; available in Spreadsheet mode only |

### 2.5 State Management

- Single source of truth: `rows` (selected items) in `BulkReceivePage`
- `ProductBrowserPanel` receives `onAddVariant`, `selectedVariantIds` (for checkbox state)
- `SelectedReceiveGrid` receives `rows`, `onRowsChange`, `onFocusRow`, `focusedRowId`
- No new global state; props + callbacks

---

## 3. Risks & Compatibility

| Risk | Mitigation |
|------|------------|
| **API load** | Debounce search 300ms; limit 50 per request; no infinite scroll initially |
| **Performance (long lists)** | No virtualization initially; API returns ≤50 items. If >200 items needed later, add lightweight windowing |
| **CSS conflicts** | Use module CSS scoped to bulk page only; reuse Larkon classes |
| **State sync** | Both modes (Visual, Spreadsheet) write to same `rows` state |
| **Location reset** | Confirm dialog before clearing; avoid accidental data loss |
| **Unit cost prefill** | API has no unit cost. Leave empty or 0; future: optional valuation fetch per variant |

### 3.1 Backend Compatibility

- No backend changes required
- Variants search returns `product`; grouping done client-side
- Filters (Category, Brand, Status, Verified): UI placeholders only — backend does not expose these params for variants/search today

---

## 4. Conflicts / Blockers

**None identified.** Current bulk page is self-contained; no shared state with other pages. Design uses existing Larkon/Bootstrap patterns.

---

## 5. Implementation Order

1. Create `types.ts`
2. Create `ProductBrowserPanel.tsx` (search, grouped list, checkboxes, select all / clear)
3. Create `SelectedReceiveGrid.tsx` (editable grid, validations, keyboard flow)
4. Create `BulkReceivePage.tsx` (layout, header, mode toggle, summary, submit)
5. Update `page.tsx` to render `BulkReceivePage`
6. Regression: build, navigate, select, edit, submit, verify other owner inventory pages
