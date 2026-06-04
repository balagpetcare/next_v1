# Vaccine Warehouse To Branch Distribution Completion Plan - 2026-05-04

Planning-only audit for BPA/WPA. Source analysis: `D:\BPA_Data\backend-api`, `D:\BPA_Data\bpa_web`.  
Governance: follows `D:\BPA_Data\backend-api\docs\WINDSURF_GLOBAL_RULE.md` (plan-first, docs under `/docs`, single source of truth).

---

## 1. Executive Summary

### Overall completion percentage

**~50%** for the *full* target chain (owner purchase → central warehouse → lot → stock request → dispatch → branch receive → **clinical batches** → mapping → stock-backed vaccination).

- **~85–90%** for the **downstream** path already described in vaccination reports: `VaccineInventoryMapping` → stock candidates (`BranchItemBatch`) → `administerVaccinationWithBatch` → `ClinicalStockLedger` → pet vaccination history.
- **~40–55%** for the **upstream** vaccine-specific supply chain, because enterprise **product** receive/transfer is mature, but it posts **retail/warehouse inventory** (`ProductVariant` + `InventoryLot` + `StockDispatch`), while stock-backed vaccination consumes **clinical inventory** (`ClinicalItem` / `ClinicalItemVariant` + `BranchItemBatch`). There is **no implemented bridge** from GRN/dispatch receive into `BranchItemBatch`. The parallel **clinical** transfer path updates aggregate `BranchItemStock` via ledger but **does not create `BranchItemBatch` rows**, which the vaccination UI/API requires for batch-level administration.

### What is already complete

- Schema and services for `ClinicalItem`, `ClinicalItemVariant`, `BranchItemStock`, `BranchItemBatch`, `ClinicalStockLedger`, `VaccineInventoryMapping`, `Vaccination`.
- Stock-backed vaccination: `administerVaccinationWithBatch` in `vaccination.service.ts` validates branch batch, writes ledger with batch deduction, links vaccination to batch.
- Vaccine stock candidates API: `getBranchVaccineStockCandidates` queries **`branch_item_batches`** (not just aggregate stock).
- Owner and staff **manual** clinical receive with batch/expiry: `POST .../item-stock/receive` → `createBranchItemBatch` when batch metadata supplied.
- Owner API for central warehouse **location** resolution: `GET/POST /api/v1/owner/central-warehouse` (warehouse branch holds `InventoryLocation` with type `CENTRAL_WAREHOUSE`).
- Enterprise **product** flow: PO → GRN → warehouse lots → stock requests → allocation/pick → `StockDispatch` with statuses `CREATED` → … → `DELIVERED`, plus controlled receive sessions.
- Parallel **clinical** supply workflow: clinical supply request → `ClinicalStockTransfer` (`CREATED` → `IN_TRANSIT` → `RECEIVED`) with ledger `TRANSFER_OUT` / `TRANSFER_IN` on **clinical** stock — **without batch granularity**.

### What is partial

- **Purchasing/receiving vaccines “as products”** at the central warehouse works for **SKU/product** inventory; it does **not** automatically materialize **clinical lots** usable by the vaccination module.
- **Clinical stock transfer** moves quantities between branches at ledger level; destination may show **aggregate** `BranchItemStock` but **still no batches**, so **stock-candidates for vaccination often stay empty** unless someone uses manual clinical receive.
- **Dispatch receive** updates branch **product** location stock; **no** `BranchItemBatch` creation.

### What is missing

- A **single coherent path** that creates or synchronizes **`BranchItemBatch`** (batch number, expiry, manufacturer, quantity) from either:
  - warehouse **GRN lines** / **stock lots**, or
  - **clinical transfer receive** (with per-line batch/expiry capture), or
  - an explicit **mapping** from `ProductVariant` + `InventoryLot` → `ClinicalItemVariant` + `BranchItemBatch`.
- **Vaccine-specific** labeling/filters in warehouse UIs (optional but needed for operations clarity).
- Optional: **cold-chain / expiry** warnings in transfer/dispatch UIs for vaccine SKUs (not enforced in current audit scope).

### Biggest blockers

