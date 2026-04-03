# Clinic appointment-to-treatment workflow audit and fix report

## PHASE A — Real running flow

### A1. Page/component files and routes

| Flow step | Route | File | Primary entity |
|-----------|--------|------|----------------|
| Appointments list | `/staff/branch/[branchId]/clinic/appointments` | `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx` | List (no single appointment) |
| Appointment detail (drawer) | Same page, drawer opened by row click | `AppointmentDetailDrawer` in `src/components/clinic/AppointmentDetailDrawer.jsx` | Appointment (fetched by id when drawer opens) |
| Assign doctor | Modal on appointments page | `AssignDoctorModal` inside appointments/page.jsx | Appointment (prop from list row) |
| Collect payment | Modal on appointments page | `PayModal` / collect payment modal in appointments/page.jsx | Appointment (prop from list row) |
| Intake | `/staff/branch/[branchId]/clinic/intake/[appointmentId]` | `app/staff/(larkon)/branch/[branchId]/clinic/intake/[appointmentId]/page.jsx` | Appointment (route param), then intake |
| Patient list | `/staff/branch/[branchId]/clinic/patients` | `app/staff/(larkon)/branch/[branchId]/clinic/patients/page.jsx` | List |
| Patient detail | `/staff/branch/[branchId]/clinic/patients/[patientId]` | `app/staff/(larkon)/branch/[branchId]/clinic/patients/[patientId]/page.jsx` | Patient (pet) by petId |
| Patient edit | `/staff/branch/[branchId]/clinic/patients/[patientId]/edit` | `app/staff/(larkon)/branch/[branchId]/clinic/patients/[patientId]/edit/page.jsx` | Patient (pet) |
| Patient register | `/staff/branch/[branchId]/clinic/patients/register` | `app/staff/(larkon)/branch/[branchId]/clinic/patients/register/page.jsx` | N/A (create flow) |
| Visits list | `/staff/branch/[branchId]/clinic/visits` | `app/staff/(larkon)/branch/[branchId]/clinic/visits/page.jsx` | List |
| Visit detail (treatment) | `/staff/branch/[branchId]/clinic/visits/[visitId]` | `app/staff/(larkon)/branch/[branchId]/clinic/visits/[visitId]/page.jsx` | Visit (route param), then prescriptions/billing |

There are **no standalone “assign doctor” or “collect payment” pages**; both are modals on the appointments page and receive the appointment object from the parent.

### A2. Route builders / navigation

- **Appointment → Intake:** `Link href={\`/staff/branch/${branchId}/clinic/intake/${a.id}\`}` (appointments page).
- **Appointment → Assign doctor / Collect payment:** Modal open with `setAssignDoctorApt(a)` / `setPayModalApt({ apt: a })`; no route change.
- **Intake → Register patient:** `Link href=.../patients/register?returnTo=.../intake/${appointment.id}&appointmentId=...` (intake page).
- **Register → Intake (return):** `router.push(returnTo + ?registered=1&ownerId=...&petId=...&appointmentId=...)` when returnTo is set (register page).
- **Appointment (Complete intake modal) → Register:** Same pattern as intake; `returnTo` = intake URL.
- **Appointment drawer → Visit:** `Link href={\`/staff/branch/${branchId}/clinic/visits/${a.visitId}\`}` when `a.visitId` exists.
- **Patient links:** `href={\`/staff/branch/${branchId}/clinic/patients/${p.id}\`}` or `${patientId}`; dynamic folder is `[patientId]` (`useParams().patientId`); URL is `/staff/branch/:branchId/clinic/patients/:patientId` (value = `Pet.id`, e.g. `/staff/branch/5/clinic/patients/7`). The page file exists at `patients/[patientId]/page.jsx`.

### A3. Per-page summary

