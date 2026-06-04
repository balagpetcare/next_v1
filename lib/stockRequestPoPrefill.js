/**
 * Owner PO create: parse ?fromRequestId= and map stock request API payloads to prefilled lines.
 * Pure helpers — safe for node --test without React.
 */

/**
 * @param {unknown} raw — e.g. searchParams.get("fromRequestId")
 * @returns {{ ok: true, id: number } | { ok: false, reason: "missing" | "invalid" }}
 */
export function parseOwnerStockRequestPrefillId(raw) {
  if (raw == null) return { ok: false, reason: "missing" };
  const t = String(raw).trim();
  if (t === "") return { ok: false, reason: "missing" };
  if (!/^\d+$/.test(t)) return { ok: false, reason: "invalid" };
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < 1) return { ok: false, reason: "invalid" };
  return { ok: true, id: n };
}

/**
 * Normalize ownerGet / API envelope to the stock request row.
 * GET /api/v1/stock-requests/:id returns { success, data }.
 * @param {unknown} body
 * @returns {Record<string, unknown> | null}
 */
export function stockRequestDetailFromOwnerGetBody(body) {
  if (body == null || typeof body !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (body);
  if (o.data != null && typeof o.data === "object") {
    const d = /** @type {Record<string, unknown>} */ (o.data);
    if (d.id != null) return d;
    return null;
  }
  if (o.id != null) return o;
  return null;
}

/**
 * @param {unknown} items
 * @returns {{ allItems: unknown[], eligible: Array<{ item: Record<string, unknown>, remainingQty: number }> }}
 */
export function getEligibleStockRequestLinesForPoPrefill(items) {
  const allItems = Array.isArray(items) ? items : [];
  /** @type {Array<{ item: Record<string, unknown>, remainingQty: number }>} */
  const eligible = [];
  for (const raw of allItems) {
    if (raw == null || typeof raw !== "object") continue;
    const item = /** @type {Record<string, unknown>} */ (raw);
    if (item.lineKind === "EXTRA") continue;
    const vid = Number(item.variantId);
    if (!Number.isFinite(vid) || vid < 1) continue;
    const requested = Number(item.requestedQty) || 0;
    const fulfilled = Number(item.fulfilledQty) || 0;
    const cancelledQty = Number(item.cancelledQty) || 0;
    const remaining = Math.max(0, requested - fulfilled - cancelledQty);
    if (remaining <= 0) continue;
    eligible.push({ item, remainingQty: remaining });
  }
  return { allItems, eligible };
}

/**
 * Plain row fields merged into LineDraft (caller adds key via newLine()).
 * @param {Array<{ item: Record<string, unknown>, remainingQty: number }>} eligible
 * @param {number} stockRequestId
 * @returns {Array<{ variantId: number, sku: string, title: string, productLabel: string, orderedQty: string, unitCost: string, note: string }>}
 */
export function mapEligibleStockRequestItemsToPoPrefillPatches(eligible, stockRequestId) {
  return eligible.map(({ item, remainingQty }) => {
    const v =
      item.variant != null && typeof item.variant === "object"
        ? /** @type {Record<string, unknown>} */ (item.variant)
        : {};
    const p =
      item.product != null && typeof item.product === "object"
        ? /** @type {Record<string, unknown>} */ (item.product)
        : {};
    const vid = Number(item.variantId);
    const itemId = Number(item.id);
    return {
      variantId: vid,
      sku: typeof v.sku === "string" ? v.sku : String(v.sku ?? ""),
      title: typeof v.title === "string" ? v.title : String(v.title ?? ""),
      productLabel: typeof p.name === "string" ? p.name : String(p.name ?? ""),
      orderedQty: String(Math.max(1, remainingQty)),
      unitCost: "",
      note: `Stock request #${stockRequestId} line #${Number.isFinite(itemId) ? itemId : "?"}`,
    };
  });
}
