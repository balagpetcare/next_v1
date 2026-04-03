# Clinic intake return flow fix – completion report

## Problem

After patient/owner registration, the app redirected to the intake URL with query params, e.g.:

`/staff/branch/5/clinic/intake/6?registered=1&ownerId=34&petId=3&appointmentId=6`

The intake page showed **"Appointment not found"** even though the route contained `/intake/6`, so the return URL was correct but the page failed to load the appointment.

## Root cause

1. **Appointment ID source**  
   The page used `Number(params?.appointmentId)` from the route. In some cases (e.g. first client render or param timing), `params.appointmentId` could be missing or not yet available, so `appointmentId` became `NaN`. The load logic then did `if (!branchId || !appointmentId) return` and **never called `setLoading(false)`**, so the UI could stay in a loading state or, after a later run with valid params, show "Appointment not found" if the first successful run failed (e.g. 404).

2. **Tight coupling**  
   Appointment load and post-registration promote (owner/pet binding) were coupled via `appointmentIdFromUrl === appointmentId`. Relying on query and route param to match could block or confuse behavior when the route was the only truth.

3. **Generic error**  
   When the appointment fetch failed, the card always showed "Appointment not found." and did not surface the real API/fetch error.

4. **Early return left loading true**  
   When `load()` returned early due to missing/invalid `branchId` or `appointmentId`, it set `loading = true` but never set it to `false`, so the UI could hang on "Loading appointment and intake...".

## Files changed

- **`app/staff/(larkon)/branch/[branchId]/clinic/intake/[appointmentId]/page.jsx`**  
  All behavior changes are in this file; no new files and no backend or API changes.

## Fix (summary)

1. **Single source of truth for appointment ID**  
   - Primary: route param `params.appointmentId`.  
   - Fallback: query param `appointmentId` only when the route value is missing or not a finite number.  
   - No use of query to override route when both exist.

2. **Load appointment only**  
   - `load()` only fetches appointment + intake; it does not depend on `registered` / `ownerId` / `petId`.  
   - When `branchId` or `appointmentId` is missing/invalid: set `loading = false`, clear appointment/intake, set a clear error for invalid appointment ID, and return.  
   - On fetch failure: set `appointment` and `intake` to `null`, set `error` to the real message, and set `loading = false`.

3. **Promote effect decoupled**  
   - Promote runs only when we have a valid `appointmentId` (from route or fallback), `registered=1`, and `ownerId`.  
   - Removed the condition `appointmentIdFromUrl !== appointmentId` so the route param is the only authority.  
   - Promote failure does not clear or block the appointment; it only sets an error message.

4. **UI behavior**  
   - When there is no appointment and loading is done: show **`error || "Appointment not found."`** in the card so real fetch/API errors are shown.  
   - When appointment exists but owner/pet are not linked: keep showing the existing "Owner & pet not linked" alert (no "Appointment not found" in that case).  
   - Success message after registration: **"Owner/patient registered successfully. Continue intake below."**  
   - Breadcrumb: `Intake #{appointmentId ?? "?"}` so null `appointmentId` does not break the label.

## Test steps

1. **Return from registration (happy path)**  
   - Go to staff clinic intake for an appointment without owner/pet (e.g. quick call), e.g. `/staff/branch/5/clinic/intake/6`.  
   - Click "Register owner & pet, then return here" and complete registration.  
   - After redirect you should land on `/staff/branch/5/clinic/intake/6?registered=1&ownerId=...&petId=...&appointmentId=6`.  
   - Intake page should load the same appointment (route 6), show "Owner/patient registered successfully. Continue intake below.", and after promote replace URL (strip query).  
   - No "Appointment not found".

2. **Route vs query**  
   - Open `/staff/branch/5/clinic/intake/6?appointmentId=99`.  
   - Page should load appointment **6** (route wins), not 99.

3. **Invalid appointment in URL**  
   - Open `/staff/branch/5/clinic/intake/foo` (or a segment that doesn’t parse to a number).  
   - Should not hang on loading; should show "Invalid appointment ID in URL." or similar and no infinite spinner.

