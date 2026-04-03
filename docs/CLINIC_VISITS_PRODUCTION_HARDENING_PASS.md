# Clinic Visits module — production hardening pass (archive)

**Canonical spec:** [CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md](./CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md) — permissions, enforcement, CSV, and final behavior are maintained there.

Staff route: `/staff/branch/[branchId]/clinic/visits` · Backend audit: `backend-api/docs/CLINIC_E2E_FLOW_IMPLEMENTATION_AUDIT.md` · Follow-up QA fixes: [CLINIC_VISITS_QA_BUG_HUNT.md](./CLINIC_VISITS_QA_BUG_HUNT.md)

This file records **what was fixed during the hardening pass** (root causes + file list). It is not duplicated in the canonical plan.

## 1. Root causes found

| Area | Issue |
|------|--------|
| Frontend list | `VisitFilterBar` wired to non-existent `search` / `setSearch` → **ReferenceError**. |
| Backend completion bypass | `PATCH` could set `completedAt` without policy/audit; `POST /visits` could create `COMPLETED`. |
| Status query | Arbitrary `status` strings → poor errors. |
| Permissions | Billing reads were EMR-only while list allowed `clinic.visits.read` → **403** on detail flows. |
| Complete permission | `visits.manage` without `emr.write` could not `POST /complete`. |
| Settlement / CSV | `doctorShare` → NaN; CSV formula-like cell risk. |
| Frontend | Drawer queue race; stale page on filter change; detail secondary tied to stale `visit` object; mobile row parity. |

## 2. Fixes applied (summary)

Controller: status whitelist, block `completedAt` on PATCH, block `COMPLETED` on create, CSV `csvEscapeCell` hardening. Routes: `POST /complete` → `emr.write` **or** `visits.manage`; billing-summary / orders / payment-status → `clinicVisitReadPerms`. EMR: finite `doctorShare` only. Web: list/drawer/detail fixes as in plan + QA doc.

## 3. Files touched in that pass

| Repo | File |
|------|------|
| backend-api | `src/api/v1/modules/clinic/clinic.controller.ts` |
| backend-api | `src/api/v1/modules/clinic/clinic.routes.ts` |
| backend-api | `src/api/v1/modules/clinic/emr.service.ts` |
| bpa_web | `app/staff/.../clinic/visits/page.jsx` |
| bpa_web | `app/staff/.../clinic/visits/[visitId]/page.jsx` |
| bpa_web | `app/staff/.../clinic/visits/_components/VisitDetailDrawer.jsx` |

*(Additional files from the QA pass are listed in CLINIC_VISITS_QA_BUG_HUNT.md.)*

## 4. Manual QA checklist

- [ ] List: search Apply, filters reset page, export matches filters.
- [ ] CSV safe in Excel (commas, `=` prefix).
- [ ] Drawer A→B race: queue matches B.
- [ ] Detail: fast visit id change — secondary data matches URL.
- [ ] `PATCH` COMPLETED / `PATCH` with `completedAt` / `POST` create COMPLETED → **400**.
- [ ] `POST /complete` with `visits.manage` only → **200** when policy OK.
- [ ] `visits.read`: billing-summary + payment-status load.
- [ ] Double complete: idempotent; no duplicate settlement ledger.

**Remaining risks:** see **Known remaining risks** in [CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md](./CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md). Doctor completion is unified on `completeVisitWithPolicy` (see `backend-api/docs/DOCTOR_VISIT_COMPLETION_GOVERNANCE.md`).
