# Clinic Visits enterprise module — release readiness

**Canonical spec:** [CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md](./CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md)  
**Verification date:** 2026-03-21 (code vs docs)

## Verdict: **Ready**

Staff Clinic Visits list, detail, drawer, summary, export, queue, completion, billing/payment/settlement signals, and route permissions match the hardened canonical plan. **Doctor** visit completion delegates to the same `emr.completeVisitWithPolicy` implementation (after doctor ownership). No open **code** blockers found in this pass.

**Product / org gates (non-code):** Confirm org policy for `clinic.visits.read` accessing billing-summary/payment-status; confirm UTC calendar-day date filters are acceptable for operations.

## Code verification (vs plan)

| Requirement | Verified |
|-------------|----------|
| `clinicVisitReadPerms` on list, detail, summary, export, eligibility, queue-events, billing-summary, orders, payment-status | `clinic.routes.ts` |
| `POST .../complete` → `clinic.emr.write` **or** `clinic.visits.manage` | `clinic.routes.ts` |
| PATCH `status` COMPLETED blocked (any casing) | `isRequestedVisitStatusCompleted` + `updateVisit` |
| PATCH body includes `completedAt` → 400 | `updateVisit` |
| POST create `status` COMPLETED blocked (any casing) | `createVisit` |
| List/export `status` whitelist + 400 | `parseVisitStatusList` |
| Inclusive `YYYY-MM-DD` (from/to) list + export + summary | `visitQueryFromDate` / `visitQueryToDateInclusive` |
| `unpaidOnly` = visit has order with `paymentStatus !== COMPLETED` | `emr.service.ts` `listVisits` |
| CSV `csvEscapeCell` + formula-like prefix | `clinic.controller.ts` |
| Settlement ledger dedup on visit | `createSettlementLedgerForVisit` early return |
| Doctor `PATCH .../doctor/visits/:id/complete` | `doctor.service.completeVisit` → `emr.completeVisitWithPolicy` + `changedByRole: DOCTOR` |
| Queue **Complete service** (ticket with `visitId`) | `queue.service.completeService` → `emr.completeVisitWithPolicy` (then ticket `DONE`); audit `completionSource: QUEUE_TICKET_DONE` |
| Staff visits list **Actions** + drawer | `VisitRowActions.jsx`: primary **View** + **More** menu (Remix icons, body portal); no owner `ActionDropdown` / Iconify; `VisitDetailDrawer` portals to `document.body`; `openDrawer` normalizes `id` / `visitId` / `visit_id` |
| List: search input, page reset on filter changes, drawer ref + `staffClinicVisitGet`, visibility refetch | `visits/page.jsx` |
| Detail: secondary cancel flag, `secondaryRefreshKey` after complete | `visits/[visitId]/page.jsx` |
| Prescriptions **not** in visits read set | `clinic.routes.ts` |

## Blockers

**None** for this module at code level.

## Files changed in this verification pass

| File | Change |
|------|--------|
| `backend-api/src/api/v1/modules/clinic/clinic.controller.ts` | Case-insensitive block for `status` COMPLETED on create/PATCH |
| `bpa_web/docs/CLINIC_VISITS_RELEASE_READINESS.md` | This document |

## Concise QA checklist (pre-release smoke)

**Queue → visit → appointment → settlement → room (slice):** [backend-api: CLINIC_QUEUE_VISIT_SLICE_LIVE_SMOKE_CHECKLIST.md](../../backend-api/docs/CLINIC_QUEUE_VISIT_SLICE_LIVE_SMOKE_CHECKLIST.md)

- [ ] List loads; Apply updates search only; dates/doctor/sort/status/unpaid reset page and totals.
- [ ] Summary KPIs update when from/to change; copy explains table can differ.
- [ ] Export CSV matches on-screen filters; open in spreadsheet — no formula execution from `=` cells.
- [ ] Drawer: open A then B — data matches B; full visit loads after row click.
- [ ] Detail: complete visit — status, eligibility, queue/billing blocks refresh; no duplicate settlement row.
- [ ] Role: `visits.read` only — list + detail + billing-summary + payment-status OK; prescriptions need `prescription.read`/`write`.
- [ ] Role: `visits.manage` without `emr.write` — `POST .../complete` succeeds when policy allows.
- [ ] API: PATCH with `status: completed` (lowercase) → 400; PATCH with `completedAt` → 400.
