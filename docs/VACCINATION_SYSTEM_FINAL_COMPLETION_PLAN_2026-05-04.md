# Vaccination System Final Completion Plan - 2026-05-04

**Document type:** Implementation-readiness audit (read-only analysis).  
**Planning governance:** `D:\BPA_Data\backend-api\docs\WINDSURF_GLOBAL_RULE.md` (analyze → plan → implement; documentation in `/docs`; avoid duplicate planning files—this report extends prior vaccination notes, including `VACCINATION_PHASE_1_STAFF_MAPPING_ACCESS_2026-05-02.md` in this repo and existing plans under `backend-api/docs/`).  
**Related prior doc (this repo):** `docs/VACCINATION_PHASE_1_STAFF_MAPPING_ACCESS_2026-05-02.md` (staff vaccine mapping access—marked complete).

---

## 1. Executive Summary

| Topic | Assessment |
|--------|------------|
| **Overall completion (estimate)** | **~76%** end-to-end for a clinic that needs stock-backed administration, org vaccine mapping, staff workflows, and basic owner visibility. Lower if production requires automatic void reversals, outbound reminders, public certificate verification, or rich reporting. |
| **Production-readiness** | **Conditional:** safe for controlled pilot **only** with documented manual processes for voids (inventory and billing), clear RBAC for billing (`clinic.billing.write`), and acceptance that reminders are queue rows (IN_APP) without proven SMS/Email/WhatsApp delivery from this module. |
| **Biggest risks** | (1) **Void without stock or billing reversal**—inventory and revenue drift. (2) **Billing after failed post-transaction order**—vaccination persisted with stock deducted; order may fail (partial state documented in service). (3) **Legacy `recordVaccination`**—no branch/org/stock linkage. (4) **Frontend build** currently fails on owner vaccination card types (see §17). |
| **Recommended next action** | **Phase 1 (verification):** RBAC matrix for staff vs owner mapping and administer+billing paths; then **Phase 5 planning:** design idempotent stock reversal and billing cancellation/refund policy before any code change (see §14). |

---

## 2. Existing Backend Implementation

