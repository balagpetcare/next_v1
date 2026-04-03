# Enterprise Clinic Visits Module — Canonical spec (implemented)

Staff hub: `/staff/branch/:branchId/clinic/visits` (list) and `/visits/:visitId` (detail). This document is **implementation-true**; deeper narratives live in linked notes.

**Related docs**

- Production hardening (historical fix list + QA checklist): [CLINIC_VISITS_PRODUCTION_HARDENING_PASS.md](./CLINIC_VISITS_PRODUCTION_HARDENING_PASS.md)
- QA bug hunt (dates, drawer, staleness, UI): [CLINIC_VISITS_QA_BUG_HUNT.md](./CLINIC_VISITS_QA_BUG_HUNT.md)
- Release readiness (verification vs this spec): [CLINIC_VISITS_RELEASE_READINESS.md](./CLINIC_VISITS_RELEASE_READINESS.md)
- Backend E2E audit (traceability matrix): [backend-api/docs/CLINIC_E2E_FLOW_IMPLEMENTATION_AUDIT.md](../../backend-api/docs/CLINIC_E2E_FLOW_IMPLEMENTATION_AUDIT.md)
- Doctor completion policy (shared rules): [backend-api/docs/DOCTOR_VISIT_COMPLETION_GOVERNANCE.md](../../backend-api/docs/DOCTOR_VISIT_COMPLETION_GOVERNANCE.md)

## Scope

Operational list + detail; EMR-backed APIs; queue/billing/settlement signals on rows; staff completion via `visitCompletionPolicy` + `completeVisitWithPolicy` (audit: `DoctorAuditLog`, `changedByRole: STAFF`); CSV export; summary KPIs (date-range scoped).

## Key files

| Area | Path |
|------|------|
| Staff list | `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/page.jsx` |
| Staff detail | `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/[visitId]/page.jsx` |
| Components | `.../visits/_components/*` |
| Datetime helper | `.../visits/_lib/formatVisitDateTime.js` |
| API client | `bpa_web/lib/api.ts` |
| Types | `bpa_web/src/types/clinicVisit.ts` |
| EMR / completion | `backend-api/.../clinic/emr.service.ts` |
| Routes / controller | `clinic.routes.ts`, `clinic.controller.ts` |
| Policy | `backend-api/.../doctor/visitCompletionPolicy.ts` |

## Visit status

