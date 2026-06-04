/**
 * Deduplicate variant rows for dropdowns (inventory list items often repeat the same variant per stock row).
 * Primary key: numeric variant id (string ids normalized to number).
 * Tie-break: prefer row with sku, then title, then first occurrence.
 */

export type VariantOptionRow = {
  id: number;
  sku?: string | null;
  title?: string | null;
  product?: unknown;
  /** Optional display field (e.g. owner transfer form). */
  productName?: string | null;
};

function normalizeVariantId(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function scoreVariantRow(v: { sku?: string | null; title?: string | null; productName?: string | null }): number {
  let s = 0;
  if (v.sku != null && String(v.sku).trim() !== "") s += 4;
  if (v.title != null && String(v.title).trim() !== "") s += 2;
  if (v.productName != null && String(v.productName).trim() !== "") s += 1;
  return s;
}

/**
 * Deduplicate variant rows by id. Invalid/missing ids are dropped.
 */
export function getUniqueVariants(
  variantRows: Array<Partial<VariantOptionRow> & { id?: unknown; productName?: string | null }>
): VariantOptionRow[] {
  const byId = new Map<number, VariantOptionRow>();
  let validInputCount = 0;

  for (const row of variantRows) {
    const id = normalizeVariantId(row.id);
    if (id == null) continue;
    validInputCount += 1;

    const candidate: VariantOptionRow = {
      id,
      sku: row.sku ?? null,
      title: row.title ?? null,
      product: row.product,
      productName: row.productName ?? null,
    };

    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, candidate);
      continue;
    }
    if (scoreVariantRow(candidate) > scoreVariantRow(prev)) {
      byId.set(id, candidate);
    }
  }

  if (process.env.NODE_ENV === "development" && validInputCount > byId.size) {
    console.warn(
      `[getUniqueVariants] Deduplicated ${validInputCount - byId.size} duplicate variant id entr(y/ies) (${validInputCount} rows → ${byId.size} unique)`
    );
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

/**
 * Extract variant options from staff inventory list API items (`items[].variant`).
 */
export function getUniqueVariantsFromStaffInventoryItems(
  items: Array<{
    variant?: { id?: unknown; sku?: string | null; title?: string | null; product?: unknown } | null;
  } | null | undefined>
): VariantOptionRow[] {
  const rows: Array<Partial<VariantOptionRow> & { id?: unknown }> = [];
  for (const i of items) {
    if (!i?.variant) continue;
    const v = i.variant;
    const id = normalizeVariantId(v.id);
    if (id == null) continue;
    rows.push({
      id,
      sku: v.sku,
      title: v.title,
      product: v.product,
    });
  }
  return getUniqueVariants(rows);
}
