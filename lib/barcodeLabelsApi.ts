const BULK_STORAGE_KEY = "bpa_barcode_bulk_labels_v1";
const STAFF_BULK_STORAGE_PREFIX = "barcode_bulk_labels_staff_branch_";

export type BulkLabelItem = {
  type: string;
  variantId?: number;
  lotId?: number;
  copies?: number;
};

export type BulkLabelSession = {
  branchId: number;
  items: BulkLabelItem[];
};

export async function fetchProductBarcodeLabel(variantId: number, branchId: number): Promise<unknown> {
  const res = await fetch(
    `/api/v1/barcodes/labels/product/${encodeURIComponent(String(variantId))}?branchId=${encodeURIComponent(String(branchId))}`,
    { credentials: "include", cache: "no-store" }
  );
  const j = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(j?.message || `Failed to load label (${res.status})`);
  return j?.data;
}

export async function fetchBatchBarcodeLabel(lotId: number, branchId: number): Promise<unknown> {
  const res = await fetch(
    `/api/v1/barcodes/labels/batch/${encodeURIComponent(String(lotId))}?branchId=${encodeURIComponent(String(branchId))}`,
    { credentials: "include", cache: "no-store" }
  );
  const j = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(j?.message || `Failed to load label (${res.status})`);
  return j?.data;
}

export async function fetchBulkBarcodeLabels(body: { branchId: number; items: BulkLabelItem[] }): Promise<{
  labels?: unknown[];
  preset?: string | null;
}> {
  const res = await fetch("/api/v1/barcodes/labels/bulk", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { message?: string; data?: { labels?: unknown[]; preset?: string | null } };
  if (!res.ok) throw new Error(j?.message || `Bulk label failed (${res.status})`);
  return j?.data ?? {};
}

export function saveBulkLabelSession(payload: BulkLabelSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BULK_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readBulkLabelSession(): BulkLabelSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BULK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BulkLabelSession;
  } catch {
    return null;
  }
}

function staffBulkLabelSessionKey(branchId: number | string): string {
  return `${STAFF_BULK_STORAGE_PREFIX}${String(branchId)}`;
}

export function saveStaffBulkLabelSession(branchId: number | string, payload: BulkLabelSession): void {
  if (typeof window === "undefined") return;
  try {
    const bid = Number(branchId);
    sessionStorage.setItem(staffBulkLabelSessionKey(branchId), JSON.stringify({ ...payload, branchId: bid }));
  } catch {
    /* ignore */
  }
}

export function readStaffBulkLabelSession(branchId: number | string): BulkLabelSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(staffBulkLabelSessionKey(branchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BulkLabelSession;
    if (String(parsed?.branchId) !== String(branchId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStaffBulkLabelSession(branchId: number | string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(staffBulkLabelSessionKey(branchId));
  } catch {
    /* ignore */
  }
}

export function clearBulkLabelSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BULK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type BranchLotLabelRow = {
  lotId: number;
  lotCode?: string;
  variantId: number;
  productName?: string;
  sku?: string;
  variantTitle?: string;
  labelBarcode?: string | null;
  supplierBarcode?: string | null;
  packDisplay?: string | null;
  mfgDate?: string;
  expDate?: string;
  availableQty?: number;
  mrp?: number | null;
  effectiveSellPrice?: number | null;
  sellPrice?: number | null;
  priceSource?: string;
  status?: string;
};

export async function fetchBranchLotsForLabels(
  branchId: number,
  params: {
    q?: string;
    stockGt0?: boolean;
    nearExpiry?: boolean;
    expired?: boolean;
    hasLabelBarcode?: boolean;
    missingLabelBarcode?: boolean;
  } = {}
): Promise<{
  shopLocationId: number | null;
  items: BranchLotLabelRow[];
  batchPricingEnabled?: boolean;
  warning?: string | null;
}> {
  const q = new URLSearchParams();
  q.set("branchId", String(branchId));
  if (params.q) q.set("q", params.q);
  if (params.stockGt0) q.set("stockGt0", "1");
  if (params.nearExpiry) q.set("nearExpiry", "1");
  if (params.expired) q.set("expired", "1");
  if (params.hasLabelBarcode) q.set("hasLabelBarcode", "1");
  if (params.missingLabelBarcode) q.set("missingLabelBarcode", "1");
  const res = await fetch(`/api/v1/barcodes/branch-lots?${q}`, { credentials: "include", cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(j?.message || `Failed to load batches (${res.status})`);
  const d = j.data as {
    shopLocationId?: number | null;
    items?: BranchLotLabelRow[];
    batchPricingEnabled?: boolean;
    warning?: string | null;
  };
  return {
    shopLocationId: d?.shopLocationId ?? null,
    items: Array.isArray(d?.items) ? d.items : [],
    batchPricingEnabled: d?.batchPricingEnabled,
    warning: d?.warning ?? null,
  };
}

export type BranchVariantLabelRow = {
  variantId: number;
  productId?: number;
  productName?: string;
  variantTitle?: string;
  sku?: string;
  barcode?: string | null;
  mrp?: number | null;
  listPrice?: number | null;
  isActive?: boolean;
  brandName?: string | null;
};

export async function fetchBranchVariantsForLabels(
  branchId: number,
  q: string,
  limit = 50
): Promise<BranchVariantLabelRow[]> {
  const qs = new URLSearchParams({ branchId: String(branchId), limit: String(limit) });
  if (q.trim()) qs.set("q", q.trim());
  const res = await fetch(`/api/v1/barcodes/branch-variants?${qs}`, { credentials: "include", cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as { message?: string; data?: { items?: BranchVariantLabelRow[] } };
  if (!res.ok) throw new Error(j?.message || `Failed to load variants (${res.status})`);
  return Array.isArray(j?.data?.items) ? j.data.items : [];
}

export async function patchLotLabelBarcodeApi(
  lotId: number,
  branchId: number,
  labelBarcode: string | null
): Promise<{ lotId: number; labelBarcode: string | null }> {
  const res = await fetch(`/api/v1/barcodes/lots/${encodeURIComponent(String(lotId))}/label-barcode`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ branchId, labelBarcode }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    message?: string;
    data?: { lotId: number; labelBarcode: string | null };
  };
  if (!res.ok) throw new Error(j?.message || `Update failed (${res.status})`);
  if (!j?.data) throw new Error("Invalid response");
  return j.data;
}