# Staff POS Product Data Stabilization Report

## Final Architecture Decision

### Stock source (single source of truth)
- **POS stock now comes from `inventory.quantity` (branch-scoped) only.**
- POS product browse and barcode lookup both read stock from the `inventory` table for the active branch.
- Ledger-based stock fallback was removed from POS product data read-path to avoid mixed-source drift.

### Price source (single resolver boundary)
- **POS price now comes from canonical pricing resolver path only** via:
  - `resolvePosBranchVariantListPrice(...)`
  - `resolvePosBranchVariantListPricesBulk(...)`
- These internally route to `resolveSellingPrice` / `resolveSellingPriceWithEnterprise` according to org pricing policy.
- If no resolver price exists, API returns `price: null` (never fake `0.00`).

## Root Cause
- Previous behavior mixed multiple sources:
  - stock from ledger balances with inventory fallback
  - price from location/enterprise + deep variant/product fallback
- In branches with incomplete ledger/location price rows, POS could show:
  - false `Out of stock`
  - fake `0.00` display from frontend numeric fallback

## Files Changed

### Backend (`backend-api`)
- `src/api/v1/modules/pos/pos.controller.ts`
  - Consolidated POS browse stock to inventory table map.
  - Removed ledger-based stock read from `GET /pos/products`.
  - Consolidated variant prices through POS pricing resolver bulk API only.
  - Missing resolver price now serialized as `null`.
- `src/api/v1/modules/pos/pos.service.ts`
  - Consolidated barcode stock to inventory aggregate only.
  - Barcode price now resolves through POS pricing resolver only.
  - Removed variant/product fallback pricing in barcode response.
- `src/api/v1/modules/pricing/posListPriceResolution.service.ts`
  - Accepts nullable `shopLocationId` so resolver path remains canonical even when shop location is missing.

### Frontend (`bpa_web`)
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosSaleWorkspace.jsx`
  - Removed variant→product price fallback for variant rows.
  - Keeps `price` nullable and blocks add-to-cart when missing.
- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosProductPanel.jsx`
  - Add button disabled when `price` is null or stock <= 0.
  - Explicit UI state: **"No price configured"**.
  - Retains compact premium product-row UI improvements.

## Removed Fallback Logic
- Removed from POS product browse:
  - ledger-first stock computation
  - location/enterprise/variant/product chained price fallback
- Removed from POS barcode lookup:
  - ledger stock fallback path
  - variant base-price fallback

## Consistency Guarantees
- POS browse stock aligns with branch inventory module semantics (`inventory.quantity`).
- POS price aligns with pricing engine policy path (`resolveSellingPrice*` via POS resolver).
- Missing prices remain explicit (`null`), preventing silent zero-price sales.
- Frontend prevents add-to-cart for:
  - stock <= 0
  - missing price

## Validation Run
- Frontend lint passed (touched files):
  - `PosSaleWorkspace.jsx`
  - `PosProductPanel.jsx`
- Backend typecheck passed:
  - `npm run typecheck -- --pretty false`

## Manual QA Checklist
- POS product list stock matches inventory page for same branch and variants.
- POS product list price matches pricing-engine resolved values for same branch.
- Products with missing resolver price show `No price configured` and cannot be added.
- Out-of-stock items show `Out of stock` and cannot be added.
- Barcode scan adds product only when stock > 0 and resolver price is present.
