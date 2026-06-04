# Staff POS Multi-Cart Redesign - Implementation Report

## Scope Completed
- Rebuilt the staff POS sale workspace into a compact 3-panel cashier layout:
  - Left: product browser/search/scan.
  - Center: active multi-cart tabs + cart lines + cart totals/actions.
  - Right: customer + membership + checkout/payment context.
- Preserved existing top-level POS tabs and flows for:
  - New Sale
  - Sales History
  - Refunds
  - Cash Drawer
- Kept existing POS contracts and branch permission model intact, with minimal POS API extensions.

## Files Changed
### Frontend (`bpa_web`)
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx`
  - Implemented fixed 3-column composition.
  - Moved cart tabs into center panel context.
  - Added category state and local product filtering logic.
  - Added line-price patch flow for cart discount control.
  - Added compact cart totals/actions block with proceed-to-payment CTA.
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`
  - Rebuilt as compact product browser with:
    - scan/search mode toggle
    - barcode quick-add
    - search input
    - category chips
    - compact product list cards (image/name/sku/barcode/stock/price/add)
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartLinesTable.jsx`
  - Rebuilt cart rows with:
    - image + product/sku
    - lot/expiry preview
    - qty controls
    - unit price edit (discount control via sell price patch)
    - discount display
    - line total + remove
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
  - Updated to compact browser-like tab strip with:
    - active highlighting
    - `+` new cart
    - `x` safe close hook
    - held cart dropdown resume
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosMembershipPanel.jsx`
  - Added optional new-card entry-point behavior (fallback helper text when route not configured).
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCustomerPanel.jsx`
  - Minor display normalization for compact metadata formatting.
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCheckoutPanel.jsx`
  - Updated checkout subtitle to match center-cart/right-checkout layout.

### Backend (`backend-api`)
- `src/api/v1/modules/pos/pos.controller.ts`
  - Expanded product search OR filters to include `slug` and `category.name`.
  - Included `category` and first media URL in POS product payload.
  - Extended cart line patch controller to accept `quantity` or `unitSellPrice`.
- `src/api/v1/modules/pos/posCart.service.ts`
  - Enriched cart line include payload with product media URL.
  - Replaced qty-only line patch with generalized line patch:
    - supports `quantity`
    - supports `unitSellPrice`
  - Kept delete-on-qty<1 behavior.

## Product Search Bug - Root Cause and Fix
## Root Cause
- Search looked broken because matched items were silently removed before render:
  - frontend product flattening only kept rows with `stock > 0`.
- Search relevance was narrower than cashier expectations:
  - backend product query did not include product `slug` or `category.name`.
- Result UX was brittle for broad queries:
  - list was sliced early and lacked robust local matching behavior across all visible fields.

## Fix Applied
- Frontend:
  - Removed stock-based exclusion in product flattening.
  - Kept out-of-stock rows visible and disabled Add button instead.
  - Added local filter over `name`, `sku`, `barcode`, `variant title`, `category`.
  - Added category chip filtering.
  - Kept Enter-to-add first in-stock result for cashier speed.
- Backend:
  - Expanded `/api/v1/pos/products` query to include `slug` and `category.name`.
  - Included category + media in payload to support product panel rendering.

## Major Decisions
- Kept route and POS module boundaries stable (low risk).
- Preserved existing history/refunds/cash-drawer behaviors and contracts.
- Used cart-line `unitSellPrice` patch for line discount control instead of introducing a new discount schema.
- Kept cart note persistence in existing cart metadata model.
- Kept lot/batch data as preview-only in cart rows.

## Manual QA Checklist
- [ ] POS opens with compact sale workspace and one active cart by default.
- [ ] Layout presents three clear panels on desktop:
  - [ ] Left product browser
  - [ ] Center active cart
  - [ ] Right customer/membership/checkout
- [ ] Multi-cart tabs:
  - [ ] switch tabs
  - [ ] create via `+`
  - [ ] close via `x` (safe behavior for non-empty carts)
  - [ ] held carts can resume from dropdown
- [ ] Product search works for:
  - [ ] product name
  - [ ] SKU
  - [ ] barcode text
- [ ] Barcode scanner input adds product on Enter.
- [ ] Out-of-stock products are visible but not addable.
- [ ] Product click adds to active cart.
- [ ] Cart rows appear only in center panel, never in right panel.
- [ ] Cart row supports qty +/- and inline unit price update.
- [ ] Cart summary shows subtotal/discount/tax/payable.
- [ ] Hold, clear, note actions work.
- [ ] Customer phone lookup:
  - [ ] loads existing customer details when found
  - [ ] supports quick-create when not found
- [ ] Membership:
  - [ ] lookup by card
  - [ ] lookup by customer context
  - [ ] apply and clear card
- [ ] Checkout submit finalizes sale and allows invoice/receipt actions.
- [ ] Sales History, Refunds, Cash Drawer tabs still function.

## Remaining Limitations
- Customer multi-match selector is not fully implemented because current POS customer lookup resolves a single owner context.
- New membership card issuance remains a handoff to membership management flow unless a direct staff card-create route is provided.
- Lot/expiry shown in cart rows is preview-only and can change before finalization due live stock movement.
