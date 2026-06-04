# Staff POS Fluid Compact Alignment Fix

Date: 2026-04-28
Route: `app/staff/(larkon)/branch/[branchId]/pos`

## Root UI problems

- The POS route was visually dense, but it was not consistently using the same horizontal gutter as the Larkon top header.
- The sale workspace still felt offset because route-level wrappers and the page shell were both contributing spacing.
- Cart tabs and compact controls were improved earlier, but the cart strip still needed to stay intentionally small and truncation-safe.
- Scroll behavior had to remain safe after the dense layout pass so compact spacing did not make content unreachable.

## Files changed

- `app/staff/(larkon)/branch/[branchId]/pos/layout.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosShell.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx`
- `src/larkon-ui/styles/dashboard-overrides.scss`

## Container-fluid strategy

- Kept the Larkon shell as the alignment source instead of inventing a separate POS gutter.
- Route-only dense mode is applied through `staff-pos-dense-mode` in `pos/layout.jsx`.
- Overrode `page-content.bpa-app-workspace > .container-fluid` only for the POS route.
- Forced the POS route to use:
  - `width: 100%`
  - `max-width: none`
  - compact route padding
- Matched the POS horizontal inset to Bootstrap's container gutter with:
  - `padding-inline: calc(var(--bs-gutter-x, 1.5rem) * 0.5)`
- Removed extra nested page-root padding so the sale workspace starts on the same x-axis line as the top header hamburger/menu area.

## Cart tab compact strategy

- Reduced cart tab card padding and chip spacing.
- Kept cart tab height in the compact range by using smaller chip padding and tighter text lines.
- Truncated long cart labels instead of allowing tabs to expand vertically or horizontally.
- Kept item count and total as secondary microcopy.
- Kept `New cart`, held-cart controls, and close buttons compact and aligned inside the same row.
- Allowed the open-cart row itself to scroll horizontally when many carts exist instead of inflating the layout.

## Scroll strategy

- Did not use aggressive global `overflow: hidden` on `html`, `body`, or the entire dashboard shell.
- Kept the main page scrollable when the viewport is smaller than the compact POS target height.
- Used a viewport-based working height for the sale area:
  - `height: clamp(560px, calc(100dvh - 198px), 980px)`
- Preserved `min-height: 0` through the POS workspace chain so child panels can actually scroll.
- Internal scroll areas:
  - product catalog list: `overflow-y: auto`
  - cart table wrapper: `overflow: auto`
  - right summary/customer/membership rail: `overflow-y: auto`
- Removed sticky behavior from the right rail so it would not trap or hide content in dense mode.

## QA checklist

- [ ] POS route starts with a small clean gap after the sidebar, not touching it and not floating too far away.
- [ ] POS content aligns horizontally with the top header hamburger/menu line.
- [ ] No `max-width` or centered container behavior limits the sale workspace.
- [ ] Cart tabs stay compact and long labels truncate cleanly.
- [ ] Left product list scrolls with large SKU counts.
- [ ] Center cart list scrolls with many line items.
- [ ] Right customer/membership/payment rail scrolls without clipping checkout actions.
- [ ] Browser/page scroll still works on smaller screens.
- [ ] Layout remains usable at `1366x768`.
- [ ] Layout remains comfortable at `1920x1080`.
- [ ] Multi-cart, hold/resume, search, add line, qty, discount, customer, membership, summary, and checkout still work.
