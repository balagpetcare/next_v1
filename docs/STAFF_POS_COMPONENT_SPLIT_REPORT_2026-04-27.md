# Staff POS component split report (2026-04-27)

## Scope

UI-only refactor under `app/staff/(larkon)/branch/[branchId]/pos/`. No backend, API, pricing, cart, or checkout logic changes. Route URL unchanged (`page.jsx` still owns tabs and non-sale POS UI; sale workspace remains `PosSaleWorkspace`).

## Baseline document

`docs/STAFF_POS_UI_BASELINE_AUDIT_2026-04-27.md` was **not present** in the repository at the time of implementation; work followed the live `PosSaleWorkspace.jsx` structure instead.

## Component map (`_components/`)

| File | Role |
|------|------|
| `PosShell.jsx` | Outer `pos-reference-workspace`, scoped layout CSS (moved verbatim from workspace), three-column `pos-content-shell` grid; `children` = modals (preserves prior DOM: modals stay inside the workspace root). |
| `PosProductPanel.jsx` | Unchanged (catalog / search / add). |
| `PosCartWorkspace.jsx` | Center column composition: tabs, scanner, table, action bar. |
| `PosCartTabs.jsx` | Unchanged. |
| `PosCartTable.jsx` | Cart lines table (implementation moved from former monolithic table file). |
| `PosCartLinesTable.jsx` | Thin `use client` re-export of `PosCartTable` for any existing imports/docs. |
| `PosScannerInput.jsx` | Barcode / quick search form; `forwardRef` for the input (same ref behavior as before). |
| `PosActionBar.jsx` | Cart note, Save note / Hold / Clear, inline totals box, “Checkout” scroll CTA. |
| `PosCustomerPanel.jsx` | Unchanged. |
| `PosMembershipPanel.jsx` | Unchanged. |
| `PosCheckoutPanel.jsx` | Unchanged. |
| `PosSaleWorkspace.jsx` | All state, effects, API calls, and pricing/totals math unchanged; JSX wired through `PosShell` + new presentational components. |

## Behavior preservation checklist

- **DOM / layout**: Same column classes, `id="pos-checkout-panel"` on the right column for `scrollIntoView`, same CSS rules in `PosShell`.
- **Product search**: Still driven by `productSearch` / debounced fetch in `PosSaleWorkspace`; `PosProductPanel` props unchanged.
- **Scanner input**: Same `quickInputRef`, `scanMode`, submit and toggle handlers; logic remains `handleQuickEntrySubmit` in parent.
- **Cart table**: Same props and handlers as before (`PosCartTable` ≡ previous table body).
- **Multi-cart tabs**: Still `PosCartTabs` with same props from parent.
- **Totals**: Subtotal / discount / tax / grand total still computed in `PosSaleWorkspace`; `PosActionBar` only displays values passed in.

## Verification

| Check | Result |
|-------|--------|
| ESLint (POS tree) | `npx cross-env ESLINT_USE_FLAT_CONFIG=true eslint --no-error-on-unmatched-pattern "app/staff/(larkon)/branch/[branchId]/pos/**/*.jsx" --max-warnings 0` → **exit 0** |
| IDE diagnostics (edited POS files) | **No issues** |
| `npm run build` (full app) | **Failed**: TypeScript error in `./app/owner/(larkon)/inventory/stock-requests/[id]/page.tsx` (unrelated to POS). Next reported “Compiled successfully” before TS phase; POS JSX was not implicated. |

## Files touched

- Added: `PosShell.jsx`, `PosScannerInput.jsx`, `PosCartWorkspace.jsx`, `PosCartTable.jsx`, `PosActionBar.jsx`
- Replaced with re-export: `PosCartLinesTable.jsx`
- Modified: `PosSaleWorkspace.jsx`

## Follow-up (optional)

- Fix the owner `stock-requests/[id]/page.tsx` ReactNode typing so full `next build` passes repo-wide.
- If the baseline audit doc is added later, align any naming notes with this split.
