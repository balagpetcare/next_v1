/**
 * Admin API layer – structured by module.
 * Uses lib/api (apiGet, apiPost, apiPatch, etc.); credentials include.
 */

import { apiGet, apiPatch, apiPost } from "./api";

const prefix = "/api/v1";

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