1. **Dual inventory models** without synchronization: product (`StockLot` / ledger per `InventoryLocation`) vs clinical (`BranchItemBatch` / `ClinicalStockLedger`).
2. **`ClinicalStockTransfer.receiveTransfer`** never calls `createBranchItemBatch`; ledger entries omit `batchId`, so **batch-level vaccination cannot use transfer-received stock** unless batches are added separately.
3. **Stock dispatch** (`dispatches.service.ts`) is **product-variant-centric**; no clinical posting.

### Recommended implementation strategy

Prefer **reuse + thin integration layer** over rewriting dispatch/GRN:

1. **Decide canonical source of truth** for vaccine vials at branch: either (A) clinical-only receive/transfers, or (B) product lots + **sync job / receive hook** that creates `BranchItemBatch` from accepted GRN/dispatch lines when a `ProductVariant` ↔ `ClinicalItemVariant` mapping exists.
2. **Short term**: document operational workaround — manual **clinical receive** at branch (or at hub branch) with batch/expiry after physical goods arrive (duplicates data entry).
3. **Medium term**: extend **clinical transfer receive** (or add confirmation step) to **allocate received qty into `BranchItemBatch`** (one or more batches per line).
4. **Long term**: optional **unified mapping table** (org-level) linking `ProductVariant` to `ClinicalItemVariant` for automated reconciliation.

---

## 2. Existing Product/Inventory Flow

**Purchase / Receive → Warehouse stock → Batch/lot → Transfer → Branch receive → Branch stock**

| Stage | Mechanism | Key backend | Key UI (owner/staff) |
|-------|-----------|-------------|----------------------|
| Purchase | Purchase orders, vendors | PO / procurement modules (see `purchase-orders`, `grn`) | `app/owner/(larkon)/inventory/purchase-orders/`, receipts |
| Warehouse receive | GRN posts to **product** inventory / lots | `grn.service.ts`, inventory ledger | `app/owner/(larkon)/inventory/receipts/page.tsx`, staff `warehouse/receive-po`, `vendor-receipts` |
| Lot / batch (product) | `StockLot` tied to `ProductVariant`, locations | `inventory` / `ledger.service.ts` | Warehouse batches, barcode labels under inventory |
| Transfer request | Stock requests, allocation, pick lists | `stock_requests`, `allocation_plans`, `fulfillment` | Owner `stock-requests`, staff stock request pages |
| Dispatch | `StockDispatch` + items (`ProductVariant`, lot) | `dispatches.service.ts` — `TRANSFER_OUT` / receive → `TRANSFER_IN`, GRN at receive | Staff `inventory/incoming`, `receive-dispatch`, dispatch print |
| Branch receive (product) | Controlled receive session → ledger | `receiveDispatch`, `DispatchReceiveSession` | Staff receive workspace (`receive/page.jsx` pipeline) |
| Branch stock (product) | Quantity at `InventoryLocation` (e.g. `BRANCH_STORE`, `CLINIC_STORE`) | `ledger.service.ts` | Branch inventory overview |

**APIs / routes (representative):** `/api/v1/grn`, `/api/v1/stock-requests`, `/api/v1/dispatches`, inventory ledger endpoints under `inventory.routes.ts`.

---

## 3. Existing Vaccine Flow

**ClinicalItem → ClinicalItemVariant → BranchItemBatch → BranchItemStock → VaccineInventoryMapping → Vaccination → Stock deduction → Pet history**

| Stage | Mechanism | Key backend | Key UI |
|-------|-----------|-------------|--------|
| Catalog | `ClinicalItem` (`domainType`, e.g. `MEDICINE`), variants | `clinic` modules, seed/catalog | Owner `clinic/.../catalog`, vaccine mappings page |
| Mapping | `VaccineInventoryMapping` (org + `vaccineTypeId` → clinical item/variant) | `vaccination.service.ts` `upsertVaccineInventoryMapping`, `getBranchVaccineInventoryMappings` | Owner `.../catalog/vaccine-mappings`, staff `clinic/vaccine-mappings` |
| Branch stock / batches | `BranchItemStock`, `BranchItemBatch` | `clinicalItemStock.service.ts` | Owner `clinic/[branchId]/inventory` (Receive modal), staff `item-stock/receive` |
| Candidates for UI | `branchItemBatch.findMany` with vaccine-like filters | `getBranchVaccineStockCandidates`, route `GET .../vaccinations/stock-candidates` | Staff patient vaccination workspace |
| Administer (stock-backed) | `administerVaccinationWithBatch` | `vaccination.service.ts`; ledger `VACCINATION_ADMINISTRATION` | `.../patients/[patientId]/vaccination` |
| Ledger | `ClinicalStockLedger`; batch `usedQty` / `remainingQty` when `batchId` set | `clinicalStockLedger.service.ts` | Owner/staff ledger views under clinic item-stock |

