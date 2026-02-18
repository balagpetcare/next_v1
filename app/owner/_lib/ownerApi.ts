// Base API host (no trailing slash). Example: http://localhost:3000
const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** In browser use same-origin so Next.js rewrites /api to backend and cookies are sent (e.g. 3104 → 3000). */
function getBase(): string {
  if (typeof window !== "undefined") return "";
  return API_BASE;
}

export async function ownerGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${getBase()}${path}`, { method: "GET", credentials: "include" });
  const j = await res.json().catch(() => null);
  // 403 = no owner access (e.g. KYC onboarding) — return null to avoid console noise; callers should handle null
  if (res.status === 403) return null;
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

/** Same as ownerGet but returns null on 403/errors — use for optional UI (badges, counts) to avoid console noise */
export async function ownerGetSafe<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getBase()}${path}`, { method: "GET", credentials: "include" });
    if (res.status === 403) return null;
    const j = await res.json().catch(() => null);
    if (!res.ok) return null;
    return j;
  } catch {
    return null;
  }
}

export async function ownerPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = j?.error || j?.message || `Request failed (${res.status})`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).response = j;
    throw error;
  }
  return j;
}

export async function ownerPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

export async function ownerPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = j?.message || j?.error || `Request failed (${res.status})`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).response = j;
    throw error;
  }
  return j;
}

export async function ownerDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = j?.error || j?.message || `Request failed (${res.status})`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).response = j;
    throw error;
  }
  return j;
}

/** GET /api/v1/owner/hubs — ONLINE_HUB locations for order fulfilment filter */
export async function getOwnerHubs(): Promise<{ id: number; name: string; code: string | null; type: string; branch: { id: number; name: string } }[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>("/api/v1/owner/hubs");
  return (res?.data as { id: number; name: string; code: string | null; type: string; branch: { id: number; name: string } }[]) ?? [];
}

/** Multipart upload helper (FormData). Do NOT set Content-Type manually. */
export async function ownerUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

// ========== Universal Product Import (Owner panel) ==========
export interface ProductImportBatch {
  id: number;
  orgId: number;
  branchId: number | null;
  sourceType: string;
  provider: string | null;
  filename: string | null;
  status: string;
  totals: { total: number; ready: number; needsFix: number; error: number } | null;
  progress?: {
    processedRows: number;
    totalRows: number;
    progressPercent: number | null;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
  };
  createdBy: number;
  createdAt: string;
}

export interface ProductImportRow {
  id: number;
  batchId: number;
  externalProductKey: string;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown> | null;
  status: "READY" | "NEEDS_FIX" | "ERROR";
  issues: Array<{ code: string; message?: string; meta?: Record<string, unknown> }> | null;
  matchedProductId: number | null;
  createdAt: string;
}

export interface IntegrationMapping {
  id: number;
  orgId: number;
  provider: string;
  type: "CATEGORY" | "SUBCATEGORY" | "BRAND" | "UNIT";
  externalValue: string;
  internalId: number;
  confidence: number | null;
}

export async function listImportBatches(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await ownerGet<{ success?: boolean; data?: { items: ProductImportBatch[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/imports/products${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export async function uploadProductImport(file: File, provider?: string) {
  const form = new FormData();
  form.append("file", file);
  if (provider) form.append("provider", provider);
  return ownerUpload<{ success?: boolean; data?: { batchId: number; status: string; filename: string } }>(
    "/api/v1/owner/imports/products/upload",
    form
  );
}

export async function getImportBatch(batchId: number) {
  const res = await ownerGet<{ success?: boolean; data?: ProductImportBatch }>(`/api/v1/owner/imports/products/${batchId}`);
  return res?.data ?? null;
}

export async function getImportBatchRows(batchId: number, params?: { status?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await ownerGet<{ success?: boolean; data?: { items: ProductImportRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/imports/products/${batchId}/rows${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export async function revalidateImportBatch(batchId: number) {
  return ownerPost<{ success?: boolean; data?: { totals: { total: number; ready: number; needsFix: number; error: number } } }>(
    `/api/v1/owner/imports/products/${batchId}/revalidate`,
    {}
  );
}

export async function listImportMappings(params?: { type?: string; provider?: string }) {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.provider) q.set("provider", params.provider);
  const res = await ownerGet<{ success?: boolean; data?: IntegrationMapping[] }>(`/api/v1/owner/imports/mappings${q.toString() ? `?${q}` : ""}`);
  return (res?.data as IntegrationMapping[]) ?? [];
}

export async function upsertImportMapping(provider: string, type: "CATEGORY" | "SUBCATEGORY" | "BRAND" | "UNIT", externalValue: string, internalId: number) {
  return ownerPost<{ success?: boolean; data?: IntegrationMapping }>("/api/v1/owner/imports/mappings", {
    provider,
    type,
    externalValue,
    internalId,
  });
}

export async function publishImportBatch(
  batchId: number,
  opts?: { rowIds?: number[]; allowWarnings?: boolean }
) {
  const body: { rowIds?: number[]; allowWarnings?: boolean } = {};
  if (opts?.rowIds?.length) body.rowIds = opts.rowIds;
  if (opts?.allowWarnings) body.allowWarnings = true;
  return ownerPost<{
    success?: boolean;
    data?: {
      published: number;
      productIds: number[];
      publishBlockedCount?: number;
      publishWarningCount?: number;
    };
  }>(`/api/v1/owner/imports/products/${batchId}/publish`, body);
}

export async function fixImportRow(rowId: number, body: { mapping?: { type: string; externalValue: string; internalId: number }; setFields?: Record<string, unknown> }) {
  return ownerPost<{ success?: boolean; data?: { rowId: number; status: string; matchedProductId?: number; issues: unknown[] } }>(
    `/api/v1/owner/imports/products/rows/${rowId}/fix`,
    body
  );
}

export interface ProductImportBatchInsights {
  issueCodeCounts: { code: string; count: number }[];
  topUnmappedValues: {
    BRAND: { externalValue: string; count: number }[];
    CATEGORY: { externalValue: string; count: number }[];
    SUBCATEGORY: { externalValue: string; count: number }[];
  };
  publishableCount: number;
  needsFixCount: number;
  errorCount: number;
  timeStats: {
    createdAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    publishAt: string | null;
  };
}

export async function getImportBatchInsights(batchId: number): Promise<ProductImportBatchInsights | null> {
  const res = await ownerGet<{ success?: boolean; data?: ProductImportBatchInsights }>(
    `/api/v1/owner/imports/products/${batchId}/insights`
  );
  return res?.data ?? null;
}

export async function getImportBatchUnmapped(batchId: number, type: "BRAND" | "CATEGORY" | "SUBCATEGORY") {
  const res = await ownerGet<{ success?: boolean; data?: { type: string; items: { externalValue: string; count: number }[] } }>(
    `/api/v1/owner/imports/products/${batchId}/unmapped?type=${type}`
  );
  return res?.data ?? { type, items: [] };
}

export async function bulkFixImportBatch(
  batchId: number,
  body: {
    mappingUpdates?: Array<{ type: string; externalValue: string; internalId: number }>;
    setFields?: Record<string, unknown>;
    rowIds?: number[];
    issueType?: string;
    byExternalValue?: { type: "BRAND" | "CATEGORY" | "SUBCATEGORY"; externalValue: string };
  }
) {
  return ownerPost<{ success?: boolean; data?: { applied: number; fixed: number; totals: { total: number; ready: number; needsFix: number; error: number } } }>(
    `/api/v1/owner/imports/products/${batchId}/bulk-fix`,
    body
  );
}