| File path | Purpose | Status | Working / incomplete | Change vs preserve |
|-----------|---------|--------|----------------------|-------------------|
| `prisma/schema.prisma` | `VaccineType`, `VaccineInventoryMapping`, `Vaccination`, `VaccinationReminder`, `DewormingRecord`, `ClinicalStockLedger`, enums | **DONE** | Relations and indexes present; nullable org/branch on `Vaccination` supports legacy rows | **Preserve** unless new features (e.g. multi-dose vial) require additive fields—follow migration policy |
| `prisma/migrations/20260302260000_vaccination_certificate_manufacturer/migration.sql` | Certificate / manufacturer columns | **DONE** | Applied path in repo | **Preserve** (do not edit applied migrations) |
| `prisma/migrations/20260501170000_vaccine_inventory_mapping/migration.sql` | Vaccine inventory mapping | **DONE** | Org-level mapping | **Preserve** |
| `prisma/migrations/20260501193000_vaccination_reminder_foundation/migration.sql` | Reminder foundation | **DONE** | Stages, channels, statuses | **Preserve** |
| `prisma/migrations/20260504000000_vaccination_v2_nullable_refs/migration.sql` | Nullable refs on vaccination | **DONE** | Supports gradual backfill | **Preserve** |
| `prisma/seeders/seedVaccineTypes.ts` | Seed vaccine types | **DONE** | Master catalog | **Preserve** unless catalog updates needed |
| `prisma/seeders/seedClinicalVaccineItems.ts`, `prisma/seeders/data/defaultClinicalVaccineItems.ts` | Default clinical vaccine items | **DONE** / **PARTIAL** | Depends on seed runs in env | **Preserve** |
| `scripts/seed-clinic-vaccine-items.ts` | Operational seed script | **DONE** | Dev/onboarding | **Preserve** |
| `src/api/v1/modules/clinic/vaccination.service.ts` | Core vaccination logic: mapping, candidates, administer, record, correct, void, reminders sync, audit helpers, certificate lookup, deworming | **PARTIAL** | Strong: mapping, FEFO-style candidate sorting, administer + ledger, idempotency, audit events, reminder row sync. Gaps: void/correct do not touch stock/billing; reminders only **IN_APP** channel in schedule; `recordVaccination` legacy path | **Change only with care** for void/billing/reminder delivery—high risk to stock integrity |
| `src/api/v1/modules/clinic/clinic.controller.ts` | HTTP handlers for vaccination routes | **DONE** / **PARTIAL** | Enforces `clinic.billing.write` when `createBilling===true` on administer | **Preserve** behavior; extend when reversal APIs exist |
| `src/api/v1/modules/clinic/clinic.routes.ts` | Route wiring + `requireClinicPermission` | **DONE** | Consistent permission gates per endpoint | **Preserve** unless new routes (public verify) |
| `src/api/v1/modules/clinic/billing.service.ts` | `listVaccinationBillingOptions`, `prepareVaccinationBilling`, `createVaccinationBillingOrder` | **PARTIAL** | Creates **Order** via `orderService.createOrder`; returns `invoiceId: null` in returned billing object; notes encode vaccination id | **Extend** for invoice linkage / void—do not break existing order creation |
| `src/api/v1/modules/orders/orders.service.ts` | `createOrder` | **DONE** (generic) | No vaccination-specific invoice side effects in reviewed snippet | **Preserve**—vaccination billing composes on top |
| `src/api/v1/modules/clinic/clinicalStockLedger.service.ts` | `recordClinicalLedgerEntry` | **DONE** | Negative delta updates `BranchItemStock` and batch used/remaining when batchId set | **Preserve**—reversal should compose new ledger entries + rules, not mutate past rows |
| `src/api/v1/modules/owner/owner.controller.ts` | `getMyPetVaccinationCard` | **DONE** | Owner-safe card; excludes `VOIDED`; no certificate token in payload | **Extend** for optional token/QR when product requires |
| `src/api/v1/modules/owner/ownerClinic.controller.ts` | Owner vaccine inventory mapping GET/PUT | **DONE** | Delegates to `vaccinationService` | **Preserve** |
| `src/api/v1/modules/owner/owner.routes.ts` | Owner routes for card + mappings | **DONE** | `clinic.services.manage` on mapping routes | **Preserve** |
| `src/api/v1/modules/clinic/patient.service.ts` | Patient payload includes vaccinations | **DONE** | Read-only inclusion for workspace | **Preserve** |
| `src/api/v1/modules/clinic/returnAudit.service.ts` | Return audit | **N/A** | No vaccination references found | **N/A** |

---

## 3. Existing Frontend Implementation

