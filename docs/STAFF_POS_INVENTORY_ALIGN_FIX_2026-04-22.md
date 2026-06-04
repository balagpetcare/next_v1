# Staff POS vs inventory alignment fix (2026-04-22)

## Confirmed root causes

1. **Stock scope mismatch (backend)**  
   `GET /api/v1/pos/products` attached **branch-wide** aggregated `stockBalance` to each variant, while checkout (`createSale` / cart finalize) validates **only the default SHOP** `InventoryLocation`. That made browse show “in stock” when only a warehouse row had qty, or the reverse when shop had qty but the UI compared the wrong row elsewhere.

2. **Barcode path inconsistency**  
   `getProductByBarcode` used the same branch-wide map for `stock` while the comment said SHOP; it now uses SHOP location availability when a SHOP exists.

3. **Frontend (secondary)**  
   - Product grid did not **refresh** after a completed sale, so on-hand in the list could stay stale.  
   - **Cart context**: rows did not subtract quantities already in the active cart, so add-button vs displayed availability could feel inconsistent.  
   - **Variant labeling**: multi-variant products did not show the variant **title** on the card, so “Acana”-style items could be confused with the wrong sibling when comparing to inventory by SKU.

4. **Bulk POS list price (backend)**  
   A thrown error in one `resolvePosBranchVariantListPrice` call could fail the **entire** bulk request. Failures are now isolated; missing prices remain `null` (no silent zero).

5. **Search fields (UI)**  
   Tight or inconsistent `padding-left` and `type="search"` decoration caused **icon/text overlap** in the product search and the center quick-search field.

## Files changed

| Area | File |
|------|------|
| Backend | `backend-api/src/api/v1/modules/pos/pos.service.ts` – `getLocationVariantStockMap`, SHOP stock in `getProductByBarcode`, export |
| Backend | `backend-api/src/api/v1/modules/pos/pos.controller.ts` – `getProducts` uses SHOP map when `shopLocationId` is set; `baseStock` aligned |
| Backend | `backend-api/src/api/v1/modules/pricing/posListPriceResolution.service.ts` – per-variant try/catch in bulk resolver |
| Frontend | `bpa_web/app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx` – refresh after sale, cart-adjusted display stock, search padding, `refreshPosProducts` |
| Frontend | `bpa_web/app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx` – search layout, variant line, `Refresh catalog` button |

## Fixes applied (summary)

- **POS browse + barcode** use **default SHOP** on-hand available qty when a SHOP location exists; if there is no SHOP, **fallback remains branch-aggregated** (same as before for edge branches).  
- **After successful cart finalize**: refresh the product list from the server.  
- **Display stock** for a variant row = **server on-hand (SHOP) − quantity already in the active cart** (minimum 0).  
- **Refresh catalog** button calls the same product query as the debounced search.  
- **Search inputs**: `type="text"`, `autoComplete="off"`, `padding-left: 2.5rem`, icon non-interactive with `pointer-events: none`.  
- **Bulk list price**: errors logged per variant; other variants still resolve.

## How to verify (3 products on branch 1)

Use the **same** variant (match `variantId` / **SKU** in staff inventory) and, for stock comparison, the **default SHOP** location row in inventory (not the sum of all locations) if you need 1:1 with POS.

| Check | Pass criteria |
|--------|----------------|
| A | POS card `In stock (n)` matches SHOP `availableQty` (minus cart qty) for that variant. |
| B | If list price exists in policy engine, card shows it; if truly missing, “No price configured” and add disabled. |
| C | After **Complete sale**, product list on-hand updates when refreshed or after auto-refresh. |
| D | Search + quick-search: typed text does not sit under the search icon. |

*Before/after* for “Acana”-style products: after the fix, each card should show a **variant title** line and **SHOP-consistent** stock; previously branch-wide or ambiguous rows could disagree with sale validation.

## Validation run

- `npx eslint` on touched POS component files: **pass** (exit 0).  
- `npx tsc --noEmit` in `backend-api`: **pass** (exit 0).

## Remaining limitations

