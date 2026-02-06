import { getApiHeaders } from "./countryContext";

// Base API host (no trailing slash). Example: http://localhost:3000
const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function parseError(res: Response): Promise<never> {
  let msg = `Request failed (${res.status})`;
  try {
    const j = await res.json();
    if (j?.message) msg = j.message;
  } catch {}
  throw new Error(msg);
}

function defaultHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Accept: "application/json", ...getApiHeaders(), ...extra };
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    credentials: "include",
    headers: defaultHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: defaultHeaders(),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

/** GET /api/v1/me/location – profile, places, events, geoKeys */
export async function getMeLocation(): Promise<{
  profile?: unknown;
  currentPlace?: { countryCode?: string; admin1?: string; admin2?: string; city?: string; postalCode?: string; formattedAddress?: string; lat?: number; lng?: number; bdDivision?: string; bdDistrict?: string; bdUpazila?: string; bdWard?: string };
  manualOverridePlace?: { countryCode?: string; admin1?: string; admin2?: string; city?: string; postalCode?: string; formattedAddress?: string; lat?: number; lng?: number; bdDivision?: string; bdDistrict?: string; bdUpazila?: string; bdWard?: string };
  homePlace?: unknown;
  events?: unknown[];
  geoKeys?: string[];
}> {
  const res = await fetch(`${base}/api/v1/me/location`, {
    method: "GET",
    credentials: "include",
    headers: defaultHeaders(),
  });
  if (!res.ok) return parseError(res);
  const j = await res.json();
  return j?.data ?? j;
}

/**
 * GET /api/v1/me/branch-access (Branch Dashboard contract).
 * Uses GET /api/v1/branch-access/my-requests and maps to { branches: [...] }.
 */
export interface BranchAccessItem {
  branchId: number;
  branchName: string;
  branchType: string;
  role: string;
  status: string;
  requestedAt?: string | null;
  approvedAt?: string | null;
}

export async function getMeBranchAccess(): Promise<{ branches: BranchAccessItem[] }> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>("/api/v1/branch-access/my-requests");
  const list = res?.data ?? [];
  const branches: BranchAccessItem[] = (Array.isArray(list) ? list : []).map((p: any) => ({
    branchId: Number(p.branchId ?? p.branch?.id ?? 0),
    branchName: p.branch?.name ?? "—",
    branchType: p.branchType ?? p.branch?.type ?? "—",
    role: p.role ?? "—",
    status: p.status ?? "PENDING",
    requestedAt: p.requestedAt ?? null,
    approvedAt: p.approvedAt ?? null,
  }));
  return { branches };
}

/**
 * Branch summary shape (stable hook contract).
 * Uses GET /api/v1/branches/:id/me for branch + myAccess (role/permissions from approved branch access).
 */
export const BRANCH_SUMMARY_DEFAULT_PERMISSIONS = ["branch.view", "dashboard.view"];

