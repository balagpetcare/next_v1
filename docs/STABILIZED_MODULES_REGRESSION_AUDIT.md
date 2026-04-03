# Regression / smoke audit — stabilized modules (2026-03-21)

**Scope:** Static code and API-shape review of areas touched by staff patient routing, cross-shell navigation, owner clinic TS cleanup, staff items display fixes, and `formatAuditDetails`. No browser E2E was run in this pass.

## 1) Staff clinic patient module — **no-issue (routing)**

- **Canonical builders:** `lib/staffClinicPatientRoutes.js` — list, register, detail (`patient-detail/[id]`), edit (`patient-edit/[id]`); invalid `petId` falls back to list path (safe).
- **Flat re-exports:** `patient-register`, `patient-detail`, `patient-edit` re-export nested `patients/*` pages — consistent with Turbopack/nesting notes in file headers.
- **Usage:** List/detail/edit/register and wizards use the helpers; `visit` / `surgery` pages link via `staffClinicPatientDetailPath(branchId, petId)`.
- **Runtime risks (TS won’t catch):** `patientId` from URL must remain numeric pet id everywhere callers pass it — already documented in `staffClinicPatientRoutes.js`.

## 2) Cross-shell clinic → staff — **no-issue**

- **Documented:** `docs/CROSS_SHELL_NAVIGATION.md` matches code: standalone `/clinic/patients` uses `staffClinicPatientDetailPath` for **View**; intake uses `staffBranchClinicIntakePath`.
- **Check:** `rg` for `href=...'/clinic'` under `app/staff` — **no** standalone `/clinic/*` links from staff (only `@/src/components/clinic/*` imports — unrelated).
- **Residual deployment risk (documented elsewhere):** multi-origin dev ports / split domains — same as `CROSS_SHELL_NAVIGATION.md` §4–6.

## 3) Owner clinic schedule / settings / staff / services — **no-issue (param narrowing)**

- `typeof branchId === "string"` (and related) guards before values are captured in `useEffect` + nested `async` loaders — avoids `undefined` reaching API calls; behavior unchanged when params valid.
- **Follow-up:** `ownerClinicScheduleTemplatesPut` still sends full `DoctorScheduleTemplateRow` objects (including optional nested `branchMember` from GET). Backend ignores extra keys for create; payload could be slimmed later for size/clarity only.

## 4) Owner appointments / inventory / packages / schedule / settlement — **verified shapes + one backend fix**

| Area | API / UI check |
|------|----------------|
| **Reschedule slots** | `getSlotsForOwner` → `appointment.service.getAvailableSlots` returns `{ start, end, doctorId }` (Dates → ISO strings in JSON). `normalizeOwnerSlotList` reads string `start`/`end` — **matches**. |
| **Schedule exceptions list** | Prisma `listScheduleExceptions` had an **invalid `include` shape** (`user` sibling to `select` on `doctor`). **Fixed** in backend (see below). Frontend `normalizeScheduleExceptions` expects `id`, `doctorId`, `date`, `type` — matches `DoctorScheduleException` model JSON. |
| **Inventory / staff items** | `String(row.clinicalItemId ?? "—")` etc. only affects display when name/label missing — **no contract change**. |
| **Settlement batch detail** | `String(batch.clinicStaffProfileId ?? "—")` fixes React child typing; display equivalent for primitives. |

## 5) Staff clinic items page — **no-issue**

- Same display pattern as owner inventory for ledger/instrument cells; fallbacks are stringified IDs.

## 6) Shared `formatAuditDetails` — **no-issue**

- `field: field ?? undefined` aligns with `formatAuditChangeLines` optional `field`; call sites pass audit row shapes unchanged — behavior for `null` field is unchanged (treated as omitted).

---

## Fixed in this audit

| File | Issue |
|------|--------|
| `backend-api/src/api/v1/modules/owner/ownerClinic.service.ts` | `listScheduleExceptions` Prisma `include.doctor` used invalid mix of `select` + top-level `user`. Nested `user` under `select` so the owner portal schedule exceptions list can load reliably. |

---

## Likely follow-up improvements (not done)

1. Centralize slot/exception normalization in `ownerApi.ts` to avoid duplicate page-level helpers.
2. Strip nested relations from `doctorTemplates` payload before PUT (payload hygiene).
3. Manual QA: reschedule modal end-to-end against real branch timezone and slot boundaries.
4. `settlement-batches/[batchId]/page.tsx`: `load()` uses `setBatch as (d: unknown) => void` — if the API ever returns a non-object, state could be odd; narrow at boundary if this surface misbehaves in the field.

---

## Validation commands (dev)

```bash
cd D:\BPA_Data\bpa_web
npx tsc --noEmit -p tsconfig.json
```

Browser smoke (recommended): staff patient list → detail → edit → back; `/clinic/patients?branchId=` → View (cross-shell); owner schedule exceptions CRUD; owner appointment reschedule with slot picker; owner settlement batch detail.
