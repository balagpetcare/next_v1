// Type declarations for stockRequestPoPrefill.js

export function parseOwnerStockRequestPrefillId(
  raw: unknown
): { ok: true; id: number } | { ok: false; reason: "missing" | "invalid" };

export function stockRequestDetailFromOwnerGetBody(
  body: unknown
): Record<string, unknown> | null;

export function getEligibleStockRequestLinesForPoPrefill(
  items: unknown
): {
  allItems: unknown[];
  eligible: Array<{ item: Record<string, unknown>; remainingQty: number }>;
};

export function mapEligibleStockRequestItemsToPoPrefillPatches(
  eligible: Array<{ item: Record<string, unknown>; remainingQty: number }>,
  stockRequestId: number
): Array<{
  variantId: number;
  sku: string;
  title: string;
  productLabel: string;
  orderedQty: string;
  unitCost: string;
  note: string;
}>;