export async function fetchBranchSummary(branchId: string | number): Promise<{
  success: true;
  data: {
    branch: { id: number; name: string; type?: string; address?: string; lat?: number; lng?: number; [k: string]: any };
    myAccess: { role: string; permissions: string[]; scopes?: string[] };
    kpis: Record<string, any>;
    todayBoard: Record<string, any>;
    alerts: Record<string, any>;
    activity: any[];
  };
} | { success: false; errorCode: "unauthorized" | "forbidden" | "not_found" | "network"; message: string }> {
  const id = String(branchId).replace(/[^0-9]/g, "");
  if (!id) return { success: false, errorCode: "not_found", message: "Invalid branch id" };

  const path = (p: string) => `${base}${p}`;
  const get = async (url: string) => {
    const res = await fetch(path(url), { method: "GET", credentials: "include", headers: defaultHeaders() });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  try {
    const meRes = await get(`/api/v1/branches/${id}/me`);
    if (meRes.status === 401) return { success: false, errorCode: "unauthorized", message: "Unauthorized" };
    if (meRes.status === 403 || !meRes.ok) return { success: false, errorCode: "forbidden", message: meRes.data?.message ?? "Access denied" };
    if (meRes.status === 404) return { success: false, errorCode: "not_found", message: "Branch not found" };
    if (!meRes.ok) return { success: false, errorCode: "network", message: "Failed to load branch" };

    const payload = meRes.data?.data ?? meRes.data;
    const rawBranch = payload?.branch ?? {};
    const branch = {
      id: rawBranch?.id ?? Number(id),
      name: rawBranch?.name ?? "",
      type: rawBranch?.types?.[0]?.type?.code ?? rawBranch?.type ?? "",
      address: rawBranch?.addressJson ?? rawBranch?.address,
      lat: rawBranch?.lat ?? rawBranch?.latitude,
      lng: rawBranch?.lng ?? rawBranch?.longitude,
      ...rawBranch,
    };
    const myAccess = {
      role: payload?.myAccess?.role ?? "BRANCH_STAFF",
      permissions: Array.isArray(payload?.myAccess?.permissions) ? payload.myAccess.permissions : BRANCH_SUMMARY_DEFAULT_PERMISSIONS,
      scopes: Array.isArray(payload?.myAccess?.scopes) ? payload.myAccess.scopes : [],
    };

    const today = new Date().toISOString().split("T")[0];
    const kpis: Record<string, any> = {
      todaySales: 0,
      pendingOrders: 0,
      lowStockCount: 0,
      returnsToday: 0,
      todayAppointments: undefined,
      cashSnapshot: undefined,
    };
    const todayBoard: Record<string, any> = {
      approvalsPending: [],
      tasksAssignedToMe: [],
      transfersPending: [],
      receivePending: [],
      appointmentsQueue: [],
    };
    const alerts: Record<string, any> = {
      lowStockItems: [],
      expiryWarnings: [],
      suspiciousFlags: [],
    };
    let activity: any[] = [];

    try {
      const [salesRes, ordersRes, alertsRes, expiringRes] = await Promise.all([
        get(`/api/v1/reports/sales?branchId=${id}&startDate=${today}&endDate=${today}&groupBy=day`),
        get(`/api/v1/orders?branchId=${id}&limit=500`),
        get(`/api/v1/inventory/alerts?branchId=${id}`),
        get(`/api/v1/inventory/expiring?branchId=${id}&daysAhead=7`),
      ]);

      if (salesRes.ok && salesRes.data?.data) {
        const d = salesRes.data.data;
        kpis.todaySales = d.summary?.totalSales ?? d.totalSales ?? 0;
        kpis.todayOrders = d.summary?.totalOrders ?? d.totalOrders ?? 0;
      }
      if (ordersRes.ok && ordersRes.data?.data?.items) {
        const items = ordersRes.data.data.items;
        kpis.pendingOrders = Array.isArray(items) ? items.filter((o: any) => (o.status || "").toUpperCase() === "PENDING").length : 0;
      } else if (ordersRes.ok && Array.isArray(ordersRes.data?.data)) {
        kpis.pendingOrders = ordersRes.data.data.filter((o: any) => (o.status || "").toUpperCase() === "PENDING").length;
      }
      if (alertsRes.ok && alertsRes.data?.data) {
        const list = Array.isArray(alertsRes.data.data) ? alertsRes.data.data : [];
        alerts.lowStockItems = list;
        kpis.lowStockCount = list.length;
      }
      if (expiringRes.ok && expiringRes.data?.data) {
        alerts.expiryWarnings = Array.isArray(expiringRes.data.data) ? expiringRes.data.data : [];
      }
    } catch {
      // keep defaults
    }

    return {
      success: true,
      data: { branch, myAccess, kpis, todayBoard, alerts, activity },
    };
  } catch (e: any) {
    return { success: false, errorCode: "network", message: e?.message ?? "Network error" };
  }
}

/** POST /api/v1/me/location/events – source=GPS, eventType=PING */
export async function postLocationEvents(payload: { lat: number; lng: number; source?: string; eventType?: string; accuracyMeters?: number }): Promise<{ eventId?: number }> {
  const res = await fetch(`${base}/api/v1/me/location/events`, {
    method: "POST",
    credentials: "include",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      lat: payload.lat,
      lng: payload.lng,
      source: payload.source ?? "GPS",
      eventType: payload.eventType ?? "PING",
      accuracyMeters: payload.accuracyMeters,
    }),
  });
  if (!res.ok) return parseError(res);
  const j = await res.json();
  return j?.data ?? j;
}

