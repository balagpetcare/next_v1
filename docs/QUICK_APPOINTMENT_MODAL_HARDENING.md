# Quick Appointment Modal – Hardening Pass

## Summary
Hardening pass for the QuickAppointmentModal and the POST .../appointments/quick backend path. Addresses service UX, canonical duration, source/channel, backend divergence, and duplicate protection.

---

## 1. Service field explicit and safe

**Rule:** Service is backend-required; UX must make this explicit and safe.

**Changes:**
- **Frontend (QuickAppointmentModal.jsx):**
  - Label: "Service *" with required asterisk.
  - `<select required aria-required="true">` and placeholder "Select service (required)".
  - Validation message: "Service is required. Please select a service."
  - When no services load: show "No services available. Add a service for this branch first."
  - Service options show duration when available: e.g. "Consultation (15 min)".

**Rules enforced:** Required field is clearly marked; empty state is explicit; no submit without a valid selected service.

---

## 2. Canonical duration resolution

**Rule:** End time = start + canonical duration: selected service duration → branch default slot → fallback.

**Changes:**
- **Frontend:**
  - Removed fixed 15-minute constant for end time.
  - `durationMinutes` = selected service `duration` (from API) when present and finite, else `FALLBACK_DURATION_MINUTES` (15).
  - Clamped to `MIN_DURATION_MINUTES` (5) to match backend slot minimum.
  - Backend does not expose a single "branch default slot" API; slot duration is per schedule template (`slotMinutes`). Frontend uses service duration when available, otherwise 15 (same as backend `DEFAULT_SLOT_MINUTES` in appointmentAvailability.service).

**Rules enforced:** Service duration drives slot when configured; otherwise fallback 15 min; minimum 5 min.

---

## 3. Source/channel for quick appointments

**Rule:** Use valid enums; default PHONE; support reporting (e.g. walk-in vs phone).

**Changes:**
- **Backend (appointment.service.ts):**
  - `createQuickAppointment` accepts optional `source` and `channel`.
  - Valid sources (AppointmentSource enum): `PHONE` | `WALKIN` | `STAFF` (default `PHONE`).
  - Valid channels (VARCHAR): `PHONE` | `COUNTER` | `ONLINE` | `REFERRAL` (default `PHONE`).
  - Invalid or missing values fall back to PHONE.
- **Backend (clinic.controller.ts):** Passes `body.source` and `body.channel` into the service.
- **Frontend:** Continues to omit source/channel; backend defaults to PHONE. Future UI (e.g. "Entry type: Phone / Walk-in") can send source/channel without API change.

**Rules enforced:** Only valid enum/DB values; default PHONE for backward compatibility and reporting.

---

## 4. Backend quick path vs canonical create

**Rule:** Confirm whether POST .../appointments/quick reuses canonical create; if not, document and reduce divergence safely.

**Audit result:** The quick path does **not** call `createAppointment`. Reason: `createAppointment` requires `patientId: number`, while quick appointments allow null patient with snapshot fields. Refactoring canonical create to accept optional patientId and snapshots would be a larger change.

**Changes:**
- **Backend (appointment.service.ts):**
  - Comment above `createQuickAppointment` updated to state:
    - Does not reuse `createAppointment` (which requires patientId).
    - Shares validation: `validateAppointmentDateTime`, `validateCreateAppointmentData`.
    - Same branch ACTIVE, service/doctor validation, overlap checks.
  - Optional source/channel added so reporting can distinguish entry type without adding a second code path.

**Rules enforced:** No duplicate business logic for validation; single create path for quick with documented relationship to canonical create.

---

## 5. Duplicate booking protection / operator warning

**Rule:** Protect against or warn for likely duplicate quick appointments (same branch/time/phone).

**Changes:**
- **Frontend (QuickAppointmentModal.jsx):**
  - Before submit, call `staffClinicCheckDuplicate(branchId, { mobile, petName, date })`.
  - If `possibleDuplicate && existing.length > 0`: show warning alert and do not submit.
  - Alert text: "Possible duplicate: same phone/date already has appointment(s) in this branch."
  - Buttons: "Cancel" (dismiss warning) and "Save anyway" (set ref, clear warning, re-submit form so duplicate check is skipped).
  - Uses `forceSaveRef` so "Save anyway" triggers one programmatic submit that bypasses duplicate check.

**Rules enforced:** Operator is warned for same branch + date + phone (and optional pet name); can still save if intentional.

---

## 6. Exact files changed

| File | Change |
|------|--------|
| **bpa_web** | |
| `app/staff/(larkon)/branch/[branchId]/clinic/appointments/_components/QuickAppointmentModal.jsx` | Service required UX (label *, required, empty state). Canonical duration from selected service or fallback 15 min. Duplicate check before submit; warning + "Save anyway" with ref-based re-submit. Import `staffClinicCheckDuplicate`, `useRef`. |
| **backend-api** | |
| `src/api/v1/modules/clinic/appointment.service.ts` | Comment: quick path does not reuse createAppointment; shares validation. Optional `source`/`channel` in createQuickAppointment; QUICK_APPOINTMENT_SOURCES (PHONE, WALKIN, STAFF), QUICK_APPOINTMENT_CHANNELS; default PHONE. |
| `src/api/v1/modules/clinic/clinic.controller.ts` | Pass `body.source` and `body.channel` into createQuickAppointment. |
| **docs** | |
| `docs/QUICK_APPOINTMENT_MODAL_HARDENING.md` | This file. |

---

## 7. Rules enforced (checklist)

- Service is required and explicit in UX (label, required, validation, empty state).
- Duration: service duration → fallback 15 min; min 5 min.
- Source/channel: valid enums only; default PHONE; optional in API for reporting.
- Quick path documented; shares validation with canonical create; no new duplicate create logic.
- Duplicate: warning for same branch/date/phone; operator can "Save anyway".

---

## 8. Verification

1. **Service required:** Open Quick modal → leave service unselected → Save → "Service is required. Please select a service." Select a service → Save proceeds (or duplicate warning).
2. **Duration:** Select a service with duration (e.g. 30 min) → create appointment → in list/detail, end time = start + 30 min. Service with no duration → end = start + 15 min.
3. **Source/channel:** Create quick appointment (no body source/channel) → DB has source=PHONE, channel=PHONE. (Optional) POST with `source: "WALKIN", channel: "COUNTER"` → DB reflects them.
4. **Duplicate warning:** Create quick appointment for phone X, date D. Open Quick again, same phone X and date D → warning "Possible duplicate...". Cancel → warning dismisses. "Save anyway" → second appointment created.
5. **Backend:** No new endpoints; quick create still uses same permission and validation; optional source/channel only.
