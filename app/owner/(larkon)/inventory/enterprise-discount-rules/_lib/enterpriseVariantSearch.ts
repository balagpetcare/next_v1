/**
 * Shape returned by GET /api/v1/inventory/variants/search (org-scoped catalog variants).
 */
export type VariantSearchHit = {
  id: number;
  sku: string;
  title: string;
  barcode: string | null;
  product?: { id?: number; name?: string; slug?: string | null } | null;
};

export function formatVariantSummary(hit: VariantSearchHit): string {
  const productName = hit.product?.name?.trim();
  const variantLabel = hit.title?.trim();
  if (productName && variantLabel) return `${productName} — ${variantLabel}`;
  if (productName) return productName;
  if (variantLabel) return variantLabel;
  return hit.sku || `Variant ${hit.id}`;
}