| File path | Purpose | Reachable | Permission / gate | Incomplete | Change vs preserve |
|-----------|---------|-----------|---------------------|--------------|-------------------|
| `app/staff/(larkon)/branch/[branchId]/clinic/vaccinations/page.jsx` | Staff vaccination **dashboard** (summary, reminders list, patient links) | Yes—sidebar `clinic-vaccinations` | `clinic.patients.read` + `clinic.emr.read` OR variants (see `branchSidebarConfig`) | No deep reporting export | **Preserve** UI patterns |
| `app/staff/(larkon)/branch/[branchId]/clinic/vaccine-mappings/page.jsx` | Staff **vaccine mapping** | Yes—sidebar `clinic-vaccine-mappings` | **`clinic.emr.write`** for sidebar + API PUT | Owner still uses `clinic.services.manage` for owner API | **Preserve**; align messaging with owner if needed |
| `app/staff/(larkon)/branch/[branchId]/clinic/patients/[patientId]/vaccination/page.jsx` | **Patient vaccination workspace** (administer, correct, void, billing tab, audit, deworming, reminders) | Via patient workspace / URLs | `VIEW_PERMS` / `WRITE_PERMS` in page | Certificate shown as raw token; no QR | **Extend** for QR/PDF later |
| `app/owner/(larkon)/clinic/[branchId]/catalog/vaccine-mappings/page.tsx` | Owner vaccine mapping | Owner clinic console tab | Owner API + `clinic.services.manage` | None critical | **Preserve** |
| `app/owner/(larkon)/pets/[id]/vaccination-card/page.tsx` | Owner **vaccination card** | From pet detail links | Owner session | **Print/QR: "Coming soon"**; **build fails** type mismatch (§17) | **Fix** types when implementing print/QR |
| `app/owner/(larkon)/pets/[id]/page.tsx` | Links to vaccination card | Yes | Owner | — | **Preserve** |
| `app/clinic/(larkon)/vaccinations/page.jsx` | Legacy/simple clinic vaccinations UI (`branchId` query) | Parallel path to staff | Staff API functions | Certificate lookup by token (staff API); not primary staff UX | **Preserve** or deprecate later with QA |
| `app/owner/_components/clinic/ClinicConsoleTabs.tsx` | Console tab **Vaccine Mapping** | Yes | Owner clinic | — | **Preserve** |
| `src/lib/branchSidebarConfig.ts` | Staff sidebar clinic entries | Yes | Vaccination: `clinic.patients.read` + any `clinic.emr.*`; Mapping: **`clinic.emr.write` only** | Mapping stricter than read-only EMR | **Policy choice**—document for roles |
| `src/lib/permissionMenu.ts` | Owner menu entries for vaccine mapping | Yes | `clinic.services.manage` for href to catalog | Generic `view=catalog` href | **Verify** deep-link to vaccine-mappings tab |
| `lib/api.ts` | All `staffClinic*` vaccination + `ownerPetVaccinationCardGet` | Used by pages above | — | Large shared file | **Extend** with new endpoints when added |
| `app/owner/_lib/ownerApi.ts` | `ownerClinicVaccineInventoryMappings`, `ownerClinicUpsertVaccineInventoryMapping` | Owner mapping page | — | — | **Preserve** |

---

## 4. Database And Data Model Status

**Models:** `VaccineType`, `VaccineInventoryMapping` (unique per `orgId` + `vaccineTypeId`), `Vaccination` (optional `orgId`, `branchId`, `inventoryBatchId`, `clinicalItemId`, `clinicalItemVariantId`, `stockLedgerId`, `orderId`, `invoiceId`, `certificateToken`, status lifecycle fields), `VaccinationReminder` (stage, channel, status, scheduling, idempotency), `DewormingRecord`, `ClinicalStockLedger`.

**Enums:** `VaccinationRecordStatus` (ACTIVE, CORRECTED, VOIDED), `VaccinationReminderStage`, `VaccinationReminderChannel` (**IN_APP | SMS | EMAIL | WHATSAPP**), `VaccinationReminderStatus`.

**Relationships:** `Vaccination` → `Pet`, `VaccineType`, reminders; mapping ties `Organization` + `VaccineType` → `ClinicalItem` / optional `ClinicalItemVariant`.

**Migrations:** See §2; vaccination-related migrations exist in repo (plus older certificate migration).

**Seed data:** `seedVaccineTypes`, clinical vaccine item seeders—environment-dependent.

**Missing models (product gap, not necessarily DB):** explicit **multi-dose vial** consumption per vaccination (current code deducts **fixed quantity -1** per administration via ledger). Optional future: vial session linkage to medicine-control models if product unifies.

**Schema change required?** **Not strictly required** for: public certificate read API (could use existing `certificateToken` + `VOIDED` status), outbound reminders (enums already allow SMS/EMAIL/WHATSAPP), billing void workflow (application logic + existing Order/Invoice modules). **Likely required** for: first-class **multi-dose vial** accounting per vaccination, or **immutable reversal linkage** rows if compliance demands separate audit tables.

---

## 5. Vaccine Stock Flow Status

Flow: **ClinicalItem → ClinicalItemVariant → BranchItemBatch → BranchItemStock → VaccineInventoryMapping → Vaccination administration → ClinicalStockLedger → Pet vaccination history**