Prisma `VisitStatus`: `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. No-show stays appointment-level.

## Permissions (final)

Shared read set for the visits hub (used in routes as `clinicVisitReadPerms` — **any one** is enough):

- `clinic.emr.read`, `clinic.emr.write`, `clinic.visits.read`, `clinic.visits.manage`

**Applies to:** `GET` list, detail, summary, export, completion-eligibility, queue-events, and **visit-scoped billing reads**: `GET .../visits/:visitId/billing-summary`, `.../orders`, `.../payment-status`.

**Staff completion:** `POST .../visits/:visitId/complete` requires **`clinic.emr.write` or `clinic.visits.manage`** (either).

**EMR mutations** (vitals, notes, `PATCH` visit fields other than completion, `POST` create visit, etc.): per-route; typically `clinic.emr.write` — not implied by `clinic.visits.read` alone.

**Prescriptions (visit-scoped):** `GET .../visits/:visitId/prescriptions` requires **`clinic.prescription.read`**. `POST` create uses **`clinic.prescription.create`** **plus** veterinarian middleware (`ClinicStaffProfile.staffType === DOCTOR`). `clinic.prescription.write` is not used on clinic authoring routes (see backend `docs/CLINIC_PRESCRIPTION_WRITE_MIGRATION.md`).

## Completion enforcement (no bypass)

- **`PATCH .../visits/:visitId`** with `status` meaning completed (**case-insensitive**, e.g. `completed`) → **400** (message directs to `POST .../complete`).
- **`PATCH`** with **`completedAt` present in body** (any value) → **400** (completion timestamp only via complete flow).
- **`POST .../visits`** with `status` meaning completed (**case-insensitive**) → **400**.

Valid path: **`POST .../visits/:visitId/complete`** → `completeVisitWithPolicy` (policy, optional override, appointment sync when applicable, settlement hook via `updateVisit` when status becomes `COMPLETED`, ledger deduped in `createSettlementLedgerForVisit`).

## List / export / summary query behavior

- **`status`:** whitelist only the four `VisitStatus` values; invalid tokens → **400** (list + export).
- **Date range (`fromDate` / `toDate`):** HTML `YYYY-MM-DD` is interpreted as **inclusive UTC calendar day** (`visitQueryFromDate` / `visitQueryToDateInclusive` in `clinic.controller.ts`) for list, export, and summary so the “to” day is not cut off at midnight.
- **`unpaidOnly`:** visits with at least one order where `paymentStatus !== COMPLETED`.

## CSV export safety

- Cells escaped for commas/quotes/newlines; values leading with `=`, `+`, `-`, `@` get a text-safe prefix + quoting to reduce formula injection when opened in spreadsheets.
- Export uses the **same filter semantics** as the list (including inclusive dates and status whitelist).

## Frontend behavior (hardened)

- **List:** Search bound to `searchInput`; Apply commits search + refreshes summary; filter/sort/date/doctor changes **reset page synchronously** before refetch; queue drawer requests guarded with a ref so a slow response cannot paint the wrong visit; **visibilitychange** (throttled ~4s) refetches list + summary when returning to the tab.
- **Drawer:** Opens with row snapshot, then **`GET` visit by id** for parity with detail; loading state while fetching; queue section shows loading / events / tickets-without-events / empty; narrow width capped with `min(440px, calc(100vw - 24px))`.
- **Detail:** Secondary data loads on `branchId` + `visitId` with **cancel** on navigation; **`secondaryRefreshKey`** after successful complete refetches queue/billing/payment/eligibility; shared **`formatVisitDateTime`** for display consistency.
- **Summary cards:** KPIs are **date-range only**; table can add search, doctor, status chips, unpaid — UI copy states they need not match row count.

## Final implemented behavior (checklist)

| Capability | Behavior |
|------------|----------|
| List filters | Search (apply), dates, doctor, appointment yes/no, treatment code, sort, status chips, unpaid-only; signals on rows: queue ticket, billing counts, settlement (nullable `doctorShare` if non-finite). |
| Summary | `GET /visits/summary` — by status in range, open pipeline (branch), completed in range by `completedAt`, visits in range, visits with unpaid orders in range. |
| Detail | Full visit + prescriptions UI (where permitted) + billing block + queue timeline states + completion with eligibility / override. |
| Complete | Shared `completeVisitWithPolicy` (staff `POST` / doctor `PATCH` after auth); audit role STAFF vs DOCTOR; idempotent if already `COMPLETED`; appointment sync best-effort. |
| Export | `GET /visits/export` — same filters as list, row cap enforced server-side. |
| Permissions | Visit read set includes billing-summary/orders/payment-status; complete allows `emr.write` **or** `visits.manage`. |

## Known remaining risks

- **Doctor vs staff:** Both use `emr.completeVisitWithPolicy` after their respective auth (doctor: visit ownership; staff: clinic branch permissions). Details: [DOCTOR_VISIT_COMPLETION_GOVERNANCE.md](../../backend-api/docs/DOCTOR_VISIT_COMPLETION_GOVERNANCE.md).
- **Calendar day = UTC** for `YYYY-MM-DD` query params; branch-local “business day” would need an explicit timezone strategy.
- **`clinic.visits.read` without `clinic.emr.read`** can read visit-scoped billing summary / payment-status — confirm org policy.
- **PATCH `completedAt`:** clearing a bad timestamp is not exposed via API (by design); needs admin/support or a dedicated tool if ever required.
- **CSV:** timestamp columns may appear as ISO strings in Excel vs locale-formatted UI.
- **Visibility refetch:** throttled; very fast tab switches might skip a refresh (normal navigation remount usually reloads).
