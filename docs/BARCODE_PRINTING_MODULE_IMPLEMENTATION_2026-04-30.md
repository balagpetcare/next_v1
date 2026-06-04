# Enterprise Barcode Printing module — analysis & implementation

**Date:** 2026-04-30  
**Scope:** UI centralization for staff/manager and owner; reuse barcode APIs; optional backend list endpoints.

---

## 1. Existing route / component / API analysis

### Frontend — staff

| Area | Path / file | Notes |
|------|-------------|--------|
| Inventory root | `app/staff/(larkon)/branch/[branchId]/inventory/*` | Larkon shell + `branchSidebarConfig` |
| Batch pricing | `inventory/batch-pricing/page.jsx` | Uses `staffShopBatchesList`, bulk session `saveStaffBulkLabelSession`, print links |
| Labels | `inventory/labels/batch/[lotId]/print/page.tsx`, `labels/bulk/page.tsx` | Bulk empty state pointed at Batch pricing only |
| Barcode components | `app/_components/barcode/*` | `BarcodeLabelPreview`, `BarcodePrintPage`, `LabelTemplateSelector`, `barcodeLabelsApi.ts` |
| Sidebar | `src/lib/branchSidebarConfig.ts` | `BRANCH_SIDEBAR` Operations group; batch-pricing requires `inventory.batch.pricing`, hidden on warehouse hubs |

### Frontend — owner

| Area | Path | Notes |
|------|------|--------|
| Inventory menu | `src/lib/permissionMenu.ts` | Owner `owner.inventory` children |
| Batches | `owner/inventory/batches/page.tsx` | `ownerGet` `/inventory/locations`, `/inventory/batches`, bulk session `saveBulkLabelSession` |
| Labels | `owner/inventory/labels/product/.../print`, `labels/batch/...`, `labels/bulk` | Product print needs `branchId` query |

### API client

- `lib/barcodeLabelsApi.ts`: `fetchProductBarcodeLabel`, `fetchBatchBarcodeLabel`, `fetchBulkBarcodeLabels`, staff bulk session key `barcode_bulk_labels_staff_branch_${branchId}`.
- Bulk POST body uses `type: "BATCH" | "PRODUCT"` today; module adds **`SKU` as alias of PRODUCT** server-side.

### Backend — barcodes

- `GET /api/v1/barcodes/resolve`, `labels/product/:variantId`, `labels/batch/:lotId`, `POST labels/bulk`, `PATCH lots/:lotId/label-barcode`.
- Middleware: `requireBranchBarcodeAccess` (`pos.view` **or** `inventory.read` for branch members); `requireBranchLabelMutate` (`inventory.adjust` or org member).

### Backend — inventory / POS (reuse)

- `GET /api/v1/inventory/shop-batches` (`listShopBatchesForBranch`) requires **BRANCH_MANAGER** + **`inventory.batch.pricing`** — too narrow for general “Barcode Printing” users.
- `inventory.service.getInventoryBatches` — location-scoped rows (used internally).
- `GET /api/v1/pos/products` — POS product browse; permission `pos.view`-oriented.

### Prisma (reference)

- `StockLot.labelBarcode` (@map `label_barcode`), `supplierBarcode`.
- `ProductVariant.barcode`, `ProductPricing.mrp`, `BatchPricingRule` for batch sell price.

---

## 2. Backend gaps (addressed in this task)

| Gap | Resolution |
|-----|------------|
| Staff batch list for users with `inventory.read` / `pos.view` only | **New** `GET /api/v1/barcodes/branch-lots?branchId=&q=&filters...` — same enrichment pattern as shop-batches (pricing), no manager-only gate |
| Staff SKU/variant search for label module | **New** `GET /api/v1/barcodes/branch-variants?branchId=&q=&limit=` |
| Bulk body `type: "SKU"` | **Alias** to PRODUCT in `bulkLabels` |
| Print history | **None** — UI placeholder only |

### Safety

- New routes use existing `requireBranchBarcodeAccess` (org/branch isolation unchanged).
- No schema migrations; no data drops.
- `PATCH .../label-barcode` unchanged; still requires `requireBranchLabelMutate`.

---

## 3. Frontend pages / components to add

| Item | Path |
|------|------|
| Staff module | `app/staff/.../inventory/barcode-printing/page.tsx` + `_components/*` tabs |
| Staff SKU print | `app/staff/.../inventory/labels/product/[variantId]/print/page.tsx` (new) |
| Owner module | `app/owner/.../inventory/barcode-printing/page.tsx` + `_components/*` |
| Shared config | `app/_components/barcode/labelTemplateConfig.ts` |
| Preview / print | Extend `BarcodeLabelPreview`, `BarcodePrintPage` for template + QR |
| Sidebar | `branchSidebarConfig.ts` — “Barcode Printing” under Operations |
| Owner menu | `permissionMenu.ts` — “Barcode Printing” under Inventory (both menu variants) |

---

## 4. Test checklist (manual)

- Staff sidebar: Barcode Printing visible with `inventory.read` or `pos.view`.
- `/staff/branch/{id}/inventory/barcode-printing` opens; tabs work.
- Batch tab: search/filters, print, preview, set label barcode, conflict error.
- SKU tab: search, print, staff product print route.
- Bulk: mixed BATCH + SKU, session key, `/labels/bulk` empty state copy.
- Owner page: tabs, localStorage template, read-only policy stub if present.
- QR modes in preview; `npm run build` on web + API.

