// Base API host (no trailing slash). Example: http://localhost:3000
const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** In browser use same-origin so Next.js rewrites /api to backend and cookies are sent (e.g. 3104 → 3000). */
function getBase(): string {
  if (typeof window !== "undefined") return "";
  return API_BASE;
}

/** Use backend URL directly for owner clinic catalog calls (avoids Next.js proxy 404). */
function getCatalogBase(): string {
  return API_BASE;
}

/** JSON envelopes often infer `data` as `{}`, which fails strict `Record<string, unknown>` assignment. */
function asJsonRecord(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

/** GET that hits backend directly (for owner clinic catalog when proxy returns 404). */
async function ownerGetCatalog<T>(path: string): Promise<T | null> {
  const res = await fetch(`${getCatalogBase()}${path}`, { method: "GET", credentials: "include", cache: "no-store" });
  const j = await res.json().catch(() => null);
  if (res.status === 403) return null;
  if (!res.ok) throw new Error((j as { message?: string })?.message || `Request failed (${res.status})`);
  return j as T;
}

/** POST that hits backend directly (for owner clinic catalog when proxy returns 404). */
async function ownerPostCatalog<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getCatalogBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (j as { message?: string })?.message || `Request failed (${res.status})`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return j as T;
}

export async function ownerGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${getBase()}${path}`, { method: "GET", credentials: "include", cache: "no-store" });
  const j = await res.json().catch(() => null);
  // 403 = no owner access (e.g. KYC onboarding) — return null to avoid console noise; callers should handle null
  if (res.status === 403) return null;
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

/** Same as ownerGet but returns null on 403/errors — use for optional UI (badges, counts) to avoid console noise */
export async function ownerGetSafe<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getBase()}${path}`, { method: "GET", credentials: "include", cache: "no-store" });
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

// ========== Clinic Setup (Owner Panel) ==========
export async function ownerClinicBranches(): Promise<{ success?: boolean; data?: unknown[] } | null> {
  return ownerGet<{ success?: boolean; data?: unknown[] }>("/api/v1/owner/clinic/branches");
}

export interface OwnerClinicNetworkStats {
  totalClinics: number;
  activeDoctors: number;
  todayAppointments: number;
  todayRevenue: number;
  pendingApprovals: number;
  lowStockAlerts: number;
  branchStats?: Array<{
    branchId: number;
    branchName: string;
    status?: string;
    servicesCount: number;
    staffCount: number;
    doctorsCount: number;
    todayAppointments: number;
    todayPatients: number;
    todayRevenue: number;
  }>;
  patientFlowTrend?: Array<{ date: string; appointments: number; visits: number }>;
  revenueByClinic?: Array<{ branchId: number; branchName: string; revenue: number }>;
  servicePopularity?: Array<{ serviceId: number; serviceName: string; count: number }>;
}

export async function ownerClinicNetworkStats(): Promise<OwnerClinicNetworkStats | null> {
  const res = await ownerGet<{ success?: boolean; data?: OwnerClinicNetworkStats }>(
    "/api/v1/owner/clinic/network-stats"
  );
  return res?.data ?? null;
}

export interface OwnerClinicDashboardStats {
  branchId: number;
  todayAppointments: number;
  walkIns: number;
  surgeriesToday: number;
  doctorsOnDuty: number;
  medicineAlerts: number;
  lowStockAlerts: number;
  todayPatients: number;
  todayRevenue: number;
  pendingApprovals: number;
  expiringItems: number;
  patientFlowData: Array<{ date: string; appointments: number; visits: number; revenue: number }>;
  doctorPerformanceData: Array<{ doctorId: number; doctorName: string; completedVisits: number; appointments: number }>;
  revenueTrendData: Array<{ date: string; revenue: number }>;
}

export async function ownerClinicDashboardStats(
  branchId: string | number
): Promise<OwnerClinicDashboardStats | null> {
  const resolvedBranchId = String(branchId ?? "").trim();
  if (!resolvedBranchId) return null;
  const res = await ownerGet<{ success?: boolean; data?: OwnerClinicDashboardStats }>(
    `/api/v1/owner/clinic/branches/${resolvedBranchId}/dashboard-stats`
  );
  return res?.data ?? null;
}

/** Same as ownerClinicDashboardStats but never throws (returns null on 404/403/error). Use in headers/optional UI. */
export async function ownerClinicDashboardStatsSafe(
  branchId: string | number
): Promise<OwnerClinicDashboardStats | null> {
  const resolvedBranchId = String(branchId ?? "").trim();
  if (!resolvedBranchId) return null;
  const res = await ownerGetSafe<{ success?: boolean; data?: OwnerClinicDashboardStats }>(
    `/api/v1/owner/clinic/branches/${resolvedBranchId}/dashboard-stats`
  );
  return res?.data ?? null;
}

// --- Clinic module enable/disable (owner-primary control) ---
export interface ClinicModuleData {
  branchId: number;
  clinicEnabled: boolean;
}

export async function ownerClinicModuleGet(branchId: string | number): Promise<ClinicModuleData | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicModuleData }>(
    `/api/v1/owner/clinic/branches/${branchId}/modules/clinic`
  );
  return res?.data ?? null;
}

export async function ownerClinicModuleUpdate(
  branchId: string | number,
  data: { enabled: boolean }
): Promise<ClinicModuleData | null> {
  const res = await ownerPatch<{ success?: boolean; data?: ClinicModuleData }>(
    `/api/v1/owner/clinic/branches/${branchId}/modules/clinic`,
    { enabled: data.enabled }
  );
  return (res as { data?: ClinicModuleData })?.data ?? null;
}

// --- Clinic staff permission overrides (clinic.* only; array of permission strings) ---
export async function ownerClinicStaffPermissionsUpdate(
  branchId: string | number,
  memberId: string | number,
  permissionOverrides: string[]
): Promise<{ permissionOverrides: string[] } | null> {
  const res = await ownerPatch<{ success?: boolean; data?: { permissionOverrides: string[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/staff/${memberId}/permissions`,
    { permissionOverrides }
  );
  return (res as { data?: { permissionOverrides: string[] } })?.data ?? null;
}

export async function ownerClinicSettings(branchId: string | number) {
  const res = await ownerGet<{ success?: boolean; data?: Record<string, unknown> }>(
    `/api/v1/owner/clinic/branches/${branchId}/settings`
  );
  return res?.data ?? null;
}

export async function ownerClinicSettingsUpdate(branchId: string | number, data: Record<string, unknown>) {
  const res = await ownerPut<{ success?: boolean; data?: Record<string, unknown> }>(
    `/api/v1/owner/clinic/branches/${branchId}/settings`,
    data
  );
  return (res as { data?: Record<string, unknown> })?.data ?? null;
}

export async function ownerClinicServices(branchId: string | number) {
  const res = await ownerGet<{ success?: boolean; items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/services`
  );
  return res ?? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export type ClinicServiceCreateData = {
  name: string;
  description?: string;
  category: string;
  price: number;
  duration?: number;
  isRecurring?: boolean;
  status?: string;
  department?: string;
  paymentGateRule?: string;
  serviceCode?: string | null;
  prerequisiteRule?: object | null;
  allowDiscount?: boolean;
  maxDiscountPct?: number | null;
  discountNeedsApproval?: boolean;
  applicableSpecies?: string[] | null;
};

export async function ownerClinicServiceCreate(branchId: string | number, data: ClinicServiceCreateData) {
  return ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/services`,
    data
  );
}

export type ClinicServiceUpdateData = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  duration?: number;
  isRecurring?: boolean;
  status?: string;
  department?: string;
  paymentGateRule?: string;
  serviceCode?: string | null;
  allowDiscount?: boolean;
  maxDiscountPct?: number | null;
  discountNeedsApproval?: boolean;
  applicableSpecies?: string[] | null;
};

export async function ownerClinicServiceUpdate(
  branchId: string | number,
  serviceId: string | number,
  data: ClinicServiceUpdateData
) {
  return ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/services/${serviceId}`,
    data
  );
}

export async function ownerClinicServiceDelete(branchId: string | number, serviceId: string | number) {
  return ownerDelete<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/services/${serviceId}`
  );
}

export async function ownerClinicServiceVariants(branchId: string | number, serviceId: string | number) {
  const res = await ownerGet<{ success?: boolean; data?: { id: number; species: string; sex?: string; price: number; isActive: boolean }[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/services/${serviceId}/variants`
  );
  return (res as { data?: unknown })?.data ?? [];
}

export async function ownerClinicServiceVariantsPut(
  branchId: string | number,
  serviceId: string | number,
  variants: Array<{ species: string; sex?: string | null; price: number; isActive?: boolean }>
) {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/services/${serviceId}/variants`,
    { variants }
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicServiceProposals(branchId: string | number, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await ownerGet<{ success?: boolean; branch?: { id: number; name: string }; proposals?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/service-proposals${q}`
  );
  return res ?? { branch: null, proposals: [] };
}

export async function ownerClinicServiceProposalReview(
  branchId: string | number,
  proposalId: string | number,
  data: { action: "APPROVED" | "REJECTED"; reviewNote?: string }
) {
  return ownerPost<{ success?: boolean; proposal?: unknown; createdService?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/service-proposals/${proposalId}/review`,
    data
  );
}

export async function ownerClinicStaff(branchId: string | number) {
  const res = await ownerGet<{ success?: boolean; data?: { branch: { id: number; name: string; orgId: number }; members: unknown[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/staff`
  );
  return res?.data ?? null;
}

// --- Clinic Rooms ---
export interface ClinicRoom {
  id: number;
  orgId: number;
  branchId: number;
  name: string;
  roomType: string;
  code?: string | null;
  floor?: string | null;
  zone?: string | null;
  capacity?: number | null;
  status: string;
  operationalStatus?: string;
  notes?: string | null;
  bookable?: boolean;
  cleaningBufferMinutes?: number | null;
  maintenanceBufferMinutes?: number | null;
  supportsWalkIns?: boolean;
  emergencyOverrideAllowed?: boolean;
  preferredDoctorIds?: number[];
  allowedServiceIds?: number[];
  allowedPackageIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export type RoomSummary = {
  total: number;
  availableNow: number;
  occupiedNow: number;
  cleaning: number;
  maintenance: number;
  blocked: number;
  todayBookings: number;
};

export async function ownerClinicRooms(
  branchId: string | number,
  params?: { roomType?: string; status?: string; operationalStatus?: string; zone?: string; floor?: string; summary?: boolean }
): Promise<ClinicRoom[] | null> {
  const q = new URLSearchParams();
  if (params?.roomType) q.set("roomType", params.roomType);
  if (params?.status) q.set("status", params.status);
  if (params?.operationalStatus) q.set("operationalStatus", params.operationalStatus);
  if (params?.zone) q.set("zone", params.zone);
  if (params?.floor) q.set("floor", params.floor);
  if (params?.summary) q.set("summary", "1");
  const url = `/api/v1/owner/clinic/branches/${branchId}/rooms${q.toString() ? `?${q.toString()}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: ClinicRoom[]; summary?: RoomSummary }>(url);
  return res?.data ?? null;
}

