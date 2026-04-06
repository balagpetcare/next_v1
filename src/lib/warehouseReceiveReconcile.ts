/**
 * Manager receive line reconciliation: accepted + damaged + short = expectedRef + extra
 * (aligned with backend applyManagerConfirmLineEdits / PO vs non-PO expectedRef.)
 */

export type LineQtyField = "accepted" | "damaged" | "short" | "extra";

export type LineQuantities = {
  acceptedQty: number;
  damagedQty: number;
  shortQty: number;
  extraQty: number;
};

export function deriveAcceptedFromOthers(expectedRef: number, damaged: number, short: number, extra: number): number {
  return Math.max(0, Math.floor(expectedRef + extra - damaged - short));
}

export function deriveShortFromOthers(expectedRef: number, accepted: number, damaged: number, extra: number): number {
  return Math.max(0, Math.floor(expectedRef + extra - accepted - damaged));
}

export function isLineBalanced(expectedRef: number, q: LineQuantities): boolean {
  const lhs = q.acceptedQty + q.damagedQty + q.shortQty;
  const rhs = expectedRef + q.extraQty;
  return lhs === rhs;
}

/**
 * @param field - which field the user just edited
 * @returns updated quantities and which field was auto-derived for UX hints
 */
export function applyQuantityEdit(
  expectedRef: number,
  prev: LineQuantities,
  field: LineQtyField,
  rawValue: number
): { next: LineQuantities; autoDerived: LineQtyField } {
  const v = Math.max(0, Math.floor(Number(rawValue) || 0));

  if (field === "accepted") {
    const shortQty = deriveShortFromOthers(expectedRef, v, prev.damagedQty, prev.extraQty);
    return {
      next: { ...prev, acceptedQty: v, shortQty },
      autoDerived: "short",
    };
  }

  if (field === "damaged") {
    const acceptedQty = deriveAcceptedFromOthers(expectedRef, v, prev.shortQty, prev.extraQty);
    return {
      next: { ...prev, damagedQty: v, acceptedQty },
      autoDerived: "accepted",
    };
  }

  if (field === "short") {
    const acceptedQty = deriveAcceptedFromOthers(expectedRef, prev.damagedQty, v, prev.extraQty);
    return {
      next: { ...prev, shortQty: v, acceptedQty },
      autoDerived: "accepted",
    };
  }

  // extra
  const acceptedQty = deriveAcceptedFromOthers(expectedRef, prev.damagedQty, prev.shortQty, v);
  return {
    next: { ...prev, extraQty: v, acceptedQty },
    autoDerived: "accepted",
  };
}

/** Toolbar: recalculate short from current A/D/E */
export function recalculateShort(expectedRef: number, q: LineQuantities): LineQuantities {
  return {
    ...q,
    shortQty: deriveShortFromOthers(expectedRef, q.acceptedQty, q.damagedQty, q.extraQty),
  };
}

/** Toolbar: fix invalid — first derive accepted; then if still off, derive short */
export function fixInvalidLine(expectedRef: number, q: LineQuantities): LineQuantities {
  let acceptedQty = deriveAcceptedFromOthers(expectedRef, q.damagedQty, q.shortQty, q.extraQty);
  let shortQty = q.shortQty;
  let next = { ...q, acceptedQty };
  if (!isLineBalanced(expectedRef, next)) {
    shortQty = deriveShortFromOthers(expectedRef, acceptedQty, q.damagedQty, q.extraQty);
    next = { ...next, shortQty };
  }
  return next;
}

/** Auto balance one line: prefer deriving accepted unless last edit was "accepted" → derive short */
export function autoBalanceLine(
  expectedRef: number,
  q: LineQuantities,
  lastQtyEdit: LineQtyField | null
): LineQuantities {
  if (lastQtyEdit === "accepted") {
    return { ...q, shortQty: deriveShortFromOthers(expectedRef, q.acceptedQty, q.damagedQty, q.extraQty) };
  }
  return {
    ...q,
    acceptedQty: deriveAcceptedFromOthers(expectedRef, q.damagedQty, q.shortQty, q.extraQty),
  };
}

export function autoBalanceAllLines(
  rows: Array<{ expectedRef: number; lastQtyEdit: LineQtyField | null } & LineQuantities>
): LineQuantities[] {
  return rows.map((r) => autoBalanceLine(r.expectedRef, r, r.lastQtyEdit));
}

/** Set exact receive: accepted = expectedRef, rest zero */
export function setExactReceive(expectedRef: number): LineQuantities {
  return {
    acceptedQty: Math.max(0, Math.floor(expectedRef)),
    damagedQty: 0,
    shortQty: 0,
    extraQty: 0,
  };
}

/** All short: accepted = 0, damaged = 0, short = expectedRef + extra (extra preserved) */
export function setAllShort(expectedRef: number, extraQty: number): LineQuantities {
  const e = Math.max(0, Math.floor(extraQty));
  return {
    acceptedQty: 0,
    damagedQty: 0,
    shortQty: Math.max(0, expectedRef + e),
    extraQty: e,
  };
}
