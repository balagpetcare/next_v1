# Batch Pricing Single Page Edit Fix - 2026-04-27

## Root Cause

The staff batch pricing edit flow lived inside the batch list drawer and always required `sellPrice` in the update payload. That made safe expiry-only corrections fail before the backend could update the lot date. The list row also only carried a lightweight snapshot, so the edit UI could not show full product, variant, location, stock, policy, and price-bound context.

## Files Changed

- `app/staff/(larkon)/branch/[branchId]/inventory/batch-pricing/page.jsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/batch-pricing/[batchId]/page.jsx`
- `lib/api.ts`
- Backend API:
  - `src/api/v1/modules/inventory/inventory.routes.ts`
  - `src/api/v1/modules/inventory/staffBatchPricing.controller.ts`
  - `src/api/v1/modules/inventory/staffBatchPricing.service.ts`

## Route Added

- `/staff/branch/[branchId]/inventory/batch-pricing/[batchId]`

The list page now navigates to this dedicated page using the stock lot id as `batchId`.

## Update Flow

1. Detail page fetches `GET /api/v1/inventory/shop-batches/:lotId?branchId=...`.
2. Staff edits expiry date, batch sell price, selling-price mode, and audit reason.
3. Page sends `PATCH /api/v1/inventory/shop-batches/:lotId?branchId=...`.
4. Backend validates branch access, SHOP location ownership, lot org, date format, price format, and catalog bounds.
5. Backend returns the refreshed detail payload; the page stays open and shows a success message.

## Validation Performed

- Branch access must resolve to `BRANCH_MANAGER`.
- Permission must include `inventory.batch.pricing`.
- Lot must exist at the branch default SHOP location.
- Lot org must match the branch org.
- Expiry date must parse and be in the future when supplied.
- Sell price must be numeric and greater than zero when supplied.
- Sell price is clamped through existing catalog min/max/MRP rules.
- Batch pricing changes continue to use existing pricing audit logging through `upsertBatchPricingRule`.

## Test Checklist

- Open batch pricing list.
- Click Edit batch price on a row.
- Confirm the single page opens with product, SKU, lot, expiry, SHOP qty, and location.
- Change expiry date only and save.
- Change batch sell price only and save.
- Change both expiry and batch sell price and save.
- Enter an invalid price and confirm a clear error appears.
- Correct an expired lot with a future expiry date.
- Return to list and verify updated values.
- Confirm POS/barcode price resolution still uses the existing pricing APIs.

## Sell Price Column Fix

### Root Cause

The batch pricing list rendered only `currentSellingPrice`, while the backend list response already had the batch rule amount separately. When a lot had a batch price but no resolved catalog or enterprise list price, the UI fell back to `-` even though a valid batch sell price existed.

### Fields Added / Used

- Backend list response now supports:
  - `batchSellPrice`
  - `resolvedSellPrice`
  - `effectiveSellPrice`
  - `sellPrice`
  - `catalogSellPrice`
  - `mrp`
  - `priceSource`
- The table now uses these fields directly instead of relying only on `currentSellingPrice`.

### Display Fallback Order

1. `batchSellPrice`
2. `resolvedSellPrice`
3. `effectiveSellPrice`
4. `sellPrice`
5. `catalogSellPrice`
6. `mrp`
7. `—`

### Test Result

- Backend response includes the normalized price fields for the list.
- The table now prefers the explicit batch sell price when present and shows a muted source label such as `Batch`, `Enterprise`, `Catalog`, or `MRP`.
- The single edit page still uses the existing save flow, including expiry-only and price-only updates.