4. **Fetch error**  
   - Use a non-existent appointment ID in the route (e.g. 99999) for a branch where it doesn’t exist.  
   - Should show the actual API/fetch error message in the card (and in the alert), not only "Appointment not found."

5. **Appointment exists, owner/pet not linked**  
   - Open intake for an appointment that has no `patientId`/`petId`.  
   - Should show the "Owner & pet not linked" warning and links to promote/register, and never "Appointment not found."

---

## Follow-up: Redirect contract and register → intake return (intake flow E2E)

### Additional issues addressed

- **Redirect to patient detail after register**  
  When staff registered a patient from the intake flow (returnTo set to intake URL), the app could still redirect to `/staff/branch/:branchId/clinic/patients/:id` instead of returning to the intake page. That happened only when the success branch did not run (e.g. returnTo validation failed or was missing in edge cases). The contract is: **when returnTo is set, always return there after success; never send to patient detail.**

- **"Patient not found" confusion**  
  "Patient not found" appears on the **patient detail page** (`/staff/.../clinic/patients/[petId]`) when that patient fails to load. It is not shown on the intake page. Wrong redirect to patient detail after register could make it look like "intake shows Patient not found." Fix: ensure register always returns to intake when returnTo is set, so staff stay on intake and see the correct "Owner & pet not linked" state when applicable.

- **appointmentId when returning**  
  When building the return URL after register, `appointmentId` is now taken from the query param when present, or parsed from the returnTo path (e.g. `.../intake/6` → `6`) so the intake page always receives it even if the register link omitted `appointmentId` in the query.

### Files changed (this round)

- **`app/staff/(larkon)/branch/[branchId]/clinic/patients/register/page.jsx`**  
  - After successful registration: when `returnToFromQuery` is set, **always** redirect to that URL (with `registered=1`, `ownerId`, `petId`, `appointmentId` when available). Never fall through to patient detail.  
  - `appointmentId` for the return URL: use `appointmentIdFromQuery` if present, else parse from returnTo path (`/intake/(\d+)`).

- **`app/staff/(larkon)/branch/[branchId]/clinic/intake/[appointmentId]/page.jsx`**  
  - Copy tweak: "Patient/owner not linked to this appointment. Link or register owner and pet below, then continue intake." so the patient-missing state is explicit and not confused with a generic "Patient not found."

### Redirect contract

| Context | returnTo | After register success |
|--------|----------|------------------------|
| Opened from intake (returnTo = `/staff/branch/:id/clinic/intake/:aptId`) | Set, valid | Redirect to returnTo + `?registered=1&ownerId=...&petId=...&appointmentId=...` (intake remains central). |
| Opened from appointments modal (returnTo = same intake URL) | Set, valid | Same as above. |
| Opened from Patients list or direct (no returnTo) | Not set | Redirect to `/staff/branch/:id/clinic/patients/:petId` or patients list (standalone flow). |

### Test steps (E2E)

- **Existing patient found**  
  Intake for an appointment that already has owner/pet: no "not linked" alert; owner & pet summary and intake form show.

- **Owner not found**  
  Intake for snapshot-only appointment → "Register owner & pet, then return here" → register → success → must land on **same intake page** with success message and promote; must **not** land on patient detail.

- **Patient created and returned to intake**  
  From intake (no owner/pet) → Register → create owner + register pet → submit → must land on `/staff/branch/:branchId/clinic/intake/:appointmentId?registered=1&ownerId=...&petId=...&appointmentId=...`; appointment loads; success message; URL then cleaned (promote); no redirect to `/patients/:id`.

- **Patient create flow does not redirect to patient detail when returnTo is set**  
  Open register via intake link (with returnTo). Complete registration. Confirm redirect is to intake URL, not to `/staff/.../clinic/patients/7`.

- **Appointment remains visible when patient binding fails**  
  Intake page with `?registered=1&ownerId=...&petId=...`; if promote API fails (e.g. pet not owned by owner), intake page must still show the appointment and the error alert; must not show "Appointment not found."
