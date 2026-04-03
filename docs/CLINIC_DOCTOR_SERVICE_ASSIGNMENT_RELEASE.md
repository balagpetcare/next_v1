# Doctor service assignment — release notes & rollout

## Summary

Enterprise doctor–service assignment (V2 UI) is **additive**: new REST endpoints and optional templates table; legacy **service-matrix** GET/PUT remains unchanged. Staff URL (unchanged in the browser):

`/staff/branch/[branchId]/clinic/doctors/service-assignment`

The Next.js page file lives at `app/staff/.../clinic/doctors-service-assignment/` with a `beforeFiles` rewrite in `next.config.js` (same pattern as patient-* and services-pricing flat routes) to avoid nested-route 404s in some dev/build modes.

## Operator: feature flag

| Variable | Effect |
|----------|--------|
| *(unset or any value except the string `false`)* | V2 enterprise workspace (directory, categories, bulk, templates, audit drawer, fees tab). |
| `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2=false` | Legacy doctors × services matrix only (same URL; uses existing service-matrix API). |

Set in the **frontend** env for the staff/owner Next build that serves `/staff/*`. Restart or rebuild after changing.

## Backend endpoints (additive)

These handlers are registered on the clinic router in `clinic.routes.ts` and **also** mounted early in `backend-api/src/api/v1/routes.ts` (before `router.use("/clinic", …)`), matching the clinical-overview / service-pricing pattern. That avoids global **`Route not found`** when the API runs from **`npm start`** with a **stale `dist/clinic.routes.js`**; see `backend-api/docs/DEV_API_RUN_AND_DIST.md`.

- `GET .../doctors/service-assignment/summary`
- `GET .../doctors/:memberId/service-assignment`
- `PATCH .../doctors/:memberId/service-assignment/bulk`
- `GET|POST|PATCH|DELETE .../doctors/service-assignment/templates` (+ `POST .../templates/:templateId/apply`)

Permissions align with existing doctor/service rules (`clinic.doctors.view` / `clinic.doctors.manage_services` as routed).

**422 responses** include `message` (first validation issue, with a count if multiple) and `errors[]` with `{ index, message }` per failed op.

## Database

- **Migration:** `prisma/migrations/20260322140000_doctor_service_assignment_templates/migration.sql` creates `doctor_service_assignment_templates`.
- **Prisma model:** `DoctorServiceAssignmentTemplate` in `schema.prisma`.

## Rollout checklist

1. **Backend:** `npx prisma migrate deploy` (target environment DB).  
2. **Backend:** `npx prisma generate` if CI/build image does not run it automatically.  
3. **Backend:** deploy API; rebuild **full** `dist/` when using `npm start` (early mounts live in `src/api/v1/routes.ts` as well as `clinic.routes.ts`). Quick probe **without** auth: `GET .../doctors/service-assignment/summary` → **401** (route matched). **Global** `Route not found` means stale or partial `dist` / wrong host. With valid staff session: same URL → **200** + `success` payload.  
4. **Frontend:** set `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2` as desired; `npm run build` (or your pipeline); deploy.  
5. **Smoke:** see below.  
6. **Rollback:** set `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2=false` and redeploy frontend; API/table can remain (unused by legacy UI). Do **not** drop the new table unless you intentionally revert the migration.

## Smoke tests (manual)

1. Open `/staff/branch/{id}/clinic/doctors/service-assignment` (expect 200 / login redirect, not app 404).  
2. V2: select a doctor; assign one service; change role; bulk unassign or category bulk (if used); apply a template; open assignment audit drawer.  
3. Fees tab: visible when user has fee/pricing-related perms as implemented in UI.  
4. Read-only: user with `clinic.doctors.view` only — no edits, no bulk/template apply.  
5. Flag: `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2=false` — matrix loads; toggles still work.  
6. API regression: `GET .../doctors/service-matrix` and `PUT .../doctors/service-matrix` still succeed for permitted users.

## References

- Plan / architecture: `docs/clinic-doctor-service-assignment-enterprise-plan.md`  
- Routing repair context: `docs/DOCTOR_OPERATIONS_ROUTING_REPAIR.md`
