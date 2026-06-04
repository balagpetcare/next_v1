/**
 * Client-side heuristics for vaccine-related inventory rows (retail + clinical).
 * Aligns loosely with backend vaccine inventory bridge eligibility.
 */

export function retailSkuLooksLikeVaccine(
  productName: string,
  sku?: string | null,
  variantTitle?: string | null,
  categoryName?: string | null
): boolean {
  const blob = `${productName} ${sku ?? ""} ${variantTitle ?? ""} ${categoryName ?? ""}`.toLowerCase();
  if (/\bvaccin|\bvac\b|rabies|dhpp|dhppi|fvrcp|felv|bordetella|immun|cccv|ccvb/i.test(blob)) return true;
  const code = String(sku ?? "").toUpperCase();
  if (code.startsWith("VAC")) return true;
  return false;
}

export function clinicalItemLooksLikeVaccine(item?: {
  name?: string | null;
  itemCode?: string | null;
  domainType?: string | null;
  category?: { name?: string | null } | null;
} | null): boolean {
  if (!item) return false;
  const dt = String(item.domainType ?? "").toUpperCase();
  if (dt && dt !== "MEDICINE") return false;
  const name = String(item.name ?? "").toLowerCase();
  const code = String(item.itemCode ?? "").toUpperCase();
  const cat = String(item.category?.name ?? "").toLowerCase();
  if (code.startsWith("VAC")) return true;
  if (/\bvaccin|rabies|dhpp|fvrcp|felv|immun|bordetella/i.test(name) || cat.includes("vaccin")) return true;
  return false;
}

/** Days until expiry; negative if past. */
export function daysUntilCalendarDate(isoDate: string | Date | null | undefined): number | null {
  if (!isoDate) return null;
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

export function lotExpiryBadgeHint(expIso: string | null | undefined): "expired" | "soon" | null {
  const days = daysUntilCalendarDate(expIso ?? null);
  if (days == null) return null;
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return null;
}