export async function ownerClinicRoomsWithSummary(
  branchId: string | number,
  filters?: { roomType?: string; status?: string; operationalStatus?: string; zone?: string; floor?: string }
): Promise<{ rooms: ClinicRoom[]; summary: RoomSummary } | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicRoom[]; summary?: RoomSummary }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms?summary=1${filters?.roomType ? `&roomType=${encodeURIComponent(filters.roomType)}` : ""}${filters?.status ? `&status=${encodeURIComponent(filters.status)}` : ""}${filters?.operationalStatus ? `&operationalStatus=${encodeURIComponent(filters.operationalStatus)}` : ""}${filters?.zone ? `&zone=${encodeURIComponent(filters.zone)}` : ""}${filters?.floor ? `&floor=${encodeURIComponent(filters.floor)}` : ""}`
  );
  if (!res?.data) return null;
  return { rooms: res.data, summary: res.summary ?? { total: 0, availableNow: 0, occupiedNow: 0, cleaning: 0, maintenance: 0, blocked: 0, todayBookings: 0 } };
}

export async function ownerClinicRoomDetail(branchId: string | number, roomId: string | number): Promise<ClinicRoom | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicRoom }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms/${roomId}`
  );
  return res?.data ?? null;
}

export type RoomAuditEntry = { id: number; action: string; summaryText: string; actorId: string; createdAt: string };

export async function ownerClinicRoomAudit(branchId: string | number, roomId: string | number, limit?: number): Promise<RoomAuditEntry[]> {
  const url = `/api/v1/owner/clinic/branches/${branchId}/rooms/${roomId}/audit${limit != null ? `?limit=${limit}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: RoomAuditEntry[] }>(url);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function ownerClinicRoomCreate(
  branchId: string | number,
  data: {
    name: string;
    roomType?: string;
    code?: string;
    floor?: string;
    zone?: string;
    capacity?: number;
    status?: string;
    notes?: string;
    bookable?: boolean;
    cleaningBufferMinutes?: number;
    maintenanceBufferMinutes?: number;
    supportsWalkIns?: boolean;
    emergencyOverrideAllowed?: boolean;
    preferredDoctorIds?: number[];
    allowedServiceIds?: number[];
    allowedPackageIds?: number[];
  }
) {
  const res = await ownerPost<{ success?: boolean; data?: ClinicRoom }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms`,
    data
  );
  return (res as { data?: ClinicRoom })?.data ?? null;
}

export async function ownerClinicRoomUpdate(
  branchId: string | number,
  roomId: string | number,
  data: {
    name?: string;
    roomType?: string;
    code?: string;
    floor?: string;
    zone?: string;
    capacity?: number;
    status?: string;
    operationalStatus?: string;
    notes?: string;
    bookable?: boolean;
    cleaningBufferMinutes?: number;
    maintenanceBufferMinutes?: number;
    supportsWalkIns?: boolean;
    emergencyOverrideAllowed?: boolean;
    preferredDoctorIds?: number[];
    allowedServiceIds?: number[];
    allowedPackageIds?: number[];
  }
) {
  const res = await ownerPatch<{ success?: boolean; data?: ClinicRoom }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms/${roomId}`,
    data
  );
  return (res as { data?: ClinicRoom })?.data ?? null;
}

export async function ownerClinicRoomDelete(branchId: string | number, roomId: string | number) {
  const res = await ownerDelete<{ success?: boolean; data?: ClinicRoom }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms/${roomId}`
  );
  return (res as { data?: ClinicRoom })?.data ?? null;
}

export type ScheduleBoardAppointment = {
  id: number;
  roomId: number | null;
  roomName: string | null;
  doctorId: number | null;
  doctorName: string | null;
  serviceId: number;
  serviceName: string;
  patientId: number | null;
  petId: number | null;
  petName: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  hasConflict: boolean;
};

export type ScheduleBoardResult = {
  dateFrom: string;
  dateTo: string;
  rooms: { id: number; name: string; code: string | null; roomType: string }[];
  appointments: ScheduleBoardAppointment[];
  conflicts: { appointmentId: number; roomId: number; overlapsWith: number[] }[];
};

export async function ownerScheduleBoard(
  branchId: string | number,
  params?: { dateFrom?: string; dateTo?: string; roomId?: number; doctorId?: number; serviceId?: number }
): Promise<ScheduleBoardResult | null> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.roomId != null) q.set("roomId", String(params.roomId));
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  const res = await ownerGet<{ success?: boolean; data?: ScheduleBoardResult }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule-board${q.toString() ? `?${q.toString()}` : ""}`
  );
  return res?.data ?? null;
}

export async function ownerRoomSchedule(
  branchId: string | number,
  roomId: string | number,
  date?: string
): Promise<ScheduleBoardAppointment[]> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await ownerGet<{ success?: boolean; data?: ScheduleBoardAppointment[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms/${roomId}/schedule${q}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

// --- Clinic Staff Profile ---
export interface ClinicStaffProfileData {
  branchMemberId: number;
  displayName?: string | null;
  staffType: string;
  licenseNumber?: string | null;
  specializationTags?: string[];
  defaultConsultationFee?: number | null;
  visiting: boolean;
  status: string;
}

export async function ownerClinicStaffProfileGet(
  branchId: string | number,
  memberId: string | number
): Promise<ClinicStaffProfileData | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicStaffProfileData }>(
    `/api/v1/owner/clinic/branches/${branchId}/staff/${memberId}/profile`
  );
  return res?.data ?? null;
}

export async function ownerClinicStaffProfilePut(
  branchId: string | number,
  memberId: string | number,
  data: {
    staffType?: string;
    licenseNumber?: string | null;
    specializationTags?: string[] | null;
    defaultConsultationFee?: number | null;
    visiting?: boolean;
    status?: string;
  }
): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/staff/${memberId}/profile`,
    data
  );
  return (res as { data?: unknown })?.data ?? null;
}

// --- Clinic Schedule templates ---
export interface DoctorScheduleTemplateRow {
  id: number;
  branchMemberId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes?: number;
  maxSlots?: number | null;
  roomTypeRequired?: string | null;
  status: string;
  branchMember?: { id: number; user?: { profile?: { displayName?: string } } };
}
export interface RoomScheduleTemplateRow {
  id: number;
  branchRoomId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: string;
  branchRoom?: { id: number; name: string };
}

export async function ownerClinicScheduleTemplates(branchId: string | number): Promise<{
  doctorTemplates: DoctorScheduleTemplateRow[];
  roomTemplates: RoomScheduleTemplateRow[];
} | null> {
  const res = await ownerGet<{ success?: boolean; data?: { doctorTemplates: DoctorScheduleTemplateRow[]; roomTemplates: RoomScheduleTemplateRow[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule/templates`
  );
  return res?.data ?? null;
}

export async function ownerClinicScheduleTemplatesPut(
  branchId: string | number,
  data: { doctorTemplates?: DoctorScheduleTemplateRow[]; roomTemplates?: RoomScheduleTemplateRow[] }
) {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule/templates`,
    data
  );
  return (res as { data?: unknown })?.data ?? null;
}

// --- Clinic Holidays ---
export interface BranchHolidayRow {
  id: number;
  date: string;
  name?: string | null;
  notes?: string | null;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export async function ownerClinicHolidays(branchId: string | number): Promise<BranchHolidayRow[] | null> {
  const res = await ownerGet<{ success?: boolean; data?: BranchHolidayRow[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/holidays`
  );
  return res?.data ?? null;
}

export async function ownerClinicHolidayCreate(
  branchId: string | number,
  data: { date: string; name?: string; notes?: string; isClosed?: boolean; startTime?: string; endTime?: string }
) {
  const res = await ownerPost<{ success?: boolean; data?: BranchHolidayRow }>(
    `/api/v1/owner/clinic/branches/${branchId}/holidays`,
    data
  );
  return (res as { data?: BranchHolidayRow })?.data ?? null;
}

export async function ownerClinicHolidayDelete(branchId: string | number, holidayId: string | number) {
  const res = await ownerDelete<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/holidays/${holidayId}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

// --- Clinic Emergency policy ---
export interface EmergencyPolicy {
  enabled?: boolean;
  reservedSlotsPerDay?: number;
  allowedHours?: string | null;
}

export async function ownerClinicEmergencyPolicy(branchId: string | number): Promise<EmergencyPolicy | null> {
  const res = await ownerGet<{ success?: boolean; data?: EmergencyPolicy }>(
    `/api/v1/owner/clinic/branches/${branchId}/policy/emergency`
  );
  return res?.data ?? null;
}

export async function ownerClinicEmergencyPolicyPut(
  branchId: string | number,
  data: { enabled?: boolean; reservedSlotsPerDay?: number; allowedHours?: string | null }
) {
  const res = await ownerPut<{ success?: boolean; data?: EmergencyPolicy }>(
    `/api/v1/owner/clinic/branches/${branchId}/policy/emergency`,
    data
  );
  return (res as { data?: EmergencyPolicy })?.data ?? null;
}

// --- Clinic Fees ---
export interface ClinicFeesData {
  serviceOverrides: { serviceId: number; fee: number }[];
  doctorFees: { branchMemberId: number; defaultConsultationFee: number | null; staffType: string }[];
}

export async function ownerClinicFees(branchId: string | number): Promise<ClinicFeesData | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicFeesData }>(
    `/api/v1/owner/clinic/branches/${branchId}/fees`
  );
  return res?.data ?? null;
}

export async function ownerClinicFeesPut(
  branchId: string | number,
  data: { serviceOverrides?: { serviceId: number; fee: number }[] }
) {
  const res = await ownerPut<{ success?: boolean; data?: ClinicFeesData }>(
    `/api/v1/owner/clinic/branches/${branchId}/fees`,
    data
  );
  return (res as { data?: ClinicFeesData })?.data ?? null;
}

// --- Clinic role template assignment ---
export const CLINIC_ROLE_TEMPLATE_KEYS = [
  "CLINIC_DOCTOR",
  "CLINIC_NURSE",
  "CLINIC_RECEPTION",
  "CLINIC_LAB",
  "CLINIC_GROOMER",
  "CLINIC_MANAGER",
] as const;