// ========== Staff Branch Inventory (Phase 5A) ==========
export async function staffInventoryList(branchId: string, opts?: { search?: string; lowStockOnly?: boolean; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.lowStockOnly) params.set("lowStockOnly", "true");
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit ?? 50));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/inventory?${params}`);
  return { items: res?.data ?? [], pagination: (res as any)?.pagination ?? {} };
}

export async function staffInventoryAlerts(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/alerts?branchId=${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffInventoryLocations() {
  const res = await apiGet<{ success?: boolean; data?: any[] }>("/api/v1/inventory/locations");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffInventorySummary(branchId: string, opts?: { search?: string; lowStockOnly?: boolean; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.lowStockOnly) params.set("lowStockOnly", "true");
  if (opts?.page) params.set("page", String(opts.page ?? 1));
  if (opts?.limit) params.set("limit", String(opts.limit ?? 50));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/inventory/summary?${params}`);
  return { items: res?.data ?? [], pagination: (res as any)?.pagination ?? {} };
}

/** GET /api/v1/inventory/lots - Lot-wise stock (excludeExpired=true by default for selectors) */
export async function staffInventoryLots(opts: { locationId: number; variantId?: number; excludeExpired?: boolean }) {
  const params = new URLSearchParams();
  params.set("locationId", String(opts.locationId));
  if (opts.variantId) params.set("variantId", String(opts.variantId));
  params.set("excludeExpired", opts.excludeExpired !== false ? "true" : "false");
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/lots?${params}`);
  return res?.data ?? [];
}

/** GET /api/v1/inventory/fefo - FEFO helper: available lots by earliest expiry (excludes expired) */
export async function staffFefoLots(locationId: number, variantId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/fefo?locationId=${locationId}&variantId=${variantId}`);
  return res?.data ?? [];
}

export async function staffCreateOpeningStock(body: { locationId: number; variantId: number; quantity: number; lotId?: number; orgId?: number; lotCode?: string; mfgDate?: string; expDate?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/inventory/opening", body);
}

export async function staffCreateAdjustmentRequest(body: { locationId: number; variantId: number; quantityDelta: number; lotId?: number; reason?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/inventory/adjustment-requests", body);
}

export async function staffTransfersList(opts?: { fromLocationId?: number; toLocationId?: number; status?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.fromLocationId) params.set("fromLocationId", String(opts.fromLocationId));
  if (opts?.toLocationId) params.set("toLocationId", String(opts.toLocationId));
  if (opts?.status) params.set("status", opts.status ?? "");
  if (opts?.page) params.set("page", String(opts.page ?? 1));
  if (opts?.limit) params.set("limit", String(opts.limit ?? 100));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/transfers?${params}`);
  return { items: res?.data ?? [], pagination: (res as any)?.pagination ?? {} };
}

export async function staffTransferGet(id: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/transfers/${id}`);
  return res?.data ?? null;
}

/** Lot-backed: allocations with lotId, variantId, quantity required */
export async function staffCreateTransfer(body: {
  fromLocationId: number;
  toLocationId: number;
  allocations: { lotId: number; variantId: number; quantity: number }[];
}) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/transfers", {
    fromLocationId: body.fromLocationId,
    toLocationId: body.toLocationId,
    allocations: body.allocations,
  });
}

export async function staffSendTransfer(id: number) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/transfers/${id}/send`, {});
}

export async function staffReceiveTransfer(id: number, body: { items: { variantId: number; quantityReceived?: number; quantityDamaged?: number; quantityExpired?: number }[]; notes?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/transfers/${id}/receive`, body);
}

