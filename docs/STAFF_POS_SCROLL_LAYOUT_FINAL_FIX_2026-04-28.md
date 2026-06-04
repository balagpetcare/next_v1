# Staff POS Scroll Layout Final Fix - 2026-04-28

## Root Causes Found

- The POS sale body used a clamped fixed height with a hard minimum. On shorter screens this could consume the available viewport without creating a reliable fallback scroll path.
- The POS shell had `height: 100%` chains combined with `overflow: visible` on the workspace scroller. When inner content exceeded the calculated height, the browser did not always have a clear scroll container under the mouse.
- The grid/card/flex children needed stricter `min-height: 0` and `min-width: 0` boundaries so the product list, cart table, and checkout rail could shrink and scroll internally.
- Cart tabs were allowed to wrap, which could create a second row and steal vertical space from the cart table and checkout actions on 1366px-wide screens.
- Bottom cart actions and payment controls had more padding than a compact POS terminal can afford at 1366x768.
- The right checkout rail could grow taller than its column without keeping the payment action reliably reachable.

## Files Changed

- `src/larkon-ui/styles/dashboard-overrides.scss`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosActionBar.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosScannerInput.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTable.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCheckoutPanel.jsx`

## Final Scroll Strategy

- POS route dense mode keeps the Larkon shell intact and only tightens the route container padding.
- The sale workspace now uses viewport-aware height: topbar CSS variable plus compact POS header/tabs offset.
- The workspace scroller uses `overflow: auto`, not hidden, so it provides a safe fallback scroll path.
- Product catalog rows scroll inside `.pos-product-list`.
- Center cart lines scroll inside `.pos-cart-table-wrap`.
- Right checkout rail scrolls inside `.pos-right-rail`.
- Grid and flex children use `min-height: 0`/`min-width: 0` so internal scroll areas can actually shrink.
- The main page is still allowed to scroll when the viewport is smaller than the minimum usable POS height.

## Final Spacing Strategy

- Page gutter is 10px with a 4px top offset in POS dense mode.
- Desktop grid is `260px-290px / 1fr / 300px-330px` with an 8px gap.
- Card padding is 7px-8px, with compact card headers.
- Cart tabs are single-row, horizontally scrollable, and capped around 36px high.
- Product rows use compact 34px minimum height with 26px add buttons.
- Scanner input and scan buttons are 38px high.
- Cart table cells use 5px-6px padding and compact qty pills.
- Bottom note/actions use one compact row plus a full-width checkout button.
- Checkout payment card is sticky at the bottom of the right rail so payment stays reachable while the rail scrolls.

## QA Checklist

- [ ] At 1366x768, open `/staff/branch/1/pos` and verify New Sale, Sales History, Refunds, and Cash Drawer buttons remain visible.
- [ ] At 1366x768, verify the catalog, cart table, and right checkout rail each respond to mouse-wheel scrolling.
- [ ] At 1366x768, add many products to the cart and confirm cart rows scroll without hiding note/save/hold/clear/checkout.
- [ ] At 1366x768, load many products and confirm more rows are visible and the catalog list scrolls internally.
- [ ] At 1366x768, expand customer create and membership lookup states and confirm the payment button remains reachable in the right rail.
- [ ] At 1920x1080, confirm the layout stays fluid with small gutters and no centered max-width container.
- [ ] Confirm long cart IDs truncate in cart chips and tabs do not wrap into a tall block.
- [ ] Confirm New Cart, cart switch, held cart resume, hold, clear, notes, product add, qty, discount, customer search, membership, payment, and checkout still work.
- [ ] Confirm the page itself can still scroll if the viewport height is smaller than the minimum POS workspace height.

## Remaining Limitations

- Browser/device QA was not automated in this pass; final visual confirmation should be done against the running Next.js app at the target route.
- Repository-wide lint/typecheck are currently blocked by unrelated pre-existing issues outside the POS route, so targeted POS lint is the most reliable validation signal for this change.