---

## 4. Gap Between Product Flow And Vaccine Flow

| Topic | Product flow | Vaccine / clinical flow | Gap |
|-------|--------------|-------------------------|-----|
| SKU model | `ProductVariant` | `ClinicalItem` + `ClinicalItemVariant` | No first-class link in schema between the two for sync. |
| Lots | `StockLot` at inventory location | `BranchItemBatch` at branch | Receive paths are different; dispatch does not create clinical batches. |
| Transfer | `StockDispatch` + inventory ledger | `ClinicalStockTransfer` + clinical ledger | Parallel systems; clinical transfer **does not** create batches. |
| Branch receive | Posts **product** stock | Manual clinical receive creates **batches** | Enterprise dispatch receive **does not** feed vaccination batches. |
| Vaccination consumption | N/A | Requires **batch row** for stock-backed path | Aggregate-only stock from transfers is **insufficient** for `administerVaccinationWithBatch`. |

**Conclusion:** Reusing the **product** transfer UI alone does **not** complete the vaccine flow; you must either add **batch creation** on the clinical path or **bridge** product lots into `BranchItemBatch`.

---

## 5. Backend Current State

| File path | Purpose | Status | Reuse vs change | Risk |
|-----------|---------|--------|-----------------|------|
| `prisma/schema.prisma` (`VaccineInventoryMapping`, `BranchItemBatch`, `ClinicalStockLedger`, `StockDispatch`, `InventoryLocation`, etc.) | Data model | Complete for parallel tracks | Extend only with migrations if linking product↔clinical | **High** if schema wrong |
| `src/api/v1/modules/clinic/vaccination.service.ts` | Mapping, candidates, administer with batch, reminders | **Downstream complete** | Preserve behavior; optional APIs for sync | **High** — production vaccination |
| `src/api/v1/modules/clinic/clinicalItemStock.service.ts` | `createBranchItemBatch`, adjust stock | **Only batch factory** today | Extend cautiously; single source for batch creation | **High** |
| `src/api/v1/modules/clinic/clinicalStockLedger.service.ts` | Ledger + stock (+ batch decrement if `batchId`) | Stable | Do not break invariants | **High** |
| `src/api/v1/modules/clinic/clinicalStockTransfer.service.ts` | Clinical transfers branch→branch | **Partial** — no batches | **Needs change** for batch-aware receive | Med |
| `src/api/v1/modules/clinic/clinicalSupplyRequest.service.ts` | CSR workflow | Operational for requests | Tie to improved transfer/receive | Med |
| `src/api/v1/modules/clinic/clinic.controller.ts` / `clinic.routes.ts` | Staff/clinic HTTP API including `item-stock/receive`, vaccinations | Complete for manual path | Add endpoints if bridging | Med |
| `src/api/v1/modules/owner/ownerClinic.controller.ts` / `owner.routes.ts` | Owner clinical stock receive, transfers, supply | Complete for manual path | Same | Med |
| `src/api/v1/modules/dispatches/dispatches.service.ts` | Enterprise dispatch + receive | **Product only** | Do **not** rewrite; optional adapter elsewhere | **High** |
| `src/api/v1/modules/grn/grn.service.ts` | GRN posting | **Product** inventory | Optional hook OUTSIDE core posting | **High** if touched carelessly |
| `src/api/v1/modules/inventory/ledger.service.ts` | Product ledger | Core commerce | Do not change for vaccines | **High** |
| `src/api/v1/modules/owner/owner.controller.ts` | `central-warehouse` helpers | Resolves `CENTRAL_WAREHOUSE` locations | Reuse as-is | Low |

---

## 6. Frontend Current State

