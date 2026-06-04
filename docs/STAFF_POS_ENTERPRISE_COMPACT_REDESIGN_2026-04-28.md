# Staff POS Enterprise Compact Redesign - 2026-04-28

## Problems Found

- The POS workspace was fluid in intent, but the catalog and checkout rails were still narrower than the requested grocery/retail POS proportions.
- Several shell/grid wrappers used clipping overflow, which could make dropdowns or long right-panel content feel constrained.
- The top POS header and navigation actions had avoidable vertical space for a high-frequency checkout screen.
- Cart tabs were functional, but the active state and chip density still felt heavier than an enterprise POS tab strip.
- Product rows, cart controls, note actions, and payment controls needed a shared compact rhythm.
- The sale summary total and payment action did not have enough terminal-style hierarchy.

## Changed Files

- `src/larkon-ui/styles/dashboard-overrides.scss`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTable.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosActionBar.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosScannerInput.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCustomerPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosMembershipPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosPaymentSummary.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCheckoutPanel.jsx`

## Layout Strategy

- Kept the existing Larkon shell and added only POS-route-specific dense-mode spacing.
- Preserved the three-column split: product catalog fixed left rail, current order flexible center, customer/summary/payment fixed right rail.
- Updated desktop grid sizing to `260px-300px / 1fr / 300px-340px` with an 8px grid gap.
- Kept mobile/tablet fallbacks so narrow screens can stack or horizontally scroll instead of clipping content.

## Spacing Strategy

- Reduced parent route padding to 10px side gutters in dense POS mode.
- Tightened the title/header, tab button height, scanner spacing, card body padding, product rows, cart tab chips, and bottom cart action spacing.
- Kept font sizes compact but readable, with stronger hierarchy on product names, line totals, and grand total.
- Used subtle borders, 8px-12px radius, white cards, light grey workspace background, and primary blue for main POS actions.

## Scroll Strategy

- Avoided global `overflow: hidden` for the POS page.
- Product catalog rows scroll inside the catalog card.
- Cart line table scrolls inside the current-order card with sticky headers.
- Customer, membership, sale summary, and payment controls scroll inside the right rail.
- Small viewports can scroll the page or workspace instead of losing access to lower checkout actions.

## QA Checklist

- [ ] Open `/staff/branch/1/pos` and confirm the content starts aligned close to the top navigation/hamburger line.
- [ ] Confirm the POS page spans the available width with only small left/right gutters.
- [ ] Confirm product catalog, current order lines, and right checkout rail each scroll internally when content is long.
- [ ] Search by product name, SKU, and barcode; add products from both scanner/search and catalog.
- [ ] Switch carts, create a new cart, hold a cart, resume a held cart, and close a cart.
- [ ] Edit quantity with minus/input/plus, apply a line discount, remove a line, and add a cart note.
- [ ] Search/create/clear customer and link/clear membership without layout clipping.
- [ ] Select payment method, enter received amount, verify change, and complete checkout.
- [ ] Check Sales History, Refunds, and Cash Drawer tabs still render normally.
- [ ] Recheck at desktop, laptop, and narrow viewport widths.
