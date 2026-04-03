# Quick Appointment Modal – Implementation Summary

## Purpose
Lightweight fast-entry modal for clinic staff to create appointments quickly. Uses the canonical appointment quick-create API; created records are normal `Appointment` rows (PRE_BOOKED, source PHONE) editable later in the main flow.

## Deliverables

### 1. QuickAppointmentModal component
- **Path:** `app/staff/(larkon)/branch/[branchId]/clinic/appointments/_components/QuickAppointmentModal.jsx`
- **Props:** `branchId`, `onClose`, `onSuccess`
- **Required fields:** appointmentDate, appointmentTime, phone, ownerName
- **Optional fields:** petName, animalTypeId (species), serviceId, doctorId, notes
- **Behaviour:** branchId from staff context (passed from page). Service defaults to first branch service when list loads. Date/time sent via `branchLocalToUTCISO` (timezone-safe). Submit calls `staffClinicQuickAppointmentCreate` (POST `/api/v1/clinic/branches/:branchId/appointments/quick`). No duplicate quick-create logic; reuses existing backend quick-create.

### 2. Button opens modal
- **Quick** button added to the appointments filter bar (Staff → Branch → Clinic → Appointments).
- Click opens QuickAppointmentModal.

### 3. Submit creates real appointment
- Submit builds payload: `scheduledStartAt`/`scheduledEndAt` (15 min duration), `ownerNameSnapshot`, `mobileSnapshot`, optional `petNameSnapshot`, `petTypeSnapshot`, `serviceId`, `doctorId`, `notes`, `status: "PRE_BOOKED"`.
- Calls `staffClinicQuickAppointmentCreate(branchId, payload)` → backend `createQuickAppointment` → same validation (branch ACTIVE, service/doctor branch checks, time validations).

### 4. Success refreshes list
- On success, parent runs `onSuccess()` which calls `refreshAll()` (loadAppointments, stats, doctor stats, service stats) and closes the modal.

### 5. Exact files changed
| File | Change |
|------|--------|
| `app/staff/(larkon)/branch/[branchId]/clinic/appointments/_components/QuickAppointmentModal.jsx` | **New.** Modal component with form, validation, submit, loading, cancel. |
| `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx` | Import `QuickAppointmentModal`; state `showQuickModal`; render modal; pass `onQuickAppointment={() => setShowQuickModal(true)}` to filter bar; onSuccess close + `refreshAll()`. |
| `src/components/clinic/AppointmentFilterBar.jsx` | New prop `onQuickAppointment`; "Quick" button that calls it when provided. |
| `docs/QUICK_APPOINTMENT_MODAL_IMPLEMENTATION.md` | **New.** This summary. |

### 6. UX checklist
- Modal title: **Quick Appointment**
- Compact layout (small form controls, single column)
- Save + Cancel buttons
- Inline validation (formError alert)
- Loading state (submitting disables buttons, "Saving…" on submit button)
- Prevent duplicate submit (`if (submitting) return`)
- Close on success (modal closed and list refreshed)
- Preserve form state on failure (no reset in catch)
- Refresh appointment list on success via `refreshAll()`

### 7. Backend / API
- Reuses **canonical** quick-create: `POST /api/v1/clinic/branches/:branchId/appointments/quick` with `requireClinicPermission("clinic.appointments.manage")`. No new backend endpoints or duplicate business logic.
- Branch ACTIVE and permission rules enforced by existing middleware and `createQuickAppointment` service.
- Doctor/service branch validation done in `validateCreateAppointmentData`.
- Date/time sent as ISO strings; backend uses `new Date(...)`. Frontend uses `branchLocalToUTCISO` for branch-timezone-safe conversion.

## Verification
1. Go to Staff → select branch → Clinic → Appointments.
2. Click **Quick** in the filter bar → modal "Quick Appointment" opens.
3. Fill required: Date, Time, Phone, Owner name. Optionally set Service (defaults to first), Doctor, Pet name, Species, Notes.
4. Click **Save** → one new PRE_BOOKED appointment; modal closes; list refreshes.
5. Open the new appointment from the list → detail/edit works as for any appointment.
6. Submit with missing required field → inline error, form state preserved.
7. Cancel → modal closes without creating.
