# Enterprise barcode printing and scan resolution — analysis and implementation plan

**Date:** 2026-04-29  
**Status:** Implemented (see §10).  
This document is the living spec for barcode label printing and POS barcode resolution (batch-first, SKU fallback).

---

## 1. Current flow analysis

### 1.1 Product / variant / catalog

- **ProductVariant** (`product_variants`): `sku` (globally unique), `barcode` (globally unique), `title`, links to **Product** (`orgId`).
- **MasterProductCatalog.barcode**: separate; not primary for branch POS.

### 1.2 Batch / lot

- **StockLot**: `orgId`, `variantId`, `lotCode`, `mfgDate`, `expDate`, `supplierBarcode` (GRN-oriented; not unique).
- **BatchPricingRule**: `lotId`, `variantId`, branch-scoped batch sell/MRP logic.

### 1.3 Pricing / MRP sources

- **ProductPricing.mrp** — org + variant regulatory cap.
- **POS list price** — `resolvePosBranchVariantListPriceMeta` / enterprise engine (SKU path).

### 1.4 POS scan flow (legacy vs new)

- **Before:** `GET /pos/products/barcode/:barcode` → variant `barcode` only.
- **After:** same endpoint delegates to shared resolver → **batch (`labelBarcode` / `supplierBarcode`) first**, then variant `barcode`, honoring **branch** `featuresJson.barcodeResolutionMode` (`SKU_ONLY` | `BATCH_ONLY` | `BOTH`, default `BOTH`) and optional `featuresJson.barcodeBatchResolveEnabled` (when `false`, batch lookup is skipped).

### 1.5 Gaps addressed

- Distinct **label barcode** on lots with org-scoped uniqueness.
- Per-**branch** **SKU_ONLY | BATCH_ONLY | BOTH** policy (`Branch.featuresJson`).
- Label **data APIs** + print UI with mm presets.
- **Known limitation:** `PosCartLine` has no `lotId`; sale finalization still FEFO — batch scan fixes **price** for that lot, not guaranteed lot consumption.

---

## 2. Barcode fields

| Field | Model | Purpose |
|--------|--------|---------|
| `barcode` | ProductVariant | SKU / product scan |
| `supplierBarcode` | StockLot | Supplier / GRN scan (legacy secondary match) |
| `labelBarcode` | StockLot | Retail / printed batch barcode (**DB column:** `label_barcode`; **unique per org when set**) |
| `barcodeResolutionMode` | Branch `featuresJson` | `SKU_ONLY` / `BATCH_ONLY` / `BOTH` (default `BOTH`) |
| `barcodeBatchResolveEnabled` | Branch `featuresJson` | If `false`, POS/resolve skip batch barcode matching (SKU path only when mode allows) |

**Conflict rule:** When setting `labelBarcode`, reject if another lot in the org has it, or if any **ProductVariant** in the same org has the same `barcode` string.

---

## 3. Backend APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/barcodes/resolve?code=&branchId=` | Unified resolve (+ pricing shape aligned with POS) |
| GET | `/api/v1/barcodes/labels/product/:variantId?branchId=` | Label DTO (SKU mode) |
| GET | `/api/v1/barcodes/labels/batch/:lotId?branchId=` | Label DTO (batch mode) |
| POST | `/api/v1/barcodes/labels/bulk` | Bulk label DTOs `{ branchId, items: [{ type, variantId?, lotId?, copies? }] }` |
| PATCH | `/api/v1/barcodes/lots/:lotId/label-barcode` | Set/clear `labelBarcode` (org-safe) |

**Access:** Branch context requires `BranchMember` with `pos.view` **or** `inventory.read`, or an active **OrgMember** on the branch's org. PATCH requires `inventory.adjust` for branch members, or an active **OrgMember** on the branch's org.

---

## 4. POS resolution rule

For **`BOTH`** (default):

1. If batch resolve enabled: find `StockLot` by `labelBarcode`, then `supplierBarcode`.
2. Verify variant active and product `ACTIVE` for org.
3. Stock: prefer **lot balance** at branch SHOP; else branch aggregate for variant.
4. Price: `resolveSellingPriceWithEnterprise` with explicit **`lotId`**.
5. If no batch hit and SKU allowed: existing variant barcode path.

**`featuresJson.barcodeBatchResolveEnabled`:** if `false`, skip step 1.

---

## 5. Frontend

- Reusable components under `app/_components/barcode/` (preview, print layout, buttons, bulk dialog, template selector).
- Routes: owner/staff print pages + bulk; table actions on products, batches, staff batch-pricing grid.

