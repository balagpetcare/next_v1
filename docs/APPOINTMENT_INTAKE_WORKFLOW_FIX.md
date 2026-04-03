# Appointment Intake Workflow Fix - Invalid Action Display

**Date:** 2026-03-19  
**Issue:** Appointments table showing "Complete intake" for BOOKED appointments, causing invalid PROMOTE transition error  
**Status:** ✅ FIXED

---

## Problem

Appointments list UI shows "Complete intake" action for pre-booked/booked appointments without patient/pet data, but clicking it triggers backend error:

```
"Invalid transition: cannot PROMOTE when status is BOOKED"
```

**Observed State:**
- Visit: SCHEDULED
- Status: Pre-booked (or BOOKED after promotion)
- Intake: —
- Action shown: **Complete intake** ❌ (WRONG)

Doctor side also shows:
> "Complete check-in and add to queue first, then start treatment."

---

## Root Cause Analysis

### Canonical Appointment State Machine

From `backend-api/src/api/v1/modules/clinic/appointments/appointmentStateMachine.ts`:

```typescript
TRANSITIONS = {
  DRAFT_CREATE: { from: [], to: "DRAFT" },
  PRE_BOOK: { from: [], to: "PRE_BOOKED" },
  PROMOTE: { from: ["DRAFT", "PRE_BOOKED"], to: "BOOKED" },  // ← ONLY from DRAFT/PRE_BOOKED
  CONFIRM: { from: ["BOOKED"], to: "CONFIRMED" },
  CHECK_IN: { from: ["BOOKED", "CONFIRMED"], to: "CHECKED_IN" },
  ENQUEUE: { from: ["CHECKED_IN"], to: "IN_QUEUE" },
  CALL: { from: ["IN_QUEUE"], to: "CALLED" },
  START_CONSULT: { from: ["CALLED"], to: "IN_CONSULT" },
  COMPLETE: { from: ["IN_CONSULT"], to: "COMPLETED" },
  CANCEL: { from: ["BOOKED", "CONFIRMED", "DRAFT", "PRE_BOOKED"], to: "CANCELLED" },
  NO_SHOW: { from: ["BOOKED", "CONFIRMED", "DRAFT", "PRE_BOOKED"], to: "NO_SHOW" },
}
```

**Valid Flow:**
```
PRE_BOOKED → PROMOTE → BOOKED → CHECK_IN → CHECKED_IN → ENQUEUE → IN_QUEUE → ...
```

### UI Action Logic (BROKEN)

From `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx:570`:

```javascript
{(canCompleteIntake(status) || (canCheckIn(status) && (!a.patientId || !a.petId))) && (
  <button onClick={() => setCompleteIntakeApt(a)}>Complete intake</button>
)}
```

**Condition breakdown:**
1. `canCompleteIntake(status)` → TRUE for DRAFT/PRE_BOOKED ✅
2. **OR** `canCheckIn(status) && (!a.patientId || !a.petId)` → TRUE for **BOOKED** without patient/pet ❌

**The Problem:**
- `canCheckIn(status)` returns TRUE for ["BOOKED", "CONFIRMED"]
- If appointment is **BOOKED** but missing `patientId` or `petId`, condition #2 is TRUE
- "Complete intake" button shows
- Clicking it opens `CompleteIntakeModal` which calls `staffClinicAppointmentPromote()`
- Backend rejects: **"Invalid transition: cannot PROMOTE when status is BOOKED"**

### Helper Function (CORRECT but MISUSED)

From `lib/appointmentStatusHelpers.js:54`:

```javascript
/** Complete intake = same statuses as promote (DRAFT/PRE_BOOKED) for the Complete Intake modal */
export function canCompleteIntake(status) {
  return PROMOTE_FROM.includes(normalize(status)); // ["DRAFT", "PRE_BOOKED"]
}
```

