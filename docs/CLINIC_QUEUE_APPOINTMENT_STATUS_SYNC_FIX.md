# Clinic Queue Appointment Status Sync Fix

**Date:** 2026-03-19  
**Issue:** Appointment shows "Checked in" and "Intake Complete" but doctor cannot start treatment - 409 error  
**Status:** ✅ COMPLETED (State-Machine-Compliant Fix)

---

## ✅ STATE-MACHINE-COMPLIANT FIX (FINAL)

**Date:** 2026-03-19 (Third Analysis - Correct Fix)

### The Real Problem: State Machine Violations

**Previous approaches violated the state machine by:**
1. Directly updating appointment status in queue.service without using `assertTransition`
2. Attempting to CALL from CHECKED_IN status (state machine requires CALL from IN_QUEUE only)
3. Frontend trying to bypass state machine with auto-call logic from invalid statuses

**State Machine Requirements:**
```typescript
CHECK_IN: { from: ["BOOKED", "CONFIRMED"], to: "CHECKED_IN" }
ENQUEUE: { from: ["CHECKED_IN"], to: "IN_QUEUE" }
CALL: { from: ["IN_QUEUE"], to: "CALLED" }
START_CONSULT: { from: ["CALLED"], to: "IN_CONSULT" }
```

### The Correct Fix

**Backend Changes:**

1. **Created `enqueueAppointment` function** in `appointment.service.ts`:
   - Properly uses `assertTransition` for ENQUEUE action
   - Transitions CHECKED_IN → IN_QUEUE
   - Creates appointment event

2. **Updated `queue.service.callNext()`** to use state-machine-compliant transitions:
   - First: Calls `appointmentService.enqueueAppointment()` if status is CHECKED_IN
   - Second: Calls `doctorService.callAppointment()` if status is IN_QUEUE
   - Both use proper `assertTransition` validation
   - No direct DB updates that bypass state machine

**Frontend Changes:**

1. **Reverted bad auto-call logic** in doctor page:
   - Removed logic that attempted CALL from CHECKED_IN, BOOKED, CONFIRMED
   - Only auto-calls from IN_QUEUE (which is state-machine-compliant)
   - Updated error message to guide user to proper workflow

2. **Updated button visibility** in doctor UI:
   - "Start Treatment" only shown for IN_QUEUE and CALLED statuses
   - Removed BOOKED, CONFIRMED, CHECKED_IN from allowed statuses
   - Forces proper queue workflow before treatment can start

### The Correct Workflow

**Clinic Side:**
1. Staff checks in appointment → BOOKED/CONFIRMED → CHECKED_IN ✅
2. Queue ticket created with status WAITING ✅
3. Staff calls next in queue → Queue service triggers:
   - ENQUEUE: CHECKED_IN → IN_QUEUE ✅
   - CALL: IN_QUEUE → CALLED ✅

**Doctor Side:**
4. Doctor sees "Start Treatment" button (only if IN_QUEUE or CALLED) ✅
5. Doctor clicks button:
   - If IN_QUEUE: Auto-calls (CALL action) → CALLED ✅
   - If CALLED: Directly starts consult → IN_CONSULT ✅
6. No 409 errors ✅

### Files Modified (State-Machine-Compliant)

**Backend:**
- `appointment.service.ts`: Added `enqueueAppointment()` function with proper `assertTransition`
- `queue.service.ts`: Updated `callNext()` to use `enqueueAppointment()` and `doctorService.callAppointment()`

**Frontend:**
- `app/doctor/(larkon)/appointments/[id]/page.tsx`: Reverted bad auto-call logic, only auto-call from IN_QUEUE
- `app/doctor/(larkon)/appointments/_components/QuickActionBar.tsx`: Updated button visibility to IN_QUEUE and CALLED only

---

## CRITICAL UPDATE - Doctor Page Runtime Analysis

**Date:** 2026-03-19 (Second Analysis)

### The Queue Sync Fix Was Not Sufficient

After implementing queue status sync, the 409 error still occurs:
```
POST /api/v1/doctor/appointments/5/start-consult
409 Conflict
Message: "Complete check-in and add to queue first, then start treatment."
```

### Doctor Page Button Mapping

**File:** `bpa_web/app/doctor\(larkon)\appointments\[id]\page.tsx`

**Top Button (line 294-301):**
- Label: **"Start Treatment"**
- Condition: `canStartTreatment` (line 250-253)
- Handler: `handleStartConsult` (line 103-124)
- Endpoint: `/api/v1/doctor/appointments/${id}/start-consult`

