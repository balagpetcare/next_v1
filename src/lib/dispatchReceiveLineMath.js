/** Branch dispatch receive: line envelope, accepted split, excess (independent), and discrepancy UI options. */

export function getDispatchLineRemaining(line) {
  const d = Number(line?.quantityDispatched ?? 0);
  const r = Number(line?.quantityReceived ?? 0);
  const dm = Number(line?.quantityDamaged ?? 0);
  const s = Number(line?.quantityShort ?? 0);
  return Math.max(0, d - r - dm - s);
}

/** Remaining = Accepted + Damage + Shortage (envelope). Accepted = Remaining − Damage − Shortage. Excess is separate. */
export function acceptedFromDamageShort(remaining, damage, shortage) {
  const rem = Math.max(0, Number(remaining) || 0);
  const dmg = Math.max(0, Number(damage) || 0);
  const sh = Math.max(0, Number(shortage) || 0);
  return Math.max(0, rem - dmg - sh);
}

export function lineHasDamageOrShortage(damage, shortage) {
  return Math.max(0, Number(damage) || 0) > 0 || Math.max(0, Number(shortage) || 0) > 0;
}

export function lineHasExcess(excess) {
  return Math.max(0, Number(excess) || 0) > 0;
}

/** True if the row should show the discrepancy / excess documentation panel. */
export function lineNeedsDetailPanel(damage, shortage, excess) {
  return lineHasDamageOrShortage(damage, shortage) || lineHasExcess(excess);
}

export function lineDiscrepancyInputsOutOfRange(remaining, damage, shortage) {
  const rem = Math.max(0, Number(remaining) || 0);
  const dmg = Math.max(0, Number(damage) || 0);
  const sh = Math.max(0, Number(shortage) || 0);
  if (Number(damage) < 0 || Number(shortage) < 0) return true;
  if (dmg + sh > rem) return true;
  return false;
}

export function batchFullyAccountsForRemaining(remaining, accepted, damage, shortage) {
  const rem = Math.max(0, Number(remaining) || 0);
  if (rem <= 0) return true;
  const a = Math.max(0, Number(accepted) || 0);
  const dmg = Math.max(0, Number(damage) || 0);
  const sh = Math.max(0, Number(shortage) || 0);
  const sum = a + dmg + sh;
  if (sum <= 0) return false;
  return sum === rem;
}

export function parseNonNegInt(v, fallback = 0) {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/** @deprecated */
export function derivedShortage(remaining, accepted, damage) {
  const rem = Math.max(0, Number(remaining) || 0);
  const a = Math.max(0, Number(accepted) || 0);
  const dmg = Math.max(0, Number(damage) || 0);
  return Math.max(0, rem - a - dmg);
}

/** @deprecated */
export function lineNeedsDiscrepancyNote(remaining, accepted, damage, short) {
  const rem = Math.max(0, Number(remaining) || 0);
  const a = Math.max(0, Number(accepted) || 0);
  const dmg = Math.max(0, Number(damage) || 0);
  const sh = Math.max(0, Number(short) || 0);
  const total = a + dmg + sh;
  if (total <= 0) return false;
  return dmg > 0 || sh > 0 || total < rem;
}

export function dispatchLineKey(line) {
  return `${line.variantId}-${line.lotId ?? 0}`;
}

/** Values must match backend `DISPATCH_RECEIVE_LINE_DISCREPANCY_REASON_CODES`. */
export const DISPATCH_RECEIVE_DISCREPANCY_REASON_OPTIONS = [
  { value: "", label: "Select reason…" },
  { value: "DAMAGED_IN_TRANSIT", label: "Damaged in transit" },
  { value: "SHORT_SHIPPED", label: "Short shipped / not loaded" },
  { value: "NOT_SENT_BY_WAREHOUSE", label: "Not sent by warehouse" },
  { value: "LOST_IN_TRANSIT", label: "Lost in transit" },
  { value: "PACKING_MISMATCH", label: "Packing / SKU mismatch" },
  { value: "HELD_FOR_LATER_DELIVERY", label: "Held for later delivery" },
  { value: "QUALITY_ISSUE", label: "Quality issue on arrival" },
  { value: "OVER_DELIVERED", label: "Over-delivered (extra vs dispatch)" },
  { value: "EXTRA_ITEM_FOUND", label: "Extra item / unexpected SKU" },
  { value: "WRONG_DISPATCH_QTY", label: "Wrong quantity vs dispatch" },
  { value: "REVIEW_REQUIRED", label: "Review required" },
  { value: "OTHER", label: "Other (explain in details)" },
];
