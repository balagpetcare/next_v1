# Staff POS Scroll And Cart Header Fix - 2026-04-28

## Root Cause Of Mouse Wheel Scroll Blocking

- The POS workspace previously had nested scroll containers with `overscroll-behavior: contain`. When the mouse wheel was over the catalog, cart table, right rail, or workspace scroller, wheel chaining back to the document could stop at panel boundaries.
- The workspace scroller itself used `overflow: auto`, even though the real scroll areas are the three POS panels. That made the page feel trapped when the workspace height and panel heights were close to the viewport.
- Several flex/grid boundaries needed `min-height: 0` and `min-width: 0`; without them, children could refuse to shrink and their internal scroll areas would not consistently activate.
- The cart overflow dropdown was rendered inside the horizontally scrollable tab strip. That could clip the dropdown and make the header look tall or messy.
- Cart chip text did not have a dedicated ellipsis layout, so long cart IDs could squeeze into the close button area.

## Changed Files

- `src/larkon-ui/styles/dashboard-overrides.scss`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCheckoutPanel.jsx`

## Final Overflow / Height Strategy

- POS dense mode remains route-specific through `staff-pos-dense-mode`.
- Main document scroll remains available; no body/html scroll lock was added.
- POS workspace uses viewport-aware height based on the Larkon topbar variable and compact POS header offset.
- The workspace wrapper no longer acts as the vertical scroll trap on desktop.
- Only real content panels scroll vertically:
- `.pos-product-list`
- `.pos-cart-table-wrap`
- `.pos-right-rail`
- Removed `overscroll-behavior: contain` from POS scroll containers so wheel events can chain naturally when a panel reaches its scroll boundary.
- Kept `min-height: 0` and `min-width: 0` on flex/grid boundaries so internal scroll panels can shrink correctly at 1366x768.

## Cart Tab / Header Compact Strategy

- Cart header is now a compact single-line flex row.
- Cart chips live in the left scrollable strip only.
- `+more`, `New`, and `Held` live in a fixed right-side action group so dropdowns are not clipped by the tab scroller.
- Cart chips are 40px high with bounded widths.
- Cart ID and metadata use explicit ellipsis rules.
- `+more`, `New`, and `Held` controls are 38px high and aligned with the tabs.
- Active cart remains highlighted with a primary inset accent and subtle shadow.

## Cart Number Visibility And Header Polish

### Problem

- Cashiers could see unclear labels such as `CA...` because backend cart numbers were used as the primary visible tab label.
- Cart IDs competed with the close button and metadata for horizontal space.
- The POS header was very compact but visually cramped near the top edge.
- Cart tab/action spacing did not feel balanced after the scroll fixes.

### Changed Files

- `src/larkon-ui/styles/dashboard-overrides.scss`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`

### Final Cart Label Strategy

- Visible cart tabs now use cashier-friendly labels: `Cart 1`, `Cart 2`, `Cart 3`.
- The full backend cart number/id remains available in the tab tooltip.
- Cart metadata is shown under the label as `0 items · Tk 0.00`.
- Cart ordinals are based on the natural open-cart order, so labels remain stable even when the active cart is moved to the front visually.
- Overflow dropdown rows use the same readable cart labels and show item count/total.

### QA Checklist

- [ ] POS header has 8px-12px page top breathing room and does not touch the viewport edge.
- [ ] `POS / Sales`, status badge, and branch name are visually aligned.
- [ ] Cart tabs show `Cart 1`, `Cart 2`, `Cart 3` clearly.
- [ ] Full backend cart number/id is visible in the browser tooltip.
- [ ] Cart metadata uses the `items · Tk` format.
- [ ] Active cart is clearly highlighted without becoming a giant blue block.
- [ ] `+more`, `New`, and `Held` align with the cart tabs.
- [ ] The previous mouse-wheel/page scroll behavior remains fixed.

## QA Checklist

- [ ] Mouse wheel works on the page when content exceeds viewport.
- [ ] Left product catalog list scrolls internally.
- [ ] Center cart item list scrolls internally.
- [ ] Right checkout/payment panel scrolls internally.
- [ ] At 1366x768, important actions remain reachable.
- [ ] Cart tabs do not overlap.
- [ ] Long cart IDs truncate with ellipsis.
- [ ] `+more` button is compact and dropdown is not clipped by the tab strip.
- [ ] `New` and `Held` controls align with the cart tabs.
- [ ] Payment method tiles are compact.
- [ ] Checkout button remains reachable.
- [ ] Multi-cart, cart switch, overflow, new cart, hold, barcode search, product add, qty, discount, customer, membership, payment, notes, and checkout still work.

## Remaining Limitations

- Browser viewport QA should still be confirmed manually at `/staff/branch/1/pos` for 1366x768 and 1920x1080.
- Repository-wide lint/typecheck are blocked by unrelated pre-existing issues outside this POS route.
