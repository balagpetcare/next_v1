# Staff POS enterprise grocery UI redesign (2026-04-27)

## Intent

Reskin the Staff **New Sale** workspace into a dense, retail-style three-column layout: compact catalog (left), barcode-first cart (center), sticky customer / membership / totals / payment (right). **No** backend, API, handler, or pricing/cart math changes—only JSX, CSS-in-JS (scoped under `.pos-reference-workspace`), and layout props.

Prerequisite context: `docs/STAFF_POS_COMPONENT_SPLIT_REPORT_2026-04-27.md`.

## Layout model

| Zone | Width (desktop) | Contents |
|------|-------------------|----------|
| Left | ~252px grid column | Search, category chips, scrollable SKU list, always-visible `+` add (disabled when no price / OOS). |
| Center | `1fr` (flexible) | Cart tabs (`Cart n` + primary `+`), large scanner row, flex-growing cart table, bottom note / hold / clear / checkout CTA. |
| Right | ~308px grid column | Sticky stack: Customer, Membership, **Sale summary** (subtotal / discount / tax / total), Payment (methods, received, change, large Pay). |

### Full height & minimum width

- **Page** (`page.jsx`): On **New Sale** tab only, outer wrapper uses `container-fluid` + `staff-pos-page-root` with inline CSS `min-height: calc(100dvh - 88px)` and flex column so `PosShell` can grow.
- **Shell** (`PosShell.jsx`): Horizontal scroll host + inner card `min-width: 1366px` and `min-height: max(520px, calc(100dvh - 200px))` for a usable grocery lane below ~1366px width (scroll horizontally rather than crushing columns).

## Files created

- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosPaymentSummary.jsx` — read-only display of `subtotal`, `discountAmount`, `taxAmount`, `grandTotal` (values still computed in `PosSaleWorkspace`).

## Files modified (UI only)

| File | Change summary |
|------|------------------|
| `PosShell.jsx` | CSS grid (`pos-enterprise-grid`) replaces Bootstrap `row`/`col` for the three-pane shell; refreshed Larkon-adjacent borders/shadows; flex rules for catalog/cart scroll regions; `#pos-checkout-panel` preserved on the right column for `scrollIntoView`. |
| `PosProductPanel.jsx` | Removed duplicate Products/Categories header tabs; denser chips and rows; single-line SKU / price / stock; compact **No price** badge; `+` fixed 36×36 always visible; list `slice(0, 24)` (display-only). |
| `PosCartWorkspace.jsx` | Flex column + `pos-cart-table-host` so the table consumes remaining vertical space; totals props removed from bottom bar (moved to right). |
| `PosCartTabs.jsx` | Grocery-style cart chips; primary `+` for new cart; “Held” disclosure label. |
| `PosScannerInput.jsx` | Barcode-first placeholder copy; `displayName` for devtools. |
| `PosCartTable.jsx` | Denser typography, smaller thumbs, shorter column label “Off” for discount; richer empty state. |
| `PosActionBar.jsx` | Note + compact actions + large checkout CTA only (no duplicate totals box). |
| `PosCheckoutPanel.jsx` | Title “Payment”; 2×2 method grid; larger Pay CTA; optional `showHoldButton` (default `true`); **Hold** hidden when `showHoldButton={false}` to avoid duplicating center **Hold**. |
| `PosCustomerPanel.jsx` / `PosMembershipPanel.jsx` | Tighter section headers and spacing. |
| `PosSaleWorkspace.jsx` | Inserts `PosPaymentSummary` above checkout; passes `showHoldButton={false}` to `PosCheckoutPanel`; trims props to `PosCartWorkspace`. |
| `page.jsx` | Fluid + flex host for sale tab only. |

## Behavior & regression guardrails

- All cart / customer / membership / finalize handlers remain in `PosSaleWorkspace.jsx` unchanged.
- `PosCheckoutPanel` `onSubmit` still `handleSaleSubmit`; payment method / received amount still driven by `activeCheckoutUi` / `updateActiveCheckoutUi`.
- `scrollIntoView` target id unchanged (`pos-checkout-panel`).
- ESLint on `app/staff/(larkon)/branch/[branchId]/pos/**/*.jsx`: **pass** (`--max-warnings 0`).

## Responsive notes

- **Desktop first**: grid fixed at ≥1366px inner width; smaller viewports scroll horizontally.
- Below `1199.98px`, existing shell rule keeps the right rail from `position: sticky` (stacked / scroll-friendly).

## Follow-ups (optional)

- Tune `calc(100dvh - 88px)` / `-200px` offsets once measured against the real staff Larkon header height.
- Repo-wide `next build` may still fail on unrelated TS (see component split report); POS paths lint clean.