---

## 5. Final implementation log

### Changed / new files

- **backend-api:** `src/api/v1/modules/barcodes/barcodes.service.js`, `barcodes.controller.ts`, `barcodes.routes.ts` — `GET /branch-lots`, `GET /branch-variants`, bulk `SKU` alias, label DTO enrichments.
- **bpa_web:**  
  - `src/lib/branchSidebarConfig.ts`, `src/lib/permissionMenu.ts` — menu entries.  
  - `app/_components/barcode/labelTemplateConfig.ts`, `BarcodeLabelPreview.tsx`, `BarcodePrintPage.tsx`, `lib/barcodeLabelsApi.ts`.  
  - Staff: `inventory/barcode-printing/page.tsx`, `StaffBarcodePrintingClient.tsx`, `inventory/labels/product/[variantId]/print/page.tsx`, `inventory/labels/bulk/page.tsx` (empty state).  
  - Owner: `inventory/barcode-printing/page.tsx`, `OwnerBarcodePrintingClient.tsx`.  
  - Dependency: `qrcode.react` in `package.json`.

### New API routes

- `GET /api/v1/barcodes/branch-lots?branchId=&q=&stockGt0=&nearExpiry=&expired=&hasLabelBarcode=&missingLabelBarcode=`
- `GET /api/v1/barcodes/branch-variants?branchId=&q=&limit=`

### Reused APIs

- `GET/PATCH .../barcodes/lots/:lotId/label-barcode`, `GET .../labels/product/:variantId`, `labels/batch/:lotId`, `POST labels/bulk`, `resolve`.

### New public routes

- `/staff/branch/[branchId]/inventory/barcode-printing`
- `/staff/branch/[branchId]/inventory/labels/product/[variantId]/print`
- `/owner/inventory/barcode-printing`

### Build result

- **bpa_web:** `npm run build` — success (Next.js 16.1.6). If `.next` cache errors with `ENOTEMPTY` on Windows, delete `.next` and rebuild.  
- **backend-api:** `npm run build` — success in prior verification; re-run after barcodes changes.

### Hotfix (2026-04-29 closeout)

- **OwnerBarcodePrintingClient:** Added missing `presetId` (`mapPresetToLayoutId`), restored inventory **locations** load + branch sync from selected location, replaced non-existent `GET /api/v1/branches/:id` policy fetch with **read-only browser-scope** copy on Templates tab.  
- **StaffBarcodePrintingClient:** `BranchHeader` now receives `branch`, `myAccess`, `branchId` (matches `BranchHeader.jsx` contract); page title moved to a small heading block.

### Manual QA checklist

- Staff sidebar shows **Barcode Printing** (with inventory/pos access as configured).
- `/staff/branch/1/inventory/barcode-printing` opens; Batch / SKU / Bulk / History tabs behave as designed.
- Batch: filters, print → existing `labels/batch/[lotId]/print`, preview modal, **Set/Edit label barcode** → `PATCH .../label-barcode`, duplicate error surfaces API message.
- SKU: print → `labels/product/[variantId]/print`.
- Bulk: mixed BATCH + SKU, `sessionStorage` key `barcode_bulk_labels_staff_branch_${branchId}`, **Print** opens `/labels/bulk`; direct bulk URL shows empty state with link back to module.
- Field toggles + size presets + QR modes affect `BarcodeLabelPreview`; density warning for small presets when many fields on.
- Owner: `/owner/inventory/barcode-printing`, location → branch context, SKU/batch tables, templates in **localStorage**, History placeholder.
- `npm run build` passes on **bpa_web** and **backend-api**.

### Known limitations

- Print history / audit not implemented (placeholder tabs).
- Owner barcode “policy” is descriptive only unless a dedicated owner-safe branch-features read API is wired later.
- Label templates persist per browser (staff key per branch; owner global), not server-side.

### Next improvements

- Persist label templates in org/branch settings when a safe API exists.
- Optional print audit log endpoint and History tab data source.

---

## 6. Duplicate branch context card fix

### Root cause

`StaffBarcodePrintingClient` wrapped the page in `StaffBranchLayout`, and `StaffBranchLayout` already renders the shared `BranchHeader` branch context card. The barcode printing client also rendered its own `BranchHeader` inside the layout, so the same branch name/type/role/switcher card appeared twice.

### Changed files

- `app/staff/(larkon)/branch/[branchId]/inventory/barcode-printing/StaffBarcodePrintingClient.tsx`
  - Removed the inner `BranchHeader` import/render.
  - Kept `StaffBranchLayout`, the page title `Barcode Printing`, tabs, filters, tables, and actions intact.

### Build result

- `npm run build` initially failed before compilation with `ENOTEMPTY` on `.next/owner/dev/logs` because the owner dev instance was active.
- `$env:SITE_MODE='codex-barcode-context-fix'; npm run build` - **PASS**.
- Temporary Next-generated type reference changes from the isolated build were restored after verification.

### Manual QA URLs

- `/staff/branch/1/inventory/barcode-printing`
- `/staff/branch/1/inventory/batch-pricing`
- `/staff/branch/1/inventory/labels/batch/25/print`
