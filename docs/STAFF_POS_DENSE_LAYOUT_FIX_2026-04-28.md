# Staff POS Dense Layout Fix

Date: 2026-04-28
Route: `app/staff/(larkon)/branch/[branchId]/pos`
Target URL: `http://localhost:3104/staff/branch/1/pos`

## Root UI problems

- The Larkon page-content shell still left too much padding after the sidebar and kept the footer in the viewport budget.
- The POS page header and tab strip consumed too much vertical space before the selling workspace started.
- The POS shell enforced a wide minimum content width, which created unnecessary horizontal waste and scrolling pressure.
- Product cards, cart rows, and right-rail cards used more padding and row height than a cashier workflow needs.
- The page relied too much on outer page scroll instead of keeping scroll localized to the catalog, cart list, and right rail.

## Changed files

- `app/staff/(larkon)/branch/[branchId]/pos/layout.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosScannerInput.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTable.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosActionBar.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCustomerPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosMembershipPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosPaymentSummary.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCheckoutPanel.jsx`
- `src/larkon-ui/styles/dashboard-overrides.scss`

## Layout decisions

- Added a route-scoped dense mode via the POS route layout so only this page gets compact dashboard spacing.
- Converted the POS page into a viewport-bound workspace using the Larkon topbar height and a flex shell with `min-height: 0`.
- Reduced outer page padding and compressed the POS page header and tab row.
- Removed the old large minimum content width and replaced it with a dense 3-column grid:
  - left catalog: `220px` to `248px`
  - center cart: flexible `1fr`
  - right rail: `278px` to `304px`
- Limited scrolling to internal POS panels:
  - product list
  - cart table
  - right customer / membership / summary rail
- Tightened component density:
  - smaller card radius and padding
  - shorter search and action controls
  - smaller product row height
  - smaller cart row height and qty controls
  - more compact checkout summary and payment controls
- Kept all sale logic and existing POS workflows intact; the changes are presentational and layout-scoped.

## Scroll regression fix

### Root cause

- The first dense pass applied `overflow: hidden` too aggressively at multiple levels:
  - `html/body`
  - Larkon `page-content`
  - POS page sale root
  - POS workspace wrapper
- That locked the browser scroll while also making the internal panel scroll chain brittle.
- The result was a compact-looking POS surface that could clip overflow and make product, cart, or right-rail content unreachable.

### Changed files

- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx`
- `src/larkon-ui/styles/dashboard-overrides.scss`

### Exact overflow / height strategy

- Keep the route-scoped dense mode class, but do not lock `html` or `body` scrolling.
- Keep the Larkon footer hidden for this POS route to preserve vertical workspace, but leave `page-content` overflow visible.
- Give the Larkon content container a compact padded shell and a `min-height` based on the topbar height.
- Make the POS sale body use a viewport-based working height:
  - `height: clamp(560px, calc(100dvh - 198px), 980px)`
  - `min-height: 560px`
- Let the browser page scroll naturally on smaller screens by avoiding full-page `overflow: hidden`.
- Keep internal scrolling only where it helps the cashier:
  - `.pos-product-list { overflow-y: auto; min-height: 120px; }`
  - `.pos-cart-table-wrap { overflow: auto; min-height: 0; }`
  - `.pos-right-rail { overflow-y: auto; min-height: 0; }`
- Preserve `min-height: 0` through the flex/grid chain so the three panels can actually shrink and scroll.
- On mobile / narrower widths, drop the fixed workspace height and let the page flow normally.

### QA checklist

- [ ] Browser/page scroll works again when viewport height is constrained
- [ ] Left product list scrolls independently
- [ ] Center cart item area scrolls independently
- [ ] Right customer / membership / summary area scrolls independently
- [ ] Checkout remains reachable without clipped content
- [ ] There is a small clean gap after the sidebar
- [ ] Top alignment still matches the Larkon topbar and menu frame
- [ ] Cart tabs stay compact and truncate long labels
- [ ] POS still works on `1366x768`
- [ ] POS still works on `1920x1080`

## QA checklist

- [ ] POS page fits inside one viewport as much as possible on `1366x768`
- [ ] POS page remains comfortable on `1920x1080`
- [ ] Main browser scroll is minimized on the sale tab
- [ ] Product catalog scrolls internally
- [ ] Cart line list scrolls internally
- [ ] Right customer / membership / summary rail scrolls internally
- [ ] Multi-cart switching still works
- [ ] Barcode / SKU / name quick entry still works
- [ ] Product add from catalog still works
- [ ] Qty increment, decrement, and manual blur-save still work
- [ ] Line discount selection still works
- [ ] Customer lookup / create / clear still works
- [ ] Membership lookup / apply / clear still works
- [ ] Sale summary values still update correctly
- [ ] Checkout still submits a sale successfully