| Step | Status | Existing files / surfaces | Problems | Fix direction |
|------|--------|---------------------------|----------|----------------|
| ClinicalItem / Variant | **DONE** | Prisma models; clinic catalog | Mapping requires MEDICINE + inventory + vaccine-like heuristics | Data QA on item naming |
| BranchItemBatch / Stock | **DONE** | `clinicalStockLedger.service.ts`, inventory module | Void does not restore qty | Reversal ledger entries on void (Phase 5) |
| VaccineInventoryMapping | **DONE** | `vaccination.service.ts` `upsertVaccineInventoryMapping`, owner + staff APIs | Org-level only (by design) | Document org vs branch expectations |
| Administration (batch pick) | **DONE** | `administerVaccinationWithBatch` | Always **-1** unit | Multi-dose product design |
| ClinicalStockLedger deduction | **DONE** | `VACCINATION_ADMINISTRATION`, `refType`/`refId` | No compensating entry on void | Phase 5 |
| Pet vaccination history | **DONE** | `Vaccination` rows; `listByPet`; owner card | Legacy `recordVaccination` without branch/stock | Migrate/discourage legacy |

**Summary:** Operational path is **DONE** for single-dose deduction. **BLOCKED** for automated integrity on void until reversal design is implemented (logic gap, not DB gap).

---

## 6. Vaccine Mapping Status

- **Owner mapping:** `app/owner/(larkon)/clinic/[branchId]/catalog/vaccine-mappings/page.tsx` + `ownerApi` + `GET/PUT /api/v1/owner/clinic/branches/:branchId/vaccine-inventory-mappings` (`clinic.services.manage`, branch-scoped owner permission).
- **Staff mapping:** `app/staff/.../clinic/vaccine-mappings/page.jsx` + clinic routes with **`clinic.emr.write`** for PUT; GET allows broader read set (`clinic.patients.read`, `clinic.emr.read`, `clinic.emr.write`).
- **API:** Shared `vaccinationService.getBranchVaccineInventoryMappings` / `upsertVaccineInventoryMapping`.
- **Permission:** Staff mapping barrier was addressed per `docs/VACCINATION_PHASE_1_STAFF_MAPPING_ACCESS_2026-05-02.md` (**emr.write**). Owner still uses **`clinic.services.manage`**—intentional split: catalog managers vs clinical writers.
- **Enough for go-live?** Yes for org-level “which SKU represents this vaccine type.” **Improvement:** branch-specific overrides only if product requires different stock per branch for same org type.

---

## 7. Vaccination Administration Workflow

| Step | Status | Notes |
|------|--------|-------|
| Patient/pet selection | **DONE** | Staff patient workspace + branch visibility rules in service |
| Vaccine selection | **DONE** | `listVaccineTypes` |
| Batch selection | **DONE** | `getBranchVaccineStockCandidates` with explicit mapping or fallback heuristics |
| Dose date | **DONE** | `administeredAt` |
| Next due date | **DONE** | From body or `defaultIntervalDays` |
| Doctor/staff tracking | **PARTIAL** | Populated from `branchMember` + `clinicStaffProfile.staffType` for doctor vs staff ids |
| Stock deduction | **DONE** | Transactional ledger + batch decrement |
| Billing creation | **PARTIAL** | Optional; requires `clinic.billing.write` + vaccination **service** `category: VACCINATION` on branch; order created; invoice id not set in returned payload |
| History creation | **DONE** | `Vaccination` create |
| Certificate token | **PARTIAL** | Generated on create; staff certificate endpoint branch-scoped; **no public verify** |
| Reminder creation | **PARTIAL** | Rows upserted with **IN_APP** only; **no observed job** marking `SENT` for vaccination reminders in `src` grep scope |

---

## 8. Void, Correction, Reversal And Audit

| Area | Status | Evidence |
|------|--------|----------|
| Correction workflow | **PARTIAL** | Metadata-only (`administeredAt`, `nextDueDate`, notes, manufacturer, batchNumber); **no batch/stock change**; status → CORRECTED |
| Void workflow | **PARTIAL** | Status → VOIDED, reason, audit event, reminders cancelled/synced |
| Stock reversal | **MISSING** | `voidVaccinationRecord` does not call ledger or batch reversal |
| Billing reversal | **MISSING** | No order cancel/refund on void |
| Audit trail | **DONE** | `writeVaccinationAuditEvent` + `getVaccinationAudit` reads `auditEvent` |
| Financial/inventory risk | **HIGH** | Void after billing leaves charged services; void after stock leaves physical stock misaligned |
| Safest strategy | **Plan-first** | (1) Define compensating **ledger +1** with ref to original entry and void reason. (2) Define billing policy: cancel order if unpaid; credit note / refund if paid—coordinate with orders module. (3) Idempotency on void reversal. (4) Never mutate historical ledger rows. |

