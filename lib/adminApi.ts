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
export const adminVerificationsApi = {
  owners: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/verifications/owners${qs}`);
  },
  organizations: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/verifications/organizations${qs}`);
  },
  branches: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/verifications/branches${qs}`);
  },
  staff: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/verifications/staff${qs}`);
  },
  producerOrgs: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return apiGet<{ data: unknown[] }>(`${prefix}/admin/verifications/producer-orgs${qs}`);
  },
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
