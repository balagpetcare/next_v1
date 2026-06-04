# Barcode Single Label Designer Upgrade

**Date:** 2026-04-30  
**Scope:** Upgrade existing single barcode label print pages into a reusable Label Designer + Print Preview experience.  
**Status:** Phase 1 analysis complete; implementation pending.

## Current Page Structure

### Staff Routes

- `app/staff/(larkon)/branch/[branchId]/inventory/labels/batch/[lotId]/print/page.tsx`
  - Thin server page that passes `branchId` and `lotId` into `StaffBatchLabelPrintClient`.
- `app/_components/barcode/StaffBatchLabelPrintClient.tsx`
  - Client-side loader for `fetchBatchBarcodeLabel(lotId, branchId)`.
  - Renders back link, error state, loading state, and `BarcodePrintPage`.
- `app/staff/(larkon)/branch/[branchId]/inventory/labels/product/[variantId]/print/page.tsx`
  - Client page that loads `fetchProductBarcodeLabel(variantId, branchId)`.
  - Renders back link, error state, loading state, and `BarcodePrintPage`.
- `app/staff/(larkon)/branch/[branchId]/inventory/labels/bulk/page.tsx`
  - Reads staff bulk print session from `sessionStorage`.
  - Loads labels via `fetchBulkBarcodeLabels`.
  - Renders existing shared print page for multiple labels.

### Owner Routes

- `app/owner/(larkon)/inventory/labels/batch/[lotId]/print/page.tsx`
  - Requires `branchId` query parameter.
  - Loads `fetchBatchBarcodeLabel` and renders `BarcodePrintPage`.
- `app/owner/(larkon)/inventory/labels/product/[variantId]/print/page.tsx`
  - Requires `branchId` query parameter.
  - Loads `fetchProductBarcodeLabel` and renders `BarcodePrintPage`.
- `app/owner/(larkon)/inventory/labels/bulk/page.tsx`
  - Reads owner bulk print session and renders `BarcodePrintPage`.

### API Usage

- `lib/barcodeLabelsApi.ts`
  - `fetchProductBarcodeLabel(variantId, branchId)`
  - `fetchBatchBarcodeLabel(lotId, branchId)`
  - `fetchBulkBarcodeLabels({ branchId, items })`
  - Staff/owner bulk print session helpers.
- `lib/api.ts`
  - Existing POS barcode lookup and print helpers are unrelated to this UI pass.
  - No backend API change is required for this upgrade.

## Reusable Barcode Components Found

- `app/_components/barcode/BarcodeLabelPreview.tsx`
  - Renders one label with CSS mm dimensions.
  - Uses `jsbarcode` for CODE128 barcode rendering.
  - Already imports `QRCodeSVG` from `qrcode.react`.
  - Already supports a partial QR payload with type, variantId, lotId, sku, barcode, mrp, expiryDate.
- `app/_components/barcode/BarcodePrintPage.tsx`
  - Existing print toolbar and repeated label grid.
  - Good compatibility surface for bulk print.
- `app/_components/barcode/barcodePrint.css`
  - Existing label tile styles and print media rules.
- `app/_components/barcode/labelPresets.ts`
  - Current presets: `40x25`, `50x30`, `60x40`.
- `app/_components/barcode/labelTemplateConfig.ts`
  - Existing local template config and localStorage helpers.
  - Current code modes: `BARCODE`, `QR`, `BARCODE_QR`.
  - Current fields cover most required fields, but custom text, org/company, producer, style toggles, A4 layout, and copy controls need expansion.
- `app/_components/barcode/LabelTemplateSelector.tsx`
  - Simple label size selector.

## Target UI Layout

### Left / Main Area

- Page title and route-safe back link.
- Live label preview using the real backend label DTO.
- Real-size / zoom preview toggle.
- Print area preview that repeats labels according to selected copies.
- A4 sheet mode that shows labels repeated in a browser-print-safe grid.
- Overflow warning visible above preview when too many fields are enabled for small labels.

### Right Settings Panel

- Label size selector:
  - 25 x 15 mm
  - 30 x 20 mm
  - 40 x 25 mm
  - 50 x 30 mm
  - 60 x 40 mm
  - 80 x 50 mm
  - A4 sheet layout
- Code type selector:
  - `BARCODE_ONLY`
  - `QR_ONLY`
  - `BARCODE_AND_QR`
- Field visibility checklist.
- Custom Text Line 1 and Custom Text Line 2 inputs.
- Style controls:
  - font scale: small / normal / large
  - compact mode
  - product name bold
  - show border
  - text alignment: left / center
  - barcode height: small / normal / tall
  - QR size: small / normal / large
- Copies control:
  - manual numeric copies
  - optional batch stock quantity shortcut if stock quantity is present in DTO
- Template preset selector:
  - Compact Barcode
  - Retail MRP
  - Medicine / Expiry
  - Importer Label
  - QR Detail
  - Barcode + QR
- Print button.

## Implementation Steps

1. Extend shared label config types in `labelTemplateConfig.ts`.
2. Extend label presets in `labelPresets.ts` while preserving existing preset IDs.
3. Upgrade `BarcodeLabelPreview.tsx` to support required fields, custom text, code type aliases, and style options.
4. Add a reusable `SingleLabelDesignerPrintPage.tsx` component that owns local settings, preview mode, copies, templates, and localStorage persistence.
5. Keep `BarcodePrintPage.tsx` compatible for bulk routes, but allow it to consume upgraded template config and A4 grid print CSS.
6. Update staff batch and staff SKU print routes to use the reusable designer component.
7. Update owner batch and owner SKU print routes to use the same designer component when their route structure provides the required label DTO.
8. Improve `barcodePrint.css` for screen preview, print-only area, mm sizes, A4 layout, repeated copies, and dashboard/header/sidebar hiding during print.
9. Run `npm run build` from `D:\BPA_Data\bpa_web` and fix task-related build/type errors.
10. Update this document with changed files, final feature list, build result, manual QA checklist, known limitations, and next improvements.

