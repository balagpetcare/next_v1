# Staff POS enterprise UI — final QA & regression (2026-04-27)

## Scope

**Project:** `D:\BPA_Data\bpa_web`  
**Area:** Staff branch POS (`app/staff/(larkon)/branch/[branchId]/pos/`) after enterprise layout, scanner-first UX, and multi-cart tab work.

**Method:** Static code trace against the checklist below, cross-check of guards (checkout, pricing, cart), and **ESLint** on the POS tree. **No browser E2E** was executed in this pass (no Playwright/Cypress specs found for Staff POS). **No backend changes** were made or required.

**Automated check:**

```text
npx cross-env ESLINT_USE_FLAT_CONFIG=true eslint --no-error-on-unmatched-pattern \
  "app/staff/(larkon)/branch/[branchId]/pos/**/*.{jsx,js}" --max-warnings 0
```

**Result:** Exit code **0** (no warnings).

---

## Checklist results

| # | Check | Result | Evidence / notes |
|---|--------|--------|-------------------|
| 1 | Page load for branch POS | **Pass (static)** | `page.jsx` keeps route; `PosSaleWorkspace` mounts after `useBranchContext` + `pos.view`; sale tab uses `container-fluid` + height helper only for layout. |
| 2 | Product catalog loads | **Pass (static)** | `refreshPosProducts` / `useEffect` on `productSearchDebounced` + `staffPosProducts` unchanged. |
| 3 | Category filter works | **Pass (static)** | `PosProductPanel` chips call `onSelectCategory`; `productCategory` + `searchResults` `useMemo` unchanged in `PosSaleWorkspace`. |
| 4 | Product search works | **Pass (static)** | `productSearch` state + debounced fetch; panel `onProductSearchChange` wired. |
| 5 | Barcode / manual scan works | **Pass (static)** | `handleQuickEntrySubmit`, `tryAddFromBarcode`, `findLocalProductMatch`, `refocusScanField`; `PosScannerInput` form submit + Enter via native form behavior. |
| 6 | Add item to cart | **Pass (static)** | `addToCart` → `staffPosCartAddLine`; catalog `onAddProduct={addToCart}`; price/stock guards unchanged. |
| 7 | Qty increase/decrease | **Pass (static)** | `PosCartTable` → `persistLineQty` / increment handlers unchanged. |
| 8 | Remove item | **Pass (static)** | `removeCartLine` → `staffPosCartDeleteLine`. |
| 9 | Multiple carts | **Pass (static)** | `createNewPosCart`, `switchToPosCart`, `refreshPosCartList`; `PosCartTabs` UI-only metrics from `cart.lines`, same `onSelectCart` / `onCreateCart` / `onRequestCloseCart`. |
| 10 | Hold cart | **Pass (static)** | `holdActivePosCart` → `staffPosCartHold` + new cart create; center **Hold** + optional right hold hidden via `showHoldButton={false}` (no duplicate engine). |
| 11 | Customer phone search | **Pass (static)** | `PosCustomerPanel` → `lookupCustomer` / `staffPosCustomerLookup` / `patchActiveCart` unchanged. |
| 12 | Membership link/scan | **Pass (static)** | `PosMembershipPanel` + `lookupMembershipByCode` / `applyMembershipCardToCart` unchanged. |
| 13 | Payment method selection | **Pass (static)** | `PosCheckoutPanel` `onPaymentMethodChange` → `updateActiveCheckoutUi`; buttons `type="button"`. |
| 14 | Received amount / change | **Pass (static)** | `receivedAmount` / `changeAmount` derived in `PosSaleWorkspace`; cash validation in `handleSaleSubmit` unchanged. |
| 15 | Checkout submit | **Pass (static)** | `handleSaleSubmit` → `staffPosCartFinalize` with same `payments` / `discountPercent` / `taxPercent` / `customerId` / `notes`. |
| 16 | No-price products cannot silently checkout | **Pass (static)** | `addToCart` returns `false` and sets error if `price` not finite or `<= 0`; catalog **+** disabled when `!hasPrice`; `tryAddFromBarcode` delegates to `addToCart`. Checkout still requires priced lines to reach pay. |
| 17 | Empty cart checkout disabled | **Pass (static)** | **Triple guard:** (1) `PosCheckoutPanel` `disabled={... \|\| grandTotal <= 0}`; (2) parent `busy={posCartBusy \|\| !activeCart?.id \|\| displayLines.length === 0}` so pay/received disabled when empty; (3) `handleSaleSubmit` early return if `displayLines.length === 0`. |
| 18 | Responsive desktop layout acceptable | **Pass (static)** | `PosShell`: `min-width: 1366px` + horizontal scroll; grid columns documented in enterprise redesign doc; below `lg` right rail un-sticky in CSS. |

---

## Regression targets explicitly unchanged

- **Cart / finalize API payloads:** `handleSaleSubmit` body structure unchanged.  
- **Pricing math:** `subtotal`, `manualDiscountPct`, `grandTotal`, `changeAmount` computed in `PosSaleWorkspace` only.  
- **Multi-cart engine:** `requestCloseCart` / `closeCartNow` / modal flow unchanged; tabs only display `lines` for preview totals.

---

## Issues found & fixes applied

**None** during this pass. No code changes were required after review and lint.

---

## Gaps / recommended manual smoke (outside this pass)

1. **Live browser:** Log in as staff with `pos.view` / `pos.sell`, complete one sale with cash + one with card, hold/resume, two open carts.  
2. **Full `next build`:** Repo may still fail TypeScript in unrelated routes (see prior POS reports); POS folder itself lints clean.  
3. **Backend contract drift:** If list carts omit `lines` in some environments, tab subtotals would show `0` until list payload is enriched — **document only** unless observed in QA.

---

## Sign-off

- **Business logic:** Preserved per static analysis; **no edits** committed for this task.  
- **Lint:** POS subtree **clean** under flat ESLint with `--max-warnings 0`.  
- **Report:** `docs/STAFF_POS_ENTERPRISE_UI_FINAL_QA_2026-04-27.md` (this file).