---

## 9. Certificate And QR Verification

| Topic | Status |
|--------|--------|
| `certificateToken` | **DONE** on `Vaccination` (unique) |
| Staff certificate fetch | **DONE** | `GET .../vaccinations/certificate/:token` + `getByCertificateToken` |
| Owner card display | **PARTIAL** | History fields; **no token** in owner payload; UI **“Print and QR — Coming soon”** |
| QR | **MISSING** on owner card; staff workspace shows token text only |
| Public verification | **MISSING** | No unauthenticated `/public/.../vaccination/verify` style route identified |
| Print/export | **MISSING** | Owner card explicit placeholder |

**Recommendation:** Add read-only **public** endpoint returning non-sensitive fields + void flag, rate-limited; add QR payload URL in staff/owner UIs using existing token; PDF generation optional second step.

---

## 10. Reminder And Notification System

| Topic | Status |
|--------|--------|
| Reminder creation | **DONE** | `syncRemindersForVaccination` after create/correct/void |
| Stages | **DONE** | Seven days before, three days before, due, overdue |
| Channels | **PARTIAL in code** | Enum supports SMS/EMAIL/WHATSAPP; **schedule hardcodes `IN_APP` only** |
| Status | **DONE** in schema | PENDING, SENT, SKIPPED, FAILED, CANCELLED |
| Delivery | **MISSING / UNVERIFIED** | No `VaccinationReminder` processor found in quick `src` search; **`SENT`** transition not evidenced for this feature |
| Gap | Connect to existing `notificationWorker` / queue patterns with explicit vaccination template keys |

---

## 11. Reporting And Dashboard Gap

**Present:** `getBranchVaccinationDashboard` exposes counts (today due, upcoming 30d, overdue, administered today, recent records list)—consumed by staff dashboard page.

**Missing / common enterprise asks:** exportable **due/overdue** lists, **branch-wide** administration logs, **vaccine stock usage** tied to vaccinations, **per-staff** administration stats, **compliance** % by pet/owner. These require new queries/reports and UI (not present as first-class report pages).

---

## 12. What Existing Logic Should NOT Be Changed

- **`recordClinicalLedgerEntry` immutability pattern**—do not edit past ledger rows; add compensating transactions.
- **Idempotency behavior** in `administerVaccinationWithBatch` (branch + `idempotencyKey`)—critical for safe retries.
- **`getBranchVaccineStockCandidates` explicit-mapping precedence**—stable enterprise behavior; only extend, do not regress fallback ranking without migration plan.
- **RBAC route matrix in `clinic.routes.ts`**—changing permission keys breaks deployed roles; additive permissions preferred.
- **Owner vaccination card privacy choices** (hiding billing/stock internals)—preserve unless owner explicitly opts in to more detail.
- **Applied SQL migrations**—never edit in place per project policy.

---

## 13. What Existing Logic Should Be Changed

### P0 — Must fix (product / integrity)

| Problem | Impact | Recommended fix | Affected files | Risk |
|---------|--------|-----------------|----------------|------|
| Void without stock reversal | Inventory understated vs reality | Compensating ledger + batch restore in transactional void | `vaccination.service.ts`, possibly `clinicalStockLedger.service.ts` | **High**—must be transactional and idempotent |
| Void without billing handling | Revenue / customer balance wrong | Policy-based cancel/refund/credit linked to `orderId`/`invoiceId` | `vaccination.service.ts`, `billing.service.ts`, orders | **High** |
| Owner vaccination card **TypeScript build error** | Owner build blocked | Align `OwnerVaccinationCardPet` with `formatPetTaxonomyLine` | `lib/api.ts` types and/or `vaccination-card/page.tsx` | **Low** |