**Quick Actions (QuickActionBar component, line 82-90):**
- Label: **"Call Patient"** (shown when status is IN_QUEUE or CHECKED_IN)
- Handler: `handleCall` (line 89-101)
- Endpoint: `/api/v1/doctor/appointments/${id}/call`

**Quick Actions (QuickActionBar component, line 101-110):**
- Label: **"Start Consultation"**
- Condition: `canStartTreatment` (same as top button)
- Handler: `handleStartConsult` (same as top button)
- Endpoint: `/api/v1/doctor/appointments/${id}/start-consult`

**FINDING:** There are TWO buttons ("Start Treatment" and "Start Consultation") that call the SAME handler and endpoint!

### The Auto-Call Logic Bug

**From `page.tsx` lines 103-124:**

```typescript
const handleStartConsult = async () => {
  if (!Number.isFinite(id)) return;
  setActioning(true);
  try {
    const currentStatus = (appointment?.status ?? "").toUpperCase();
    if (currentStatus === "IN_QUEUE") {  // ← BUG: Checks stale status
      await doctorCallAppointment(id);
    }
    const data = await doctorStartConsult(id);  // ← Requires CALLED status
    toast.success("Consultation started");
    await refresh();
    // ... navigate to visit
  } catch (e) {
    const msg = (e as Error)?.message ?? "Failed to start";
    toast.error(msg === "Invalid status transition" || msg.includes("transition") 
      ? "Complete check-in and add to queue first, then start treatment." 
      : msg);
  } finally {
    setActioning(false);
  }
};
```

### The Exact Runtime Flow (BROKEN)

**Scenario:** Appointment #5 is CHECKED_IN

1. **Clinic staff checks in appointment:**
   - Appointment status: BOOKED → CHECKED_IN ✅
   - Queue ticket created: WAITING ✅

2. **Clinic staff calls next in queue:**
   - Queue ticket: WAITING → CALLED ✅
   - **Appointment status: CHECKED_IN → IN_QUEUE → CALLED** ✅ (queue sync works!)

3. **Doctor opens appointment detail page:**
   - Frontend fetches appointment
   - **Frontend shows status: CALLED** (if fresh) or **CHECKED_IN** (if stale/cached)
   - Stores in `appointment` state variable

4. **Doctor clicks "Start Treatment" button:**
   - Calls `handleStartConsult()`
   - Checks: `if (currentStatus === "IN_QUEUE")`
   - **currentStatus = "CHECKED_IN"** (stale from initial load) or "CALLED" (if fresh)
   - If CHECKED_IN: Skips `doctorCallAppointment` call ❌
   - If CALLED: Also skips (only checks for IN_QUEUE) ❌
   - Calls `doctorStartConsult(id)` directly
   - **Backend checks: appointment.status must be CALLED**
   - **If appointment is CHECKED_IN or IN_QUEUE: 409 error** ❌

### The True Root Cause

**The auto-call logic has THREE problems:**

1. **Checks stale status:** Uses `appointment?.status` from initial page load, not current backend state
2. **Only handles IN_QUEUE:** Doesn't handle CHECKED_IN or other pre-CALLED statuses
3. **Incomplete logic:** Should call patient for ANY status that requires calling before starting consult

**Correct logic should be:**
```typescript
// If appointment is not yet CALLED, call it first
if (!["CALLED", "IN_CONSULT", "COMPLETED"].includes(currentStatus)) {
  await doctorCallAppointment(id);  // This will handle the queue workflow
}
await doctorStartConsult(id);
```

### Why This Wasn't Caught Earlier

1. **Queue sync works correctly** - the backend does update appointment status
2. **Doctor page has stale data** - doesn't refresh after queue operations
3. **Auto-call logic is incomplete** - only checks for IN_QUEUE, not CHECKED_IN
4. **Two buttons, same action** - confusing UX with "Start Treatment" and "Start Consultation"

---

## Problem

Clinic UI shows appointment as checked in with intake complete, but doctor API returns 409 when trying to start treatment:

```
POST /api/v1/doctor/appointments/5/start-consult
409 Conflict
Message: "Complete check-in and add to queue first, then start treatment."
```

**Observed State:**
- Clinic UI: Intake: Complete, Status: Checked in, Visit: Scheduled
- Doctor API: Cannot start treatment (requires CALLED status)
- Appointment status in DB: **CHECKED_IN**
- Queue ticket status: **WAITING** or **CALLED**

