# Staff Inventory / POS Price Visibility Fix - 2026-04-27

## Summary

Implemented the safe fix for Staff Inventory price display and Staff POS product visibility.

Root cause fixed:
- POS browse was returning only variants with `stock > 0` and `price > 0`, so available but unpriced SHOP stock disappeared from the product panel.
- Staff Inventory used `/api/v1/inventory?branchId=...` rows that did not include POS/list-price metadata, so the inventory table could not show sell price or missing-price state.
- Barcode lookup already tolerated `price:null` on the frontend, but now returns the same price metadata shape as browse.

## Changed Files

Backend:
- `D:\BPA_Data\backend-api\src\api\v1\modules\pricing\posListPriceResolution.service.ts`
- `D:\BPA_Data\backend-api\src\api\v1\modules\pricing\pricingEngine.service.ts`
- `D:\BPA_Data\backend-api\src\api\v1\modules\pos\pos.controller.ts`
- `D:\BPA_Data\backend-api\src\api\v1\modules\pos\pos.service.ts`
- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\inventory.service.ts`

Frontend:
- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\pos\_components\PosSaleWorkspace.jsx`
- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\pos\_components\PosProductPanel.jsx`
- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\inventory\page.jsx`

Report:
- `D:\BPA_Data\bpa_web\docs\STAFF_INVENTORY_POS_PRICE_FIX_2026-04-27.md`

## Backend Behavior

`GET /api/v1/pos/products?branchId=&q=` now returns variants with available stock even when price is missing. Returned variants keep `price:null` and include:
- `sellPrice`
- `effectiveSellPrice`
- `priceSource`
- `priceMissing`
- `priceMissingReason`

`GET /api/v1/inventory?branchId=...` now enriches ledger stock rows with the same POS/default SHOP price metadata using the POS list-price resolver and branch default SHOP location lookup.

POS list-price resolution now also allows an active batch rule marked `sellsAtRulePrice=true` to supply the POS price when the core catalog/branch/location price is missing.

Safety retained:
- POS cart add rejects missing/non-positive prices server-side.
- Legacy direct POS sale path rejects missing/non-positive prices.
- Cart finalize reuses the same sale creation guard.
- Branch/org isolation remains through existing branch scope plus org-scoped price resolution.

## Frontend Behavior

Staff POS:
- Product browse now filters by available stock instead of sellable price.
- Count label is now `available items`.
- Unpriced products render with `No price configured`.
- Add button is disabled for unpriced rows.
- Quick/barcode add still shows a clear price-not-configured error and does not add unpriced rows.

Staff Inventory:
- Added `POS price` column.
- Shows resolved price when available.
- Shows `Missing price` when stock exists and price metadata is missing/null.
- Existing stock, status, row click, ledger drawer, and action menu behavior were left intact.

## Validation

Backend:
- `cd /d D:\BPA_Data\backend-api`
- `npm run typecheck`
- Result: passed.

Frontend:
- `cd /d D:\BPA_Data\bpa_web`
- `npm run lint`
- Result: failed due existing repo-wide parser/lint errors outside this change set.
- Focused POS component lint passed:
  - `npx eslint 'app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx' 'app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx'`
- Focused inventory page lint still reports pre-existing unused state/effect-rule errors unrelated to the new price column.

## Manual Check URLs

- `/staff/branch/[branchId]/inventory`
- `/staff/branch/[branchId]/pos`
- `/staff/branch/[branchId]/inventory/batch-pricing`

## Follow-Up Validation Checklist

- Inventory table shows a POS price for priced stocked variants.
- Inventory table shows `Missing price` for stocked variants with null price.
- POS product panel shows all available SHOP-stock variants, including unpriced ones.
- POS product panel disables add for unpriced variants.
- Barcode search for an unpriced stocked variant returns a result but add-to-cart is blocked.
- Finalize cannot sell an unpriced line.
- Batch pricing page still loads and retains its current batch price behavior.
