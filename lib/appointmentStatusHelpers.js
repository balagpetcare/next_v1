/**
 * Appointment status action helpers. Mirrors backend state machine transitions
 * (backend-api: appointmentStateMachine.ts) so the UI stays in sync with allowed actions.
 * Single source of truth for "can X" checks on the staff appointments page.
 */

/** Statuses that allow CHECK_IN (BOOKED -> CHECKED_IN, CONFIRMED -> CHECKED_IN) */
const CHECK_IN_FROM = ["BOOKED", "CONFIRMED"];

/** Statuses that allow CONFIRM (BOOKED -> CONFIRMED) */
const CONFIRM_FROM = ["BOOKED"];

/** Statuses that allow CANCEL */
const CANCEL_FROM = ["BOOKED", "CONFIRMED", "DRAFT", "PRE_BOOKED"];

/** Statuses that allow NO_SHOW */
const NO_SHOW_FROM = ["BOOKED", "CONFIRMED", "DRAFT", "PRE_BOOKED"];

/** Statuses that allow RESCHEDULE (old appointment cancelled, new BOOKED created) */
const RESCHEDULE_FROM = ["BOOKED", "CONFIRMED"];

/** Statuses that allow PROMOTE (DRAFT/PRE_BOOKED -> BOOKED) */
const PROMOTE_FROM = ["DRAFT", "PRE_BOOKED"];

function normalize(status) {
  return typeof status === "string" ? status.toUpperCase() : "";
}

export function canCheckIn(status) {
  return CHECK_IN_FROM.includes(normalize(status));
}

export function canConfirm(status) {
  return CONFIRM_FROM.includes(normalize(status));
}

export function canCancel(status) {
  return CANCEL_FROM.includes(normalize(status));
}

export function canNoShow(status) {
  return NO_SHOW_FROM.includes(normalize(status));
}

export function canReschedule(status) {
  return RESCHEDULE_FROM.includes(normalize(status));
}

export function canPromote(status) {
  return PROMOTE_FROM.includes(normalize(status));
}

/** Complete intake = same statuses as promote (DRAFT/PRE_BOOKED) for the Complete Intake modal */
export function canCompleteIntake(status) {
  return PROMOTE_FROM.includes(normalize(status));
}

// ─── Queue-phase action helpers (mirrors state machine CALL/START_CONSULT/COMPLETE) ───

/** Statuses that allow explicit ENQUEUE (CHECKED_IN → IN_QUEUE) */
const ENQUEUE_FROM = ["CHECKED_IN"];

/** CALL is only valid from IN_QUEUE (state machine: CALL: [IN_QUEUE] → CALLED) */
const CALL_FROM = ["IN_QUEUE"];

/** START_CONSULT is only valid from CALLED */
const START_CONSULT_FROM = ["CALLED"];

/** COMPLETE is only valid from IN_CONSULT */
const COMPLETE_FROM = ["IN_CONSULT"];

/** Statuses where the appointment is actively in the queue/consult pipeline */
const ACTIVE_QUEUE_STATUSES = ["CHECKED_IN", "IN_QUEUE", "CALLED", "IN_CONSULT"];

export function canEnqueue(status) {
  return ENQUEUE_FROM.includes(normalize(status));
}

export function canCall(status) {
  return CALL_FROM.includes(normalize(status));
}

export function canStartConsult(status) {
  return START_CONSULT_FROM.includes(normalize(status));
}

export function canComplete(status) {
  return COMPLETE_FROM.includes(normalize(status));
}

/** True when the appointment is somewhere in the queue or consultation pipeline */
export function isInActiveQueue(status) {
  return ACTIVE_QUEUE_STATUSES.includes(normalize(status));
}

/** True when a Visit link should be available (in consult or completed with a visit) */
export function canOpenVisit(status) {
  return ["IN_CONSULT", "COMPLETED"].includes(normalize(status));
}