**The Mismatch:** Queue workflow updates queue ticket status but does NOT sync appointment status.

---

## Root Cause Analysis

### Canonical State Machine

From `backend-api/src/api/v1/modules/clinic/appointments/appointmentStateMachine.ts`:

```typescript
const TRANSITIONS = {
  CHECK_IN: { from: ["BOOKED", "CONFIRMED"], to: "CHECKED_IN" },
  ENQUEUE: { from: ["CHECKED_IN"], to: "IN_QUEUE" },
  CALL: { from: ["IN_QUEUE"], to: "CALLED" },
  START_CONSULT: { from: ["CALLED"], to: "IN_CONSULT" },
  COMPLETE: { from: ["IN_CONSULT"], to: "COMPLETED" },
}
```

**Required Flow:**
```
BOOKED → CHECK_IN → CHECKED_IN → ENQUEUE → IN_QUEUE → CALL → CALLED → START_CONSULT → IN_CONSULT
```

**Doctor Requirement:**
- `START_CONSULT` action requires appointment status = **CALLED**
- From `doctor.service.ts:261`: `assertTransition(apt.status, "START_CONSULT")`
- This throws 409 if status is not CALLED

### Current Workflow (BROKEN)

**Clinic Check-in Flow:**
1. Staff clicks "Check-in" on appointment
2. `clinic.controller.ts:505` calls `queueService.checkInAndIssueTicket()`
3. `queue.service.ts:257` calls `appointmentService.checkInAppointment()`
4. `appointment.service.ts:1111` updates appointment status to **CHECKED_IN** ✅
5. `queue.service.ts:259` calls `issueTicket()` to create queue ticket with status **WAITING** ✅
6. **Appointment status stays at CHECKED_IN** ❌

**Queue Call Flow:**
1. Staff/system calls next ticket via `queueService.callNext()`
2. `queue.service.ts:359` updates queue ticket status to **CALLED** ✅
3. **Appointment status stays at CHECKED_IN** ❌ (should be IN_QUEUE then CALLED)

**Queue Start Service Flow:**
1. Doctor starts service via `queueService.startService()`
2. `queue.service.ts:434` updates queue ticket status to **IN_SERVICE** ✅
3. Creates visit if needed ✅
4. **Appointment status stays at CHECKED_IN** ❌ (should be IN_CONSULT)

**Doctor Start Consult Flow:**
1. Doctor clicks "Start Treatment" 
2. `doctor.controller.ts:177` calls `doctorService.startConsultAppointment()`
3. `doctor.service.ts:283` calls `transitionAppointmentStatus()` with action "START_CONSULT"
4. `doctor.service.ts:261` calls `assertTransition(apt.status, "START_CONSULT")`
5. **Appointment status is CHECKED_IN, but START_CONSULT requires CALLED** ❌
6. Throws `InvalidTransitionError`: "Invalid transition: cannot START CONSULT when status is CHECKED_IN"
7. Returns 409 to client

### The Missing Sync

**Queue service updates queue ticket status but NEVER updates appointment status:**

| Queue Action | Queue Ticket Status | Appointment Status (Current) | Appointment Status (Required) |
|--------------|---------------------|------------------------------|-------------------------------|
| checkInAndIssueTicket | WAITING | CHECKED_IN ✅ | CHECKED_IN ✅ |
| callNext | CALLED | CHECKED_IN ❌ | IN_QUEUE → CALLED |
| startService | IN_SERVICE | CHECKED_IN ❌ | IN_CONSULT |
| completeService | DONE | COMPLETED ✅ | COMPLETED ✅ |

**Only `completeService` syncs appointment status** (line 486-488 in queue.service.ts).

---

## Correct Workflow

### Status Sync Requirements

**When queue ticket is created (check-in):**
- Queue ticket: WAITING
- Appointment: CHECKED_IN ✅ (already correct)

**When queue ticket is called:**
- Queue ticket: WAITING → CALLED
- Appointment: CHECKED_IN → **IN_QUEUE** → **CALLED** (missing sync)

**When service starts:**
- Queue ticket: CALLED → IN_SERVICE
- Appointment: CALLED → **IN_CONSULT** (missing sync)

**When service completes:**
- Queue ticket: IN_SERVICE → DONE
- Appointment: IN_CONSULT → COMPLETED ✅ (already synced)

### Appointment Status Transitions Needed

**Option A: Two-step transition (follows state machine strictly)**
```typescript
// When callNext is called:
1. Update appointment: CHECKED_IN → IN_QUEUE (ENQUEUE action)
2. Update appointment: IN_QUEUE → CALLED (CALL action)
```