| File path | Purpose | Status | Reachable | Reuse vs change |
|-----------|---------|--------|-----------|-----------------|
| `app/owner/(larkon)/clinic/[branchId]/inventory/page.tsx` | Clinical receive/adjust; batch fields | **Manual clinical receive** | Owner menu via clinic branch | Reuse patterns for batch capture |
| `app/owner/(larkon)/clinic/[branchId]/catalog/vaccine-mappings/page.tsx` | Map vaccine types to clinical items | Implemented | Owner | Reuse |
| `app/owner/(larkon)/clinic/supply-requests/page.tsx` | CSR owner queue | Implemented | Owner clinic nav | Extend when backend gains batch transfer |
| `app/owner/(larkon)/inventory/receipts/page.tsx` | GRN list (product) | **Product** receive | Owner inventory | Do not conflate with clinical batches without UX clarity |
| `app/staff/(larkon)/branch/[branchId]/clinic/vaccinations/page.jsx` | Vaccination hub | Links to patient vaccination, owner mappings | Staff | Reuse |
| `app/staff/(larkon)/branch/[branchId]/clinic/patients/[patientId]/vaccination/page.jsx` | Stock-backed administer UI | Depends on batch candidates API | Staff | Reuse |
| `app/staff/(larkon)/branch/[branchId]/clinic/vaccine-mappings/page.jsx` | Staff mapping UI | Implemented | Staff | Reuse |
| `app/staff/(larkon)/branch/[branchId]/inventory/incoming`, `receive`, `receive-dispatch` | **Product** dispatch receive | Does **not** create clinical batches | Staff | Add separate workflow or banner explaining clinical receive |
| `app/staff/.../warehouse/receive-po` | Vendor GRN | Warehouse product receive | Staff warehouse | Same |
| `app/owner/_lib/ownerApi.ts` | `ownerClinicItemStockReceive`, vaccine mapping helpers | Wired | — | Extend when new APIs exist |

**Sidebar/menus:** Owner clinic inventory and vaccine mappings exist; staff vaccination and vaccine mappings exist. **Enterprise inventory** menus cover **product** dispatch receive — not automatic vaccine clinical batches.

---

## 7. Required Data Flow Design

Target: **Owner/Admin purchase → Warehouse receive → Vaccine batch/lot → Branch transfer request → Warehouse dispatch → Branch receive → Branch stock update → Vaccine mapping → Vaccination administer → Stock deduction**

| Step | Existing support | Required API | Required UI | Permission | Validation |
|------|------------------|--------------|-------------|------------|------------|
| Owner purchase | PO / vendor flows | Same | Same | `purchase.*` / owner inventory | Vendor, branch, variant |
| Warehouse receive (product) | GRN | Same | GRN pages | `purchase.receive`, `grn.post` | Lot/expiry at product level |
| Vaccine batch/lot (clinical) | `createBranchItemBatch` **manual** | **New:** batch create from GRN line OR mapping sync OR clinical transfer line detail | Receive wizard: show clinical target item | Owner `clinic.services.manage` or scoped clinical perm | Expiry, batch number, qty > 0 |
| Transfer request | Stock request (product) **or** CSR (clinical) | Already: stock-requests; clinical CSR + transfer | Both UIs exist | Role-specific | Match org/branch |
| Warehouse dispatch | `StockDispatch` | Existing | Owner/staff dispatch | Warehouse/dispatch perms | Status transitions |
| Branch receive (product) | Controlled dispatch receive | Existing | Receive workspace | `inventory.receive` | Session verify/submit/confirm |
| Branch clinical stock update | Manual receive; clinical transfer | **Gap-fill API** for batches | Clinical receive at branch | `clinic.cases.write` + stock perms | Same as batch rules |
| Vaccine mapping | CRUD mapping APIs | Existing | Owner + staff pages | Owner manage / staff write | Vaccine-like clinical item |
| Vaccination administer | `administerVaccinationWithBatch` | Existing | Patient vaccination | Clinic write | Batch belongs to branch, not expired |
| Stock deduction | Ledger + batch | Existing | N/A | — | Non-negative remaining |

---

## 8. Permissions And Roles

| Capability | Suggested permission keys (as observed / inferred) | Notes |
|------------|-----------------------------------------------------|------|
| Owner/admin purchase | Owner inventory / procurement permissions | Existing PO flows |
| Warehouse receive / GRN | `purchase.receive`, `grn.post`, `grn.create` | Staff warehouse pages gate these |
| Transfer create (product) | Stock request + fulfillment permissions | Enterprise queue |
| Dispatch | Warehouse dispatch / pick permissions | Status drives receive |
| Branch receive (product) | `inventory.receive` | Receive workspace |
| Clinical receive / batch | Owner `clinic.services.manage` (branch); staff `clinic.cases.write` for branch clinic routes | Matches `owner.routes` / `clinic.routes` patterns |
| Vaccine mapping | Owner clinic manage; staff clinic write for mappings | Align with `requireClinicPermission` |
| Vaccination administer | Branch member with clinic access; stock-backed requires valid batch | Enforced in service |