// ========== Stock Requests (branch request → owner fulfill → dispatch → receive) ==========
export async function staffStockRequestsList(opts?: { branchId?: string; status?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.branchId) params.set("branchId", opts.branchId);
  if (opts?.status) params.set("status", opts.status ?? "");
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit ?? 20));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/stock-requests?${params}`);
  return { items: res?.data ?? [], pagination: (res as any)?.pagination ?? {} };
}

export async function staffStockRequestGet(id: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/stock-requests/${id}`);
  return res?.data ?? null;
}

export async function staffStockRequestCreate(body: { branchId: number; items: { productId: number; variantId: number; requestedQty: number; note?: string }[] }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/stock-requests", body);
}

export async function staffStockRequestUpdate(id: number, body: { items: { productId: number; variantId: number; requestedQty: number; note?: string }[] }) {
  return apiPatch<{ success?: boolean; data?: any; message?: string }>(`/api/v1/stock-requests/${id}`, body);
}

export async function staffStockRequestSubmit(id: number) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/stock-requests/${id}/submit`, {});
}

export async function staffStockRequestCancel(id: number) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/stock-requests/${id}/cancel`, {});
}

// ========== Staff Branch POS / Sales (Phase 5B) ==========
/** GET /api/v1/pos/products?branchId= – products with variants and stock for POS */
export async function staffPosProducts(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/pos/products?branchId=${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** POST /api/v1/inventory/pos-sale – FEFO sale (locationId, variantId, quantity) */
export async function staffRecordPosSale(body: {
  locationId: number;
  variantId: number;
  quantity: number;
  refType?: string;
  refId?: string;
}) {
  return apiPost<{ success?: boolean; data?: { ledgerIds?: number[]; balance?: any }; message?: string }>("/api/v1/inventory/pos-sale", body);
}

/** POST /api/v1/pos/sale – create POS sale (branchId, items, paymentMethod, customerId?, notes) */
export async function staffPosSale(body: {
  branchId: number;
  items: { productId: number; variantId?: number; quantity: number; price: number }[];
  paymentMethod: string;
  customerId?: number;
  notes?: string;
}) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/pos/sale", body);
}

/** GET /api/v1/pos/receipt/:orderId */
export async function staffPosReceipt(orderId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/receipt/${orderId}`);
  return res?.data ?? null;
}

/** GET /api/v1/orders?branchId= – branch-scoped orders (sales history) */
export async function staffOrdersList(
  branchId: string,
  opts?: { status?: string; page?: number; limit?: number; customerId?: number }
) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.page) params.set("page", String(opts.page ?? 1));
  if (opts?.limit) params.set("limit", String(opts.limit ?? 50));
  if (opts?.customerId) params.set("customerId", String(opts.customerId));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/orders?${params}`);
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: (res as any)?.pagination ?? {} };
}

/** GET /api/v1/orders/:id */
export async function staffOrderGet(orderId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/orders/${orderId}`);
  return res?.data ?? null;
}

/** POST /api/v1/orders/:id/cancel – full refund/cancel (reason required for refund flow) */
export async function staffOrderCancel(orderId: number, reason?: string) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/orders/${orderId}/cancel`, {
    reason: reason ?? "Refund requested",
  });
}

// ========== Staff Branch Clinic Services / Appointments (Phase 5C) ==========
// These call documented branch-scoped clinic endpoints. If backend has not implemented them yet, they return empty data.

