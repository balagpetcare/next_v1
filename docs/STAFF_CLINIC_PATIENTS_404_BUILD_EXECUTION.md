# Staff clinic Patients 404 — build-ready execution blueprint

**Purpose:** Step-by-step instructions for Composer / engineers to fix or extend the staff Patients routes without ambiguity.  
**Master context:** [STAFF_CLINIC_PATIENTS_MODULE_ENTERPRISE_AUDIT_AND_PLAN.md](./STAFF_CLINIC_PATIENTS_MODULE_ENTERPRISE_AUDIT_AND_PLAN.md)

**Final status (2026-03-21 hardening):** **Phase A + Phase B complete.**

- **Phase A:** Single `next.config.js` (Turbopack nested-route flag, doctor/supply redirects/rewrites); `next.config.mjs` removed.
- **Phase B:** Flat **`patient-register`** and **`patient-edit/[patientId]`** (re-export register/edit implementations), **`proxy.ts`** + **`next.config.js` `redirects()`** for legacy URLs, **`lib/staffClinicPatientRoutes.js`** for all in-app links, intake/appointments modals updated.

---

## A. Files created (Phase B)

| File | Role |
|------|------|
| `app/staff/(larkon)/branch/[branchId]/clinic/patient-register/page.jsx` | `export { default } from "../patients/register/page"` |
| `app/staff/(larkon)/branch/[branchId]/clinic/patient-edit/[patientId]/page.jsx` | `export { default } from "../../patients/[patientId]/edit/page"` |
| `lib/staffClinicPatientRoutes.js` | `staffClinicPatientsPath`, `staffClinicPatientRegisterPath`, `staffClinicPatientDetailPath`, `staffClinicPatientEditPath` |

---

## B. Files updated

| File | Change |
|------|--------|
| `next.config.js` | `redirects()`: `.../patients/register` → `.../patient-register`; `.../patients/:patientId/edit` → `.../patient-edit/:patientId` |
| `proxy.ts` | Same two patterns (307, query string preserved on clone) |
| `patients/page.jsx` | Row actions + “Add patient” → route helpers |
| `patients/[patientId]/page.jsx` | Edit link + back links via helpers; invalid `patientId` guard |
| `patients/[patientId]/edit/page.jsx` | All navigation via helpers; invalid id card; loading a11y |
| `patients/register/page.jsx` | List links + post-register `router.push` via helpers; loading a11y |
| `clinic/intake/[appointmentId]/page.jsx` | Register deep-link → `staffClinicPatientRegisterPath` |
| `clinic/appointments/new/page.tsx` | Register pet href → helper |
| `clinic/appointments/_components/CompleteIntakeModal.jsx` | Register link → helper |

---

## C. Inspect before future edits

1. `lib/staffClinicPatientRoutes.js` — single source for staff patient **path strings**  
2. `proxy.ts` — patient legacy redirects must stay **before** `isPublicPath` / auth gate  
3. Grep: `patients/register`, `/edit` under `patients/` (should only appear in redirects or re-export comments)

---

## D. Canonical vs legacy URLs

| Intent | **Canonical** (use in app) | Legacy (redirects to canonical) |
|--------|----------------------------|----------------------------------|
| Register | `/staff/branch/:branchId/clinic/patient-register` | `.../clinic/patients/register` |
| Edit | `/staff/branch/:branchId/clinic/patient-edit/:patientId` | `.../clinic/patients/:patientId/edit` |
| List | `.../clinic/patients` | — |
| Detail | `.../clinic/patients/:patientId` | — |

---

## E. Navigation (completed)

Sidebar continues to point at **`.../clinic/patients`** (list). Register/edit use helpers everywhere listed in §B.

---

## F. Data / API

Unchanged: `patientId` / `petId` in APIs = **`Pet.id`**. Permissions: `clinic.patients.read` / `clinic.patients.manage` enforced on pages + branch layout.

---

## G. Reuse

Register/edit **logic** remains in `patients/register/page.jsx` and `patients/[patientId]/edit/page.jsx` only — flat routes are **re-exports**, not duplicated forms.

---

## H. Validation

1. Clear `.next/<SITE_MODE>`; restart dev.  
2. While authenticated, open **`/staff/branch/1/clinic/patient-register`** and **`/staff/branch/1/clinic/patient-edit/4`** (replace `4` with a real pet id) → app shell or `AccessDenied`, not Next 404.  
3. Open legacy **`.../patients/register`** and **`.../patients/4/edit`** → should **redirect** to flat URLs.  
4. `npx next build` when repo has no unrelated compile errors.

---

## I. Deferred (product)

- Appointment prefill from patient detail; deeper billing; inventory on patient workspace; notifications.

---

## Execution checklist

- [x] Phase A: unified `next.config.js`  
- [x] Phase B: flat routes + proxy + redirects + helpers + link updates  
- [ ] Local QA after cache clear (environment-specific)