**Option B: Direct transition (simpler, requires state machine update)**
```typescript
// When callNext is called:
1. Update appointment: CHECKED_IN → CALLED (combined ENQUEUE+CALL action)
```

**Recommendation:** Use Option A to maintain state machine integrity.

---

## Fix Strategy

### Fix 1: Sync Appointment Status in Queue Service

**File:** `backend-api/src/api/v1/modules/clinic/queue.service.ts`

**Change 1: Update `callNext()` to sync appointment status**

Add after line 362 (after updating queue ticket to CALLED):

```typescript
// Sync appointment status: CHECKED_IN → IN_QUEUE → CALLED
if (next.appointmentId) {
  const apt = await prisma.appointment.findUnique({
    where: { id: next.appointmentId },
    select: { id: true, status: true },
  });
  
  if (apt && apt.status === "CHECKED_IN") {
    // First transition: CHECKED_IN → IN_QUEUE
    await prisma.appointment.update({
      where: { id: next.appointmentId },
      data: { status: "IN_QUEUE" },
    });
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: next.appointmentId,
        eventType: "IN_QUEUE",
        byUserId: userId,
        meta: { queueTicketId: next.id },
      },
    });
    
    // Second transition: IN_QUEUE → CALLED
    await prisma.appointment.update({
      where: { id: next.appointmentId },
      data: { status: "CALLED" },
    });
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: next.appointmentId,
        eventType: "CALLED",
        byUserId: userId,
        meta: { queueTicketId: next.id },
      },
    });
  }
}
```

**Change 2: Update `startService()` to sync appointment status**

Add after line 437 (after updating queue ticket to IN_SERVICE):

```typescript
// Sync appointment status: CALLED → IN_CONSULT
if (ticket.appointmentId) {
  const apt = await prisma.appointment.findUnique({
    where: { id: ticket.appointmentId },
    select: { id: true, status: true },
  });
  
  if (apt && apt.status === "CALLED") {
    await prisma.appointment.update({
      where: { id: ticket.appointmentId },
      data: { status: "IN_CONSULT" },
    });
    await prisma.appointmentEvent.create({
      data: {
        appointmentId: ticket.appointmentId,
        eventType: "IN_CONSULT",
        byUserId: userId,
        meta: { queueTicketId: ticket.id, visitId },
      },
    });
  }
}
```

### Fix 2: Update UI Badge Mapping

**File:** `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx`

**Current badge logic** (approximate line 520-540):
```javascript
const statusBadge = status === "BOOKED" ? "primary" : 
                    status === "CONFIRMED" ? "info" :
                    status === "CHECKED_IN" ? "success" :
                    status === "COMPLETED" ? "secondary" : "warning";
```

**Update to include queue statuses:**
```javascript
const statusBadge = status === "BOOKED" ? "primary" : 
                    status === "CONFIRMED" ? "info" :
                    status === "CHECKED_IN" ? "success" :
                    status === "IN_QUEUE" ? "warning" :
                    status === "CALLED" ? "warning" :
                    status === "IN_CONSULT" ? "info" :
                    status === "COMPLETED" ? "secondary" : "dark";

const statusLabel = status === "IN_QUEUE" ? "In Queue" :
                    status === "CALLED" ? "Called" :
                    status === "IN_CONSULT" ? "In Treatment" :
                    status; // default to status value
```

### Fix 3: Update Intake Badge Logic

**Current:** Shows "Intake Complete" when intake exists
**Problem:** Misleading when appointment is still in queue

**Update:** Show queue status when appointment is in queue workflow

```javascript
const intakeDisplay = 
  status === "IN_QUEUE" ? "In Queue" :
  status === "CALLED" ? "Called" :
  status === "IN_CONSULT" ? "In Treatment" :
  intake ? "Complete" : "—";
```

---

## Implementation Plan

### Phase 1: Backend - Sync Appointment Status

**File:** `backend-api/src/api/v1/modules/clinic/queue.service.ts`

**Changes:**
1. Import appointment service at top of file
2. Update `callNext()` function:
   - After updating queue ticket to CALLED
   - Check if appointmentId exists
   - If appointment status is CHECKED_IN:
     - Transition CHECKED_IN → IN_QUEUE (ENQUEUE)
     - Transition IN_QUEUE → CALLED (CALL)
     - Create appointment events for both transitions
