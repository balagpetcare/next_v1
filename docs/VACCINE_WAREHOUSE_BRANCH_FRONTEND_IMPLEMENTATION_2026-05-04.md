# Vaccine warehouse → branch — frontend implementation (2026-05-04)

This document describes UI wiring completed on **`bpa_web`** so vaccine distribution follows the **same product/inventory surfaces** as non-vaccine stock (no parallel vaccine inventory module).

Backend bridge behavior is documented in `backend-api/docs/VACCINE_WAREHOUSE_BRANCH_BACKEND_IMPLEMENTATION_2026-05-04.md`.

## Files changed

| File | Purpose |
|------|---------|
| `app/_lib/vaccineInventoryUi.ts` | Shared helpers: retail/clinical vaccine-like detection, calendar expiry hints for UI badges. |
| `app/owner/(larkon)/inventory/page.tsx` | Owner stock overview: banner linking **Batches** and **stock requests** for vaccine workflow context. |
| `app/owner/(larkon)/inventory/batches/page.tsx` | Lot table: **Vaccine-like** SKU filter, vaccine badge, expiry emphasis (≤30d / expired), link to branch **Vaccine mapping** when location resolves to a branch. |
| `app/owner/(larkon)/clinic/[branchId]/inventory/page.tsx` | Clinical branch stock: vaccine filter, badges, low-stock badges, workflow strip with links to batches / requests / vaccine mapping. |
| `app/staff/(larkon)/branch/[branchId]/inventory/page.jsx` | Branch retail inventory: **Vaccine-like** filter, vaccine badge + nearest expiry line when API provides `nearestExpiry`, quick links (incoming, vaccine mapping, vaccinations). |
| `app/staff/(larkon)/branch/[branchId]/clinic/items/page.tsx` | Staff clinical stock: same vaccine filter/badges + links to vaccine mapping, vaccinations, incoming. |
| `app/staff/(larkon)/branch/[branchId]/clinic/vaccine-mappings/page.jsx` | Mapping UI: broader clinical item discovery via **multiple parallel searches** (vaccine, rabies, DHPP, FVRCP, VAC, immun). |
| `app/staff/(larkon)/branch/[branchId]/inventory/incoming/page.jsx` | Incoming shipments: short explanation tying dispatch receive → vaccine mapping. |
| `src/lib/branchSidebarConfig.ts` | Staff branch sidebar: **Incoming shipments** → `/staff/branch/[id]/inventory/incoming`. |

## Routes / pages updated

- **Owner:** `/owner/inventory`, `/owner/inventory/batches`, `/owner/clinic/[branchId]/inventory`
- **Staff:** `/staff/branch/[branchId]/inventory`, `/staff/branch/[branchId]/clinic/items`, `/staff/branch/[branchId]/clinic/vaccine-mappings`, `/staff/branch/[branchId]/inventory/incoming`
- **Related (unchanged logic):** patient vaccination page still uses existing batch candidates API; labels already include batch, expiry, qty.

## Reuse of existing product UI

- **Retail:** Staff branch inventory and owner batches remain the primary surfaces for quantities, lots, and expiry; vaccine UX is additive (filters, badges, links).
- **Clinical:** Owner/staff **Clinic items / branch clinical inventory** pages are extended—not replaced— for vaccine visibility and navigation.

## Manual QA checklist

Use a branch where backend vaccine bridge + `ClinicalItemVariant.productVariantId` linking are configured.

1. Owner receives vaccine stock into central warehouse (existing GRN/receipt flow).
2. Owner **Batches**: vaccine SKU filter shows lots; lot code, expiry, qty visible; expiry warning styling when ≤30 days or past.
3. Owner creates transfer / dispatch to branch (existing flows).
4. Branch receives dispatch (existing receive / incoming flow).
5. Staff **Branch inventory**: vaccine-like rows show badge; available qty visible; expiry line if list API returns `nearestExpiry`.
6. Staff **Vaccine mapping**: clinical items from merged searches appear in item dropdown.
7. Staff maps **VaccineType** → received clinical item/variant.
8. Staff opens patient **Vaccination** page; select vaccine type; batch dropdown lists received batches (existing API).
9. Administer vaccine; stock decreases (backend).
10. Pet vaccination history updates (existing UI).

## Build validation

```bash
cd D:\BPA_Data\bpa_web
npm run build
```

**Result:** completed successfully (`exit_code: 0` on 2026-05-05).

## Known limitations

1. **Heuristic classification:** “Vaccine-like” rows use name/SKU/category heuristics when domain metadata is missing; misclassification is possible for ambiguous SKUs.
2. **Clinical stock tables:** Batch number per row is not shown unless the clinical stock API enriches responses; branch **retail** inventory shows nearest expiry when the list endpoint provides it.
3. **Backend dependency:** End-to-end vaccine clinical batches require deployed backend bridge migration and valid **product variant ↔ clinical variant** links; UI cannot fix missing linkage.
4. **Sidebar overlap:** “Inbound transfers” (warehouse queue) and “Incoming shipments” (dispatch list) both appear where permissions allow; both remain valid entry points.

## Next recommended command

After deploying backend migrations to your environment:

```bash
cd D:\BPA_Data\backend-api
npx prisma migrate deploy
```

Then run through the manual QA checklist above on staging.
