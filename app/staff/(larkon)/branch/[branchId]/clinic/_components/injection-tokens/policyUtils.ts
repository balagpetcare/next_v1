/**
 * Helpers for medicine policy rows from GET .../medicine-control/policies
 */

export function policyVariantId(p: unknown): number | null {
  const row = p as Record<string, unknown> | null;
  if (!row) return null;
  const raw = row.variantId ?? (row.variant as Record<string, unknown> | undefined)?.id ?? row.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function policyVariantLabel(p: unknown): string {
  const row = p as Record<string, unknown>;
  const v = row?.variant as Record<string, unknown> | undefined;
  const product = v?.product as Record<string, unknown> | undefined;
  const title = (v?.title as string) ?? (row?.title as string) ?? "";
  const brand = (product?.name as string) ?? "";
  const sku = (v?.sku as string) ?? "";
  const strength = (v?.strength as string) ?? (v?.concentration as string) ?? "";
  const parts = [title || `Variant #${policyVariantId(p) ?? "?"}`];
  if (brand) parts.push(brand);
  if (strength) parts.push(String(strength));
  if (sku) parts.push(`SKU ${sku}`);
  return parts.filter(Boolean).join(" · ");
}

export type VariantDefaultsFromPolicy = {
  unit: string;
  route: string;
  price: string;
};

function readAttrString(attrs: unknown, key: string): string | null {
  if (!attrs || typeof attrs !== "object") return null;
  const v = (attrs as Record<string, unknown>)[key];
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Derive editable defaults when user picks a catalog variant */
export function defaultsFromMedicinePolicyRow(p: unknown): VariantDefaultsFromPolicy {
  const row = p as Record<string, unknown>;
  const v = row?.variant as Record<string, unknown> | undefined;
  const unitRow = v?.unit as Record<string, unknown> | undefined;
  const unit =
    (unitRow?.abbreviation as string)?.trim() ||
    (unitRow?.code as string)?.trim() ||
    (unitRow?.name as string)?.trim() ||
    "ml";
  const attrs = v?.attributes;
  const route =
    readAttrString(attrs, "defaultInjectionRoute") ||
    readAttrString(attrs, "defaultRoute") ||
    readAttrString(attrs, "route") ||
    "SQ";
  const priceRaw = row.branchSellingPrice;
  let price = "";
  if (priceRaw != null && priceRaw !== "") {
    const n = Number(priceRaw);
    if (Number.isFinite(n) && n >= 0) price = String(n);
  }
  return { unit, route: route.toUpperCase(), price };
}