3. Update `startService()` function:
   - After updating queue ticket to IN_SERVICE
   - Check if appointmentId exists
   - If appointment status is CALLED:
     - Transition CALLED → IN_CONSULT (START_CONSULT)
     - Create appointment event

### Phase 2: Frontend - Update UI Status Display

**File:** `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/appointments/page.jsx`

**Changes:**
1. Update status badge color mapping to include IN_QUEUE, CALLED, IN_CONSULT
2. Update status label display for queue statuses
3. Update intake column to show queue status when applicable

---

## Validation Test Cases

### Test Case 1: Complete workflow from check-in to treatment
**Setup:** Appointment is BOOKED with patient/pet linked
**Steps:**
1. Staff clicks "Check-in"
2. Appointment status → CHECKED_IN ✅
3. Queue ticket created with status WAITING ✅
4. Staff/system calls next ticket
5. **Appointment status → IN_QUEUE → CALLED** ✅ (NEW)
6. Queue ticket status → CALLED ✅
7. Doctor clicks "Start Treatment"
8. **Appointment status → IN_CONSULT** ✅ (NEW)
9. No 409 error ✅

**Expected:**
- ✅ Check-in succeeds
- ✅ Queue ticket created
- ✅ Call next succeeds and syncs appointment status
- ✅ Doctor can start treatment without 409 error
- ✅ Appointment status matches queue workflow

### Test Case 2: UI displays correct status
**Setup:** Appointment in queue workflow
**Expected:**
- ✅ Status badge shows "In Queue" when status is IN_QUEUE
- ✅ Status badge shows "Called" when status is CALLED
- ✅ Status badge shows "In Treatment" when status is IN_CONSULT
- ✅ Intake column shows queue status instead of misleading "Complete"

### Test Case 3: Queue without appointment
**Setup:** Walk-in patient (queue ticket without appointment)
**Expected:**
- ✅ Queue workflow works normally
- ✅ No errors when appointmentId is null
- ✅ Visit created when service starts

### Test Case 4: Appointment already in correct status
**Setup:** Appointment status is already CALLED when callNext is called
**Expected:**
- ✅ No duplicate transitions
- ✅ No errors
- ✅ Status remains CALLED

### Test Case 5: Complete service syncs appointment
**Setup:** Appointment in IN_CONSULT status
**Steps:**
1. Complete service
2. Appointment status → COMPLETED ✅

**Expected:**
- ✅ Existing sync logic still works
- ✅ Appointment marked as completed

---

## Related Documentation

- `CLINIC_APPOINTMENT_TO_TREATMENT_WORKFLOW_AUDIT.md` - Overall workflow audit
- `APPOINTMENT_INTAKE_WORKFLOW_FIX.md` - Intake workflow fix
- `appointmentStateMachine.ts` - Canonical state machine

---

## Architecture Notes

### State Machine Integrity

**Backend state machine is the single source of truth:**
- All status transitions must go through `assertTransition()`
- Queue service must respect the state machine when syncing appointment status
- Cannot skip states (e.g., cannot go directly from CHECKED_IN to CALLED without IN_QUEUE)

### Queue Ticket vs Appointment Status

**Queue ticket status** (queue.service.ts):
- WAITING → CALLED → IN_SERVICE → DONE
- Managed by queue service
- Represents position in queue

**Appointment status** (appointmentStateMachine.ts):
- CHECKED_IN → IN_QUEUE → CALLED → IN_CONSULT → COMPLETED
- Managed by appointment service
- Represents appointment lifecycle

**The sync:** Queue service must update appointment status to match queue workflow.

### Why This Wasn't Caught Earlier

1. **Queue service was designed for walk-ins:** Queue tickets can exist without appointments (walk-in patients)
2. **Partial sync:** Only `completeService` synced appointment status (to COMPLETED)
3. **Doctor workaround:** Doctor service creates visit even if appointment status is wrong (line 292-304 in doctor.service.ts)
4. **UI misleading:** UI showed "Checked in" and "Intake Complete" even though workflow wasn't complete

---

## Summary

**Root Cause:** Queue service updates queue ticket status but does not sync appointment status for intermediate states (IN_QUEUE, CALLED, IN_CONSULT).

**Fix:** Update `callNext()` and `startService()` in queue service to sync appointment status when queue ticket status changes.

**Result:** 
- ✅ Appointment status stays in sync with queue workflow
- ✅ Doctor can start treatment after queue workflow completes
- ✅ UI displays accurate status
- ✅ No 409 errors
- ✅ State machine integrity maintained

**Status:** 🔧 Ready for implementation