*Exact permission strings should be taken from `branchRoleMatrix` / seed when implementing.*

---

## 9. Implementation Roadmap

### Phase 1: Reuse existing product receive/transfer flow for vaccine items

- Document that vaccines purchased as **SKUs** land in **warehouse product** stock only.
- Introduce **operational SOP**: perform **clinical receive** (same clinical item/variant) at hub or branch with batch data **after** physical receipt if no automation yet.

### Phase 2: Add vaccine-specific filters/labels/status

- Tag or filter `ProductVariant`/categories as vaccine SKUs in UI.
- Optional: surface links from GRN lines to “create clinical batch” when mapping exists.

### Phase 3: Add branch receive validation

- On clinical receive: enforce `requiresBatch` / `requiresExpiry` from `ClinicalItem` where configured.
- On clinical transfer receive: optional forced batch allocation UI before `RECEIVED`.

### Phase 4: Connect received vaccine batches to vaccine mapping candidates

- Ensure **every** path that increases branch vaccine quantity **creates or updates `BranchItemBatch`** when batch tracking is required.
- **Must fix:** `ClinicalStockTransfer.receiveTransfer` currently **omits** `batchId` — extend model/service to support batch splits **or** open separate “receive into batch” screen tied to transfer line.

### Phase 5: Add QA/reporting

- Reports: vaccination count vs batch consumption reconciliation per branch.
- Audit exports from `ClinicalStockLedger`.

### Phase 6: Add cold-chain/expiry warning if needed

- Optional banners on dispatch/clinical transfer for mapped cold-chain items.

---

## 10. Exact Implementation Commands

When implementation is approved (not part of this planning task):

1. **Backend:** `cd D:\BPA_Data\backend-api` → implement services/routes → `npm run typecheck` → `npm run build` → targeted `npm run test:flow` or module tests as applicable.
2. **Frontend:** `cd D:\BPA_Data\bpa_web` → wire UI → `npm run build`.
3. **QA / finalization:** manual checklist (section 11) on staging; run `node scripts/check-migration-integrity.js` after DB migrations per project policy.

---

## 11. Manual QA Checklist

- [ ] Owner receives **product** vaccine SKU into central warehouse (GRN) — confirm **product** lot qty.
- [ ] **Either** manual clinical receive **or** new integration creates **`BranchItemBatch`** at target branch with batch/expiry.
- [ ] Transfer: verify **product** dispatch **or** clinical transfer reflects movement (depending on chosen path).
- [ ] Branch receives shipment (dispatch session **or** clinical transfer receipt).
- [ ] **`branch_item_batches`** shows rows with `remainingQty` > 0; **`branch_item_stocks`** reflects qty.
- [ ] Vaccine mapping active for org (`VaccineInventoryMapping`).
- [ ] Staff opens patient vaccination workspace — **stock candidates** list non-empty.
- [ ] Administer vaccine (stock-backed) — **`clinical_stock_ledger`** entry `VACCINATION_ADMINISTRATION`; batch `remainingQty` decrements.
- [ ] Pet vaccination history shows new record; billing hooks behave as configured.

---

## 12. Validation Results

Commands run (safe validation only):

**Backend** (`D:\BPA_Data\backend-api`):

- `npm run typecheck` — **PASS** (exit code 0)
- `npm run build` — **PASS** (exit code 0)

**Frontend** (`D:\BPA_Data\bpa_web`):

- `npm run build` — **PASS** (exit code 0)

No lint sweep was requested; unrelated lint debt not analyzed.

---

## Document control

**Updated:** `D:\BPA_Data\bpa_web\docs\VACCINE_WAREHOUSE_BRANCH_DISTRIBUTION_COMPLETION_PLAN_2026-05-04.md`

Related docs to consult before implementation (reuse policy): search `D:\BPA_Data\backend-api\docs` for vaccination inventory / delivery system audits as needed.