## Risk / Safety Notes

- Do not change POS scan logic.
- Do not change backend APIs unless label DTOs are missing critical identifiers; current DTO shape appears sufficient.
- Existing staff/owner print routes must remain valid URLs.
- Existing bulk print pages should keep working through `BarcodePrintPage`.
- Existing presets (`40x25`, `50x30`, `60x40`) must remain stable IDs.
- QR payload must remain non-sensitive and limited to product/batch label data.
- Empty API fields should be skipped gracefully in preview and print.
- Print CSS must avoid leaking dashboard/sidebar/header into the printed page.
- Browser print precision can vary by printer; use mm units and keep margins conservative.

## QA Checklist

- [ ] Staff batch label page opens.
- [ ] Staff SKU label page opens.
- [ ] Owner batch label page opens when `branchId` query is present.
- [ ] Owner SKU label page opens when `branchId` query is present.
- [ ] Existing staff/owner bulk label pages still open.
- [ ] Barcode only preview works.
- [ ] QR only preview works.
- [ ] Barcode + QR preview works.
- [ ] All size presets render.
- [ ] A4 grid layout renders repeated labels.
- [ ] Custom text appears only when enabled and non-empty.
- [ ] Field toggles work and hide empty data gracefully.
- [ ] Style controls work.
- [ ] Copies repeat labels.
- [ ] Batch stock quantity shortcut appears only when quantity exists.
- [ ] Print hides sidebar/header/dashboard chrome.
- [ ] Print preserves label dimensions in mm.
- [ ] A4 grid print preview works.
- [ ] `npm run build` passes.

## Final Implementation Summary

### Changed Files

- `app/_components/barcode/BarcodeLabelPreview.tsx`
- `app/_components/barcode/SingleLabelDesignerPrintPage.tsx`
- `app/_components/barcode/barcodePrint.css`
- `app/_components/barcode/labelPresets.ts`
- `app/_components/barcode/labelTemplateConfig.ts`
- `app/_components/barcode/StaffBatchLabelPrintClient.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/labels/product/[variantId]/print/page.tsx`
- `app/staff/(larkon)/branch/[branchId]/inventory/barcode-printing/StaffBarcodePrintingClient.tsx`
- `app/owner/(larkon)/inventory/labels/batch/[lotId]/print/page.tsx`
- `app/owner/(larkon)/inventory/labels/product/[variantId]/print/page.tsx`
- `app/owner/(larkon)/inventory/barcode-printing/OwnerBarcodePrintingClient.tsx`
- `docs/BARCODE_SINGLE_LABEL_DESIGNER_UPGRADE_2026-04-30.md`

### New UI Features

- Reusable enterprise single-label designer for staff and owner single print routes.
- Left-side live preview with real-size / zoom toggle.
- Print area preview with repeated labels based on copy count.
- Right-side settings panel for label size, code type, fields, custom text, style, copies, template preset, and print.
- Label presets: 25 x 15, 30 x 20, 40 x 25, 50 x 30, 60 x 40, 80 x 50, and A4 sheet layout.
- Code modes: `BARCODE_ONLY`, `QR_ONLY`, `BARCODE_AND_QR`.
- QR rendering uses existing `qrcode.react`; payload is limited to non-sensitive label identifiers and pricing/expiry fields.
- Field toggles cover the requested product, pricing, batch, party, location, print date, and custom text lines.
- Custom text and copies persist in `localStorage` per route/type.
- Style controls include font scale, compact mode, bold product name, border, text alignment, barcode height, and QR size.
- Copy shortcut uses stock quantity only when a stock quantity-like field is present in the label DTO.
- Frontend-only template presets: Compact Barcode, Retail MRP, Medicine / Expiry, Importer Label, QR Detail, Barcode + QR.
- Print CSS hides designer/dashboard chrome and prints the label preview area with mm dimensions and A4 grid support.

### Build Result

- Command: `npm run build`
- Result: **PASS**
- Note: the first build attempt exceeded the tool timeout and left a Next lock; the stale build processes were stopped, then the build completed successfully.

### Manual QA Checklist

- [ ] Staff batch label page opens.
- [ ] Staff SKU label page opens.
- [ ] Owner label pages still open if present.
- [ ] Barcode only preview works.
- [ ] QR only preview works.
- [ ] Barcode + QR preview works.
- [ ] All size presets render.
- [ ] Custom text appears only when enabled.
- [ ] Field toggles work.
- [ ] Style controls work.
- [ ] Copies repeat labels.
- [ ] Print hides sidebar/header.
- [ ] A4 grid print preview works.
- [x] `npm run build` passes.

### Known Limitations

- No backend template persistence in this pass; settings are browser-local.
- A4 sheet layout uses the existing 50 x 30 mm label tile size inside the sheet grid.
- Stock-quantity copy shortcut depends on the label DTO containing an available quantity-like field.
- Browser and printer drivers can still apply their own scaling unless users choose actual size / 100% in print settings.

### Next Improvements

- Persist templates at org/branch level when a safe backend template API exists.
- Add a dedicated A4 label spacing editor for columns, rows, and page margins.
- Add visual calibration/test print marks for printer setup.
- Add print audit/history once a backend print history API is available.
