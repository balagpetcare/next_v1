/**
 * Admin API layer – structured by module.
 * Uses lib/api (apiGet, apiPost, apiPatch, etc.); credentials include.
 */

import { apiGet, apiPatch, apiPost } from "./api";
import { getApiHeaders } from "./countryContext";

const prefix = "/api/v1";

function apiBaseUrl(): string {
  return typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

// Dashboard
export const dashboardApi = {
  summary: () => apiGet<{ data: unknown }>(`${prefix}/admin/dashboard/summary`),
  liveFeed: () => apiGet<{ data: unknown[] }>(`${prefix}/admin/dashboard/live-feed`),
  alerts: () => apiGet<{ data: unknown[] }>(`${prefix}/admin/dashboard/alerts`),
  sla: () => apiGet<{ data: unknown }>(`${prefix}/admin/dashboard/sla`),
  trends: (params?: { period?: string }) => {
    const q = params?.period ? `?period=${params.period}` : "";
    return apiGet<{ data: { series: unknown[] } }>(`${prefix}/admin/dashboard/trends${q}`);
  },
};

// Users
export const adminUsersApi = {
  list: (params?: { q?: string; status?: string; createdSince?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.status) sp.set("status", params.status);
    if (params?.createdSince) sp.set("createdSince", params.createdSince);
    const qs = sp.toString();
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/users${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string | number) => apiGet<{ data: unknown }>(`${prefix}/admin/users/${id}`),
  update: (id: string | number, body: { status?: string; displayName?: string }) =>
    apiPatch<{ data: unknown }>(`${prefix}/admin/users/${id}`, body),
  forceLogout: (id: string | number) => apiPost<unknown>(`${prefix}/admin/users/${id}/force-logout`, {}),
};

// Verifications
function buildVerificationQuery(params?: {
  status?: string;
  search?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  country?: string;
  bodyId?: number;
}) {
  const sp = new URLSearchParams();
  const search = params?.search ?? params?.q;
  if (params?.status) sp.set("status", params.status);
  if (search) sp.set("search", search);
  if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params?.dateTo) sp.set("dateTo", params.dateTo);
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  if (params?.country) sp.set("country", params.country);
  if (params?.bodyId != null) sp.set("bodyId", String(params.bodyId));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const adminVerificationsApi = {
  stats: () => {
    return apiGet<{
      data: {
        generatedAt: string;
        totals: { total: number; pending: number; approvedToday: number; rejectedToday: number };
        entities: Record<string, { key: string; label: string; total: number; pending: number; approvedToday: number; rejectedToday: number }>;
        recentActivity: unknown[];
      };
    }>(`${prefix}/admin/verifications/stats`);
  },
  owners: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/owners${qs}`);
  },
  organizations: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/organizations${qs}`);
  },
  branches: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/branches${qs}`);
  },
  staff: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/staff${qs}`);
  },
  producerOrgs: (params?: { status?: string; search?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/producer-orgs${qs}`);
  },
  doctors: (params?: { status?: string; search?: string; country?: string; bodyId?: number; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const qs = buildVerificationQuery(params);
    return apiGet<{ data: unknown[]; total?: number; limit?: number; offset?: number }>(`${prefix}/admin/verifications/doctors${qs}`);
  },
  getOwner: (id: number) => apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/owners/${id}`),
  getOrganization: (id: number) => apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/organizations/${id}`),
  getBranch: (id: number) => apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/branches/${id}`),
  getStaff: (id: number) => apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/staff/${id}`),
  getProducerOrg: (id: number) => apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/producer-orgs/${id}`),
  getDoctor: (id: number) =>
    apiGet<{ data: Record<string, unknown> }>(`${prefix}/admin/verifications/doctors/${id}`),
  approveDoctor: (id: number, body?: { note?: string }) =>
    apiPost<{ data: unknown }>(`${prefix}/admin/verifications/doctors/${id}/approve`, body ?? {}),
  rejectDoctor: (id: number, body: { note?: string }) =>
    apiPost<{ data: unknown }>(`${prefix}/admin/verifications/doctors/${id}/reject`, body),
};