export async function ownerClinicAssignTemplate(
  branchId: string | number,
  memberId: string | number,
  templateKey: string
) {
  const res = await ownerPost<{ success?: boolean; data?: { staffType: string; permissionOverrides: string[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/staff/${memberId}/assign-template`,
    { templateKey }
  );
  return (res as { data?: { staffType: string; permissionOverrides: string[] } })?.data ?? null;
}

// Clinic Phase 2: Appointments + Schedule Exceptions
export async function ownerClinicAppointments(
  branchId: string | number,
  params?: { date?: string; doctorId?: number; status?: string; serviceId?: number; appointmentType?: string; limit?: number; offset?: number }
) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.status) q.set("status", params.status);
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.appointmentType) q.set("appointmentType", params.appointmentType);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  const path = `/api/v1/owner/clinic/branches/${branchId}/appointments${query ? `?${query}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(path);
  return (res as { data?: { items: unknown[]; total: number } })?.data ?? { items: [], total: 0 };
}

export async function ownerClinicSlots(
  branchId: string | number,
  params: { date: string; doctorId?: number; serviceId?: number }
) {
  const q = new URLSearchParams({ date: params.date });
  if (params.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params.serviceId != null) q.set("serviceId", String(params.serviceId));
  const path = `/api/v1/owner/clinic/branches/${branchId}/slots?${q.toString()}`;
  const res = await ownerGet<{ success?: boolean; data?: { slots: unknown[] } }>(path);
  return (res as { data?: { slots: unknown[] } })?.data?.slots ?? [];
}

export async function ownerClinicBookingAvailableSlots(
  branchId: string | number,
  params: { date: string; serviceId?: number; packageId?: number; doctorId?: number; durationMinutes?: number }
) {
  const q = new URLSearchParams({ date: params.date });
  if (params.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params.packageId != null) q.set("packageId", String(params.packageId));
  if (params.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params.durationMinutes != null) q.set("durationMinutes", String(params.durationMinutes));
  const path = `/api/v1/owner/clinic/branches/${branchId}/booking/available-slots?${q.toString()}`;
  const res = await ownerGet<{ success?: boolean; data?: { slots: { doctorId: number; doctorName: string; slots: { start: string; end: string }[] }[] } }>(path);
  return (res as { data?: { slots: unknown[] } })?.data?.slots ?? [];
}

export async function ownerClinicBookingEligibleDoctors(
  branchId: string | number,
  params?: { serviceId?: number; packageId?: number }
) {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.packageId != null) q.set("packageId", String(params.packageId));
  const path = `/api/v1/owner/clinic/branches/${branchId}/booking/eligible-doctors${q.toString() ? `?${q}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: { doctors: unknown[] } }>(path);
  return (res as { data?: { doctors: unknown[] } })?.data?.doctors ?? [];
}

export async function ownerClinicBookingPricePreview(
  branchId: string | number,
  params?: { serviceId?: number; packageId?: number; doctorId?: number; species?: string }
) {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.packageId != null) q.set("packageId", String(params.packageId));
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.species) q.set("species", params.species);
  const path = `/api/v1/owner/clinic/branches/${branchId}/booking/price-preview${q.toString() ? `?${q}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: { basePrice: number; doctorFee: number; discountAmount: number; totalPrice: number; breakdown: { label: string; amount: number }[] } }>(path);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicBookingConstraints(branchId: string | number, date?: string) {
  const path = `/api/v1/owner/clinic/branches/${branchId}/booking/constraints${date ? `?date=${encodeURIComponent(date)}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(path);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicAppointmentConfirm(branchId: string | number, appointmentId: number) {
  const path = `/api/v1/owner/clinic/branches/${branchId}/appointments/${appointmentId}/confirm`;
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(path, {});
  return (res as { data?: unknown })?.data;
}

export async function ownerClinicAppointmentCreate(
  branchId: string | number,
  data: {
    patientId: number;
    petId?: number;
    doctorId: number;
    serviceId: number;
    scheduledStartAt: string;
    scheduledEndAt: string;
    source?: string;
    notes?: string;
    idempotencyKey?: string;
  }
) {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/appointments`,
    data
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicAppointmentCancel(
  branchId: string | number,
  appointmentId: string | number,
  data?: { reason?: string }
) {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/appointments/${appointmentId}/cancel`,
    data ?? {}
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicAppointmentReschedule(
  branchId: string | number,
  appointmentId: string | number,
  data: { scheduledStartAt: string; scheduledEndAt: string; doctorId?: number }
) {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/appointments/${appointmentId}/reschedule`,
    data
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicScheduleExceptions(
  branchId: string | number,
  params?: { doctorId?: number; from?: string; to?: string }
) {
  const q = new URLSearchParams();
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const path = `/api/v1/owner/clinic/branches/${branchId}/schedule/exceptions${query ? `?${query}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(path);
  return (res as { data?: unknown[] })?.data ?? [];
}

export async function ownerClinicScheduleExceptionCreate(
  branchId: string | number,
  data: { doctorId: number; date: string; type: string; startTime?: string; endTime?: string; note?: string }
) {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule/exceptions`,
    data
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicScheduleExceptionDelete(
  branchId: string | number,
  exceptionId: string | number
) {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/schedule/exceptions/${exceptionId}`);
}

// ========== Clinic Doctors (CP1) ==========
export interface ClinicDoctorListItem {
  member: { id: number; userId: number; role: string; status: string; user?: { profile?: { displayName?: string }; auth?: { email?: string; phone?: string }; verificationStatus?: string | null } };
  profile: { contractStatus?: string; scheduleEditPolicy?: string; followUpFee?: number | null; emergencyFee?: number | null; roleInClinic?: string | null; onboardingStatus?: string };
  verificationStatus?: string | null;
}
export async function ownerClinicDoctors(
  branchId: string | number,
  params?: { contractStatus?: string }
): Promise<{ branch: { id: number; name: string }; doctors: ClinicDoctorListItem[] } | null> {
  const q = params?.contractStatus ? `?contractStatus=${encodeURIComponent(params.contractStatus)}` : "";
  const res = await ownerGet<{ success?: boolean; data?: { branch: { id: number; name: string }; doctors: ClinicDoctorListItem[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors${q}`
  );
  return (res as { data?: { branch: { id: number; name: string }; doctors: ClinicDoctorListItem[] } })?.data ?? null;
}

export async function ownerClinicDoctorInvite(
  branchId: string | number,
  body: {
    email?: string;
    phone?: string;
    displayName?: string;
    role?: string;
    roleInClinic?: string;
    defaultConsultationFee?: number;
    scheduleEditPolicy?: string;
    message?: string;
  }
): Promise<{ invite?: unknown; branch?: { id: number; name: string }; devInviteToken?: string }> {
  const res = await ownerPost<{ success?: boolean; data?: { invite?: unknown; branch?: { id: number; name: string }; devInviteToken?: string } }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/invite`,
    body
  );
  return (res as { data?: { invite?: unknown; branch?: { id: number; name: string }; devInviteToken?: string } })?.data ?? {};
}

/** GET /api/v1/owner/invitations — list staff invites (optionally by branchId and status) */
export async function listOwnerInvitations(params?: {
  branchId?: number | string;
  status?: string;
}): Promise<{ success?: boolean; data?: StaffInviteRow[] }> {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  const path = `/api/v1/owner/invitations${q.toString() ? `?${q}` : ""}`;
  const res = await ownerGet<{ success?: boolean; data?: StaffInviteRow[] }>(path);
  return res ?? { success: false, data: [] };
}

export type StaffInviteRow = {
  id: number;
  branchId: number;
  email?: string | null;
  phone?: string | null;
  status: string;
  inviteAsDoctor?: boolean;
  role?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  branch?: { id: number; name: string };
  invitedBy?: { id: number; profile?: { displayName?: string }; auth?: { email?: string } };
};

export type OwnerInvitation = {
  id: number;
  branchId: number;
  orgId?: number;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  status: string;
  role?: string | null;
  inviteAsDoctor?: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  branch?: { id: number; name: string };
  org?: { id: number; name: string };
  invitedBy?: { id: number; profile?: { displayName?: string }; auth?: { email?: string } };
};

export async function ownerGetInvitation(inviteId: number): Promise<OwnerInvitation | null> {
  const res = await ownerGet<{ success?: boolean; data?: OwnerInvitation }>(`/api/v1/owner/invitations/${inviteId}`);
  return res?.data || null;
}

export async function ownerUpdateInvitation(inviteId: number, data: Partial<OwnerInvitation>): Promise<{ success?: boolean; data?: OwnerInvitation; message?: string }> {
  return ownerPatch<{ success?: boolean; data?: OwnerInvitation; message?: string }>(`/api/v1/owner/invitations/${inviteId}`, data);
}

export async function ownerResendInvitation(inviteId: number): Promise<{ success?: boolean; data?: unknown; message?: string }> {
  return ownerPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/owner/invitations/${inviteId}/resend`, {});
}

export async function ownerReinviteInvitation(inviteId: number): Promise<{ success?: boolean; data?: unknown; message?: string }> {
  return ownerPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/owner/invitations/${inviteId}/reinvite`, {});
}

export async function ownerCancelInvitation(inviteId: number): Promise<{ success?: boolean; data?: unknown; message?: string }> {
  return ownerPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/owner/invitations/${inviteId}/cancel`, {});
}

export type OwnerClinicDoctorDetailResult = {
  branch?: { id: number; name: string };
  profile?: Record<string, unknown>;
  serviceFees?: Array<{
    id: number;
    serviceId: number;
    serviceName?: string;
    category?: string;
    fee: number;
    durationMin?: number | null;
    isActive: boolean;
    notes?: string | null;
  }>;
  scheduleTemplates?: unknown[];
  displayName?: string | null;
  [k: string]: unknown;
};

export async function ownerClinicDoctorDetail(
  branchId: string | number,
  memberId: string | number
): Promise<OwnerClinicDoctorDetailResult | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}`
  );
  return asJsonRecord((res as { data?: unknown })?.data) as OwnerClinicDoctorDetailResult | null;
}

export async function ownerClinicDoctorTermsPatch(
  branchId: string | number,
  memberId: string | number,
  body: {
    roleInClinic?: string;
    visitTypes?: string[];
    followUpFee?: number | null;
    emergencyFee?: number | null;
    scheduleEditPolicy?: string;
    contractStatus?: string;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    contractNotes?: string | null;
    maxPatientsPerDay?: number | null;
    allowEmergencyOverbook?: boolean;
    travelBufferMinutes?: number;
  }
) {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/terms`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

// Clinic Enterprise: Surgery packages
export async function ownerClinicPackagesList(
  branchId: string | number,
  params?: { serviceId?: number; packageType?: string; status?: string; page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.packageType) q.set("packageType", params.packageType);
  if (params?.status) q.set("status", params.status);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * GET package by id. In browser, hits backend directly (getCatalogBase) to avoid Next.js proxy 404
 * on nested owner clinic routes; on server uses same-origin. Fallback for proxy 404s.
 */
export async function ownerClinicPackageById(branchId: string | number, packageId: string | number): Promise<Record<string, unknown> | null> {
  const path = `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}`;
  if (typeof window !== "undefined") {
    const res = await fetch(`${getCatalogBase()}${path}`, { method: "GET", credentials: "include", cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (res.status === 403) return null;
    if (!res.ok) throw new Error((j as { message?: string })?.message || `Request failed (${res.status})`);
    return asJsonRecord((j as { data?: unknown })?.data);
  }
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(path);
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicPackageCreate(branchId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackageUpdate(branchId: string | number, packageId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackageDelete(branchId: string | number, packageId: string | number): Promise<void> {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}`);
}

export async function ownerClinicPackageItemsList(branchId: string | number, packageId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/items`
  );
  return (res as { data?: unknown[] })?.data ?? [];
}

export async function ownerClinicPackageItemUpsert(branchId: string | number, packageId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/items`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

/** Batch create package items. Body: { items: Array<{ itemType, productId?, variantId?, clinicalItemId?, clinicalItemVariantId?, estimatedQty?, estimatedCost?, displayLabel?, sortOrder? }> } */
export async function ownerClinicPackageItemsBatchCreate(
  branchId: string | number,
  packageId: string | number,
  body: { items: Record<string, unknown>[] }
): Promise<{ created: number; items: unknown[] }> {
  const res = await ownerPost<{ success?: boolean; data?: { created: number; items: unknown[] } }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/items/batch`,
    body
  );
  const data = (res as { data?: { created: number; items: unknown[] } })?.data;
  return data ?? { created: 0, items: [] };
}

export async function ownerClinicPackageItemDelete(branchId: string | number, packageId: string | number, itemId: number): Promise<void> {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/items/${itemId}`);
}

export async function ownerClinicPackagePriceRulesList(branchId: string | number, packageId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/price-rules`
  );
  return (res as { data?: unknown[] })?.data ?? [];
}

export async function ownerClinicPackagePriceRuleCreate(branchId: string | number, packageId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/price-rules`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackagePriceRuleDelete(branchId: string | number, packageId: string | number, ruleId: number): Promise<void> {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/price-rules/${ruleId}`);
}

export async function ownerClinicPackageComposition(branchId: string | number, packageId: string | number, species?: string): Promise<Record<string, unknown> | null> {
  const q = species ? `?species=${encodeURIComponent(species)}` : "";
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/composition${q}`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicPackageImpact(branchId: string | number, packageId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/impact`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicPackageAuditLog(
  branchId: string | number,
  packageId: string | number,
  params?: { limit?: number; offset?: number }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/audit-log${query ? `?${query}` : ""}`
  );
  return (res as { data?: unknown[] })?.data ?? [];
}

export async function ownerClinicPackageDuplicate(
  branchId: string | number,
  packageId: string | number,
  body: { packageCode?: string; newPackageCode?: string }
): Promise<Record<string, unknown> | null> {
  const code = body.packageCode ?? body.newPackageCode;
  if (!code) throw new Error("packageCode or newPackageCode is required");
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/duplicate`,
    { packageCode: code, newPackageCode: code }
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicPackageTemplatesList(branchId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/package-templates`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicPackageTemplateById(branchId: string | number, templateId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/package-templates/${templateId}`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicPackageTemplateCreate(
  branchId: string | number,
  body: { packageName: string; serviceId?: number | null; surgeryType?: string | null; itemsJson?: unknown }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/package-templates`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackageTemplateUpdate(
  branchId: string | number,
  templateId: string | number,
  body: { packageName?: string; serviceId?: number | null; surgeryType?: string | null; itemsJson?: unknown }
): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/package-templates/${templateId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackageTemplateDelete(branchId: string | number, templateId: string | number): Promise<void> {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/package-templates/${templateId}`);
}

// Master catalog: templates, install, import (use direct backend to avoid proxy 404)
export async function ownerClinicCatalogTemplatesList(branchId: string | number): Promise<unknown[]> {
  const res = await ownerGetCatalog<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/templates`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicCatalogTemplateById(branchId: string | number, templateId: number): Promise<Record<string, unknown> | null> {
  const res = await ownerGetCatalog<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/templates/${templateId}`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicCatalogInstallPreview(
  branchId: string | number,
  body: { templateId: number; categoryIds?: number[]; itemIds?: number[] }
): Promise<Record<string, unknown>> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/install/preview`,
    body
  );
  return ((res as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
}

export async function ownerClinicCatalogInstall(
  branchId: string | number,
  body: { templateId: number; categoryIds?: number[]; itemIds?: number[]; overwriteExisting?: boolean }
): Promise<{ batchId: number; categoryCount: number; itemCount: number }> {
  const res = await ownerPost<{ success?: boolean; data?: { batchId: number; categoryCount: number; itemCount: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/install`,
    body
  );
  const data = (res as { data?: { batchId: number; categoryCount: number; itemCount: number } })?.data;
  return data ?? { batchId: 0, categoryCount: 0, itemCount: 0 };
}

export async function ownerClinicCatalogInstallHistory(branchId: string | number, limit?: number): Promise<unknown[]> {
  const q = limit != null ? `?limit=${limit}` : "";
  const res = await ownerGetCatalog<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/install-history${q}`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicCatalogUpgradeCheck(branchId: string | number, templateId: number): Promise<Record<string, unknown>> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/install/upgrade-check/${templateId}`
  );
  return ((res as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
}

export async function ownerClinicCatalogImportPreview(
  branchId: string | number,
  body: { csvText: string; action?: string }
): Promise<Record<string, unknown>> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/import/preview`,
    body
  );
  return ((res as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
}

export async function ownerClinicCatalogImportExecute(
  branchId: string | number,
  body: { preview: Record<string, unknown>; action?: string }
): Promise<Record<string, unknown>> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/import/execute`,
    body
  );
  return ((res as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
}

// Master catalog (browse + add-from-master)
export async function ownerClinicMasterCatalogCategories(
  branchId: string | number,
  params?: { parentId?: number; domainType?: string; isActive?: boolean; page?: number; limit?: number }
): Promise<{ items: { id: number; name: string; slug: string; domainType?: string; _count?: { items: number } }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.parentId != null) q.set("parentId", String(params.parentId));
  if (params?.domainType) q.set("domainType", params.domainType);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGetCatalog<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/master/categories${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: (data?.items ?? []) as { id: number; name: string; slug: string; domainType?: string; _count?: { items: number } }[], pagination: data?.pagination ?? { page: 1, limit: 100, total: 0, totalPages: 0 } };
}

export async function ownerClinicMasterCatalogItems(
  branchId: string | number,
  params?: { categoryId?: number; domainType?: string; search?: string; isActive?: boolean; page?: number; limit?: number }
): Promise<{ items: { id: number; name: string; itemCode: string; slug: string; domainType: string; baseUnit?: string; category?: { id: number; name: string; slug: string } }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.categoryId != null) q.set("categoryId", String(params.categoryId));
  if (params?.domainType) q.set("domainType", params.domainType);
  if (params?.search) q.set("search", params.search);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGetCatalog<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/master/items${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: (data?.items ?? []) as { id: number; name: string; itemCode: string; slug: string; domainType: string; baseUnit?: string; category?: { id: number; name: string; slug: string } }[], pagination: data?.pagination ?? { page: 1, limit: 100, total: 0, totalPages: 0 } };
}

export async function ownerClinicAddFromMasterPreview(
  branchId: string | number,
  body: { masterItemIds: number[]; masterCategoryIds?: number[]; option?: "createMissingOnly" | "createOrUpdate" | "skipExisting" }
): Promise<Record<string, unknown>> {
  const res = await ownerPostCatalog<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/add-from-master/preview`,
    body
  );
  return ((res as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
}

export async function ownerClinicAddFromMasterExecute(
  branchId: string | number,
  body: { masterItemIds: number[]; masterCategoryIds?: number[]; option?: "createMissingOnly" | "createOrUpdate" | "skipExisting" }
): Promise<{ createdCategories: number; createdItems: number; updatedItems: number; skippedItems: number }> {
  const res = await ownerPostCatalog<{ success?: boolean; data?: { createdCategories: number; createdItems: number; updatedItems: number; skippedItems: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/catalog/add-from-master/execute`,
    body
  );
  const data = (res as { data?: { createdCategories: number; createdItems: number; updatedItems: number; skippedItems: number } })?.data;
  return data ?? { createdCategories: 0, createdItems: 0, updatedItems: 0, skippedItems: 0 };
}

// Clinical Item Master (catalog)
export async function ownerClinicItemsList(
  branchId: string | number,
  params?: { domainType?: string; categoryId?: number; search?: string; isActive?: boolean; page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.domainType) q.set("domainType", params.domainType);
  if (params?.categoryId != null) q.set("categoryId", String(params.categoryId));
  if (params?.search) q.set("search", params.search);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<unknown>(
    `/api/v1/owner/clinic/branches/${branchId}/items${query ? `?${query}` : ""}`
  );
  const response = res as any;
  const data = response?.data?.data ?? response?.data ?? response;
  const nestedData = data?.data ?? null;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(nestedData?.items)
      ? nestedData.items
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(data)
          ? data
          : [];
  const pagination = data?.pagination ?? nestedData?.pagination ?? response?.pagination ?? null;
  return {
    items,
    pagination: pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function ownerClinicVaccineInventoryMappings(
  branchId: string | number
): Promise<{ branchId: number; orgId: number | null; items: unknown[] }> {
  const res = await ownerGet<unknown>(
    `/api/v1/owner/clinic/branches/${branchId}/vaccine-inventory-mappings`
  );
  const response = res as any;
  const data = response?.data?.data ?? response?.data ?? response;
  const nestedData = data?.data ?? null;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(nestedData?.items)
      ? nestedData.items
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(data)
          ? data
          : [];
  return {
    branchId: Number(data?.branchId ?? nestedData?.branchId ?? response?.branchId ?? branchId),
    orgId: data?.orgId ?? nestedData?.orgId ?? response?.orgId ?? null,
    items,
  };
}

export async function ownerClinicUpsertVaccineInventoryMapping(
  branchId: string | number,
  vaccineTypeId: string | number,
  body: {
    clinicalItemId: number;
    clinicalItemVariantId?: number | null;
    isActive?: boolean;
    notes?: string | null;
  }
): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/vaccine-inventory-mappings/${vaccineTypeId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemSearch(
  branchId: string | number,
  params?: { q?: string; domainType?: string; limit?: number }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.domainType) q.set("domainType", params.domainType);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<unknown>(
    `/api/v1/owner/clinic/branches/${branchId}/items/search${query ? `?${query}` : ""}`
  );
  const response = res as any;
  const data = response?.data?.data ?? response?.data ?? response;
  return (Array.isArray(data) ? data : Array.isArray(response?.items) ? response.items : []) as unknown[];
}

export async function ownerClinicItemById(branchId: string | number, itemId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<unknown>(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}`
  );
  const response = res as any;
  return asJsonRecord(response?.data?.data ?? response?.data ?? response);
}

export async function ownerClinicItemCreate(branchId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/items`, body);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemUpdate(branchId: string | number, itemId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/items/${itemId}`, body);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemActivate(branchId: string | number, itemId: string | number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/activate`, {});
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemDeactivate(branchId: string | number, itemId: string | number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/deactivate`, {});
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemVariantCreate(
  branchId: string | number,
  itemId: string | number,
  body: {
    variantName: string;
    sku?: string | null;
    barcode?: string | null;
    unitLabel?: string | null;
    packSize?: string | null;
    strengthOrSpec?: string | null;
    defaultCost?: number | null;
    defaultSalePrice?: number | null;
  }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/variants`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemVariantUpdate(
  branchId: string | number,
  itemId: string | number,
  variantId: string | number,
  body: {
    variantName?: string;
    sku?: string | null;
    barcode?: string | null;
    unitLabel?: string | null;
    packSize?: string | null;
    strengthOrSpec?: string | null;
    defaultCost?: number | null;
    defaultSalePrice?: number | null;
    isActive?: boolean;
  }
): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/variants/${variantId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemMediaUpload(
  branchId: string | number,
  itemId: string | number,
  file: File
): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  const res = await ownerUpload<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/media`,
    form
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemMediaDelete(
  branchId: string | number,
  itemId: string | number,
  mediaId: string | number
): Promise<void> {
  await ownerDelete(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}/media/${mediaId}`
  );
}

/** List item categories. Uses ownerGetSafe so 404/403 (e.g. route not yet deployed) return [] instead of throwing. */
export async function ownerClinicItemCategoriesList(
  branchId: string | number,
  params?: { parentId?: number | null; domainType?: string; isActive?: boolean }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.parentId !== undefined) q.set("parentId", params.parentId === null ? "null" : String(params.parentId));
  if (params?.domainType) q.set("domainType", params.domainType);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  const query = q.toString();
  const path = `/api/v1/owner/clinic/branches/${branchId}/item-categories${query ? `?${query}` : ""}`;
  const res = await ownerGetSafe<{ success?: boolean; data?: unknown[] }>(path);
  return ((res as { data?: unknown[] } | null)?.data ?? []) as unknown[];
}

export async function ownerClinicItemCategoryTree(branchId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-categories/tree`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicItemCategoryCreate(
  branchId: string | number,
  body: { name: string; parentId?: number | null; domainType?: string | null; sortOrder?: number }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-categories`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemCategoryUpdate(
  branchId: string | number,
  categoryId: string | number,
  body: { name?: string; parentId?: number | null; domainType?: string | null; sortOrder?: number; isActive?: boolean }
): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-categories/${categoryId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicItemCategoryDelete(branchId: string | number, categoryId: string | number): Promise<void> {
  await ownerDelete(`/api/v1/owner/clinic/branches/${branchId}/item-categories/${categoryId}`);
}

export async function ownerClinicBranchItemStock(
  branchId: string | number,
  params?: { itemId?: number; variantId?: number }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.itemId != null) q.set("itemId", String(params.itemId));
  if (params?.variantId != null) q.set("variantId", String(params.variantId));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock${query ? `?${query}` : ""}`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicLowStockAlerts(branchId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock/alerts`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicItemStockLedger(
  branchId: string | number,
  params?: { clinicalItemId?: number; variantId?: number; limit?: number; offset?: number; fromDate?: string; toDate?: string }
): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.clinicalItemId != null) q.set("clinicalItemId", String(params.clinicalItemId));
  if (params?.variantId != null) q.set("variantId", String(params.variantId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock/ledger${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items: unknown[]; total: number } })?.data;
  return data ?? { items: [], total: 0 };
}

export async function ownerClinicItemStockConsumption(
  branchId: string | number,
  params?: { limit?: number; offset?: number }
): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock/consumption${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items: unknown[]; total: number } })?.data;
  return data ?? { items: [], total: 0 };
}

export async function ownerClinicItemStockAdjust(
  branchId: string | number,
  body: { itemId: number; variantId: number; deltaQty: number; reason?: string; unitCost?: number }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock/adjust`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicItemStockReceive(
  branchId: string | number,
  body: {
    itemId: number;
    variantId: number;
    quantity: number;
    batchNo?: string;
    expiryDate?: string;
    purchaseCost?: number;
  }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/item-stock/receive`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicInstrumentIssueLogsList(
  branchId: string | number,
  params?: { status?: "open" | "returned" }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/instrument-issues${query ? `?${query}` : ""}`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicInstrumentIssueLogCreate(
  branchId: string | number,
  body: { itemId: number; variantId: number; issuedQty: number; issuedToUserId?: number; procedureId?: number }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/instrument-issues`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSupplyRequestsList(params?: { orgId?: number; status?: string; limit?: number; offset?: number }): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId != null) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(
    `/api/v1/owner/clinic/supply-requests${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items: unknown[]; total: number } })?.data;
  return data ?? { items: [], total: 0 };
}

export async function ownerClinicSupplyRequestById(requestId: number, params?: { orgId?: number }): Promise<unknown> {
  const q = params?.orgId != null ? `?orgId=${params.orgId}` : "";
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/supply-requests/${requestId}${q}`);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSupplyRequestReview(
  requestId: number,
  body: { decision: string; reviewNote?: string; items?: { requestItemId: number; approvedQty?: number }[] }
): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/supply-requests/${requestId}/review`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSupplyRequestMarkOrdered(requestId: number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/supply-requests/${requestId}/mark-ordered`,
    {}
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSupplyRequestMarkReceived(
  requestId: number,
  body: { items: { requestItemId: number; receivedQty: number }[]; postToInventory?: boolean }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/supply-requests/${requestId}/mark-received`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSupplyRequestCancel(requestId: number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/supply-requests/${requestId}/cancel`,
    {}
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicTransferFromRequest(requestId: number, body: { fromBranchId: number }): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/supply-requests/${requestId}/transfer`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicTransfersList(params?: { orgId?: number; branchId?: number; status?: string }): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId != null) q.set("orgId", String(params.orgId));
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(
    `/api/v1/owner/clinic/transfers${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items: unknown[]; total: number } })?.data;
  return data ?? { items: [], total: 0 };
}

export async function ownerClinicTransferById(transferId: number, params?: { orgId?: number }): Promise<unknown> {
  const q = params?.orgId != null ? `?orgId=${params.orgId}` : "";
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/transfers/${transferId}${q}`);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicTransferDispatch(transferId: number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/transfers/${transferId}/dispatch`, {});
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSterilizationCyclesList(
  branchId: string | number,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await ownerGet<{ success?: boolean; data?: { items: unknown[]; total: number } }>(
    `/api/v1/owner/clinic/branches/${branchId}/sterilization/cycles${q.toString() ? `?${q}` : ""}`
  );
  const data = (res as { data?: { items: unknown[]; total: number } })?.data;
  return data ?? { items: [], total: 0 };
}

export async function ownerClinicSterilizationCycleById(branchId: string | number, cycleId: number): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/sterilization/cycles/${cycleId}`);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSterilizationCycleStart(
  branchId: string | number,
  body: { instrumentIds: number[]; method?: string; machineName?: string }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/sterilization/cycles`, body);
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSterilizationCycleComplete(
  branchId: string | number,
  cycleId: number,
  body?: { sterileDays?: number }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/sterilization/cycles/${cycleId}/complete`, body ?? {});
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicSterilizationCycleFail(branchId: string | number, cycleId: number): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/sterilization/cycles/${cycleId}/fail`, {});
  return (res as { data?: unknown })?.data ?? res;
}

export async function ownerClinicInstrumentInstancesList(
  branchId: string | number,
  params?: { clinicalItemId?: number; sterilizationStatus?: string }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.clinicalItemId != null) q.set("clinicalItemId", String(params.clinicalItemId));
  if (params?.sterilizationStatus) q.set("sterilizationStatus", params.sterilizationStatus);
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/sterilization/instruments${q.toString() ? `?${q}` : ""}`
  );
  return Array.isArray((res as { data?: unknown[] })?.data) ? (res as { data: unknown[] }).data : [];
}

export async function ownerClinicSterilizationDueAlerts(branchId: string | number): Promise<unknown[]> {
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/owner/clinic/branches/${branchId}/sterilization/instruments/due`);
  return Array.isArray((res as { data?: unknown[] })?.data) ? (res as { data: unknown[] }).data : [];
}

export async function ownerClinicInstrumentIssueLogReturn(
  branchId: string | number,
  logId: string | number,
  body: { returnedQty: number; sterilizationStatus?: string; conditionNote?: string }
): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/instrument-issues/${logId}/return`,
    body
  );
  return (res as { data?: unknown })?.data ?? res;
}

// Clinic Enterprise: Discount policies
export async function ownerClinicDiscountPoliciesList(
  branchId: string | number,
  params?: { status?: string; page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/discount-policies${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: data?.items ?? [], pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export async function ownerClinicDiscountPolicyById(branchId: string | number, policyId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/discount-policies/${policyId}`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicDiscountPolicyCreate(branchId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/discount-policies`, body);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDiscountPolicyUpdate(branchId: string | number, policyId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(`/api/v1/owner/clinic/branches/${branchId}/discount-policies/${policyId}`, body);
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDiscountAuditLog(
  branchId: string | number,
  params?: { from?: string; to?: string; policyId?: number; page?: number; limit?: number }
): Promise<{ items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.policyId != null) q.set("policyId", String(params.policyId));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/discount-audit${query ? `?${query}` : ""}`
  );
  return ((res as { data?: unknown })?.data ?? {}) as { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } };
}

// Clinic Enterprise: Doctor contracts
export async function ownerClinicDoctorContract(branchId: string | number, memberId: string | number): Promise<unknown | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/contract`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDoctorContractsList(
  branchId: string | number,
  memberId: string | number,
  params?: { status?: string; page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/contracts${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: data?.items ?? [], pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export async function ownerClinicDoctorContractCreate(branchId: string | number, memberId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/contract`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDoctorContractUpdate(
  branchId: string | number,
  memberId: string | number,
  contractId: string | number,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await ownerPatch<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/contract/${contractId}`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDoctorContractRatePreview(
  branchId: string | number,
  memberId: string | number,
  params?: { serviceId?: number; caseAmount?: number; isEmergency?: boolean }
): Promise<unknown> {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.caseAmount != null) q.set("caseAmount", String(params.caseAmount));
  if (params?.isEmergency) q.set("isEmergency", "true");
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/contract/rate-preview${query ? `?${query}` : ""}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

// Clinic Enterprise: Settlement batches
export async function ownerClinicSettlementBatchesGenerate(branchId: string | number, body?: { periodEnd?: string; doctorProfileIds?: number[] }): Promise<unknown[]> {
  const res = await ownerPost<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/generate`,
    body ?? {}
  );
  return (res as { data?: unknown[] })?.data ?? [];
}

export async function ownerClinicSettlementBatchesList(
  branchId: string | number,
  params?: { doctorProfileId?: number; status?: string; page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.doctorProfileId != null) q.set("doctorProfileId", String(params.doctorProfileId));
  if (params?.status) q.set("status", params.status ?? "");
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: data?.items ?? [], pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

export async function ownerClinicSettlementBatchById(branchId: string | number, batchId: string | number): Promise<unknown | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/${batchId}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSettlementBatchReview(branchId: string | number, batchId: string | number): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/${batchId}/review`,
    {}
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSettlementBatchApprove(branchId: string | number, batchId: string | number): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/${batchId}/approve`,
    {}
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSettlementBatchPay(
  branchId: string | number,
  batchId: string | number,
  body: { amount: number; paymentMethod?: string; reference?: string }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/${batchId}/pay`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicSettlementBatchAddAdjustment(
  branchId: string | number,
  batchId: string | number,
  body: { adjustmentType: string; amount: number; reason?: string }
): Promise<unknown> {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/settlement-batches/${batchId}/adjustments`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDoctorSettlementSummary(
  branchId: string | number,
  memberId: string | number,
  params?: { from?: string; to?: string }
): Promise<unknown> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/settlement-summary${query ? `?${query}` : ""}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

// Clinic Enterprise: Reports
export async function ownerClinicReportProfitability(branchId: string | number, from: string, to: string): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/reports/profitability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicReportSettlementSummary(branchId: string | number, from: string, to: string): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/reports/settlement-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicReportDiscountAnalysis(branchId: string | number, from: string, to: string): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/reports/discount-analysis?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicReportInventoryVariance(branchId: string | number, from: string, to: string): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/reports/inventory-variance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicReportDoctorContribution(branchId: string | number, from: string, to: string): Promise<unknown> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/reports/doctor-contribution?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return (res as { data?: unknown })?.data ?? null;
}

// Clinic Enterprise: Finance config
export async function ownerClinicFinanceConfig(branchId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/finance-config`
  );
  return asJsonRecord((res as { data?: unknown })?.data);
}

export async function ownerClinicFinanceConfigUpdate(branchId: string | number, body: Record<string, unknown>): Promise<unknown> {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/finance-config`,
    body
  );
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicDoctorServicesPut(
  branchId: string | number,
  memberId: string | number,
  body: { services: Array<{ serviceId: number; fee: number; durationMin?: number; isActive?: boolean; notes?: string }> }
) {
  const res = await ownerPut<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/services`,
    body
  );
  return (res as { data?: unknown[] })?.data ?? [];
}

// ========== Schedule proposals (CP3) ==========
export interface ScheduleProposalRow {
  id: number;
  branchId: number;
  branchMemberId: number;
  proposalPayload: unknown;
  status: string;
  requestedByUserId: number;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  doctor?: { displayName?: string; email?: string; phone?: string } | null;
}
export async function ownerClinicScheduleProposalsList(
  branchId: string | number,
  params?: { status?: string }
): Promise<ScheduleProposalRow[] | null> {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await ownerGet<{ success?: boolean; data?: ScheduleProposalRow[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule-proposals${q}`
  );
  return (res as { data?: ScheduleProposalRow[] })?.data ?? null;
}

export async function ownerClinicScheduleProposalReview(
  branchId: string | number,
  proposalId: string | number,
  body: { status: "APPROVED" | "REJECTED"; reviewNote?: string }
): Promise<ScheduleProposalRow[] | null> {
  const res = await ownerPost<{ success?: boolean; data?: ScheduleProposalRow[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/schedule-proposals/${proposalId}/review`,
    body
  );
  return (res as { data?: ScheduleProposalRow[] })?.data ?? null;
}

// ========== Doctor metrics (CP4) ==========
export interface DoctorMetrics {
  from: string | null;
  to: string | null;
  branchId: number;
  memberId: number;
  appointments: { total: number; completed: number; cancelled: number; noShow: number };
  visits: { total: number; completed: number };
  patientsSeen: number;
}
export async function ownerClinicDoctorMetrics(
  branchId: string | number,
  memberId: string | number,
  params?: { from?: string; to?: string }
): Promise<DoctorMetrics | null> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: DoctorMetrics }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/metrics${query ? `?${query}` : ""}`
  );
  return (res as { data?: DoctorMetrics })?.data ?? null;
}

export interface DoctorCapacitySummary {
  date: string;
  branchId: number;
  memberId: number;
  maxPatientsPerDay: number | null;
  bookedCount: number;
}
export async function ownerClinicDoctorCapacity(
  branchId: string | number,
  memberId: string | number,
  date?: string
): Promise<DoctorCapacitySummary | null> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const res = await ownerGet<{ success?: boolean; data?: DoctorCapacitySummary }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/capacity?date=${encodeURIComponent(d)}`
  );
  return (res as { data?: DoctorCapacitySummary })?.data ?? null;
}

export interface SettlementLedgerRow {
  id: number;
  visitId: number | null;
  orderId: number | null;
  type: string;
  grossAmount: number;
  clinicShare: number;
  doctorShare: number;
  settlementStatus: string;
  settledAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
  createdAt: string;
}
export async function ownerClinicDoctorSettlementLedger(
  branchId: string | number,
  memberId: string | number,
  params?: { status?: string; from?: string; to?: string }
): Promise<SettlementLedgerRow[] | null> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: SettlementLedgerRow[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/settlement-ledger${query ? `?${query}` : ""}`
  );
  return (res as { data?: SettlementLedgerRow[] })?.data ?? null;
}

export interface DoctorAuditLogRow {
  id: number;
  action: string;
  field: string | null;
  oldValue: unknown;
  newValue: unknown;
  changedByUserId: number;
  changedByRole: string | null;
  createdAt: string;
}
export async function ownerClinicDoctorAuditLog(
  branchId: string | number,
  memberId: string | number,
  params?: { limit?: number }
): Promise<DoctorAuditLogRow[] | null> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: DoctorAuditLogRow[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}/audit-log${query ? `?${query}` : ""}`
  );
  return (res as { data?: DoctorAuditLogRow[] })?.data ?? null;
}

// ========== My Pets (Owner) ==========
export async function ownerMyPets(): Promise<{ pets: any[] } | null> {
  const res = await ownerGet<{ success?: boolean; data?: { pets: any[] } }>("/api/v1/owner/me/pets");
  return (res as { data?: { pets: any[] } })?.data ?? { pets: [] };
}

/** Snapshot-only appointments matching current user phone (for "Link your visits" flow). */
export async function ownerMyPendingAppointments(): Promise<{ appointments?: any[] }> {
  const res = await ownerGet<{ success?: boolean; data?: { appointments?: any[] } }>("/api/v1/owner/me/pending-appointments");
  const data = (res as { data?: { appointments?: any[] } })?.data;
  return { appointments: Array.isArray(data?.appointments) ? data.appointments : [] };
}

export async function ownerMyPetGet(petId: string | number): Promise<any | null> {
  const res = await ownerGet<{ success?: boolean; data?: any }>(`/api/v1/owner/me/pets/${petId}`);
  return (res as { data?: any })?.data ?? null;
}

/**
 * Register a pet for the current user (canonical Pet model; same as clinic-side).
 * POST /api/v1/user/pets/register.
 * On duplicate microchip returns 409 with code DUPLICATE_PET — surface in UI.
 */
export async function ownerRegisterPet(body: {
  name: string;
  animalTypeId: number;
  breedId?: number | null;
  subBreedId?: number | null;
  colorId?: number | null;
  coatPatternId?: number | null;
  sizeId?: number | null;
  customBreedText?: string | null;
  customColorText?: string | null;
  dateOfBirth?: string | null;
  sex: "MALE" | "FEMALE";
  microchipNumber?: string | null;
  isRescue?: boolean;
  isNeutered?: boolean;
  notes?: string | null;
  weightKg?: number | null;
}): Promise<any> {
  const base = typeof window !== "undefined" ? "" : API_BASE;
  const res = await fetch(`${base}/api/v1/user/pets/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: body.name?.trim(),
      animalTypeId: body.animalTypeId,
      breedId: body.breedId ?? undefined,
      subBreedId: body.subBreedId ?? undefined,
      colorId: body.colorId ?? undefined,
      coatPatternId: body.coatPatternId ?? undefined,
      sizeId: body.sizeId ?? undefined,
      customBreedText: body.customBreedText?.trim() || undefined,
      customColorText: body.customColorText?.trim() || undefined,
      dateOfBirth: body.dateOfBirth || undefined,
      sex: body.sex,
      microchipNumber: body.microchipNumber?.trim() || undefined,
      isRescue: body.isRescue ?? false,
      isNeutered: body.isNeutered ?? false,
      notes: body.notes?.trim() || undefined,
      weightKg: body.weightKg ?? undefined,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((j as { message?: string })?.message || `Request failed (${res.status})`) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = (j as { code?: string })?.code;
    throw err;
  }
  return (j as { data?: any })?.data ?? j;
}

// ========== Injection token + reconciliation (Clinic Medicine Control) ==========
export async function ownerClinicInjectionMonitor(
  branchId: string | number,
  params?: { date?: string }
): Promise<any | null> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: any }>(
    `/api/v1/clinic/branches/${branchId}/medicine-control/dashboard/injection-monitor${query ? `?${query}` : ""}`
  );
  return (res as { data?: any })?.data ?? null;
}

export async function ownerClinicReconciliations(
  branchId: string | number,
  params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    hasMismatch?: boolean;
    take?: number;
    skip?: number;
  }
): Promise<{ list: any[]; total: number; row?: any | null }> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.status) q.set("status", params.status);
  if (params?.hasMismatch != null) q.set("hasMismatch", String(params.hasMismatch));
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  const query = q.toString();
  const res = await ownerGet<{ success?: boolean; data?: any }>(
    `/api/v1/clinic/branches/${branchId}/medicine-control/reconciliation${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: any })?.data ?? {};
  if (data?.row) return { list: data.row ? [data.row] : [], total: data.row ? 1 : 0, row: data.row };
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    total: Number(data?.total ?? 0),
  };
}

export async function ownerClinicRunReconciliation(
  branchId: string | number,
  body?: { date?: string }
): Promise<any | null> {
  const res = await ownerPost<{ success?: boolean; data?: any }>(
    `/api/v1/clinic/branches/${branchId}/medicine-control/reconciliation/run`,
    body ?? {}
  );
  return (res as { data?: any })?.data ?? null;
}

export async function ownerClinicAcknowledgeReconciliation(
  branchId: string | number,
  reconciliationId: number,
  note?: string
): Promise<any | null> {
  const res = await ownerPatch<{ success?: boolean; data?: any }>(
    `/api/v1/clinic/branches/${branchId}/medicine-control/reconciliation/${reconciliationId}/acknowledge`,
    note ? { note } : {}
  );
  return (res as { data?: any })?.data ?? null;
}

// ========== Pharmacy Enterprise: Expiry Write-Off ==========
export async function scanExpiredStock(data: {
  orgId: number;
  locationId?: number;
  dryRun?: boolean;
}) {
  return ownerPost("/api/v1/inventory/expiry-writeoff/scan", data);
}

export async function manualWriteOff(data: {
  lotId: number;
  locationId: number;
  quantity: number;
  reason?: string;
}) {
  return ownerPost("/api/v1/inventory/expiry-writeoff/manual", data);
}

export async function getWriteOffLog(params?: {
  orgId?: number;
  locationId?: number;
  lotId?: number;
  method?: "AUTO" | "MANUAL";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/expiry-writeoff/log${q}`);
}

export async function getExpiredStock(params?: {
  orgId?: number;
  locationId?: number;
  branchId?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/expired-stock${q}`);
}

// ========== Pharmacy Enterprise: Batch Recall ==========
export async function createRecall(data: {
  orgId: number;
  lotId: number;
  reason: string;
  severity: "STANDARD" | "URGENT" | "CRITICAL";
}) {
  return ownerPost("/api/v1/inventory/recalls", data);
}

export async function listRecalls(params?: {
  orgId?: number;
  status?: "ACTIVE" | "QUARANTINED" | "RESOLVED" | "CANCELLED";
  severity?: "STANDARD" | "URGENT" | "CRITICAL";
  lotId?: number;
  page?: number;
  limit?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/recalls${q}`);
}

export async function getRecallDetail(id: number, orgId: number) {
  return ownerGet(`/api/v1/inventory/recalls/${id}?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function quarantineLot(id: number, data: {
  locationId: number;
  targetLocationId: number;
}) {
  return ownerPost(`/api/v1/inventory/recalls/${id}/quarantine`, data);
}

export async function resolveRecall(id: number, data?: { notes?: string }) {
  return ownerPost(`/api/v1/inventory/recalls/${id}/resolve`, data || {});
}

export async function cancelRecall(id: number, data?: { notes?: string }) {
  return ownerPost(`/api/v1/inventory/recalls/${id}/cancel`, data || {});
}

// ========== Pharmacy Enterprise: Dashboard ==========
export async function getPharmacyDashboard(params?: {
  orgId?: number;
  branchId?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/pharmacy-dashboard${q}`);
}

export async function getExpiryTrend(params?: {
  orgId?: number;
  months?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/pharmacy-dashboard/trend${q}`);
}

export async function getPharmacyAlerts(params?: {
  orgId?: number;
  branchId?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/pharmacy-dashboard/alerts${q}`);
}

// ========== Phase 2: Write-Off Requests ==========
export async function createWriteOffRequest(data: {
  orgId: number;
  locationId: number;
  reason: string;
  notes?: string;
  lines: { variantId: number; lotId?: number; quantity: number; reason?: string }[];
}) {
  return ownerPost("/api/v1/inventory/write-off-requests", data);
}

export async function listWriteOffRequests(params?: {
  orgId?: number;
  locationId?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/write-off-requests${q}`);
}

export async function getWriteOffRequest(id: number) {
  return ownerGet(`/api/v1/inventory/write-off-requests/${id}`);
}

export async function approveWriteOffRequest(id: number) {
  return ownerPost(`/api/v1/inventory/write-off-requests/${id}/approve`, {});
}

export async function rejectWriteOffRequest(id: number, data: { rejectionReason: string }) {
  return ownerPost(`/api/v1/inventory/write-off-requests/${id}/reject`, data);
}

export async function postWriteOffRequest(id: number) {
  return ownerPost(`/api/v1/inventory/write-off-requests/${id}/post`, {});
}

// ========== Phase 3: Vendor Returns ==========
export async function createVendorReturn(data: {
  orgId: number;
  vendorId: number;
  locationId: number;
  reason: string;
  note?: string;
  creditExpected?: number;
  referenceNumber?: string;
  lines: { variantId: number; lotId?: number; quantity: number; unitCost?: number; condition?: string; note?: string }[];
}) {
  return ownerPost("/api/v1/inventory/vendor-returns", data);
}

export async function listVendorReturns(params?: {
  orgId?: number;
  vendorId?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/vendor-returns${q}`);
}

export async function getVendorReturn(id: number) {
  return ownerGet(`/api/v1/inventory/vendor-returns/${id}`);
}

export async function submitVendorReturn(id: number) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/submit`, {});
}

export async function approveVendorReturn(id: number) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/approve`, {});
}

export async function dispatchVendorReturn(id: number) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/dispatch`, {});
}

export async function markVendorReturnReceivedByVendor(id: number, data?: { referenceNumber?: string }) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/received-by-vendor`, data || {});
}

export async function markVendorReturnCredited(id: number, data: { creditReceived: number }) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/credit`, data);
}

export async function cancelVendorReturn(id: number) {
  return ownerPost(`/api/v1/inventory/vendor-returns/${id}/cancel`, {});
}

// ========== Phase 5: Warehouse Transfer Orders ==========
export async function createWarehouseTransferOrder(data: {
  orgId: number;
  fromLocationId: number;
  toLocationId: number;
  note?: string;
  lines: { variantId: number; lotId?: number; requestedQty: number; note?: string }[];
}) {
  return ownerPost("/api/v1/inventory/warehouse-transfer-orders", data);
}

export async function listWarehouseTransferOrders(params?: {
  orgId?: number;
  fromLocationId?: number;
  toLocationId?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)]))).toString() : "";
  return ownerGet(`/api/v1/inventory/warehouse-transfer-orders${q}`);
}

export async function getWarehouseTransferOrder(id: number) {
  return ownerGet(`/api/v1/inventory/warehouse-transfer-orders/${id}`);
}

export async function approveWarehouseTransferOrder(id: number) {
  return ownerPost(`/api/v1/inventory/warehouse-transfer-orders/${id}/approve`, {});
}

export async function pickWarehouseTransferOrder(id: number, data: { pickedLines: { lineId: number; pickedQty: number }[] }) {
  return ownerPost(`/api/v1/inventory/warehouse-transfer-orders/${id}/pick`, data);
}

export async function dispatchWarehouseTransferOrder(id: number) {
  return ownerPost(`/api/v1/inventory/warehouse-transfer-orders/${id}/dispatch`, {});
}

export async function receiveWarehouseTransferOrder(id: number, data: { receivedLines: { lineId: number; receivedQty: number }[] }) {
  return ownerPost(`/api/v1/inventory/warehouse-transfer-orders/${id}/receive`, data);
}

export async function closeWarehouseTransferOrder(id: number) {
  return ownerPost(`/api/v1/inventory/warehouse-transfer-orders/${id}/close`, {});
}

// ========== Phase 4: Inventory Analytics ==========
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => [k, typeof v === "boolean" ? (v ? "true" : "false") : String(v)]);
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

// ========== Wave-3: Network balance & reverse logistics ==========
export async function networkBalanceRecompute(body: { orgId: number; scope?: string; branchId?: number }) {
  return ownerPost("/api/v1/network-balance/recompute", body);
}

export async function listNetworkRecommendations(params: {
  orgId: number;
  status?: string;
  branchId?: number;
  page?: number;
  limit?: number;
}) {
  return ownerGet(`/api/v1/network-balance/recommendations${buildQuery(params)}`);
}

export async function getNetworkRecommendation(id: number, orgId: number) {
  return ownerGet(`/api/v1/network-balance/recommendations/${id}?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function dismissNetworkRecommendation(id: number, orgId: number, reason?: string) {
  return ownerPost(`/api/v1/network-balance/recommendations/${id}/dismiss`, { orgId, reason });
}

export async function acceptNetworkRecommendation(
  id: number,
  body: { orgId: number; target: "WTO" | "STOCK_REQUEST"; overrides?: { qty?: number } }
) {
  return ownerPost(`/api/v1/network-balance/recommendations/${id}/accept`, body);
}

export async function getNetworkBalanceSnapshot(orgId: number, branchId?: number) {
  return ownerGet(`/api/v1/network-balance/snapshots/latest${buildQuery({ orgId, branchId })}`);
}

/** Branch transfer shortage → PO/GRN pipeline (procurement demand lines). */
export async function listProcurementDemands(params: {
  orgId: number;
  status?: string;
  stockRequestId?: number;
  page?: number;
  limit?: number;
}) {
  return ownerGet(`/api/v1/procurement-demand${buildQuery(params)}`);
}

export async function getProcurementDemand(id: number, orgId: number) {
  return ownerGet(`/api/v1/procurement-demand/${id}?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function getStockRequest(id: number | string) {
  return ownerGet<{
    data?: {
      id: number;
      status: string;
      requestIntent?: string;
      branchId?: number;
      orgId?: number;
      items?: Array<{
        id: number;
        productId: number;
        variantId: number;
        requestedQty: number;
        fulfilledQty: number;
        cancelledQty: number;
        lineKind?: string;
        product?: { id: number; name?: string };
        variant?: { id: number; sku?: string; title?: string };
      }>;
    };
  }>(`/api/v1/stock-requests/${encodeURIComponent(String(id))}`);
}

export async function linkProcurementDemandPoLine(id: number, body: { orgId: number; purchaseOrderLineId: number }) {
  return ownerPost(`/api/v1/procurement-demand/${id}/link-po-line`, body);
}

export async function cancelProcurementDemandLine(id: number, body: { orgId: number; reason?: string }) {
  return ownerPost(`/api/v1/procurement-demand/${id}/cancel`, body);
}

export async function listQuarantineStock(orgId: number) {
  return ownerGet(`/api/v1/inventory/quarantine-stock?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function listRecallCampaigns(orgId: number) {
  return ownerGet(`/api/v1/inventory/recalls/campaigns?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function createRecallCampaign(data: {
  orgId: number;
  title: string;
  externalRef?: string;
  severity?: string;
  metaJson?: object;
}) {
  return ownerPost("/api/v1/inventory/recalls/campaigns", data);
}

export async function getRecallCampaign(id: number, orgId: number) {
  return ownerGet(`/api/v1/inventory/recalls/campaigns/${id}?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function attachRecallToCampaign(campaignId: number, recallId: number, orgId: number) {
  return ownerPost(`/api/v1/inventory/recalls/campaigns/${campaignId}/attach-recall`, { orgId, recallId });
}

export async function listReverseStockReturns(params: { orgId: number; status?: string; page?: number; limit?: number }) {
  return ownerGet(`/api/v1/reverse-logistics/stock-returns${buildQuery(params)}`);
}

export async function createReverseStockReturn(body: {
  orgId: number;
  fromLocationId: number;
  toLocationId: number;
  reason: string;
  note?: string;
  items: { variantId: number; lotId?: number; quantityReturned: number }[];
}) {
  return ownerPost("/api/v1/reverse-logistics/stock-returns", body);
}

export async function getReverseStockReturn(id: number, orgId: number) {
  return ownerGet(`/api/v1/reverse-logistics/stock-returns/${id}?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function receiveReverseStockReturn(
  id: number,
  body: { orgId: number; lines: { itemId: number; quantityReceived: number }[] }
) {
  return ownerPost(`/api/v1/reverse-logistics/stock-returns/${id}/receive`, body);
}

export async function setStockReturnDisposition(
  id: number,
  body: {
    orgId: number;
    disposition: string;
    linkedVendorReturnId?: number | null;
    metaPatch?: object;
  }
) {
  return ownerPatch(`/api/v1/reverse-logistics/stock-returns/${id}/disposition`, body);
}

export async function disputeStockReturn(id: number, orgId: number, note?: string) {
  return ownerPost(`/api/v1/reverse-logistics/stock-returns/${id}/dispute`, { orgId, note });
}

export async function listReverseLogisticsCases(orgId: number) {
  return ownerGet(`/api/v1/reverse-logistics/cases?orgId=${encodeURIComponent(String(orgId))}`);
}

export async function getInventoryMovementSummary(params: {
  orgId: number;
  fromDate?: string;
  toDate?: string;
  locationId?: number;
}) {
  return ownerGet(`/api/v1/inventory/analytics/movement-summary${buildQuery(params)}`);
}

export async function getStockTurnoverReport(params: {
  orgId: number;
  fromDate?: string;
  toDate?: string;
  locationId?: number;
}) {
  return ownerGet(`/api/v1/inventory/analytics/stock-turnover${buildQuery(params)}`);
}

export async function getAbcAnalysis(params: {
  orgId: number;
  fromDate?: string;
  toDate?: string;
  locationId?: number;
}) {
  return ownerGet(`/api/v1/inventory/analytics/abc-analysis${buildQuery(params)}`);
}

export async function getDeadStock(params: {
  orgId: number;
  locationId?: number;
  daysThreshold?: number;
}) {
  return ownerGet(`/api/v1/inventory/analytics/dead-stock${buildQuery(params)}`);
}

// ========== Phase 6: Reconciliation ==========
export async function runStockReconciliation(params: {
  orgId: number;
  locationId?: number;
}) {
  return ownerGet(`/api/v1/inventory/reconciliation${buildQuery(params)}`);
}

// ========== AI Intelligence Phase 4 ==========
export async function getAiControlTowerOverview(params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/ai/control-tower/overview${buildQuery(params)}`);
}

export async function getAiProcurementRecommendations(params: { branchId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/ai/procurement/recommendations${buildQuery(params)}`
  );
}

export async function getAiForecast(params: {
  branchId: number;
  horizonDays?: number;
  variantId?: number;
  productId?: number;
  categoryId?: number;
  warehouseId?: number;
  planningScope?: "BRANCH" | "WAREHOUSE";
}) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/ai/forecast${buildQuery(params)}`);
}

export async function getAiDemandTrend(params: {
  branchId: number;
  variantId: number;
  windowDays?: number;
  warehouseId?: number;
}) {
  return ownerGet<{ success?: boolean; data?: { series?: { date: string; units: number }[] } }>(
    `/api/v1/ai/demand-trend${buildQuery(params)}`
  );
}

export async function getAiPlanningAlerts(params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/ai/alerts${buildQuery(params)}`);
}

export async function getAiProcurementPriceHistory(params: {
  branchId: number;
  variantId: number;
  vendorId?: number;
}) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/ai/procurement/price-history${buildQuery(params)}`
  );
}

export async function getAiProcurementLeadTimeHistory(params: { branchId: number; vendorId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/ai/procurement/lead-time-history${buildQuery(params)}`
  );
}

export async function postAiBulkDismissReplenishment(ids: number[]) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/ai/replenishment/suggestions/bulk-dismiss`, {
    ids,
  });
}

export async function postAiBulkAcceptReplenishment(ids: number[]) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/ai/replenishment/suggestions/bulk-accept`, {
    ids,
  });
}

export async function getAiReplenishmentSuggestions(params: {
  branchId: number;
  status?: "OPEN" | "ACCEPTED" | "DISMISSED" | "ALL";
}) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/ai/replenishment/suggestions${buildQuery(params)}`
  );
}

// ========== Wave-4: Financial intelligence, SLA, command center ==========
export async function getFinancialIntelligenceSummary(params: {
  orgId: number;
  from: string;
  to: string;
  branchId?: number;
}) {
  return ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/intelligence/financial/summary${buildQuery(params)}`
  );
}

export async function getCostToServeDetail(params: {
  orgId: number;
  variantId: number;
  branchId: number;
  from: string;
  to: string;
}) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/intelligence/financial/cts${buildQuery(params)}`);
}

export async function postFinancialIntelligenceRefresh(body: { orgId: number; from: string; to: string }) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/intelligence/financial/refresh`, body);
}

export async function getSloDefinitions(params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/intelligence/slo/definitions${buildQuery(params)}`);
}

export async function getSloMeasurements(params: { orgId: number; from: string; to: string; sloKey?: string }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/intelligence/slo/measurements${buildQuery(params)}`
  );
}

export async function putSloDefinition(id: number, body: { orgId: number; targetValue?: number; isActive?: boolean; windowDays?: number; metaJson?: object }) {
  return ownerPut<{ success?: boolean; data?: unknown }>(`/api/v1/intelligence/slo/definitions/${id}`, body);
}

export async function getOperationalExceptions(params: {
  orgId: number;
  status?: string;
  severity?: string;
  branchId?: number;
  breachOnly?: boolean;
  skip?: number;
  take?: number;
}) {
  return ownerGet<{ success?: boolean; data?: { rows?: unknown[]; total?: number } }>(
    `/api/v1/operations/command-center/exceptions${buildQuery(params)}`
  );
}

export async function getOperationalExceptionDetail(id: number, params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/operations/command-center/exceptions/${id}${buildQuery(params)}`
  );
}

export async function patchOperationalException(
  id: number,
  body: { orgId: number; acknowledge?: boolean; status?: string; assignedToUserId?: number | null; resolutionNote?: string }
) {
  return ownerPatch<{ success?: boolean; data?: unknown }>(`/api/v1/operations/command-center/exceptions/${id}`, body);
}

export async function postOperationalExceptionRca(
  id: number,
  body: { orgId: number; primaryCause: string; contributingFactorsJson?: unknown; notes?: string }
) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/operations/command-center/exceptions/${id}/rca`, body);
}

export async function postOperationalExceptionRefresh(body: { orgId: number }) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/operations/command-center/refresh`, body);
}

// ========== Wave-5: Executive tower, decision assist, scenarios ==========
export async function getExecutiveTowerOverview(params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/overview${buildQuery(params)}`);
}

export async function getExecutiveTowerKpis(params: { orgId: number; domain?: string; branchId?: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/kpis${buildQuery(params)}`);
}

export async function getExecutiveTowerDrilldown(params: {
  orgId: number;
  kpiKey: string;
  branchId?: number;
  take?: number;
}) {
  return ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/drilldown${buildQuery(params)}`);
}

export async function listDecisionPackages(params: { orgId: number; status?: string }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/executive-tower/decision-packages${buildQuery(params)}`);
}

export async function getDecisionPackage(id: number, params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/executive-tower/decision-packages/${id}${buildQuery(params)}`
  );
}

export async function postSynthesizeDecisionPackage(body: { orgId: number; take?: number }) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/decision-packages/synthesize`, body);
}

export async function postApproveDecisionPackage(
  id: number,
  body: { orgId: number; clientRequestId?: string; comment?: string }
) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/decision-packages/${id}/approve`, body);
}

export async function postRejectDecisionPackage(id: number, body: { orgId: number; comment?: string }) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/decision-packages/${id}/reject`, body);
}

export async function postOverrideDecisionPackage(
  id: number,
  body: { orgId: number; overrideJson?: Record<string, unknown>; comment?: string }
) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/decision-packages/${id}/override`, body);
}

export async function listScenarioRuns(params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/executive-tower/scenarios${buildQuery(params)}`);
}

export async function getScenarioRun(runId: number, params: { orgId: number }) {
  return ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/executive-tower/scenarios/${runId}${buildQuery(params)}`
  );
}

export async function postScenarioRun(body: {
  orgId: number;
  templateKey: string;
  horizonDays?: number;
  parametersJson?: Record<string, unknown>;
}) {
  return ownerPost<{ success?: boolean; data?: unknown }>(`/api/v1/executive-tower/scenarios`, body);
}

export async function getScenarioTemplates() {
  return ownerGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/executive-tower/scenario-templates`);
}
