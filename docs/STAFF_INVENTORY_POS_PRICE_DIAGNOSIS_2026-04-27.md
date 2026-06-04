# Staff Inventory / POS Price Diagnosis - 2026-04-27

Scope: diagnosis only. No functional code was changed.

## Summary of Root Causes

1. Staff Branch Inventory does not show product price because the page has no price column and its API response is stock-only.
   - Frontend table columns are `Product`, `SKU`, `Available`, `Reorder`, `Status`, `Last Move`, and actions.
   - `GET /api/v1/inventory?branchId=...` returns stock balance fields from `StockBalance`, but no `sellPrice`, `listPrice`, `batchSellPrice`, `resolvedSellPrice`, `effectiveSellPrice`, `priceSource`, or missing-price marker.

2. Staff Batch Pricing uses a different, working data source.
   - Batch pricing calls `GET /api/v1/inventory/shop-batches?branchId=...`.
   - That endpoint is SHOP-lot based and returns price fields such as `batchSellPrice`, `resolvedSellPrice`, `effectiveSellPrice`, `sellPrice`, `catalogSellPrice`, `mrp`, and `priceSource`.
   - Inventory summary calls the generic stock summary endpoint and never uses this price enrichment.

3. POS browse currently filters to "sellable only" in both backend and frontend.
   - Backend `pos.controller.getProducts` removes variants unless `variant.id != null`, `stock > 0`, and `price > 0`.
   - Frontend `PosSaleWorkspace.isSellablePosRow` repeats the same `stock > 0 && price > 0` filter twice.
   - Therefore products with SHOP stock but missing POS-resolved price are absent from the left panel, so the UI can show `Total 0 sellable items`.

4. POS price resolution does not fully match the batch-pricing page's displayed effective price.
   - POS browse and barcode use `posListPriceResolution.service`.
   - Batch pricing page builds `effectiveSellPrice` as `batchSellPrice ?? resolvedSellPrice ?? catalogSellPrice ?? mrp`.
   - POS only uses the enterprise/batch path when `posPricingGovernanceEnabled` or `posUseEnterpriseListResolution` is true.
   - Even in enterprise mode, `resolveSellingPriceWithEnterprise` returns early when core catalog/branch/location price is missing, so a `BatchPricingRule` with `sellsAtRulePrice=true` cannot currently provide a POS price by itself.

5. SHOP location fallback/reactivation is already used by POS browse, POS barcode, POS checkout, and batch pricing.
   - The zero-item symptom is more likely from price filtering/resolution mismatch than from SHOP fallback not being called.

## Exact Frontend Files Involved

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\inventory\page.jsx`
  - Calls `staffInventoryList`.
  - Renders the inventory table.
  - No price table column exists.

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\inventory\batch-pricing\page.jsx`
  - Calls `staffShopBatchesList`.
  - Displays `Sell price` from price candidates.

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\inventory\batch-pricing\[batchId]\page.jsx`
  - Calls `staffShopBatchDetail` and `staffShopBatchUpdate`.
  - Shows and edits batch sell price.

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\pos\page.jsx`
  - Hosts the sale workspace.

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\pos\_components\PosSaleWorkspace.jsx`
  - Calls `staffPosProducts` and `staffPosBarcodeLookup`.
  - Filters product rows through `isSellablePosRow`, requiring positive stock and positive price.

- `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\pos\_components\PosProductPanel.jsx`
  - Displays `Total {searchResults.length} sellable items`.
  - Already has UI copy for `No price configured`, but it rarely appears because parent data is pre-filtered.

- `D:\BPA_Data\bpa_web\lib\api.ts`
  - API helpers:
    - `staffInventoryList`
    - `staffShopBatchesList`
    - `staffShopBatchDetail`
    - `staffShopBatchUpdate`
    - `staffPosProducts`
    - `staffPosBarcodeLookup`
    - `staffPosCartAddLine`

## Exact Backend Files Involved

- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\inventory.routes.ts`
  - Routes `GET /api/v1/inventory` and `GET /api/v1/inventory/shop-batches`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\inventory.controller.ts`
  - `getInventory` calls `getInventorySummaryV2`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\inventory.service.ts`
  - `getInventorySummaryV2` builds stock-only inventory rows from `stockBalance`.
  - `getInventoryBatches` builds lot rows used by batch pricing.

- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\staffBatchPricing.controller.ts`
  - `getShopBatches`, `getShopBatchDetail`, `patchShopBatch`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\inventory\staffBatchPricing.service.ts`
  - `listShopBatchesForBranch` resolves SHOP lot rows and effective sell price.
  - `getShopBatchDetailForBranch` returns detailed `pricing`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pos\pos.routes.ts`
  - Routes `GET /api/v1/pos/products` and `GET /api/v1/pos/products/barcode/:barcode`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pos\pos.controller.ts`
  - `getProducts` is the POS browse/catalog endpoint and filters out null-price variants.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pos\pos.service.ts`
  - `getProductByBarcode` is the barcode path.
  - `getLocationVariantStockMap` and `getBranchVariantStockMap` provide stock maps.
  - `createSale` and `finalizePosCart` enforce stock and pricing governance at checkout.

- `D:\BPA_Data\backend-api\src\api\v1\modules\orders\orders.service.ts`
  - `getDefaultFulfilmentLocationForBranch` resolves active SHOP and reactivates an inactive SHOP row if needed.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pricing\posListPriceResolution.service.ts`
  - POS browse/barcode list-price resolver.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pricing\pricingEngine.service.ts`
  - `resolveSellingPrice` and `resolveSellingPriceWithEnterprise`.

- `D:\BPA_Data\backend-api\src\api\v1\modules\pricing\enterpriseResolution.service.ts`
  - `findBestBatchPromoPrice`.

- `D:\BPA_Data\backend-api\prisma\schema.prisma`
  - Relevant models: `ProductVariant`, `InventoryLocation`, `LocationPrice`, `ProductPricing`, `BranchPricing`, `OrgPricingPolicy`, `BatchPricingRule`, `StockBalance`, `StockLot`, `StockLotBalance`, `PosCart`, `PosCartLine`.

## Exact Endpoints Involved

- Staff inventory summary:
  - `GET /api/v1/inventory?branchId=&search=&lowStockOnly=&page=&limit=`

- Staff inventory dashboard/side data:
  - `GET /api/v1/inventory/alerts?branchId=`
  - `GET /api/v1/inventory/dashboard?branchId=`
  - `GET /api/v1/inventory/locations`

- Staff batch pricing:
  - `GET /api/v1/inventory/shop-batches?branchId=`
  - `GET /api/v1/inventory/shop-batches/:lotId?branchId=`
  - `PATCH /api/v1/inventory/shop-batches/:lotId?branchId=`

- Staff POS browse/catalog:
  - `GET /api/v1/pos/products?branchId=&q=`

- Staff POS barcode:
  - `GET /api/v1/pos/products/barcode/:barcode?branchId=`

- Staff POS cart add:
  - `POST /api/v1/pos/carts/:cartId/lines`

- Staff POS finalize:
  - `POST /api/v1/pos/carts/:cartId/finalize`

## Current Data Shape Examples From Code

### Staff Inventory Response

Source: `inventory.service.ts`, `getInventorySummaryV2`.

```js
{
  id: `loc-${b.locationId}-var-${b.variantId}`,
  locationId: b.locationId,
  variantId: b.variantId,
  productId: b.variant?.product?.id,
  quantity: b.onHandQty,
  reservedQty: b.reservedQty,
  availableQty: b.onHandQty - b.reservedQty,
  location: b.location,
  product: b.variant?.product,
  variant: b.variant ? { id: b.variant.id, sku: b.variant.sku, title: b.variant.title } : null
}
```

Controller adds:

```js
{
  ...i,
  branch: i.location?.branch || null,
  branchId: i.location?.branch?.id ?? null,
  expiryDate: i.nearestExpiry ?? null
}
```

Missing from this response:

```js
sellPrice
listPrice
batchSellPrice
resolvedSellPrice
effectiveSellPrice
catalogSellPrice
mrp
priceSource
priceMissing
priceMissingReason
```

### Staff Inventory Table Columns

Source: `inventory/page.jsx`.

```jsx
<th>Product</th>
<th>SKU</th>
<th className="text-end">Available</th>
<th className="text-end">Reorder</th>
<th>Status</th>
<th>Last Move</th>
<th style={{ width: 70 }}></th>
```

Rendered row fields:

```js
name = row.variant?.product?.name ?? row.productName ?? row.variant?.title ?? "-"
sku = row.variant?.sku ?? row.sku ?? "-"
available = row.availableQty ?? qty
```

There is no price column or price fallback in this table.

### Batch Pricing Response

Source: `staffBatchPricing.service.ts`, `listShopBatchesForBranch`.

```js
{
  lotId,
  lotCode,
  variantId,
  productName,
  sku,
  variantTitle,
  packDisplay,
  mfgDate,
  expDate,
  availableQty,
  currentSellingPrice,
  ruleId,
  batchRulePrice,
  batchSellPrice,
  resolvedSellPrice,
  effectiveSellPrice,
  sellPrice: effectiveSellPrice,
  catalogSellPrice,
  mrp,
  priceSource,
  sellsAtRulePrice,
  status,
  rawStatus
}
```

Frontend candidate order:

```js
[
  row?.batchSellPrice,
  row?.resolvedSellPrice,
  row?.effectiveSellPrice,
  row?.sellPrice,
  row?.catalogSellPrice,
  row?.mrp
]
```

This is why batch-pricing can display price while inventory summary cannot.

### POS Browse Response

Source: `pos.controller.ts`, `getProducts`.

Backend creates variant rows like:

```js
{
  ...variant,
  stock,
  minStock: 10,
  price
}
```

Then it filters:

```js
const sellableVariants = variantsWithStock.filter((variant) => {
  const stock = Number(variant?.stock || 0);
  const price = Number(variant?.price);
  return variant?.id != null && stock > 0 && Number.isFinite(price) && price > 0;
});
```

And drops products with no remaining variants:

```js
const sellableProducts = productsWithStock.filter(
  (product) => Array.isArray(product.variants) && product.variants.length > 0
);
```

Frontend filters again:

```js
function isSellablePosRow(row) {
  const stock = Number(row?.stock ?? 0);
  const price = Number(row?.price);
  return row?.variantId != null && stock > 0 && Number.isFinite(price) && price > 0;
}
```

This directly conflicts with the new requirement to display available but unpriced products.

### POS Barcode Response

Source: `pos.service.ts`, `getProductByBarcode`.

```js
{
  productId: variant.productId,
  variantId: variant.id,
  product: variant.product,
  variant: {
    id: variant.id,
    sku: variant.sku,
    title: variant.title,
    barcode: variant.barcode
  },
  stock,
  price
}
```

Barcode lookup can return `price: null`; `addToCart` then blocks with `Price is not configured for this product.`

## Staff Inventory vs Batch Pricing Data Source

Staff Inventory:

- Uses `staffInventoryList`.
- Endpoint: `GET /api/v1/inventory?branchId=...`.
- Backend source: `stockBalance.findMany`.
- Scope: branch/location stock summary.
- Price behavior: no price resolution.

Batch Pricing:

- Uses `staffShopBatchesList`.
- Endpoint: `GET /api/v1/inventory/shop-batches?branchId=...`.
- Backend source: default SHOP location -> `getInventoryBatches`.
- Scope: lot rows at branch SHOP.
- Price behavior: explicit price enrichment with batch, enterprise/catalog, and MRP candidates.

Conclusion: batch-pricing page is reading a different endpoint that already has price fields. Staff Inventory is not missing a render-only mapping; the data is absent from its API response too.

## POS Catalog Endpoint and Zero-Item Cause

The POS left product panel uses:

```ts
staffPosProducts(branchId, q)
// GET /api/v1/pos/products?branchId=&q=
```

The backend resolves stock as:

- If default SHOP exists: use `getLocationVariantStockMap(shopLocationId, allVariantIds)`.
- If no SHOP exists: fallback to branch-wide `getBranchVariantStockMap`.

The backend resolves price as:

- `resolvePosBranchVariantListPricesBulk`.
- Only positive resolved prices are stored in the map.
- Missing or non-positive prices become `price: null`.

The backend then filters out every `price: null` row. The frontend filters them again. Therefore:

- It is filtering only products with price: yes.
- It is filtering to active/default SHOP location when SHOP exists: yes, by design.
- It does not appear to be using the wrong branchId/orgId in the normal staff route: frontend passes route `branchId`, and POS middleware verifies active branch membership.
- It excludes products with null price: yes, in both backend and frontend.
- It does use default SHOP fallback/reactivation: yes, through `orders.service.getDefaultFulfilmentLocationForBranch`.

## Barcode vs Browse Resolver Comparison

Browse path:

- `GET /api/v1/pos/products`
- `pos.controller.getProducts`
- Stock: default SHOP via `getLocationVariantStockMap`
- Price: `resolvePosBranchVariantListPricesBulk`
- Filtering: removes missing price rows before response, then frontend removes them again

Barcode path:

- `GET /api/v1/pos/products/barcode/:barcode`
- `pos.service.getProductByBarcode`
- Stock: default SHOP via `getLocationVariantStockMap`
- Price: `resolvePosBranchVariantListPrice`
- Filtering: does not remove result just because price is null
- Add behavior: `addToCart` blocks if price is missing/non-positive

Conclusion: barcode and browse use the same resolver family and mostly the same SHOP stock logic, but not the same result handling. Browse hides unpriced stock; barcode can find it but cannot add it.

## Pricing Resolver Mismatch With Batch Pricing

Current POS resolver behavior:

- `posListPriceResolution.service.resolvePosBranchVariantListPrice`
  - Uses enterprise/batch resolver only when `shouldPosUseEnterpriseListPriceResolution(policy)` is true.
  - That helper returns true only when `posPricingGovernanceEnabled` or `posUseEnterpriseListResolution` is true.

- `pricingEngine.service.resolveSellingPriceWithEnterprise`
  - Calls `resolveSellingPrice` first.
  - If core price is null or not positive, returns immediately.
  - Batch promo/list logic runs only after a positive core price exists.

This means a branch batch rule can be visible on the batch-pricing page but still fail POS price resolution when:

- There is a `BatchPricingRule`, but no effective `ProductPricing`, `BranchPricing`, or `LocationPrice`.
- `batchPricingEnabled` is true, but `posUseEnterpriseListResolution` and `posPricingGovernanceEnabled` are false.
- The batch page falls back to `mrp`, but POS resolver does not use that same fallback as a final POS price.

## Missing Fields or Wrong Filters

Missing in Staff Inventory API:

- `sellPrice`
- `listPrice`
- `resolvedSellPrice`
- `effectiveSellPrice`
- `batchSellPrice` or `batchPricePreview`
- `catalogSellPrice`
- `mrp`
- `priceSource`
- `priceMissing`
- `priceMissingReason`
- `shopLocationId` or `priceScope`

Missing in Staff Inventory UI:

- A price/sell-price column.
- Missing-price display state.
- Price source indicator if needed.

Wrong for the new POS requirement:

- Backend `sellableVariants` filter requires `price > 0`.
- Backend `sellableProducts` drops products that only have unpriced in-stock variants.
- Frontend `isSellablePosRow` requires `price > 0`.
- Frontend count text says `sellable items`; the new requirement is closer to `available items`, with add disabled when price is missing.

## Recommended Implementation Plan

1. Define the shared POS/catalog price contract.
   - For each variant row, return `stock`, `price`, `priceSource`, `priceMissing`, `priceMissingReason`, and `shopLocationId`.
   - Keep `price: null` for truly missing price. Do not coerce missing price to `0`.

2. Fix POS browse backend without changing route names.
   - In `pos.controller.getProducts`, keep the default SHOP stock logic.
   - Change the variant filter from "stock and price" to "variant exists and stock > 0".
   - Preserve `price: null` rows.
   - Rename internal variables away from `sellableVariants` if touched, because they will become "available variants".

3. Fix POS frontend display filtering.
   - In `PosSaleWorkspace`, replace `isSellablePosRow` with a display predicate that requires `variantId != null` and `stock > 0`, but not `price > 0`.
   - Keep `hasPrice` in `PosProductPanel`.
   - Keep Add disabled when `!hasPrice`.
   - Change count text from `sellable items` to `available items` or similar.
   - Make local search and barcode fallback search use the available-row list so no-price items can be found and marked.

4. Align POS price resolver with batch pricing.
   - Prefer one shared resolver for POS browse, barcode, and future Staff Inventory price fields.
   - Decide explicitly whether a staff `BatchPricingRule` with `sellsAtRulePrice=true` is a valid configured sell price even when `ProductPricing.basePrice` is absent.
   - Based on the stated requirement, the safest behavior is to let a positive active batch rule on a FEFO-eligible SHOP lot produce a POS display price, while still enforcing min/max/MRP bounds when those bounds exist.
   - Ensure expired lots are not used for POS price resolution. Use the existing FEFO available-lot path rather than all `stockLotBalance` rows.
   - Keep retail governance checkout checks intact.

5. Add price fields to Staff Inventory API.
   - Best insertion point: `inventory.service.getInventorySummaryV2` after stock rows are loaded, or a small enrichment helper called by `inventory.controller.getInventory`.
   - For branch-scoped inventory, resolve branch POS list price via the same shared POS price resolver and default SHOP location.
   - Return price metadata per `variantId`.
   - If the row is not a SHOP location row, label the field as branch/default-SHOP POS price, not as location-specific stock price.

6. Add price column to Staff Inventory UI.
   - In `inventory/page.jsx`, add a `Sell price` or `POS price` column.
   - Display formatted price when present.
   - Display `Missing price` / `Needs price setup` when stock exists but price is null.
   - Do not break existing stock, status, pagination, or ledger drawer behavior.

7. Keep batch pricing endpoint stable.
   - Do not rename `/api/v1/inventory/shop-batches`.
   - Do not remove existing batch-pricing response fields.
   - Optionally reuse the shared resolver internally later, but only after verifying its output matches the current page.

8. Preserve branch isolation and org safety.
   - POS routes already use `requirePosPermission`.
   - Batch pricing uses `resolveBranchAccessProfile`.
   - If enriching `GET /api/v1/inventory`, consider tightening explicit `branchId` access checks because the current generic inventory route accepts explicit branch scope directly after authentication.

## Risk Notes

- Showing unpriced products in POS is a UX change from the earlier "sellable-only cashier mode." Add-to-cart must remain disabled for missing price.
- If batch rules become valid standalone POS prices, governance behavior must be tested carefully. A no-catalog-price batch rule should not bypass floor, MRP, approval, or below-cost safeguards where those are configured.
- Inventory summary is location/branch stock; POS sale stock is default SHOP stock. A price shown in inventory should be clearly scoped as branch POS/default SHOP price unless the API returns location-specific price.
- `resolvePosBranchVariantListPricesBulk` currently returns only `Map<variantId, number>`. Returning source/missing diagnostics may require a new rich helper to avoid breaking callers.
- Batch pricing page includes depleted/expired rows for management. POS browse should only display available non-expired sellable stock, or at least must not allow sale from expired lots.
- Strengthening inventory route access may surface existing callers that relied on broad authenticated access; validate owner/warehouse/staff flows.

## Validation Checklist After Implementation

- Staff Inventory table shows a price column.
- Staff Inventory shows a numeric price for variants with configured POS/list/batch price.
- Staff Inventory shows `Missing price` or equivalent for available stock with no configured price.
- Batch Pricing list still loads and still shows SHOP rows and sell price.
- Batch Pricing detail still loads and saves existing batch price edits.
- POS left panel displays all variants with available SHOP quantity, including rows with `price: null`.
- POS no-price rows show `No price configured` and cannot be added to cart.
- POS priced rows can still be added and finalized.
- POS browse and barcode return the same stock and price for the same variant.
- A batch-priced SHOP lot appears in POS with the configured price when policy says batch pricing should apply.
- Expired lots are not used for POS add/finalize.
- Branch A staff cannot browse or sell Branch B products.
- Inactive SHOP fallback/reactivation still works and does not create duplicate SHOP locations.

## Commands/Tests To Run After Implementation

Backend:

```powershell
Set-Location D:\BPA_Data\backend-api
npm run typecheck
npm test -- src/api/v1/modules/pricing/posPricingPolicy.util.test.ts
npm test -- src/api/v1/modules/pricing/batchPricingBranchScope.util.test.ts
npm test -- src/api/v1/modules/pricing/unifiedPriceResolution.richTimeline.test.ts
```

Frontend:

```powershell
Set-Location D:\BPA_Data\bpa_web
npm run lint
```

Manual API checks with an authenticated staff session:

```powershell
# POS browse should include available no-price rows with price:null.
GET /api/v1/pos/products?branchId=<branchId>

# Barcode should match browse for stock and price.
GET /api/v1/pos/products/barcode/<barcode>?branchId=<branchId>

# Inventory should include new price metadata.
GET /api/v1/inventory?branchId=<branchId>&limit=50

# Batch pricing should remain unchanged.
GET /api/v1/inventory/shop-batches?branchId=<branchId>
```

Manual UI checks:

```text
/staff/branch/<branchId>/inventory
/staff/branch/<branchId>/inventory/batch-pricing
/staff/branch/<branchId>/pos
```