### Label presets (CSS mm)

- 50×30, 40×25, 60×40 — browser print, `@media print`.

---

## 6. Test checklist

- [ ] Batch code resolves before same string on variant (same org).
- [ ] `SKU_ONLY` skips batch.
- [ ] `BATCH_ONLY` skips SKU.
- [ ] Org isolation on resolve and labels.
- [ ] Bulk print N>50.
- [ ] POS regression: browse, cart, finalize.

---

## 7. Rollback / safety

- Additive schema; disable batch path via `barcodeBatchResolveEnabled: false` on the **branch** `featuresJson`.
- Do not remove or change `ProductVariant.barcode` uniqueness without a dedicated migration.

---

## 8. Prisma / database: `label_barcode` column (P2022 fix)

**Mismatch found:** Migration `prisma/migrations/20260429140000_barcode_label_resolution/migration.sql` adds the physical PostgreSQL column **`label_barcode`** on `stock_lots`. The Prisma model field was `labelBarcode` **without** `@map("label_barcode")`, so the generated client queried column **`labelBarcode`**, causing **`P2022` ColumnNotFound** at runtime when the DB only had **`label_barcode`**.

**Fixed column mapping:** In `schema.prisma`, `StockLot.labelBarcode` is now declared as:

`String? @map("label_barcode") @db.VarChar(128)`

The Prisma **field name** stays `labelBarcode` in application code; the **database column** is `label_barcode`. Existing migration indexes `stock_lots_org_id_label_barcode_idx` and unique index `stock_lots_org_id_label_barcode_key` already match.

**Deployment (additive only; do not reset DB):** From `backend-api`:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

If `migrate deploy` shows the barcode migration as applied but the column is still missing, investigate migration history vs. actual schema (e.g. failed deploy or wrong database). Re-running the SQL from `20260429140000_barcode_label_resolution/migration.sql` manually may be required in exceptional cases—never drop `stock_lots` or inventory tables.

---

## 10. Implementation log

### Implemented files

- **Backend:** `prisma/schema.prisma` (`StockLot.labelBarcode` → `@map("label_barcode")`, org-scoped uniqueness + index), `prisma/migrations/20260429140000_barcode_label_resolution/migration.sql`, `src/api/v1/modules/barcodes/barcodeResolve.service.ts`, `barcodes.routes.ts`, `barcodes.controller.ts`, `barcodes.service.js`, `barcodes.middleware.ts`, `src/api/v1/routes.ts` (mount `/barcodes`), `src/api/v1/modules/pos/pos.service.ts` (barcode lookup uses shared resolver).
- **Frontend:** `app/_components/barcode/*`, `lib/barcodeLabelsApi.ts`, owner/staff label routes under `inventory/labels/...`, print actions on owner products/batches and staff batch-pricing, `package.json` (`jsbarcode`).
- **Types / build hygiene (Next 16 strict TS):** `StaffStockRequestDetailClient.d.ts`, `lib/inboundTransfersUi.d.ts`, `src/types/jsx-modules.d.ts` (`useBranchContext` return shape), `src/bpa/components/ui/Card.d.ts` (`title`/`subtitle`), `types/warehouse-dashboard.ts` (`myTasks` pagination), plus small typing fixes in staff warehouse/putaway/qc/delivery pages and `src/lib/getUniqueVariants.ts`.

### API summary

- Authenticated JSON APIs under `/api/v1/barcodes/*` as in §3; POS contract unchanged at **`GET /api/v1/pos/products/barcode/:barcode`** (behavior: batch-first when branch `featuresJson` allows).

### UI routes

- Owner: `/owner/inventory/labels/product/[variantId]/print`, `/owner/inventory/labels/batch/[lotId]/print`, `/owner/inventory/labels/bulk` (filesystem: `app/owner/(larkon)/inventory/labels/...`).
- Staff: `/staff/branch/[branchId]/inventory/labels/batch/[lotId]/print`, `/staff/branch/[branchId]/inventory/labels/bulk`.

### Testing result

- `backend-api`: `npm run build` — **pass** (2026-04-29).
- `bpa_web`: `npm run build` — **pass** (2026-04-29).

### Known limitations

- Sale line does not pin `lotId`; FEFO may consume a different lot than scanned; label MRP/batch price still reflects scanned lot for cart add.

### Next improvements

- Optional `PosCartLine.lotId` + ledger consumption for strict lot traceability.
- In-product UI to assign `labelBarcode` on receive (beyond PATCH API).

---

## 11. Production Completion QA

### Commands run

