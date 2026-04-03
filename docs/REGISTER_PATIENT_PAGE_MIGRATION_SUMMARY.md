# Register Patient: Modal to Dedicated Page — Implementation Summary

**Date:** 2026-03-14  
**Status:** Done

## Self-audit checklist

- **Entry points:** "Add patient" and intake/appointment links navigate to **`/staff/branch/[branchId]/clinic/patient-register`** (canonical; legacy `/clinic/patients/register` redirects). Optional query: `?phone=`, `?displayName=`, `returnTo`, `appointmentId`, `petName`. Path builders: `lib/staffClinicPatientRoutes.js`.
- **Unified flow:** One dedicated page supports **Existing owner + new patient** (lookup by phone/email) and **New owner + new patient** (ensure-owner by phone + display name), then full pet form.
- **Backend:** No new routes or services. All flows use existing `GET owner-lookup`, `POST ensure-owner`, `POST /patients`.
- **Permissions:** Register page uses `clinic.patients.read` for view and `clinic.patients.manage` for submit; submit button disabled when user lacks manage.
- **DUPLICATE_PET (409):** Handled on register page with a user-friendly message (duplicate microchip).

## Changed files summary

| Repo      | Change  | Path |
|-----------|--------|------|
| **bpa_web** | **New**   | `app/staff/(larkon)/branch/[branchId]/clinic/patients/register/page.jsx` |
| **bpa_web** | Modified | `app/staff/(larkon)/branch/[branchId]/clinic/patients/page.jsx` |
| **bpa_web** | Modified | `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx` |
| **bpa_web** | Modified | `lib/api.ts` (comments only for register-patient API alias) |
| **backend-api** | None | No backend file changes |

### Details

- **register/page.jsx:** Full register-patient page with owner step (Existing: lookup / New: ensure-owner), patient step (name, species, breed, sex, DOB, microchip, allergies, blood type, notes), query-param pre-fill (`phone`, `displayName`), success redirect to `/patients/[petId]`.
- **patients/page.jsx:** "Add patient" is now a `Link` to `.../patients/register`. Removed `RegisterPatientModal` and related state/imports (`staffClinicOwnerLookup`, `staffClinicPatientRegister`, `getAnimalTypes`, `getBreedsByAnimalType`).
- **appointments/page.jsx:** Intake error link updated from `/clinic/patients` to `/clinic/patients/register` with optional `?phone=...&displayName=...`.
- **lib/api.ts:** Comments added that `staffClinicRegisterPatient` and `staffClinicPatientRegister` call the same endpoint; prefer `staffClinicPatientRegister` in app code.

## Out of scope (unchanged)

- Intake modal keeps inline "Create owner" and "Register new pet" for quick completion during intake.
- CreateAppointmentWizard and QuickAppointmentDrawer unchanged.
- Backend clinic routes and patient.service unchanged.