### P1 — Important

| Problem | Impact | Recommended fix | Affected files | Risk |
|---------|--------|-----------------|---------------|------|
| Billing success returns `invoiceId: null` | Downstream invoice UX may expect id | Populate when clinic invoice created or document single-step flow | `billing.service.ts`, orders pipeline | Medium |
| Reminder channels unused | No real-world reminder delivery | Worker + templates for SMS/Email/WhatsApp | New job module + `vaccination.service.ts` schedule | Medium |
| Public certificate verification missing | Fraudulent paper certs | Public read API + void invalidation | New route + thin service | Medium |

### P2 — Improvement

| Problem | Impact | Recommended fix | Affected files | Risk |
|---------|--------|-----------------|---------------|------|
| Legacy `recordVaccination` | Data heterogeneity | Deprecation banner + migrate data | Service + UI | Low–medium |
| Multi-dose vials | Incorrect consumption | Product model + partial qty | Schema + service | Medium |

---

## 14. Final Implementation Roadmap

### Phase 1: Access / navigation / permission verification

- **Goal:** Confirm roles for staff mapping (`emr.write`), owner mapping (`services.manage`), billing (`billing.write`), certificate (`patients.read` on cert route).
- **Files:** `branchSidebarConfig.ts`, `clinic.routes.ts`, `owner.routes.ts`, `seedRolesPermissions.ts`, QA scripts.
- **Backend:** Permission audit only.
- **Frontend:** Click-through all clinic URLs as test users.
- **Validation:** Manual RBAC matrix doc.
- **Risk:** Low.

### Phase 2: Vaccine mapping completion and validation

- **Goal:** Every active vaccine type used in branch mapped or explicitly accepted as fallback.
- **Files:** Staff + owner mapping pages, `vaccination.service.ts` mapping validators.
- **Backend:** Optional stricter warnings on administer when `usesFallback`.
- **Frontend:** Surface mapping status before administer.
- **Validation:** Org with multiple vaccine SKUs.
- **Risk:** Low.

### Phase 3: End-to-end stock flow testing

- **Goal:** Receive → batch → administer → ledger row → void (document current gap) → inventory counts.
- **Files:** `vaccination.service.ts`, `clinicalStockLedger.service.ts`, inventory UI.
- **Backend:** Jest or scripted integration tests (none dedicated today).
- **Frontend:** Staff patient vaccination flow.
- **Validation:** `npm run test` subset when tests added.
- **Risk:** Medium.

### Phase 4: Vaccination administration workflow hardening

- **Goal:** Billing optional path, idempotency replay, error messages when billing fails after stock.
- **Files:** `clinic.controller.ts`, `vaccination.service.ts`, patient workspace page.
- **Backend:** Improve transactional boundary or compensation flags (design).
- **Frontend:** Clear UI when billing partial failure.
- **Risk:** Medium.

### Phase 5: Void stock reversal and billing cancellation safety

- **Goal:** Atomic void with compensating stock and defined billing outcome.
- **Files:** `vaccination.service.ts`, `billing.service.ts`, orders.
- **Backend:** Primary implementation.
- **Frontend:** Confirm dialogs, show reversal ids in audit.
- **Validation:** Staging financial + inventory reconciliation.
- **Risk:** **High**.

### Phase 6: QR certificate and public verification

- **Goal:** QR on owner card + optional public verify.
- **Files:** Owner card page, new API route, `lib/api.ts`.
- **Backend:** Public read controller (rate limit).
- **Frontend:** `qrcode.react` already in dependencies.
- **Validation:** Security review for PII leakage.
- **Risk:** Medium.

### Phase 7: Reminder delivery

- **Goal:** Transition PENDING → SENT/FAILED; multi-channel.
- **Files:** Worker, `vaccination.service.ts` (`buildReminderScheduleForVaccination`).
- **Backend:** Channel rows or channel expansion.
- **Frontend:** Staff reminders dashboard already lists rows—wire status updates.
- **Validation:** Send test SMS/email in sandbox.
- **Risk:** Medium.