The helper is **correct** - it only allows DRAFT/PRE_BOOKED. But the UI condition adds an **OR** clause that breaks the logic.

---

## Correct Workflow

### Status → Action Mapping

| Status | Patient/Pet Linked? | Correct Action | Current (Broken) | Backend Transition |
|--------|---------------------|----------------|------------------|-------------------|
| DRAFT | No | Complete intake | Complete intake ✅ | PROMOTE → BOOKED |
| PRE_BOOKED | No | Complete intake | Complete intake ✅ | PROMOTE → BOOKED |
| **BOOKED** | **No** | **Check-in (disabled) + "Link first" badge** | **Complete intake ❌** | **N/A (already BOOKED)** |
| BOOKED | Yes | Check-in | Check-in ✅ | CHECK_IN → CHECKED_IN |
| CONFIRMED | No | Check-in (disabled) + "Link first" badge | Complete intake ❌ | N/A |
| CONFIRMED | Yes | Check-in | Check-in ✅ | CHECK_IN → CHECKED_IN |
| CHECKED_IN | Yes | (Queue action) | (Queue action) ✅ | ENQUEUE → IN_QUEUE |

### Correct Flow for BOOKED without Patient/Pet

**Current (Broken):**
1. Appointment is BOOKED (already promoted from PRE_BOOKED)
2. UI shows "Complete intake" button
3. User clicks → Opens CompleteIntakeModal
4. Modal calls PROMOTE API
5. Backend error: "Invalid transition: cannot PROMOTE when status is BOOKED"

**Correct:**
1. Appointment is BOOKED but missing patient/pet
2. UI shows:
   - Check-in button (disabled)
   - "Link first" warning badge
   - **OR** direct user to intake page to link patient/pet
3. User goes to intake page → links patient/pet
4. Returns to appointments → Check-in button now enabled
5. Check-in succeeds → CHECKED_IN

---

## Fix Strategy

### Fix 1: Remove Invalid OR Condition

**File:** `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx:570`

**Current (BROKEN):**
```javascript
{(canCompleteIntake(status) || (canCheckIn(status) && (!a.patientId || !a.petId))) && (
  <button onClick={() => setCompleteIntakeApt(a)}>Complete intake</button>
)}
```

**Fixed:**
```javascript
{canCompleteIntake(status) && (
  <button onClick={() => setCompleteIntakeApt(a)}>Complete intake</button>
)}
```

**Rationale:**
- Only show "Complete intake" for DRAFT/PRE_BOOKED (statuses that can be PROMOTED)
- For BOOKED/CONFIRMED without patient/pet, the existing "Link first" badge (line 579-581) already handles the UX
- User should use the "Intake" link to navigate to intake page and link patient/pet there

### Fix 2: Ensure "Link first" Badge Shows for BOOKED

**File:** `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx:579-581`

**Current (CORRECT):**
```javascript
{canCheckIn(status) && (!a.patientId || !a.petId) && (
  <span className="badge bg-warning text-dark ms-1" title="Link owner & pet via Complete intake first">Link first</span>
)}
```

**Update title text:**
```javascript
{canCheckIn(status) && (!a.patientId || !a.petId) && (
  <span className="badge bg-warning text-dark ms-1" title="Link owner & pet via Intake page first">Link first</span>
)}
```

**Rationale:**
- Badge already shows for BOOKED/CONFIRMED without patient/pet
- Update tooltip to say "Intake page" instead of "Complete intake" (which is now only for DRAFT/PRE_BOOKED)

---

## Implementation

### Files Modified

**1. `app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx`**

**Change 1:** Remove invalid OR condition (line 570)
```diff
- {(canCompleteIntake(status) || (canCheckIn(status) && (!a.patientId || !a.petId))) && (
+ {canCompleteIntake(status) && (
    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCompleteIntakeApt(a)} disabled={acting}>Complete intake</button>
  )}
```

