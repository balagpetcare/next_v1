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
  capacity?: number | null;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function ownerClinicRooms(branchId: string | number): Promise<ClinicRoom[] | null> {
  const res = await ownerGet<{ success?: boolean; data?: ClinicRoom[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/rooms`
  );
  return res?.data ?? null;
}

export async function ownerClinicRoomCreate(
  branchId: string | number,
  data: { name: string; roomType?: string; capacity?: number; status?: string; notes?: string }
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
  data: { name?: string; roomType?: string; capacity?: number; status?: string; notes?: string }
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
  params?: { date?: string; doctorId?: number; status?: string; limit?: number; offset?: number }
) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.status) q.set("status", params.status);
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

export async function ownerClinicDoctorDetail(
  branchId: string | number,
  memberId: string | number
): Promise<{
  branch?: { id: number; name: string };
  profile?: Record<string, unknown>;
  serviceFees?: Array<{ id: number; serviceId: number; serviceName?: string; category?: string; fee: number; durationMin?: number | null; isActive: boolean; notes?: string | null }>;
  scheduleTemplates?: unknown[];
  displayName?: string | null;
  [k: string]: unknown;
} | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/doctors/${memberId}`
  );
  return (res as { data?: unknown })?.data ?? null;
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
    return (j as { data?: unknown })?.data ?? null;
  }
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(path);
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
}

export async function ownerClinicPackageImpact(branchId: string | number, packageId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/packages/${packageId}/impact`
  );
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
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
  const res = await ownerGet<{ success?: boolean; data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } }>(
    `/api/v1/owner/clinic/branches/${branchId}/items${query ? `?${query}` : ""}`
  );
  const data = (res as { data?: { items?: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } } })?.data;
  return { items: data?.items ?? [], pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
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
  const res = await ownerGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/owner/clinic/branches/${branchId}/items/search${query ? `?${query}` : ""}`
  );
  return ((res as { data?: unknown[] })?.data ?? []) as unknown[];
}

export async function ownerClinicItemById(branchId: string | number, itemId: string | number): Promise<Record<string, unknown> | null> {
  const res = await ownerGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/owner/clinic/branches/${branchId}/items/${itemId}`
  );
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
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
  return (res as { data?: unknown })?.data ?? null;
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

export async function ownerMyPetGet(petId: string | number): Promise<any | null> {
  const res = await ownerGet<{ success?: boolean; data?: any }>(`/api/v1/owner/me/pets/${petId}`);
  return (res as { data?: any })?.data ?? null;
}