| Page | Primary entity | Route params | Query params | API calls | Fallback/snapshot | Not-found guard | Coupling |
|------|----------------|---------------|--------------|-----------|-------------------|------------------|----------|
| Appointments | List | branchId | many filters, promote | list, stats, get(id) for drawer/promote | Row has snapshot | Drawer: "No data" if get fails | None |
| Assign doctor modal | Appointment (prop) | — | — | doctors list, assignDoctor | appointment?.patient, appointment?.service | — | None |
| Collect payment modal | Appointment (prop) | — | — | collectPayment | appointment?.patient, appointment?.service | — | None |
| Intake | Appointment | branchId, appointmentId | registered, ownerId, petId, appointmentId | getAppointment, getIntake | — | !appointment → "Appointment not found" | **Fixed:** appointment and intake decoupled |
| Patient detail | Patient (pet) | branchId, petId | — | staffClinicPatientGet | — | !patient → "Patient not found" | None |
| Visit detail | Visit | branchId, visitId | — | visitGet, prescriptions, billingSummary | — | !visit → "Visit not found" | **Fixed:** visit loaded first; prescriptions/billing secondary |

---

## PHASE B — Root causes by bug class

1. **Primary entity fetch coupled to secondary (false not-found)**  
   - **Intake:** Was using `Promise.all([appointment, intake])`; intake failure cleared appointment and showed "Appointment not found." **Fixed:** appointment fetched first; on success intake fetched; only appointment failure shows "Appointment not found."
   - **Visit:** Used `Promise.all`; only visit failure should clear visit. Prescriptions/billing already had `.catch`. **Hardened:** visit loaded first in its own effect; prescriptions/billing in a separate effect so they never clear visit.

2. **Route param ignored or overridden**  
   - **Intake:** appointmentId now strictly route-first with query as fallback only; comment added. **Already fixed in prior work.**

3. **Partial snapshot with misleading not-found**  
   - Assign doctor and collect payment are **modals** with appointment from parent; they do not fetch appointment and do not show "Appointment not found." Any such report likely referred to intake (fixed) or to a drawer "No data" when appointment get failed.

4. **Broken patient links (404)**  
   - Route exists: `patients/[patientId]/page.jsx` → URL `/staff/branch/:branchId/clinic/patients/:petId`. Links use `patients/${p.id}` or `patients/${petId}`. Param name is `petId`; value is the pet/patient id. No mismatch found. If 404s occur, they may be due to base path/port, middleware, or API returning 404 and user interpreting as page 404; patient page shows "Patient not found" when API fails.

5. **Return from register to wrong page**  
   - **Fixed in prior work:** when returnTo is set, register always redirects to returnTo (intake) with params; never to patient detail unless returnTo is unset.

6. **Invalid ownerId/petId breaking page**  
   - **Fixed in prior work:** promote effect only runs when ownerIdFromUrl is a valid positive integer; invalid petId is sent as null; intake stays visible.

---

## PHASE C — Fix plan (implemented)

- **Intake:** Already decoupled; intake-only error and retry added; route param primary; promote defensive. No further change.
- **Visits:** Decouple visit load from prescriptions/billing: load visit first in one effect; a second effect (runs when visit is set, keyed by visit?.id) loads prescriptions and billing so secondary failures never clear visit.
- **Patient route:** Route and links are consistent. Patient detail URL is `/staff/branch/:branchId/clinic/patients/:patientId` (`patientId` segment = `Pet.id`).
- **Assign doctor / Collect payment:** No fetch on these modals; no change.

---

## PHASE D — Implemented changes

### Files changed in this pass

1. **`app/staff/(larkon)/branch/[branchId]/clinic/visits/[visitId]/page.jsx`**
   - **Change:** Load visit first in a dedicated effect; load prescriptions and billing in a second effect (by branchId, visitId). Secondary failures no longer affect visit state.
   - **Result:** "Visit not found" only when visit fetch truly fails; prescriptions/billing failures do not clear visit.

### Files changed in prior sessions (reference)