/** GET /api/v1/services/branches/:branchId/queue/today – today's queue */
export async function staffClinicQueueToday(branchId: string): Promise<{ items: any[]; apiAvailable: boolean }> {
  try {
    const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/services/branches/${branchId}/queue/today`);
    const items = Array.isArray(res?.data) ? res.data : [];
    return { items, apiAvailable: true };
  } catch {
    return { items: [], apiAvailable: false };
  }
}

/** GET /api/v1/services/branches/:branchId/appointments?date=&status=&assignedVetId= */
export async function staffClinicAppointmentsList(
  branchId: string,
  opts?: { date?: string; status?: string; assignedVetId?: string | number }
): Promise<{ items: any[]; apiAvailable: boolean }> {
  try {
    const params = new URLSearchParams();
    if (opts?.date) params.set("date", opts.date);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.assignedVetId != null) params.set("assignedVetId", String(opts.assignedVetId));
    const res = await apiGet<{ success?: boolean; data?: any[] }>(
      `/api/v1/services/branches/${branchId}/appointments?${params}`
    );
    const items = Array.isArray(res?.data) ? res.data : [];
    return { items, apiAvailable: true };
  } catch {
    return { items: [], apiAvailable: false };
  }
}

/** POST /api/v1/services/branches/:branchId/appointments */
export async function staffClinicAppointmentCreate(
  branchId: string,
  body: { dateTime: string; customerId?: number; patientName?: string; serviceTypeId?: number; serviceType?: string; assignedVetId?: number; notes?: string }
): Promise<{ data?: any; apiAvailable: boolean }> {
  try {
    const res = await apiPost<{ success?: boolean; data?: any }>(
      `/api/v1/services/branches/${branchId}/appointments`,
      body
    );
    return { data: res?.data, apiAvailable: true };
  } catch (e) {
    return { data: null, apiAvailable: false };
  }
}

/** PATCH /api/v1/services/branches/:branchId/appointments/:id */
export async function staffClinicAppointmentUpdate(
  branchId: string,
  appointmentId: number,
  body: Partial<{ dateTime: string; customerId: number; patientName: string; serviceTypeId: number; serviceType: string; assignedVetId: number; notes: string; status: string }>
): Promise<{ data?: any; apiAvailable: boolean }> {
  try {
    const res = await apiPatch<{ success?: boolean; data?: any }>(
      `/api/v1/services/branches/${branchId}/appointments/${appointmentId}`,
      body
    );
    return { data: res?.data, apiAvailable: true };
  } catch {
    return { data: null, apiAvailable: false };
  }
}

/** PATCH appointment status (check-in, start, complete, cancel) – same update endpoint with status */
export async function staffClinicAppointmentSetStatus(
  branchId: string,
  appointmentId: number,
  status: string
): Promise<{ data?: any; apiAvailable: boolean }> {
  return staffClinicAppointmentUpdate(branchId, appointmentId, { status });
}

/** GET /api/v1/services?branchId= – service types for clinic (catalog; existing endpoint) */
export async function staffClinicServiceTypes(branchId: string): Promise<{ items: any[]; apiAvailable: boolean }> {
  try {
    const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/services?branchId=${branchId}&limit=100`);
    const items = Array.isArray(res?.data) ? res.data : [];
    return { items, apiAvailable: true };
  } catch {
    return { items: [], apiAvailable: false };
  }
}

// ========== Staff Branch Staff & Shifts (Phase 5D) ==========
/** GET /api/v1/branches/:branchId/manager/staff – branch staff overview */
export async function staffBranchStaffList(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/branches/${branchId}/manager/staff`);
  return { items: Array.isArray(res?.data) ? res.data : [] };
}

/** GET /api/v1/branch-access/pending – pending access requests (for manager; filter by branchId in UI) */
export async function staffBranchAccessPending() {
  const res = await apiGet<{ success?: boolean; data?: any[] }>("/api/v1/branch-access/pending");
  return Array.isArray(res?.data) ? res.data : [];
}

/** GET /api/v1/branch-access/branch/:branchId – all permissions for branch */
export async function staffBranchAccessForBranch(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/branch-access/branch/${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** POST /api/v1/branch-access/:id/approve */
export async function staffBranchAccessApprove(permissionId: number, body?: { expiresAt?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/branch-access/${permissionId}/approve`, body ?? {});
}

/** POST /api/v1/branch-access/:id/revoke (reject; reason in body if backend supports) */
export async function staffBranchAccessRevoke(permissionId: number, body?: { reason?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/branch-access/${permissionId}/revoke`, body ?? {});
}

/** Invite staff – try staff-scoped path; if missing, use placeholder (owner has /owner/branches/:id/members/invite) */
export async function staffBranchInvite(branchId: string, _body: { email?: string; phone?: string; role?: string }): Promise<{ success: boolean; message?: string }> {
  try {
    await apiPost(`/api/v1/branches/${branchId}/members/invite`, _body);
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message ?? "Invite not available" };
  }
}