- **Branch inventory** list can still show **multiple location rows** per variant; **POS** shows **one** number (SHOP floor). Comparing “total of all locations” in inventory to POS will not match by design.  
- **Cart** does not re-reserve on-hand in the API on every add; the UI subtracts cart qty only for **display and add limits** in the session.  
- **List price** still requires a positive resolved price; **$0** list is treated as not sellable in browse (unchanged; no coerced 0 as “free” price).

---

## Sellable-only browse hardening (2026-04-22, cashier mode)

### Root cause (why unusable rows still appeared)

- `GET /api/v1/pos/products` enriched each active variant with stock and resolved price, but returned rows even when stock was `0` or price was missing.
- The POS workspace also created fallback product-level rows (variantId `null`) when variants were missing, which allowed ambiguous non-variant placeholders into browse/search lists.
- Product cards relied on disabled add-buttons instead of removing non-sellable rows from the default cashier catalog.

### Filtering strategy implemented

- **Backend source filter (`pos.controller.getProducts`)**
  - Keeps only variant rows where `variant.id` exists, `stock > 0`, and resolved `price > 0`.
  - Drops products that end up with zero sellable variants.
  - Returns only sellable variants for initial load, query search, category-source data, and refresh calls.
- **Frontend defensive filter (`PosSaleWorkspace`)**
  - Removes fallback non-variant placeholder rows.
  - Applies guard filtering before render: keep only `variantId != null`, `stock > 0`, `price > 0`.
  - Reapplies filter after in-cart stock subtraction so rows disappearing due to zero remaining stock are hidden.
- **Checkout safety remains intact**
  - Barcode lookup flow is unchanged in principle.
  - Add-to-cart still blocks clearly on `stock <= 0` or non-positive/missing price.

### Files changed

- `backend-api/src/api/v1/modules/pos/pos.controller.ts`
- `bpa_web/app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx`
- `bpa_web/app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`

### UX updates included

- Product count text now reflects **sellable visible items**.
- Empty state now reads: `No sellable products available for this branch/shop right now.`
- Search icon overlap hardening:
  - Left panel search input padding/icon spacing adjusted.
  - Center quick search/barcode input padding/icon spacing adjusted.

### Validation summary

- Backend response path now excludes out-of-stock and non-priced variants from default POS browse payload.
- Frontend render path excludes any remaining non-sellable/non-variant rows before list, search, and category views.
- Refresh after sale uses the same filtered fetch path (`refreshPosProducts`), so post-sale catalog remains sellable-only.
- Barcode explicit scan path still resolves product, while add-to-cart validation continues to block unsellable cases.

### Remaining limitation

- The POS browse now intentionally hides unusable rows in cashier mode; there is still no separate admin/debug toggle in this panel to show disabled/unpriced/out-of-stock variants.

---

## Final browser-UAT correction pass (2026-04-22)

### Findings

- Sellable-only guard is enforced in both layers:
  - Backend `getProducts` returns only rows with real `variant.id`, `stock > 0`, and resolved `price > 0`.
  - Frontend list/search/category pipelines filter through the same sellable predicate and do not create product-family placeholder rows.
- Search/category cannot reintroduce hidden unusable rows because they operate on already sellable-filtered rows.
- Post-finalize flow calls catalog refresh (`refreshPosProducts`) after successful sale, so refreshed data stays sellable-only.
- Both search fields have explicit icon/input spacing styles (`padding-left`, absolute icon, pointer-events none), addressing text/icon overlap.

### Correction applied in this pass

- No additional code correction was required; existing hardening already matches the cashier-mode sellable-only requirements.

### Practical checks run

- `bpa_web`: `npx eslint "app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx" "app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx"` -> pass
- `backend-api`: `npx tsc --noEmit` -> pass

### Remaining limitations

- Full interactive branch-1 browser walkthrough (authenticated cashier session with real clicks/finalize in UI) still requires manual execution in an actual logged-in browser session.
- Barcode lookup remains intentionally independent: explicit scan may resolve an item, while add-to-cart still blocks when stock/price is not sellable.

### Release readiness

- Ready for release for cashier-mode sellable-only browse behavior, with final manual branch-1 click-through/UAT sign-off recommended before production rollout.