### Phase 8: Reports and analytics

- **Goal:** Due/overdue/administration exports.
- **Files:** New report endpoints + UI pages.
- **Backend:** Aggregated queries.
- **Frontend:** Tables + CSV.
- **Risk:** Low.

---

## 15. Exact Next Commands

Safe, modular commands (planning vs implementation separated; **no destructive DB**).

1. **Backend stock/billing reversal planning**  
   `cd D:\BPA_Data\backend-api; npx ts-node -e "console.log('Read docs/VACCINATION_CORRECTION_VOID_REVERSAL_AUDIT_PLAN_2026-05-01.md + vaccination.service voidVaccinationRecord; draft reversal state machine before code.')"`

2. **Backend stock/billing reversal implementation** (after design sign-off)  
   `cd D:\BPA_Data\backend-api; git checkout -b feature/vaccination-void-reversal; npm run typecheck`

3. **Frontend certificate/QR/reporting planning**  
   `cd D:\BPA_Data\bpa_web; npx eslint app/owner/(larkon)/pets/[id]/vaccination-card/page.tsx app/staff/(larkon)/branch/[branchId]/clinic/patients/[patientId]/vaccination/page.jsx --max-warnings 0`

4. **Frontend certificate/QR/reporting implementation** (isolated branch)  
   `cd D:\BPA_Data\bpa_web; git checkout -b feature/vaccination-owner-qr-card; npm run build`

---

## 16. Manual QA Checklist

- [ ] **Vaccine mapping:** Staff with `clinic.emr.write` opens mapping page; owner with `clinic.services.manage` opens owner mapping; save mapping and verify GET reflects `MAPPED`.
- [ ] **Stock candidates:** Unmapped type shows fallback or `UNMAPPED` message; mapped type filters to mapped item/variant.
- [ ] **Administration:** Select batch, administer, verify `stockLedgerId` and batch `remainingQty` decrement.
- [ ] **Stock deduction:** Concurrent administer blocked appropriately; ledger `txnType` = `VACCINATION_ADMINISTRATION`.
- [ ] **Pet history:** List shows new row; owner card shows same (non-voided).
- [ ] **Correction:** Change `nextDueDate`; verify reminder rows rescheduled.
- [ ] **Void:** Status VOIDED; verify **stock not** auto-restored (current behavior) and document manual adjustment if needed until Phase 5.
- [ ] **Billing:** With `clinic.billing.write`, `createBilling: true`, order appears; void and verify billing **not** auto-cancelled (current).
- [ ] **Certificate:** Staff fetches certificate by token for valid row.
- [ ] **Reminder:** Rows exist in PENDING for future `scheduledFor`; verify no SMS sent unless worker implemented.
- [ ] **Reports:** Dashboard counts match spot-check queries.

---

## 17. Validation Result

| Command | Project | Result | Notes |
|---------|---------|--------|-------|
| `npm run lint` | `backend-api` | **N/A** | No `lint` script in `package.json`. |
| `npm run typecheck` | `backend-api` | **PASS** (exit 0) | Completed in ~93s. |
| `npm run build` | `backend-api` | **PASS** (exit 0) | `tsc` + prisma generate succeeded (~325s). |
| `npm run lint` | `bpa_web` | **FAIL** (exit 1) | Large number of pre-existing issues across `src/components/child/*`, `AppointmentDetailDrawer.jsx`, parsing errors in `AnimalColorSelect.tsx` / `AnimalSizeSelect.tsx`, etc. **Not vaccination-specific.** |
| `npm run typecheck` | `bpa_web` | **N/A** | No `typecheck` script in `package.json`. |
| `npm run build` | `bpa_web` | **FAIL** | **Vaccination-related:** `app/owner/(larkon)/pets/[id]/vaccination-card/page.tsx` — `OwnerVaccinationCardPet` incompatible with `formatPetTaxonomyLine` (`animalType.name` `null` vs `undefined`). |

---

**Updated document path:** `D:\BPA_Data\bpa_web\docs\VACCINATION_SYSTEM_FINAL_COMPLETION_PLAN_2026-05-04.md`