// Products
export const productsApi = {
  list: (params?: { approvalStatus?: string }) => {
    const sp = new URLSearchParams();
    if (params?.approvalStatus) sp.set("approvalStatus", params.approvalStatus);
    const qs = sp.toString();
    return apiGet<{ data: unknown[] }>(`${prefix}/products${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string | number) => apiGet<{ data: unknown }>(`${prefix}/products/${id}`),
  approve: (id: string | number) => apiPost<unknown>(`${prefix}/products/${id}/approve`, {}),
  reject: (id: string | number, body: { reason?: string }) =>
    apiPost<unknown>(`${prefix}/products/${id}/reject`, body),
};

// Orders, Returns, Wallet
export const ordersApi = {
  list: () => apiGet<{ data: unknown[] }>(`${prefix}/orders`),
  getById: (id: string | number) => apiGet<{ data: unknown }>(`${prefix}/orders/${id}`),
};

export const returnsApi = {
  list: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/returns${qs}`);
  },
};

export const walletApi = {
  withdrawRequests: (params?: { status?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiGet<{ data: unknown[] }>(`${prefix}/wallet/admin/withdraw/requests${qs ? `?${qs}` : ""}`);
  },
};

// Audit
export const auditApi = {
  logs: (params?: { q?: string; entityType?: string; action?: string; startDate?: string; endDate?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.entityType) sp.set("entityType", params.entityType);
    if (params?.action) sp.set("action", params.action);
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/audit/logs${qs ? `?${qs}` : ""}`);
  },
};

// Branch Manager – branch-scoped dashboard APIs
export const branchManagerApi = {
  // All branches where current user is BRANCH_MANAGER or org owner (and has active access)
  managedBranches: () =>
    apiGet<{ data: any[] }>(`${prefix}/branches/managed`),

  // KPIs for a single branch (per-day summary)
  kpis: (branchId: number | string) =>
    apiGet<{ data: any }>(`${prefix}/branches/${branchId}/manager/kpis`),

  // Staff + access overview for a single branch
  staffOverview: (branchId: number | string) =>
    apiGet<{ data: any[] }>(
      `${prefix}/branches/${branchId}/manager/staff`,
    ),
};

// Clinical catalog (governance)
export const adminClinicalCatalogApi = {
  items: (params: { orgId: number; domainType?: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    sp.set("orgId", String(params.orgId));
    if (params.domainType) sp.set("domainType", params.domainType);
    if (params.search) sp.set("search", params.search);
    if (params.page != null) sp.set("page", String(params.page));
    if (params.limit != null) sp.set("limit", String(params.limit));
    return apiGet<{ data: { items: unknown[]; pagination: unknown } }>(`${prefix}/admin/clinical-catalog/items?${sp}`);
  },
  approvals: () => apiGet<{ data: unknown[] }>(`${prefix}/admin/clinical-catalog/approvals`),
  approve: (logId: number, body?: { remarks?: string }) => apiPost<{ data: unknown }>(`${prefix}/admin/clinical-catalog/approvals/${logId}/approve`, body ?? {}),
  reject: (logId: number, body?: { remarks?: string }) => apiPost<{ data: unknown }>(`${prefix}/admin/clinical-catalog/approvals/${logId}/reject`, body ?? {}),
  auditLogs: (params?: { orgId?: number; itemId?: number; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.orgId != null) sp.set("orgId", String(params.orgId));
    if (params?.itemId != null) sp.set("itemId", String(params.itemId));
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    return apiGet<{ data: { items: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }>(
      `${prefix}/admin/clinical-catalog/audit-logs${sp.toString() ? `?${sp}` : ""}`
    );
  },
};

export type MedicineImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateInFile: number;
  duplicateInDb: number;
  newGenerics: number;
  newDosageForms: number;
  newManufacturers: number;
  newBrands: number;
  newPresentations: number;
  newCountryBrandRows: number;
  updatableExisting: number;
  needsReview: number;
  previewVersion: number;
};

export type MedicineImportApplySummary = {
  applied: number;
  skipped: number;
  failed: number;
  updatedExisting: number;
  skippedInvalid: number;
  skippedDuplicateInFile: number;
  skippedNeedsReview: number;
  skippedOther: number;
  finalStatus: string;
};

export const adminCountriesApi = {
  list: (params?: { q?: string; isActive?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.isActive !== undefined) sp.set("isActive", String(params.isActive));
    const qs = sp.toString();
    return apiGet<{ success: boolean; data: { id: number; code: string; name: string; isActive: boolean }[] }>(
      `${prefix}/admin/countries${qs ? `?${qs}` : ""}`
    );
  },
};

export const adminMedicineCatalogImportApi = {
  upload: async (
    file: File,
    body: { countryId?: number; countryCode?: string; provider?: string; allowDuplicateFile?: boolean }
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (body.countryId != null) form.append("countryId", String(body.countryId));
    if (body.countryCode) form.append("countryCode", body.countryCode);
    if (body.provider) form.append("provider", body.provider);
    if (body.allowDuplicateFile) form.append("allowDuplicateFile", "true");
    const res = await fetch(`${apiBaseUrl()}${prefix}/admin/medicine-catalog-import/upload`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", ...getApiHeaders() },
      body: form,
    });
    const j = (await res.json().catch(() => ({}))) as {
      message?: string;
      data?: { existingBatchId?: number; existingStatus?: string; fileSha256?: string };
    };
    if (!res.ok) {
      const err = new Error(j?.message || `Upload failed (${res.status})`) as Error & {
        status?: number;
        payload?: typeof j;
      };
      err.status = res.status;
      err.payload = j;
      throw err;
    }
    return j as {
      success: boolean;
      data: { batchId: number; totalRows: number; status: string; fileSha256?: string };
    };
  },
  batches: (params?: { page?: number; limit?: number; countryId?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.countryId != null) sp.set("countryId", String(params.countryId));
    if (params?.status) sp.set("status", params.status);
    const qs = sp.toString();
    return apiGet<{ success: boolean; data: { items: unknown[]; pagination: unknown } }>(
      `${prefix}/admin/medicine-catalog-import/batches${qs ? `?${qs}` : ""}`
    );
  },
  batch: (id: number) =>
    apiGet<{ success: boolean; data: Record<string, unknown> }>(`${prefix}/admin/medicine-catalog-import/batches/${id}`),
  rows: (id: number, params?: { page?: number; limit?: number; classification?: string; applyStatus?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page != null) sp.set("page", String(params.page));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.classification) sp.set("classification", params.classification);
    if (params?.applyStatus) sp.set("applyStatus", params.applyStatus);
    const qs = sp.toString();
    return apiGet<{ success: boolean; data: { items: unknown[]; pagination: unknown } }>(
      `${prefix}/admin/medicine-catalog-import/batches/${id}/rows${qs ? `?${qs}` : ""}`
    );
  },
  preview: (id: number) =>
    apiPost<{ success: boolean; data: MedicineImportPreviewSummary }>(
      `${prefix}/admin/medicine-catalog-import/batches/${id}/preview`,
      {}
    ),
  confirm: (
    id: number,
    body: { previewVersion: number; acknowledgeNeedsReviewSkip?: boolean }
  ) =>
    apiPost<{ success: boolean; data: unknown; code?: string; needsReview?: number }>(
      `${prefix}/admin/medicine-catalog-import/batches/${id}/confirm`,
      body
    ),
  apply: (id: number) =>
    apiPost<{ success: boolean; data: MedicineImportApplySummary }>(
      `${prefix}/admin/medicine-catalog-import/batches/${id}/apply`,
      {}
    ),
  cancel: (id: number) =>
    apiPost<{ success: boolean; data: unknown }>(`${prefix}/admin/medicine-catalog-import/batches/${id}/cancel`, {}),
  purgeBatch: (id: number) =>
    apiPost<{ success: boolean; data: { batchId: number; purged: boolean } }>(
      `${prefix}/admin/medicine-catalog-import/batches/${id}/purge`,
      {}
    ),
  downloadInvalidCsv: async (id: number, filename?: string) => {
    const res = await fetch(`${apiBaseUrl()}${prefix}/admin/medicine-catalog-import/batches/${id}/export-invalid`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "text/csv", ...getApiHeaders() },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { message?: string })?.message || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `medicine-import-${id}-invalid.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  downloadClassificationCsv: async (
    id: number,
    classification: "INVALID" | "NEEDS_REVIEW" | "DUPLICATE_IN_FILE" | "EXISTS_IN_DB" | "NEW",
    filename?: string
  ) => {
    const q = new URLSearchParams({ classification });
    const res = await fetch(
      `${apiBaseUrl()}${prefix}/admin/medicine-catalog-import/batches/${id}/export-classification?${q}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "text/csv", ...getApiHeaders() },
      }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { message?: string })?.message || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `medicine-import-${id}-${classification.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/** Admin Medicine workspace — `/api/v1/admin/medicine/*` (master data + country listings) */
const medWorkspace = `${prefix}/admin/medicine`;

export type MedicineWorkspaceDashboardSummary = {
  listings: {
    active: number;
    inactive: number;
    archived: number;
    importedLineage?: number;
    manualApprox?: number;
    prescriptionLinked?: number;
    totalNonArchived?: number;
  };
  masters: { generics: number; brands: number; manufacturers: number; dosageForms: number; presentations: number };
  imports: {
    recentBatches: Array<{
      id: number;
      status: string;
      filename: string;
      totalRows: number;
      createdAt: string;
      country?: { code: string; name: string };
    }>;
    failedLast7Days: number;
    partialAppliedLast7Days?: number;
    batchesApplying?: number;
    batchesApplyingStuck?: number;
  };
  reviewQueues: {
    needsAttentionRows: number;
    invalid: number;
    duplicateInFile: number;
    existsInDb: number;
    needsReview: number;
  };
};

function medicineWorkspaceQs(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export type MedicineListingsListParams = {
  countryId?: number;
  q?: string;
  isActive?: boolean;
  includeArchived?: boolean;
  hasPrescriptions?: boolean;
  brandQ?: string;
  genericQ?: string;
  dosageFormQ?: string;
  strengthQ?: string;
  manufacturerQ?: string;
  packageQ?: string;
  sourceType?: "imported" | "manual";
  importBatchId?: number;
  genericId?: number;
  brandId?: number;
  dosageFormId?: number;
  manufacturerId?: number;
  listingCreatedAtFrom?: string;
  listingCreatedAtTo?: string;
  listingUpdatedAtFrom?: string;
  listingUpdatedAtTo?: string;
  firstBatchCreatedAtFrom?: string;
  firstBatchCreatedAtTo?: string;
  firstBatchUploadedByUserId?: number;
  relatedExpand?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

function listingsListQs(params?: MedicineListingsListParams): Record<string, string | number | boolean | undefined | null> {
  if (!params) return {};
  return {
    countryId: params.countryId,
    q: params.q,
    isActive: params.isActive,
    includeArchived: params.includeArchived ? "true" : undefined,
    hasPrescriptions:
      params.hasPrescriptions === true ? "true" : params.hasPrescriptions === false ? "false" : undefined,
    brandQ: params.brandQ,
    genericQ: params.genericQ,
    dosageFormQ: params.dosageFormQ,
    strengthQ: params.strengthQ,
    manufacturerQ: params.manufacturerQ,
    packageQ: params.packageQ,
    sourceType: params.sourceType,
    importBatchId: params.importBatchId,
    genericId: params.genericId,
    brandId: params.brandId,
    dosageFormId: params.dosageFormId,
    manufacturerId: params.manufacturerId,
    listingCreatedAtFrom: params.listingCreatedAtFrom,
    listingCreatedAtTo: params.listingCreatedAtTo,
    listingUpdatedAtFrom: params.listingUpdatedAtFrom,
    listingUpdatedAtTo: params.listingUpdatedAtTo,
    firstBatchCreatedAtFrom: params.firstBatchCreatedAtFrom,
    firstBatchCreatedAtTo: params.firstBatchCreatedAtTo,
    firstBatchUploadedByUserId: params.firstBatchUploadedByUserId,
    relatedExpand: params.relatedExpand,
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  };
}

export const adminMedicineWorkspaceApi = {
  countries: () =>
    apiGet<{ success: boolean; data: { id: number; code: string; name: string }[] }>(`${medWorkspace}/countries`),
  medicineAuditLogs: (params: { entityType: string; entityId: number; page?: number; limit?: number }) =>
    apiGet<{
      success: boolean;
      data: {
        items: Array<{
          id: number;
          entityType: string;
          entityId: number;
          action: string;
          createdAt: string;
          user?: { auth?: { email?: string | null }; profile?: { displayName?: string } };
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    }>(
      `${medWorkspace}/audit-logs${medicineWorkspaceQs({
        entityType: params.entityType,
        entityId: params.entityId,
        page: params.page,
        limit: params.limit,
      })}`
    ),
  dashboardSummary: () =>
    apiGet<{ success: boolean; data: MedicineWorkspaceDashboardSummary }>(`${medWorkspace}/dashboard/summary`),
  reviewQueues: () =>
    apiGet<{
      success: boolean;
      data: { invalid: number; duplicateInFile: number; existsInDb: number; needsReview: number };
    }>(`${medWorkspace}/review/queues`),
  settingsMeta: () =>
    apiGet<{
      success: boolean;
      data: {
        medicineImportMaxRows: number;
        medicineImportMaxFileBytes: number;
        permissions: string[];
      };
    }>(`${medWorkspace}/settings/meta`),
  countryCatalogSummary: (countryId: number) =>
    apiGet<{
      success: boolean;
      data: {
        country: { id: number; code: string; name: string; isActive: boolean };
        listings: { active: number; inactive: number; archived: number };
      };
    }>(`${medWorkspace}/country-catalogs/${countryId}/summary`),
  listingsList: (params?: MedicineListingsListParams) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/listings${medicineWorkspaceQs(listingsListQs(params))}`
    ),
  listingsBulk: (body: { action: "deactivate" | "activate" | "archive"; ids: number[]; reason?: string }) =>
    apiPost<{
      success: boolean;
      data: { ok: number; failed: { id: number; message: string }[]; processed: number };
    }>(`${medWorkspace}/listings/bulk`, body),
  listingsGet: (id: number) => apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/listings/${id}`),
  listingsPreview: (body: {
    countryId: number;
    presentationId: number;
    brandId: number;
    packageMarkDisplay?: string;
    packageMarkNormalized?: string;
  }) =>
    apiPost<{
      success: boolean;
      data: {
        fingerprint: string;
        normalizedPreview: Record<string, unknown>;
        duplicateListing: Record<string, unknown> | null;
      };
    }>(`${medWorkspace}/listings/preview`, body),
  listingsCreate: (body: {
    countryId: number;
    presentationId: number;
    brandId: number;
    packageMarkDisplay?: string;
    packageMarkNormalized?: string;
    isActive?: boolean;
    workspaceProfileJson?: object | null;
    reviewStatus?: string | null;
  }) => apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/listings`, body),
  listingsPatch: (
    id: number,
    body: {
      packageMarkDisplay?: string;
      packageMarkNormalized?: string;
      isActive?: boolean;
      deactivatedReason?: string | null;
      workspaceProfileJson?: object | null;
      reviewStatus?: string | null;
    }
  ) => apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/listings/${id}`, body),
  listingsArchive: (id: number, body?: { reason?: string }) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/listings/${id}/archive`, body ?? {}),
  listingsRestore: (id: number) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/listings/${id}/restore`, {}),
  genericsList: (params?: { search?: string; page?: number; limit?: number; includeInactive?: boolean }) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/generics${medicineWorkspaceQs({
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
        includeInactive: params?.includeInactive ? "1" : undefined,
      })}`
    ),
  genericsGet: (id: number) => apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/generics/${id}`),
  genericsCreate: (body: { displayName: string }) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/generics`, body),
  genericsPatch: (
    id: number,
    body: { displayName?: string; isActive?: boolean; aliasesJson?: object | null }
  ) => apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/generics/${id}`, body),
  genericsArchive: (id: number) => apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/generics/${id}/archive`, {}),
  dosageFormsList: (params?: { search?: string; page?: number; limit?: number; includeInactive?: boolean }) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/dosage-forms${medicineWorkspaceQs({
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
        includeInactive: params?.includeInactive ? "1" : undefined,
      })}`
    ),
  dosageFormsGet: (id: number) =>
    apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/dosage-forms/${id}`),
  dosageFormsCreate: (body: { displayName: string }) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/dosage-forms`, body),
  dosageFormsPatch: (
    id: number,
    body: { displayName?: string; isActive?: boolean; aliasesJson?: object | null }
  ) => apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/dosage-forms/${id}`, body),
  dosageFormsArchive: (id: number) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/dosage-forms/${id}/archive`, {}),
  manufacturersList: (params?: { search?: string; page?: number; limit?: number; includeInactive?: boolean }) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/manufacturers${medicineWorkspaceQs({
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
        includeInactive: params?.includeInactive ? "1" : undefined,
      })}`
    ),
  manufacturersGet: (id: number) =>
    apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/manufacturers/${id}`),
  manufacturersCreate: (body: { displayName: string }) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/manufacturers`, body),
  manufacturersPatch: (id: number, body: { displayName?: string; isActive?: boolean }) =>
    apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/manufacturers/${id}`, body),
  manufacturersArchive: (id: number) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/manufacturers/${id}/archive`, {}),
  brandsList: (params?: {
    search?: string;
    manufacturerId?: number;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/brands${medicineWorkspaceQs({
        search: params?.search,
        manufacturerId: params?.manufacturerId,
        page: params?.page,
        limit: params?.limit,
        includeInactive: params?.includeInactive ? "1" : undefined,
      })}`
    ),
  brandsGet: (id: number) => apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/brands/${id}`),
  brandsCreate: (body: { manufacturerId: number; displayName: string }) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/brands`, body),
  brandsPatch: (
    id: number,
    body: { displayName?: string; isActive?: boolean; aliasesJson?: object | null }
  ) => apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/brands/${id}`, body),
  brandsArchive: (id: number) => apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/brands/${id}/archive`, {}),
  presentationsList: (params?: {
    search?: string;
    genericId?: number;
    dosageFormId?: number;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) =>
    apiGet<{ success: boolean; data: { items: unknown[]; pagination: Record<string, unknown> } }>(
      `${medWorkspace}/presentations${medicineWorkspaceQs({
        search: params?.search,
        genericId: params?.genericId,
        dosageFormId: params?.dosageFormId,
        page: params?.page,
        limit: params?.limit,
        includeInactive: params?.includeInactive ? "1" : undefined,
      })}`
    ),
  presentationsGet: (id: number) =>
    apiGet<{ success: boolean; data: Record<string, unknown> }>(`${medWorkspace}/presentations/${id}`),
  presentationsCreate: (body: {
    genericId: number;
    dosageFormId: number;
    strengthDisplay: string;
    strengthNormalizedKey?: string;
  }) => apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/presentations`, body),
  presentationsPatch: (
    id: number,
    body: { strengthDisplay?: string; strengthNormalizedKey?: string; isActive?: boolean }
  ) => apiPatch<{ success: boolean; data: unknown }>(`${medWorkspace}/presentations/${id}`, body),
  presentationsArchive: (id: number) =>
    apiPost<{ success: boolean; data: unknown }>(`${medWorkspace}/presentations/${id}/archive`, {}),
  downloadListingsCsv: async (
    params?: Omit<MedicineListingsListParams, "page" | "limit" | "sortBy" | "sortDir">,
    filename?: string
  ) => {
    const q = medicineWorkspaceQs(listingsListQs(params));
    const res = await fetch(`${apiBaseUrl()}${medWorkspace}/exports/listings.csv${q}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "text/csv", ...getApiHeaders() },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { message?: string })?.message || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "medicine-listings.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const adminVendorAnalyticsApi = {
  summary: () => apiGet<{ success: boolean; data: unknown }>(`${prefix}/admin/vendor-analytics`),
};
