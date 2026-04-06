# Purchase Order Create - Product Picker Redesign Plan

## Summary

Redesign the product/variant selection experience on the Owner Purchase Order creation page (`/owner/inventory/purchase-orders/new`) to provide an enterprise-grade product picker with full-width layout and professional procurement UX.

## Current Issues (Root Cause Analysis)

### 1. Layout Constraints
- The `ProductBrowserPanel` is embedded in a narrow `col-lg-5` column
- Search results and variant checkboxes are cramped in a small vertical list
- The right side (`col-lg-7`) contains only helper text, wasting horizontal space
- The overall layout follows the Bulk Receive pattern (left browser, right grid) but PO creation has different needs

### 2. Poor Information Density
- Variant results show minimal information: only SKU, title, and optional Lot/Exp badge
- No brand/category metadata visible in results
- No pack/unit info
- No status indicator (active/inactive displayed differently)
- Product grouping with accordion expand/collapse adds clicks without adding value for PO creation

### 3. UX Friction
- Users must expand each product group to see/select variants
- No quick "Add to PO" action per variant — checkbox model is slow
- Search + category + brand filters exist but feel cramped
- Empty state is a simple text message, not a helpful prompt

### 4. Misaligned Component Reuse
- `ProductBrowserPanel` was designed for Bulk Receive (receiving against inventory)
- PO creation has different goals: selecting variants to order, not to receive
- The checkbox multi-select model doesn't match the "pick → edit quantity → add" procurement workflow

## Proposed Solution

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  Order Header Card (vendor, warehouse, dates, notes)                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Line Items Card                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Filter Toolbar (full width)                                    ││
│  │  [Search input        ] [Category ▾] [Brand ▾] [Status ▾]       ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Search Results / Product Browser (full width)                  ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ [Product Info] [Variant/SKU/Meta] [Pack Info] [Status] [+] │││
│  │  │ [Product Info] [Variant/SKU/Meta] [Pack Info] [Status] [+] │││
│  │  │ [Product Info] [Variant/SKU/Meta] [Pack Info] [Status] [+] │││
│  │  │ ...                                                        │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  PO Lines Table (editable, full width)                          ││
│  │  Variant | Qty | Unit Cost | Line Total | Note | Actions        ││
│  │  ...                                                             ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Changes

1. **Full-width search results**: Replace the narrow left-column browser with a full-width result list
2. **Row-based variant display**: Each variant gets a full-width row with structured columns
3. **Immediate "Add" action**: Each row has an "Add to PO" button (becomes "Added ✓" when selected)
4. **Rich metadata display**: Show product name, variant name, SKU, brand, category, status, pack info
5. **Clear visual hierarchy**: Product name prominent, variant/SKU secondary, meta info tertiary
6. **Better empty state**: Helpful prompt when no search performed or no results
7. **Better loading state**: Skeleton or shimmer for async operations
8. **Collapsible browser**: Allow users to collapse the browser section when focusing on line editing

### Component Structure

**Before:**
```
PurchaseOrderCreateForm
├── Order Header Card
└── Line Items Card
    ├── ProductBrowserPanel (col-lg-5, cramped)
    │   └── Grouped product list with checkboxes
    ├── Helper text (col-lg-7, wasted space)
    └── Lines Table
```

**After:**
```
PurchaseOrderCreateForm
├── Order Header Card
└── Line Items Card
    ├── POProductPicker (full width, new component)
    │   ├── FilterToolbar (search + filters in row)
    │   └── ResultsGrid (full width, action per row)
    └── POLinesTable (full width, unchanged logic)
```

### New Component: `POProductPicker`

A dedicated product picker optimized for PO creation:

- Full-width filter bar with search input, category, brand, and status dropdowns
- Full-width results area with structured rows
- Each row shows: product name, variant name, SKU, brand, category, status badge, pack info
- Quick "Add" button per row
- Visual indication of already-added variants
- Keyboard navigation support
- Collapsible/expandable via card header toggle