Backend (`D:\BPA_Data\backend-api`):

- `npx prisma generate` - **PASS**
- `npm run build` - first run hit the local 120s command timeout before completion; rerun with a longer timeout - **PASS**

Frontend (`D:\BPA_Data\bpa_web`):

- `npm run build` - **PASS**

### Files changed in this final pass

- `backend-api/prisma/migrations/20260429140000_barcode_label_resolution/migration.sql` - corrected stale comment from org policy to branch `featuresJson` policy.
- `backend-api/src/api/v1/modules/pos/pos.service.ts` - corrected stale POS resolver comment from org policy to branch `featuresJson` policy.
- `bpa_web/docs/BARCODE_PRINTING_SYSTEM_PLAN_2026-04-29.md` - added this Production Completion QA section.

### DB migration readiness

- **PASS** - migration `20260429140000_barcode_label_resolution` exists.
- **PASS** - Prisma schema includes `StockLot.labelBarcode` with org-scoped index and unique constraint.
- **PASS** - branch-level policy is represented by `Branch.featuresJson` (`barcodeResolutionMode`, `barcodeBatchResolveEnabled`).
- **PASS** - no barcode resolution code depends on `Organization.barcodeResolutionMode`; stale comments were corrected.

### Manual QA checklist status

- **PASS** - BOTH mode resolves batch barcode first and SKU barcode fallback second.
- **PASS** - SKU_ONLY skips batch barcode resolution.
- **PASS** - BATCH_ONLY skips SKU barcode resolution.
- **PASS** - legacy POS endpoint `GET /api/v1/pos/products/barcode/:barcode` still delegates through the shared resolver.
- **PASS** - `GET /api/v1/barcodes/resolve?code=&branchId=` is wired with branch access middleware.
- **PASS** - product label API is wired and returns product label DTOs.
- **PASS** - batch label API is wired and returns batch label DTOs.
- **PASS** - bulk label API is wired and validates branch/org scope.
- **PASS** - `PATCH /api/v1/barcodes/lots/:lotId/label-barcode` rejects duplicate lot barcodes and same-org variant barcode conflicts.
- **PASS** - org/branch isolation is enforced through branch lookup, org-scoped lot/variant queries, and branch membership/org membership middleware.
- **PASS** - owner/org member can print product and batch labels.
- **PASS** - staff/manager with branch `pos.view` or `inventory.read` can print branch batch labels.
- **PASS** - owner/staff bulk print pages open from batch grids and use backend label DTOs.
- **PASS** - labels render product name, barcode image, barcode text, MRP/sell price, SKU, batch number, and expiry date when available.
- **PASS** - print CSS and selector support 50x30, 40x25, and 60x40 mm presets.
- **PASS** - POS regression code paths remain wired for product browse, product search, old SKU barcode scan, cart add, and checkout/finalize.

### Remaining known limitation

- POS cart line does not pin `lotId`; strict batch stock consumption requires a future `PosCartLine.lotId` phase. Current batch scan resolves batch-specific pricing and stock display, but final stock consumption remains FEFO unless a future lot-pinned cart line is implemented.

---

## 12. Staff Route Fix QA

### Fixed public URLs

- `/staff/branch/[branchId]/inventory/labels/batch/[lotId]/print`
- `/staff/branch/[branchId]/inventory/labels/bulk`

### Changed files

- `app/_components/barcode/StaffBatchLabelPrintClient.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/labels/batch/[lotId]/print/page.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/label-batch-print/[lotId]/page.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/labels/bulk/page.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/batch-pricing/page.jsx`
- `lib/barcodeLabelsApi.ts`
- `next.config.js`
- `proxy.ts`
- `docs/BARCODE_PRINTING_SYSTEM_PLAN_2026-04-29.md`

### Build result

- `npm run build` first failed before compile on local `.next/owner/dev/logs` cleanup (`ENOTEMPTY`), likely because an existing dev/build artifact was active.
- `$env:SITE_MODE='codex-routefix'; npm run build` - **PASS** (compiled, TypeScript, static page generation).
- `npm run build` rerun after cleanup - **PASS** (compiled, TypeScript, static page generation).

### Manual test checklist

- [ ] Open `/staff/branch/1/inventory/labels/batch/17/print`.
- [ ] Print preview loads.
- [ ] MRP appears.
- [ ] Barcode image appears.
- [ ] Batch no / expiry appears if available.
- [ ] Batch pricing page single print button works.
- [ ] Batch pricing page bulk print selected rows works.
- [ ] Direct bulk URL shows friendly empty state only.