- **Intake page:** Appointment vs intake decoupled; route param primary; intakeLoadError + Retry; promote defensive; return-from-register and register redirect contract.
- **Register page:** Always redirect to returnTo when set; appointmentId from returnTo path fallback.

### Routes/hrefs verified (no change)

- Intake: `/staff/branch/${branchId}/clinic/intake/${a.id}`.
- Patient detail: `/staff/branch/${branchId}/clinic/patients/${patientId}` (segment `[patientId]` = `Pet.id`).
- Register: returnTo + query params.
- Visit: `/staff/branch/${branchId}/clinic/visits/${a.visitId}` from drawer.

### Guards/error handling

- **Intake:** "Appointment not found" only when appointment fetch fails; intake failure shows intake-specific error + Retry; appointment never cleared by intake failure.
- **Visit:** "Visit not found" only when visit fetch fails; prescriptions/billing failures do not clear visit.
- **Patient detail:** "Patient not found" when staffClinicPatientGet fails (correct).
- **Modals (assign doctor, collect payment):** No not-found state; appointment is prop.

---

## PHASE E — Test steps

1. **Appointment → Assign doctor**  
   From appointments list, open Assign Dr for an appointment; modal shows appointment/service; assign; success. No "Appointment not found."

2. **Appointment → Collect payment**  
   Open collect payment modal; enter amount; collect; success. No "Appointment not found."

3. **Appointment → Intake**  
   Click Intake for appointment 7; open `/staff/branch/5/clinic/intake/7`. Appointment loads; if intake fails, appointment stays visible and intake error + Retry show.

4. **Appointment + no patient → intake visible + create/select**  
   Intake for snapshot-only appointment; "Owner & pet not linked" and links to register/complete intake; no "Appointment not found."

5. **Register from intake → return to same intake**  
   From intake, Register owner & pet; complete; redirect to same intake URL with registered=1&ownerId&petId; promote runs; success message; no redirect to patient detail.

6. **Intake → treatment/visit**  
   After check-in from queue, visit is created; from appointment drawer "View Visit" goes to `/staff/branch/:id/clinic/visits/:visitId`; visit loads.

7. **Patient detail links**  
   From visits page or patients list, link to `/staff/branch/:branchId/clinic/patients/:patientId`; page loads or shows "Patient not found" only when API fails (not Next route 404).

8. **Invalid appointment id**  
   Open intake with invalid id; show "Invalid appointment ID" or "Appointment not found" from API; no infinite loading.

9. **Secondary failure**  
   Intake: break intake API only; appointment stays visible; intake error + Retry. Visit: break prescriptions only; visit stays visible; prescriptions empty or error as designed.

---

## Deliverables summary

| Item | Status |
|------|--------|
| Workflow map (routes/files) | Above (A1, A2, A3) |
| Root cause list by bug class | Phase B |
| Exact files changed | Intake (prior), Register (prior), Visits (this pass) |
| Routes/hrefs fixed | returnTo contract (prior); patient/intake/visit hrefs verified |
| Guards/error handling | Intake + Visit decoupled; not-found only on primary fetch failure |
| Routes added/removed | None |
| Test steps | Phase E |
| Remaining risks | Patient 404: if still seen, check base path, middleware, or API; Assign/Collect “Appointment not found” not reproduced in code (modals get appointment from parent). |

---

## Remaining risks and follow-up

- **Patient detail 404:** All links use `patients/${id}` and the route is `patients/[patientId]/page.jsx`. If **Next** 404s persist, verify **`next.config.js`** (single canonical config, Turbopack flag), clear `.next`, proxy/auth redirect vs missing route; see [STAFF_CLINIC_PATIENTS_404_BUILD_EXECUTION.md](./STAFF_CLINIC_PATIENTS_404_BUILD_EXECUTION.md).
- **Assign doctor / Collect payment:** No "Appointment not found" in code for these modals. If users still see it, it may be from another screen or from a toast/page-level error when an action fails.
- **Billing/analytics:** Not in scope; no changes.