### Result Row Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Product Name]              [Variant Title]  [Brand] [Category]          │
│ SKU: ABC123 · Barcode: 1234567890123        [ACTIVE] [Pack: 12/box] [+] │
└──────────────────────────────────────────────────────────────────────────┘
```

- Product name: `fw-semibold`, prominent
- Variant title: `text-muted`, secondary
- SKU/barcode: `small text-muted`
- Brand/category badges: `badge bg-light text-dark`
- Status: `badge` (green=active, gray=inactive)
- Pack info: `small` when available
- Action button: `btn btn-sm btn-outline-primary` → `btn-success` when added

## Implementation Plan

### Phase 1: Create POProductPicker Component
1. Create `app/owner/(larkon)/inventory/purchase-orders/_components/POProductPicker.tsx`
2. Implement filter toolbar with search, category, brand, status
3. Implement full-width results grid with action buttons
4. Reuse existing API calls from `ProductBrowserPanel`

### Phase 2: Update PurchaseOrderCreateForm
1. Replace `ProductBrowserPanel` embed with `POProductPicker`
2. Remove the cramped col-lg-5/col-lg-7 layout
3. Keep the PO lines table unchanged
4. Wire up add/remove variant callbacks

### Phase 3: Polish & Responsive
1. Add loading states, empty states
2. Ensure responsive behavior (stack on mobile)
3. Test keyboard navigation
4. Verify sync between picker and lines table

## Files Changed

| File | Change |
|------|--------|
| `app/owner/(larkon)/inventory/purchase-orders/_components/PurchaseOrderCreateForm.tsx` | Major refactor: replace ProductBrowserPanel with POProductPicker |
| `app/owner/(larkon)/inventory/purchase-orders/_components/POProductPicker.tsx` | New file |

## Behavior Preserved

- All filter functionality (search, category, brand, active/inactive)
- API calls to `/api/v1/inventory/variants/search`
- Variant → line item sync (add creates line, remove deletes line)
- Duplicate variant prevention
- Form submission logic
- PO creation API call

## Responsive Behavior

- **Desktop (lg+)**: Full-width filter bar, full-width results grid
- **Tablet (md)**: Filter bar wraps to 2 rows, results remain full width
- **Mobile (sm)**: Filter controls stack, results become compact cards

## Testing Checklist

- [ ] Search by SKU returns results
- [ ] Search by product name returns results
- [ ] Category filter narrows results
- [ ] Brand filter narrows results
- [ ] Status filter works (active only vs all)
- [ ] Clicking "Add" adds variant to lines table
- [ ] Re-clicking "Added" does nothing (or shows message)
- [ ] Removing line from table updates picker state
- [ ] Empty search shows helpful prompt
- [ ] Loading state visible during search
- [ ] Form submission works with selected lines
- [ ] Mobile layout is usable

---

## Implementation Report

### Implementation Date
April 3, 2026

### Root Cause of Bad UX

The original implementation reused `ProductBrowserPanel` from the Bulk Receive flow, which was designed for a different use case (receiving inventory against POs). Key issues:

1. **Misaligned layout**: The component was placed in a `col-lg-5` column (42% width) while the remaining `col-lg-7` contained only helper text, wasting horizontal space
2. **Accordion UX pattern**: Products were grouped with expand/collapse accordions, adding clicks without value for PO creation where users want quick selection
3. **Checkbox multi-select model**: Designed for batch operations, not the "select → configure quantity → add" workflow of procurement
4. **Minimal metadata display**: Only SKU, title, and lot/expiry badge were shown; no brand, category, or status information
5. **Cramped filter controls**: Category, brand, and status dropdowns were squeezed into a narrow column

### Files Changed

| File | Change Type |
|------|-------------|
| `app/owner/(larkon)/inventory/purchase-orders/_components/PurchaseOrderCreateForm.tsx` | **Modified**: Replaced ProductBrowserPanel with POProductPicker, removed multi-select modal, added collapsible state |
| `app/owner/(larkon)/inventory/purchase-orders/_components/POProductPicker.tsx` | **New file**: Enterprise-grade full-width product picker component |
| `docs/owner/PO_CREATE_PRODUCT_PICKER_REDESIGN_PLAN.md` | **New file**: This plan document |

### Component Structure: Before vs After

**Before:**
```
PurchaseOrderCreateForm
├── Order Header Card
└── Line Items Card
    ├── ProductBrowserPanel (col-lg-5) ← cramped
    │   ├── Search input
    │   ├── Filters (cramped flex-wrap)
    │   └── Grouped product list with accordions
    ├── Helper text (col-lg-7) ← wasted space
    ├── Modal for multi-select
    └── Lines Table
```

**After:**
```
PurchaseOrderCreateForm
├── Order Header Card
└── Line Items Card
    ├── POProductPicker (full width)
    │   ├── Collapsible header with selected count
    │   ├── Filter toolbar (search + category + brand + status)
    │   └── Full-width results table with action buttons
    └── Lines Table (unchanged)
```

### Behavior Preserved

- All filter functionality (search, category, brand, active/inactive)
- API calls to `/api/v1/inventory/variants/search` and `/api/v1/meta/categories`, `/api/v1/meta/brands`
- Variant → line item sync (add creates/fills line)
- Duplicate variant prevention with error message
- Per-line variant search input (change variant on existing line)
- Form submission logic unchanged
- PO creation API call unchanged
- Vendor and warehouse selection modals unchanged

### New Features

1. **Full-width table layout**: Results displayed in a structured table with columns for Product/Variant, SKU, Brand, Category, Status, and Action
2. **Row-click to add**: Click anywhere on a row to add the variant (in addition to the explicit "Add" button)
3. **Keyboard navigation**: Tab through results, Enter/Space to add
4. **Rich metadata display**: Product name, variant title, SKU (as code), barcode, brand, category, and active/inactive status badge
5. **Lot/Expiry indicator**: Badge shown for variants requiring lot or expiry tracking
6. **Clear visual state**: Added variants show green "Added ✓" badge and green row highlight
7. **Collapsible browser**: Users can collapse the picker to focus on line editing
8. **Better empty states**: Helpful prompts for no search, loading, and no results
9. **Smart line filling**: When adding from picker, fills first empty line instead of always creating new line
10. **Clear filter button**: One-click reset of all filters

### Responsive Behavior

- **Desktop (lg+)**: Full table layout with all columns visible
- **Tablet (md)**: Filter bar wraps to 2 rows, table remains full width with horizontal scroll if needed
- **Mobile (sm)**: 
  - Picker remains functional with narrower table
  - Horizontal scroll for table if columns overflow
  - Mobile card layout preserved for line items below picker

### Technical Notes

- Removed unused multi-select modal code and state (`showProductModal`, `pmQ`, `pmOpts`, `pmLoading`, `pmSelected`, `addSelectedProductLines`)
- Added `pickerCollapsed` state for collapse/expand functionality
- POProductPicker uses same API endpoints as old ProductBrowserPanel but with higher result limit (60 vs 50)
- Results table uses sticky header for scroll context
