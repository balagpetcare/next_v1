/**
 * User-facing messages for pharmacy / medicine requisition API errors.
 * Keeps staff/owner panels consistent; map known patterns, avoid dumping raw long errors.
 */
export function pharmacyApiUserMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  const msg = (raw || fallback).trim();
  const m = msg.toLowerCase();

  if (/^4\d\d\b|http.*40[34]|\b403\b|\bforbidden\b|not authorized|permission denied/i.test(msg)) {
    return "You don't have permission to do this.";
  }
  if (/\b401\b|unauthorized|session/i.test(m)) {
    return "Your session may have expired. Please sign in again.";
  }
  if (/\b404\b|not found/i.test(m)) {
    return "This requisition could not be found.";
  }
  if (/stock|insufficient|inventory|not enough|qty/i.test(m)) {
    return "Stock or quantities don't support this action. Check amounts and try again.";
  }
  if (/state|status|transition|cannot.*(submit|cancel|approve|reject|dispatch|receive)|invalid.*status/i.test(m)) {
    return "This action isn't allowed for the current requisition status.";
  }
  if (/duplicate|already exists|already on/i.test(m)) {
    return "That item is already on the requisition.";
  }
  if (msg.length > 160 || /prisma|sql|stack|ECONNREFUSED|fetch failed/i.test(m)) {
    return fallback;
  }
  return msg;
}

export function logPharmacyApiError(context: string, err: unknown): void {
  if (typeof console !== "undefined" && console.error) {
    console.error(`[pharmacy] ${context}`, err);
  }
}