**Change 2:** Update "Link first" badge tooltip (line 580)
```diff
  {canCheckIn(status) && (!a.patientId || !a.petId) && (
-   <span className="badge bg-warning text-dark ms-1" title="Link owner & pet via Complete intake first">Link first</span>
+   <span className="badge bg-warning text-dark ms-1" title="Link owner & pet via Intake page first">Link first</span>
  )}
```

---

## Validation Test Cases

### Test Case 1: PRE_BOOKED without patient/pet
**Setup:** Create quick appointment (PRE_BOOKED status)
**Expected:**
- ✅ "Complete intake" button shows
- ✅ Clicking opens CompleteIntakeModal
- ✅ Linking patient/pet succeeds
- ✅ Status changes to BOOKED

### Test Case 2: BOOKED without patient/pet
**Setup:** Appointment already promoted to BOOKED but missing patient/pet
**Expected:**
- ❌ "Complete intake" button does NOT show
- ✅ "Link first" badge shows
- ✅ Check-in button shows but disabled
- ✅ "Intake" link navigates to intake page
- ✅ User can link patient/pet via intake page
- ✅ After linking, check-in button becomes enabled

### Test Case 3: BOOKED with patient/pet
**Setup:** Appointment is BOOKED with patient/pet linked
**Expected:**
- ❌ "Complete intake" button does NOT show
- ❌ "Link first" badge does NOT show
- ✅ Check-in button shows and is enabled
- ✅ Clicking check-in succeeds → CHECKED_IN

### Test Case 4: DRAFT appointment
**Setup:** Create draft appointment
**Expected:**
- ✅ "Complete intake" button shows
- ✅ Clicking opens CompleteIntakeModal
- ✅ Linking patient/pet succeeds
- ✅ Status changes to BOOKED

### Test Case 5: CONFIRMED without patient/pet
**Setup:** Appointment is CONFIRMED but missing patient/pet
**Expected:**
- ❌ "Complete intake" button does NOT show
- ✅ "Link first" badge shows
- ✅ Check-in button disabled
- ✅ User directed to intake page to link

### Test Case 6: Invalid PROMOTE attempt eliminated
**Setup:** Try to trigger PROMOTE on BOOKED appointment
**Expected:**
- ❌ No UI action allows this
- ✅ Backend error never occurs

---

## Related Documentation

- `CLINIC_APPOINTMENT_TO_TREATMENT_WORKFLOW_AUDIT.md` - Overall appointment workflow
- `CLINIC_INTAKE_RETURN_FLOW_FIX.md` - Intake page return flow

---

## Architecture Notes

### State Machine Enforcement

**Backend:** `appointmentStateMachine.ts` is the single source of truth
- All mutations call `assertTransition(fromStatus, action)`
- Invalid transitions throw `InvalidTransitionError` (409)

**Frontend:** `appointmentStatusHelpers.js` mirrors backend rules
- Each `canX()` function checks allowed statuses
- UI should **only** use these helpers, never add custom OR conditions

**Violation:** The OR condition `(canCheckIn(status) && (!a.patientId || !a.petId))` bypassed the helper logic and exposed an invalid action.

### Correct Pattern

**DO:**
```javascript
{canCompleteIntake(status) && <button>Complete intake</button>}
{canCheckIn(status) && <button>Check-in</button>}
```

**DON'T:**
```javascript
{(canCompleteIntake(status) || someOtherCondition) && <button>Complete intake</button>}
```

Adding OR conditions breaks the state machine alignment.

---

## Summary

**Root Cause:** UI condition allowed "Complete intake" for BOOKED appointments without patient/pet, but PROMOTE only works from DRAFT/PRE_BOOKED.

**Fix:** Remove invalid OR clause; rely solely on `canCompleteIntake(status)` helper.

**Result:** "Complete intake" only shows for DRAFT/PRE_BOOKED. BOOKED appointments show "Link first" badge and direct users to intake page.

**Status:** ✅ FIXED
