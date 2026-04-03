# Quick Appointment – Enterprise Enhancement Pass

## Summary
Two upgrades: (1) **Existing customer/pet assist** in QuickAppointmentModal (phone-based lookup, suggestions, link to create linked quick appointments); (2) **Quick-to-full enrichment** (audit of snapshot-only display, clear “Complete appointment details” path reusing promote/Complete intake).

---

## 1. Existing customer/pet assist

### How lookup works
- **Trigger:** When the user types in the **Phone** field, after a short debounce (450 ms) and when the value is at least 10 characters or contains `@`, the app calls:
  - `staffClinicOwnerLookup(branchId, trimmedPhone)` → branch/org-scoped owner lookup by phone or email.
  - If an owner is found, `staffClinicPatientsList(branchId, { ownerId: owner.id, limit: 20 })` loads that owner’s pets (recent patients).
- **Scope:** Same branch/org as the staff context; no cross-branch lookup.
- **UX:** A compact suggestion box appears below the phone field: “Existing customer: {displayName} (N pet(s))” with:
  - **Use this customer** – links the appointment to that owner only (prefills owner name, sends `patientId`).
  - **Pet name** buttons – link owner + that pet (prefill owner and pet name, send `patientId` and `petId`).
  - **Skip** – dismiss suggestions and continue with snapshot-only.
- **Linked state:** When a customer (and optionally pet) is selected, a green “Linked: {name}” badge and optional “Pet: {name}” are shown, with **Change** to clear and go back to snapshot-only.
- **Submit:** Payload includes `patientId` and `petId` when linked; snapshot fields (`ownerNameSnapshot`, `mobileSnapshot`, `petNameSnapshot`) are still sent for display. Backend quick-create already accepts `patientId`/`petId` and creates a normal appointment that is already linked.
- **Performance:** Debounce and non-blocking; user can ignore suggestions and submit with snapshot-only; no extra round-trip required to save.

### Rules enforced
- Lookup only after debounce and minimum length/`@` to avoid excessive calls.
- Suggestions are optional; quick-booking works with or without selecting an existing customer.
- Single source of truth: backend quick-create; no duplicate “link later” logic in the modal.

---

## 2. Quick-to-full enrichment flow

### Audit: how quick-created (snapshot-only) appointments are shown
- **List:** Appointment row shows owner/pet from `ownerNameSnapshot` / `petNameSnapshot` when `patientId`/`petId` are null; “Phone” badge when `appointmentMode === "QUICK_CALL"`.
- **Detail drawer:** Same snapshot fields shown in Patient/Pet; no indication that owner/pet are unlinked.
- **Missing structured data:** When `patientId` is null (and snapshot fields exist or `appointmentMode === "QUICK_CALL"`): no link to User (owner), no link to Pet, so check-in and visit flow are blocked until owner/pet are linked.

### Changes made
- **AppointmentDetailDrawer**
  - **Snapshot-only detection:** `isSnapshotOnly = !a.patientId && (a.ownerNameSnapshot != null || a.mobileSnapshot != null || a.appointmentMode === "QUICK_CALL")`.
  - **Patient/Pet section:** When `isSnapshotOnly`, an info alert explains: “Quick entry. Owner and pet are from snapshot only (not linked to a customer record). Link them below to enable check-in and visits.”
  - **Complete appointment details section:** When `isSnapshotOnly` and `onCompleteDetails` is provided, a new section with short copy and a button **Complete appointment details** that calls `onCompleteDetails(a)`.
- **Appointments page:** Passes `onCompleteDetails={(apt) => { setDetailAppointmentId(null); setCompleteIntakeApt(apt); }}` so the drawer closes and the existing **Complete Intake** modal opens with that appointment.

### How enrichment works
- **Path:** “Complete appointment details” → same as existing **Complete intake**: opens `CompleteIntakeModal`, which finds/creates owner by phone, optionally registers pet, then calls `staffClinicAppointmentPromote(branchId, appointmentId, { patientId, petId, doctorId?, notes? })`.
- **Backend:** `promoteQuickAppointment` (existing) updates the appointment to `BOOKED`, sets `patientId` and `petId`, and records a PROMOTED event. No new conversion or duplicate logic.
- **Result:** Appointment becomes a fully linked record (owner + pet); check-in and visit flow are then available.

### Rules enforced
- Enrichment reuses the canonical promote/Complete intake flow only.
- No duplicate “conversion” APIs or branching business logic.
- Snapshot-only state is clearly identified in the UI; one explicit CTA for linking.

---

## 3. Files changed

| File | Change |
|------|--------|
| **bpa_web** | |
| `app/staff/(larkon)/branch/[branchId]/clinic/appointments/_components/QuickAppointmentModal.jsx` | Owner/pet assist: debounced `staffClinicOwnerLookup` + `staffClinicPatientsList` on phone input; suggestion box (Use this customer / pet buttons / Skip); `linkedOwner`, `linkedPetId`, `linkedPetName` state; submit sends `patientId`/`petId` when set; “Linked” badge and “Change.” |
| `src/components/clinic/AppointmentDetailDrawer.jsx` | `isSnapshotOnly`; info alert in Patient/Pet when snapshot-only; optional prop `onCompleteDetails`; new section “Complete appointment details” with CTA that calls `onCompleteDetails(a)`. |
| `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx` | `AppointmentDetailDrawer` receives `onCompleteDetails={(apt) => { setDetailAppointmentId(null); setCompleteIntakeApt(apt); }}`. |
| **docs** | |
| `docs/QUICK_APPOINTMENT_ENTERPRISE_ENHANCEMENTS.md` | This file. |

---

## 4. New rules enforced

- **Lookup:** Branch/org-scoped owner lookup by phone (or email); debounced; optional; no blocking of quick booking.
- **Suggestions:** Show existing customer and recent pets; one-click link; “Change” to clear; submit with or without link.
- **Detail drawer:** Snapshot-only appointments show a clear “quick entry, not linked” message and a single “Complete appointment details” CTA.
- **Enrichment:** Only the existing promote/Complete intake path; no new conversion APIs or duplicate business logic.

---

## 5. Verification

1. **Existing customer assist**
   - Open Quick Appointment, enter a phone that matches an existing owner in the branch → after debounce, “Existing customer: …” and pet buttons appear.
   - Click “Use this customer” → owner name prefilled, “Linked” badge; save → appointment created with `patientId` set (and snapshot fields).
   - Click a pet button → owner and pet names prefilled, “Pet: …” badge; save → appointment created with `patientId` and `petId` set.
   - Click “Skip” or “Change” → suggestions cleared; save with typed names only → snapshot-only appointment.
   - Enter a phone that does not match → no suggestions; quick booking with snapshot-only works as before.

2. **Quick-to-full enrichment**
   - Create a quick appointment (snapshot-only). Open it from the list (drawer).
   - Drawer shows info alert “Quick entry. Owner and pet are from snapshot only…” and section “Complete appointment details” with button.
   - Click **Complete appointment details** → drawer closes, Complete Intake modal opens with that appointment.
   - In the modal, find/create owner and select or register pet → Promote → appointment is BOOKED with `patientId`/`petId` set.
   - Re-open the same appointment in the drawer → no snapshot-only section; Patient/Pet show linked owner/pet; check-in available if status allows.
