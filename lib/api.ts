import { getApiHeaders } from "./countryContext";

// In browser: use same-origin so /api/* goes through Next.js rewrite and cookies are sent.
// In Node (SSR): use explicit API URL.
const base =
  typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function parseError(res: Response): Promise<never> {
  let msg = `Request failed (${res.status})`;
  try {
    const j = await res.json();
    if (j?.message) msg = j.message;
  } catch {}
  const err = new Error(msg) as Error & { status?: number };
  err.status = res.status;
  throw err;
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

// ========== Common (animal types, breeds for clinic/pet forms) ==========
/** GET /api/v1/common/animal-types */
export async function getAnimalTypes(): Promise<{ id: number; name: string }[]> {
  const res = await apiGet<{ success?: boolean; types?: { id: number; name: string }[] }>("/api/v1/common/animal-types");
  return res?.types ?? [];
}

/** GET /api/v1/common/breeds/:typeId */
export async function getBreedsByAnimalType(typeId: number): Promise<{ id: number; name: string }[]> {
  const res = await apiGet<{ success?: boolean; breeds?: { id: number; name: string }[] }>(`/api/v1/common/breeds/${typeId}`);
  return res?.breeds ?? [];
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
    const clinicEnabled = rawBranch?.clinicEnabled === true;
    const typeFromApi = rawBranch?.types?.[0]?.type?.code ?? rawBranch?.type ?? "";
    const type = typeFromApi || (clinicEnabled ? "CLINIC" : "");
    const branch = {
      ...rawBranch,
      id: rawBranch?.id ?? Number(id),
      name: rawBranch?.name ?? "",
      address: rawBranch?.addressJson ?? rawBranch?.address,
      lat: rawBranch?.lat ?? rawBranch?.latitude,
      lng: rawBranch?.lng ?? rawBranch?.longitude,
      type,
      clinicEnabled,
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

/** GET /api/v1/inventory/dashboard - Cards: totalSkus, lowStockCount, outOfStockCount, etc. */
export async function staffInventoryDashboard(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { totalSkus?: number; totalStockQty?: number; lowStockCount?: number; outOfStockCount?: number; expiringCount?: number } }>(`/api/v1/inventory/dashboard?branchId=${branchId}`);
  return res?.data ?? null;
}

/** GET /api/v1/inventory/ledger - Ledger history for drawer (locationId, variantId, page, limit) */
export async function staffInventoryLedger(opts: { locationId: number; variantId: number; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  params.set("locationId", String(opts.locationId));
  params.set("variantId", String(opts.variantId));
  if (opts.page != null) params.set("page", String(opts.page));
  if (opts.limit != null) params.set("limit", String(opts.limit));
  const res = await apiGet<{ success?: boolean; data?: any[]; pagination?: any }>(`/api/v1/inventory/ledger?${params}`);
  return { items: res?.data ?? [], pagination: (res as any)?.pagination ?? {} };
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

/** GET /api/v1/inventory/dispatches/incoming?branchId= – Incoming (IN_TRANSIT) dispatches for branch */
export async function staffGetIncomingDispatches(branchId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/dispatches/incoming?branchId=${encodeURIComponent(String(branchId))}`);
  return res?.data ?? [];
}

/** GET /api/v1/inventory/dispatches/:id – Dispatch detail with items (for receive flow) */
export async function staffGetDispatch(dispatchId: number | string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/inventory/dispatches/${dispatchId}`);
  return res?.data ?? res;
}

/** POST /api/v1/inventory/dispatches/:id/receive – Receive (partial/full), creates GRN */
export async function staffReceiveDispatch(
  dispatchId: number | string,
  body: { items: { variantId: number; lotId?: number; quantityReceived?: number; quantityDamaged?: number; quantityShort?: number }[]; notes?: string }
) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/inventory/dispatches/${dispatchId}/receive`, body);
}

/** GET /api/v1/inventory/stock-request-products - Paginated products with variant-wise stock for New Stock Request picker */
export async function staffStockRequestProducts(
  branchId: string,
  opts?: {
    search?: string;
    page?: number;
    limit?: number;
    sort?: "recommended" | "low_stock" | "most_used" | "name_asc";
    stockStatus?: "all" | "low" | "out";
  }
) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.stockStatus) params.set("stockStatus", opts.stockStatus);
  const res = await apiGet<{ success?: boolean; data?: StockRequestProduct[]; pagination?: StockRequestProductsPagination }>(
    `/api/v1/inventory/stock-request-products?${params}`
  );
  return {
    items: (res as any)?.data ?? [],
    pagination: (res as any)?.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 1 },
  };
}

export type StockRequestProductVariant = {
  id: number;
  sku: string;
  title: string;
  barcode: string | null;
  productId: number;
  stockOnHand: number;
  lowStockThreshold: number;
  usageMetric: number;
};

export type StockRequestProduct = {
  id: number;
  name: string;
  slug: string;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
  variants: StockRequestProductVariant[];
};

export type StockRequestProductsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ========== Staff Branch POS / Sales (Phase 5B) ==========
/** GET /api/v1/pos/products?branchId= – products with variants, stock, and location price for POS */
export async function staffPosProducts(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/pos/products?branchId=${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** GET /api/v1/pos/products/barcode/:barcode?branchId= – lookup product by barcode */
export async function staffPosBarcodeLookup(branchId: string, barcode: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `/api/v1/pos/products/barcode/${encodeURIComponent(barcode)}?branchId=${branchId}`
  );
  return res?.data ?? null;
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

/** POST /api/v1/pos/sale – create POS sale (branchId, items, paymentMethod, discountPercent?, taxPercent?, customerId?, notes) */
export async function staffPosSale(body: {
  branchId: number;
  items: { productId: number; variantId?: number; quantity: number; price: number }[];
  paymentMethod: string;
  discountPercent?: number;
  taxPercent?: number;
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

/** GET /api/v1/pos/invoice/:orderId – invoice for print */
export async function staffPosInvoice(orderId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/invoice/${orderId}`);
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

/** POST /api/v1/pos/return – line-item return (branchId, orderId, items: [{ variantId, quantity, reason? }]) */
export async function staffPosReturn(body: {
  branchId: number;
  orderId: number;
  items: { variantId: number; quantity: number; reason?: string }[];
}) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/pos/return", body);
}

// ========== Staff Branch Clinic Services / Appointments (Phase 5C) ==========
// These call documented branch-scoped clinic endpoints. If backend has not implemented them yet, they return empty data.

/** GET /api/v1/services/branches/:branchId/queue/today – today's queue. Rethrows if (e as ApiError).code === 'CLINIC_MODULE_DISABLED'. */
export async function staffClinicQueueToday(branchId: string): Promise<{ items: any[]; apiAvailable: boolean }> {
  try {
    const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/services/branches/${branchId}/queue/today`);
    const items = Array.isArray(res?.data) ? res.data : [];
    return { items, apiAvailable: true };
  } catch (e: any) {
    if (e?.code === "CLINIC_MODULE_DISABLED") throw e;
    return { items: [], apiAvailable: false };
  }
}

/** GET /api/v1/services/branches/:branchId/appointments?date=&status=&assignedVetId=. Rethrows on CLINIC_MODULE_DISABLED. */
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
  } catch (e: any) {
    if (e?.code === "CLINIC_MODULE_DISABLED") throw e;
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

// ========== Doctor Panel – /api/v1/doctor/* ==========
export async function doctorGetMe(): Promise<{ doctorBranchMemberIds: number[]; branches: { branchId: number; branchName: string; branchMemberId: number; status: string; defaultConsultationFee: number | null; visiting: boolean }[] }> {
  const res = await apiGet<{ success?: boolean; data?: any }>("/api/v1/doctor/me");
  return res?.data ?? { doctorBranchMemberIds: [], branches: [] };
}

export async function doctorGetDashboardSummary(params?: { branchId?: number; date?: string }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.date) q.set("date", params.date);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/dashboard-summary${query ? `?${query}` : ""}`);
  return res?.data ?? null;
}

export async function doctorListAppointments(params?: {
  date?: string;
  branchId?: number;
  status?: string;
  statuses?: string;
  visitType?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  if (params?.statuses) q.set("statuses", params.statuses);
  if (params?.visitType) q.set("visitType", params.visitType);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.search) q.set("search", params.search);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { appointments: any[]; total: number } }>(`/api/v1/doctor/appointments?${q}`);
  return { appointments: res?.data?.appointments ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorGetAppointmentStats(params?: { date?: string; branchId?: number }) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  const res = await apiGet<{
    success?: boolean;
    data?: { total: number; statusCounts: Record<string, number>; emergencyCount: number; followUpCount: number; paymentPendingCount?: number };
  }>(`/api/v1/doctor/appointments/stats?${q}`);
  return res?.data ?? { total: 0, statusCounts: {}, emergencyCount: 0, followUpCount: 0, paymentPendingCount: 0 };
}

export async function doctorGetAppointmentDetail(appointmentId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}`);
  return res?.data ?? null;
}

export async function doctorCallAppointment(appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}/call`, {});
  return res?.data ?? null;
}

export async function doctorStartConsult(appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}/start-consult`, {});
  return res?.data ?? null;
}

export async function doctorCompleteAppointment(appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}/complete`, {});
  return res?.data ?? null;
}

export async function doctorAddNote(appointmentId: number, body: { noteType?: string; contentJson?: Record<string, unknown> }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}/note`, body);
  return res?.data ?? null;
}

export async function doctorCreateFollowUp(
  appointmentId: number,
  body: { followUpDate: string; followUpNotes?: string | null; createAppointment?: boolean }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/appointments/${appointmentId}/follow-up`, body);
  return res?.data ?? null;
}

export async function doctorGetPatientHistory(petId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/patients/${petId}/history`);
  return res?.data ?? null;
}

export async function doctorListFollowUps(params?: { branchId?: number; status?: "due" | "overdue" | "upcoming"; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/follow-ups?${q}`);
  return { items: res?.data?.items ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorListCases(params?: { branchId?: number; status?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/cases?${q}`);
  return { items: res?.data?.items ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorListPrescriptions(params?: { branchId?: number; status?: "DRAFT" | "FINALIZED" | "DISPENSED"; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/prescriptions?${q}`);
  return { items: res?.data?.items ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorListVisits(params?: { date?: string; branchId?: number; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { visits: any[]; total: number } }>(`/api/v1/doctor/visits?${q}`);
  return { visits: res?.data?.visits ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorGetVisit(visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}`);
  return res?.data ?? null;
}

export async function doctorUpdateBranchFee(branchMemberId: number, defaultConsultationFee: number | null) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/profile/branches/${branchMemberId}/fee`,
    { defaultConsultationFee }
  );
  return res?.data;
}

export async function doctorCancelAppointment(appointmentId: number, reason?: string) {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/doctor/appointments/${appointmentId}/cancel`,
    reason != null ? { reason } : {}
  );
  return res?.data;
}

export async function doctorRescheduleAppointment(
  appointmentId: number,
  data: { scheduledStartAt: string; scheduledEndAt: string; doctorId?: number }
) {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/doctor/appointments/${appointmentId}/reschedule`,
    data
  );
  return res?.data;
}

// Onboarding and my-services / my-schedule
export async function doctorGetOnboarding(branchId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/clinics/${branchId}/onboarding`);
  return res?.data ?? null;
}

export async function doctorCompleteOnboarding(branchId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/clinics/${branchId}/onboarding/complete`, {});
  return res?.data ?? null;
}

export async function doctorGetMyServices(branchId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/doctor/clinics/${branchId}/my-services`);
  return res?.data ?? [];
}

export async function doctorPutMyServices(
  branchId: number,
  body: { services: Array<{ serviceId: number; fee: number; species?: string | null; durationMin?: number | null; isActive?: boolean; notes?: string | null }> }
) {
  const res = await apiPut<{ success?: boolean; data?: any[] }>(`/api/v1/doctor/clinics/${branchId}/my-services`, body);
  return res?.data ?? [];
}

export async function doctorGetMySchedule(branchId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/doctor/clinics/${branchId}/my-schedule`);
  return res?.data ?? [];
}

export async function doctorPutMySchedule(
  branchId: number,
  body: { templates: Array<{ dayOfWeek: number; startTime: string; endTime: string; slotMinutes?: number; maxSlots?: number | null; roomTypeRequired?: string | null }> }
) {
  const res = await apiPut<{ success?: boolean; data?: any[] }>(`/api/v1/doctor/clinics/${branchId}/my-schedule`, body);
  return res?.data ?? [];
}

export async function doctorGetConsultationTemplates(branchId: number) {
  const res = await apiGet<{ success?: boolean; data?: { templates: any[] } }>(`/api/v1/doctor/clinics/${branchId}/consultation-templates`);
  return res?.data?.templates ?? [];
}

export async function doctorGetMyExceptions(
  branchId: number,
  params?: { from?: string; to?: string }
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `/api/v1/doctor/clinics/${branchId}/my-exceptions${query ? `?${query}` : ""}`
  );
  return res?.data ?? [];
}

export async function doctorCreateMyException(
  branchId: number,
  body: { date: string; type: "OFF" | "EXTRA_SHIFT" | "CUSTOM_SLOTS" | "LEAVE" | "EMERGENCY_AVAILABLE"; startTime?: string | null; endTime?: string | null; note?: string | null }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/my-exceptions`,
    body
  );
  return res?.data ?? null;
}

export async function doctorDeleteMyException(branchId: number, exceptionId: number) {
  const res = await apiDelete<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/my-exceptions/${exceptionId}`
  );
  return res?.data ?? null;
}

export async function doctorGetUpcomingLeaves(params?: { branchId?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`/api/v1/doctor/upcoming-leaves${query ? `?${query}` : ""}`);
  return res?.data?.items ?? [];
}

// Schedule proposals (CP3)
export async function doctorListScheduleProposals(branchId: number, params?: { status?: string }) {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await apiGet<{ success?: boolean; data?: { proposals: any[] } }>(
    `/api/v1/doctor/clinics/${branchId}/schedule-proposals${q}`
  );
  return { proposals: res?.data?.proposals ?? [] };
}

export async function doctorCreateScheduleProposal(branchId: number, proposalPayload: unknown) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/schedule-proposals`,
    { proposalPayload: proposalPayload ?? {} }
  );
  return res?.data;
}

// Metrics (CP4)
export async function doctorGetMyMetrics(
  branchId: number,
  params?: { from?: string; to?: string }
): Promise<{
  from: string | null;
  to: string | null;
  branchId: number;
  memberId: number;
  appointments: { total: number; completed: number; cancelled: number; noShow: number };
  visits: { total: number; completed: number };
  patientsSeen: number;
} | null> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/my-metrics${query ? `?${query}` : ""}`
  );
  return res?.data ?? null;
}

// Settlement ledger (CP8)
export async function doctorGetMySettlementLedger(
  branchId: number,
  params?: { status?: string; from?: string; to?: string }
): Promise<
  Array<{
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
  }> | null
> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `/api/v1/doctor/clinics/${branchId}/my-settlement-ledger${query ? `?${query}` : ""}`
  );
  return res?.data ?? null;
}

// Settlement summary (pending amount + recent batches count)
export async function doctorGetMySettlementSummary(
  branchId: number,
  params?: { from?: string; to?: string }
): Promise<{
  pendingAmount: number;
  pendingCount: number;
  recentBatches: Array<{ id: number; periodEnd: string; status: string; totalAccrued?: number; netPayable?: number }>;
} | null> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/my-settlement-summary${query ? `?${query}` : ""}`
  );
  return res?.data ?? null;
}

// My settlement batches (paginated)
export async function doctorGetMySettlementBatches(
  branchId: number,
  params?: { status?: string; from?: string; to?: string; page?: number; limit?: number }
): Promise<{
  items: Array<{
    id: number;
    periodEnd: string;
    periodStart?: string;
    status: string;
    totalAccrued?: number;
    totalDeductions?: number;
    totalAdjustments?: number;
    netPayable?: number;
    approvedAt?: string | null;
    paidAt?: string | null;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
} | null> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `/api/v1/doctor/clinics/${branchId}/my-settlement-batches${query ? `?${query}` : ""}`
  );
  return res?.data ?? null;
}

// Active contract for this branch
export async function doctorGetMyContract(
  branchId: number
): Promise<{
  id: number;
  contractType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  rules?: Array<{ service?: { id: number; name: string; category: string | null }; rateType?: string; rateValue?: number }>;
} | null> {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/clinics/${branchId}/my-contract`);
  return res?.data ?? null;
}

export async function doctorListNotifications(params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/notifications?${q}`);
  return { items: res?.data?.items ?? [], total: res?.data?.total ?? 0 };
}

export async function doctorGetNotificationUnreadCount() {
  const res = await apiGet<{ success?: boolean; data?: { count: number } }>(`/api/v1/doctor/notifications/unread-count`);
  return res?.data?.count ?? 0;
}

export async function doctorMarkNotificationRead(notificationId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/notifications/${notificationId}/read`, {});
  return res?.data ?? null;
}

export async function doctorGetReminders(params?: { branchId?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/reminders${query ? `?${query}` : ""}`);
  return res?.data ?? null;
}

// Vet reference (public)
export async function vetReferenceCountries(): Promise<{ id: number; code: string; name: string; region: string | null }[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>("/api/v1/vet-reference/countries");
  return res?.data ?? [];
}

export async function vetReferenceBodiesByCountry(countryCode: string): Promise<
  {
    id: number;
    name: string;
    abbreviation?: string | null;
    bodyType: string;
    jurisdiction?: string | null;
    websiteUrl?: string | null;
    verificationUrl?: string | null;
    verificationMethod?: string | null;
    licenseFormat?: string | null;
  }[]
> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/vet-reference/countries/${encodeURIComponent(countryCode)}/bodies`);
  return res?.data ?? [];
}

export async function vetReferenceDocTypesByBody(bodyId: number): Promise<
  { id: number; documentType: string; label: string; description?: string | null; isRequired: boolean; sortOrder: number }[]
> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/vet-reference/bodies/${bodyId}/doc-types`);
  return res?.data ?? [];
}

export async function vetReferenceBody(bodyId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/vet-reference/bodies/${bodyId}`);
  return res?.data ?? null;
}

// Doctor verification (draft, documents, licenses, submit)
export async function doctorGetVerification(): Promise<{
  id?: number;
  userId?: number;
  licenseNumber?: string | null;
  registrationBody?: string | null;
  primaryCountryCode?: string | null;
  specializationTags?: string[] | null;
  qualifications?: unknown[] | null;
  nidNumber?: string | null;
  verificationStatus?: string;
  submittedAt?: string | null;
  reviewNote?: string | null;
  documents?: { id: number; documentType: string; fileUrl?: string; url?: string; doctorLicenseId?: number | null }[];
  licenses?: {
    id: number;
    regulatoryBodyId: number;
    licenseNumber: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    licenseStatus?: string;
    isPrimary?: boolean;
    regulatoryBody?: { id: number; name: string; abbreviation?: string | null; country?: { code: string; name: string } };
    documents?: { id: number; documentType: string; url?: string }[];
  }[];
} | null> {
  const res = await apiGet<{ success?: boolean; data?: any }>("/api/v1/doctor/verification");
  return res?.data ?? null;
}

export async function doctorUpsertVerificationDraft(body: {
  licenseNumber?: string | null;
  registrationBody?: string | null;
  primaryCountryCode?: string | null;
  specializationTags?: string[] | null;
  qualifications?: unknown[] | null;
  nidNumber?: string | null;
  metadataJson?: object | null;
}) {
  const res = await apiPut<{ success?: boolean; data?: any }>("/api/v1/doctor/verification", body);
  return res?.data;
}

export async function doctorUploadVerificationDocument(
  file: File,
  documentType: string,
  metadataJson?: object,
  doctorLicenseId?: number | null
) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", documentType);
  if (metadataJson != null) form.append("metadataJson", JSON.stringify(metadataJson));
  if (doctorLicenseId != null) form.append("doctorLicenseId", String(doctorLicenseId));
  const url = `${base || ""}/api/v1/doctor/verification/documents`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", ...getApiHeaders() },
    body: form,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function doctorDeleteVerificationDocument(documentId: number) {
  await apiDelete(`/api/v1/doctor/verification/documents/${documentId}`);
}

export async function doctorAddLicense(body: {
  regulatoryBodyId: number;
  licenseNumber: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  isPrimary?: boolean;
}) {
  const res = await apiPost<{ success?: boolean; data?: any }>("/api/v1/doctor/verification/licenses", body);
  return res?.data;
}

export async function doctorUpdateLicense(
  licenseId: number,
  body: { licenseNumber?: string; issueDate?: string | null; expiryDate?: string | null; licenseStatus?: string; isPrimary?: boolean }
) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`/api/v1/doctor/verification/licenses/${licenseId}`, body);
  return res?.data;
}

export async function doctorDeleteLicense(licenseId: number) {
  await apiDelete(`/api/v1/doctor/verification/licenses/${licenseId}`);
}

export async function doctorUploadLicenseDocument(
  licenseId: number,
  file: File,
  documentType: string,
  metadataJson?: object
) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", documentType);
  if (metadataJson != null) form.append("metadataJson", JSON.stringify(metadataJson));
  const url = `${base || ""}/api/v1/doctor/verification/licenses/${licenseId}/documents`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", ...getApiHeaders() },
    body: form,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function doctorSubmitVerification() {
  const res = await apiPost<{ success?: boolean; data?: any }>("/api/v1/doctor/verification/submit", {});
  return res?.data;
}

// ========== Clinic Module (Appointment + Queue) – /api/v1/clinic/branches/:branchId/ ==========
const clinicBase = (branchId: string) => `/api/v1/clinic/branches/${branchId}`;

export async function staffClinicSlots(branchId: string, params: { date: string; doctorId?: number; serviceId?: number }) {
  try {
    const q = new URLSearchParams({ date: params.date });
    if (params.doctorId != null) q.set("doctorId", String(params.doctorId));
    if (params.serviceId != null) q.set("serviceId", String(params.serviceId));
    const res = await apiGet<{ success?: boolean; data?: { slots?: any[] } }>(`${clinicBase(branchId)}/slots?${q}`);
    const raw = res?.data?.slots ?? (Array.isArray(res?.data) ? res.data : null);
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      start: s.start != null ? new Date(s.start) : null,
      end: s.end != null ? new Date(s.end) : null,
      doctorId: s.doctorId != null ? Number(s.doctorId) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function staffClinicDoctors(branchId: string): Promise<{ id: number; displayName: string }[]> {
  try {
    const res = await apiGet<{ success?: boolean; data?: { doctors?: { id: number; displayName: string }[] } }>(`${clinicBase(branchId)}/doctors`);
    const raw = res?.data?.doctors ?? (Array.isArray(res?.data) ? res.data : null);
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => ({ id: Number(d.id), displayName: d.displayName ?? d.name ?? "Doctor #" + d.id }));
  } catch {
    return [];
  }
}

export async function staffClinicItemSearch(branchId: string, params?: { q?: string; limit?: number }): Promise<unknown[]> {
  try {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.limit != null) q.set("limit", String(params.limit));
    const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`${clinicBase(branchId)}/items/search${q.toString() ? `?${q}` : ""}`);
    const raw = Array.isArray(res?.data) ? res.data : [];
    return raw;
  } catch {
    return [];
  }
}

export async function staffClinicItemStock(branchId: string, params?: { itemId?: number; variantId?: number }): Promise<unknown[]> {
  try {
    const q = new URLSearchParams();
    if (params?.itemId != null) q.set("itemId", String(params.itemId));
    if (params?.variantId != null) q.set("variantId", String(params.variantId));
    const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`${clinicBase(branchId)}/item-stock${q.toString() ? `?${q}` : ""}`);
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function staffClinicLowStockAlerts(branchId: string): Promise<unknown[]> {
  try {
    const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`${clinicBase(branchId)}/item-stock/alerts`);
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function staffClinicItemStockLedger(
  branchId: string,
  params?: { clinicalItemId?: number; variantId?: number; limit?: number; offset?: number }
): Promise<{ items: unknown[]; total: number }> {
  try {
    const q = new URLSearchParams();
    if (params?.clinicalItemId != null) q.set("clinicalItemId", String(params.clinicalItemId));
    if (params?.variantId != null) q.set("variantId", String(params.variantId));
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const res = await apiGet<{ data?: { items: unknown[]; total: number } }>(`${clinicBase(branchId)}/item-stock/ledger${q.toString() ? `?${q}` : ""}`);
    return res?.data ?? { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function staffClinicItemStockConsumption(
  branchId: string,
  params?: { limit?: number; offset?: number }
): Promise<{ items: unknown[]; total: number }> {
  try {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const res = await apiGet<{ data?: { items: unknown[]; total: number } }>(`${clinicBase(branchId)}/item-stock/consumption${q.toString() ? `?${q}` : ""}`);
    return res?.data ?? { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function staffClinicItemStockAdjust(
  branchId: string,
  body: { itemId: number; variantId: number; deltaQty: number; reason?: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`${clinicBase(branchId)}/item-stock/adjust`, body);
  return res?.data ?? res;
}

export async function staffClinicItemStockReceive(
  branchId: string,
  body: {
    itemId: number;
    variantId: number;
    quantity: number;
    batchNo?: string;
    expiryDate?: string;
    purchaseCost?: number;
  }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`${clinicBase(branchId)}/item-stock/receive`, body);
  return res?.data ?? res;
}

export async function staffClinicInstrumentIssueLogsList(branchId: string, params?: { status?: "open" | "returned" }): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const query = q.toString();
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`${clinicBase(branchId)}/instrument-issues${query ? `?${query}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffClinicInstrumentIssueLogCreate(
  branchId: string,
  body: { itemId: number; variantId: number; issuedQty: number; issuedToUserId?: number; procedureId?: number }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`${clinicBase(branchId)}/instrument-issues`, body);
  return res?.data ?? res;
}

export async function staffClinicInstrumentIssueLogReturn(
  branchId: string,
  logId: number,
  body: { returnedQty: number; sterilizationStatus?: string; conditionNote?: string }
): Promise<unknown> {
  const res = await apiPatch<{ success?: boolean; data?: unknown }>(`${clinicBase(branchId)}/instrument-issues/${logId}/return`, body);
  return res?.data ?? res;
}

export async function staffClinicSupplyRequestsList(branchId: string, params?: { status?: string; limit?: number; offset?: number }): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ data?: { items: unknown[]; total: number } }>(`${clinicBase(branchId)}/supply-requests${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

export async function staffClinicSupplyRequestById(branchId: string, requestId: number): Promise<unknown> {
  const res = await apiGet<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests/${requestId}`);
  return res?.data ?? null;
}

export async function staffClinicSupplyRequestLowStockSuggestions(branchId: string): Promise<unknown[]> {
  const res = await apiGet<{ data?: unknown[] }>(`${clinicBase(branchId)}/supply-requests/low-stock-suggestions`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffClinicSupplyRequestCreate(
  branchId: string,
  body: { items: { clinicalItemId: number; variantId?: number; requestedQty: number; note?: string }[]; priority?: string; note?: string }
): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests`, body);
  return res?.data ?? res;
}

export async function staffClinicSupplyRequestSubmit(branchId: string, requestId: number): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests/${requestId}/submit`, {});
  return res?.data ?? res;
}

export async function staffClinicTransfersList(branchId: string, params?: { direction?: "from" | "to"; status?: string }): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.direction) q.set("direction", params.direction);
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ data?: { items: unknown[]; total: number } }>(`${clinicBase(branchId)}/transfers${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

export async function staffClinicTransferById(branchId: string, transferId: number): Promise<unknown> {
  const res = await apiGet<{ data?: unknown }>(`${clinicBase(branchId)}/transfers/${transferId}`);
  return res?.data ?? null;
}

export async function staffClinicTransferReceive(
  branchId: string,
  transferId: number,
  body: { receivedItems: { transferItemId: number; qtyReceived: number; qtyDamaged?: number }[] }
): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/transfers/${transferId}/receive`, body);
  return res?.data ?? res;
}

export async function staffClinicSterilizationCyclesList(
  branchId: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<{ items: unknown[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ data?: { items: unknown[]; total: number } }>(
    `${clinicBase(branchId)}/sterilization/cycles${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? { items: [], total: 0 };
}

export async function staffClinicSterilizationCycleById(branchId: string, cycleId: number): Promise<unknown> {
  const res = await apiGet<{ data?: unknown }>(`${clinicBase(branchId)}/sterilization/cycles/${cycleId}`);
  return res?.data ?? null;
}

export async function staffClinicSterilizationCycleStart(
  branchId: string,
  body: { instrumentIds: number[]; method?: string; machineName?: string }
): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/sterilization/cycles`, body);
  return res?.data ?? res;
}

export async function staffClinicSterilizationCycleComplete(
  branchId: string,
  cycleId: number,
  body?: { sterileDays?: number }
): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/sterilization/cycles/${cycleId}/complete`, body ?? {});
  return res?.data ?? res;
}

export async function staffClinicSterilizationCycleFail(branchId: string, cycleId: number): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/sterilization/cycles/${cycleId}/fail`, {});
  return res?.data ?? res;
}

export async function staffClinicInstrumentInstancesList(
  branchId: string,
  params?: { clinicalItemId?: number; sterilizationStatus?: string }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.clinicalItemId != null) q.set("clinicalItemId", String(params.clinicalItemId));
  if (params?.sterilizationStatus) q.set("sterilizationStatus", params.sterilizationStatus);
  const res = await apiGet<{ data?: unknown[] }>(
    `${clinicBase(branchId)}/sterilization/instruments${q.toString() ? `?${q}` : ""}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffClinicSterilizationDueAlerts(branchId: string): Promise<unknown[]> {
  const res = await apiGet<{ data?: unknown[] }>(`${clinicBase(branchId)}/sterilization/instruments/due`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffClinicDoctorsWithFees(
  branchId: string,
  serviceId: number
): Promise<{ doctors: { id: number; displayName: string; fee?: number; feeLabel?: string }[] }> {
  try {
    const res = await apiGet<{ success?: boolean; data?: { doctors?: { id: number; displayName: string; fee?: number; feeLabel?: string }[] } }>(
      `${clinicBase(branchId)}/doctors-with-fees?serviceId=${encodeURIComponent(serviceId)}`
    );
    const raw = res?.data?.doctors ?? (Array.isArray(res?.data) ? res.data : null);
    if (!Array.isArray(raw)) return { doctors: [] };
    const doctors = raw.map((d: any) => ({
      id: Number(d.id),
      displayName: d.displayName ?? d.name ?? "Doctor #" + d.id,
      fee: d.fee != null ? Number(d.fee) : undefined,
      feeLabel: d.feeLabel ?? undefined,
    }));
    return { doctors };
  } catch {
    return { doctors: [] };
  }
}

export async function staffClinicServices(branchId: string): Promise<{ id: number; name: string; duration?: number; price?: number; category?: string }[]> {
  try {
    const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(`${clinicBase(branchId)}/services`);
    const raw = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : null);
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      id: Number(s.id),
      name: s.name ?? String(s.id),
      duration: s.duration,
      price: s.price != null ? Number(s.price) : undefined,
      category: s.category ?? undefined,
    }));
  } catch {
    return [];
  }
}

export type StaffClinicAppointmentListParams = {
  date?: string;
  fromDate?: string;
  toDate?: string;
  datePreset?: string;
  doctorId?: number;
  doctorIds?: number[];
  status?: string;
  statuses?: string[];
  serviceId?: number;
  source?: string;
  channel?: string;
  paymentStatus?: string;
  visitType?: string;
  priority?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function staffClinicAppointmentsListV2(
  branchId: string,
  params?: StaffClinicAppointmentListParams
): Promise<{ items: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.datePreset) q.set("datePreset", params.datePreset);
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.doctorIds?.length) params.doctorIds.forEach((id) => q.append("doctorId", String(id)));
  if (params?.status) q.set("status", params.status);
  if (params?.statuses?.length) params.statuses.forEach((s) => q.append("status", s));
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.source) q.set("source", params.source);
  if (params?.channel) q.set("channel", params.channel);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.visitType) q.set("visitType", params.visitType);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`${clinicBase(branchId)}/appointments?${q}`);
  return { items: res?.data?.items ?? [], total: res?.data?.total ?? 0 };
}

/** Appointment stats for date range (status counts, total, emergency, revenue) */
export async function staffClinicAppointmentStats(
  branchId: string,
  params?: { date?: string; fromDate?: string; toDate?: string; datePreset?: string }
): Promise<{
  statusCounts: Record<string, number>;
  total: number;
  emergencyCount: number;
  revenueExpected: number;
  revenueCollected: number;
}> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.datePreset) q.set("datePreset", params.datePreset);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/stats?${q}`);
  const d = res?.data ?? {};
  return {
    statusCounts: d.statusCounts ?? {},
    total: d.total ?? 0,
    emergencyCount: d.emergencyCount ?? 0,
    revenueExpected: Number(d.revenueExpected) ?? 0,
    revenueCollected: Number(d.revenueCollected) ?? 0,
  };
}

/** Per-doctor appointment stats for date range */
export async function staffClinicAppointmentDoctorStats(
  branchId: string,
  params?: { date?: string; fromDate?: string; toDate?: string; datePreset?: string }
): Promise<{ doctorId: number; doctorName: string; total: number; completed: number; pending: number; cancelled: number; noShow: number; todayLoad?: number }[]> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.datePreset) q.set("datePreset", params.datePreset);
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/appointments/doctor-stats?${q}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** Per-service appointment counts for date range */
export async function staffClinicAppointmentServiceStats(
  branchId: string,
  params?: { date?: string; fromDate?: string; toDate?: string; datePreset?: string }
): Promise<{ serviceId: number; serviceName: string; count: number }[]> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.datePreset) q.set("datePreset", params.datePreset);
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/appointments/service-stats?${q}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** Export appointments as CSV (same filters as list). Returns blob/response for download. */
export async function staffClinicAppointmentExport(
  branchId: string,
  params?: StaffClinicAppointmentListParams
): Promise<string> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.datePreset) q.set("datePreset", params.datePreset);
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.doctorIds?.length) params.doctorIds.forEach((id) => q.append("doctorId", String(id)));
  if (params?.status) q.set("status", params.status);
  if (params?.statuses?.length) params.statuses.forEach((s) => q.append("status", s));
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.channel) q.set("channel", params.channel);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.visitType) q.set("visitType", params.visitType);
  if (params?.priority) q.set("priority", params.priority);
  const res = await fetch(`/api/v1/clinic/branches/${branchId}/appointments/export?${q}`, {
    credentials: "include",
    headers: { Accept: "text/csv" },
  });
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

export async function staffClinicAppointmentCreateV2(
  branchId: string,
  body: {
    patientId: number;
    petId?: number;
    doctorId?: number | null;
    serviceId: number;
    scheduledStartAt: string;
    scheduledEndAt: string;
    source?: "MOBILE" | "OWNER_PORTAL" | "WALKIN" | "STAFF" | "PHONE";
    priority?: "NORMAL" | "EMERGENCY" | "VIP";
    notes?: string;
    channelMeta?: Record<string, unknown>;
    visitType?: "WALK_IN" | "SCHEDULED" | "EMERGENCY";
    isInstant?: boolean;
    isAnyDoctor?: boolean;
    channel?: "COUNTER" | "PHONE" | "ONLINE" | "REFERRAL";
    paymentStatus?: "UNPAID" | "PARTIAL" | "PAID" | "WAIVED";
    paymentMethod?: string;
    paidAmount?: number;
    tokenNo?: string;
  }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments`, body);
  return res?.data;
}

export async function staffClinicQuickAppointmentCreate(
  branchId: string,
  body: {
    patientId?: number | null;
    petId?: number | null;
    doctorId?: number | null;
    serviceId: number;
    scheduledStartAt: string;
    scheduledEndAt: string;
    status?: "DRAFT" | "PRE_BOOKED";
    ownerNameSnapshot?: string | null;
    mobileSnapshot?: string | null;
    petNameSnapshot?: string | null;
    petTypeSnapshot?: string | null;
    priority?: "NORMAL" | "EMERGENCY" | "VIP";
    notes?: string | null;
  }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/quick`, body);
  return res?.data;
}

export async function staffClinicAppointmentPromote(
  branchId: string,
  appointmentId: number,
  body: { patientId: number; petId?: number | null; doctorId?: number | null; notes?: string | null }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/promote`, body);
  return res?.data;
}

export async function staffClinicCheckDuplicate(
  branchId: string,
  params: { mobile: string; petName?: string | null; date: string }
): Promise<{ possibleDuplicate: boolean; existing: any[] }> {
  const q = new URLSearchParams();
  q.set("mobile", params.mobile);
  q.set("date", params.date);
  if (params.petName != null) q.set("petName", params.petName);
  const res = await apiGet<{ success?: boolean; data?: { possibleDuplicate: boolean; existing: any[] } }>(
    `${clinicBase(branchId)}/appointments/check-duplicate?${q}`
  );
  const d = res?.data ?? { possibleDuplicate: false, existing: [] };
  return { possibleDuplicate: d.possibleDuplicate ?? false, existing: d.existing ?? [] };
}

// ========== Staff Clinic Enterprise: Packages, Cases, Consumption, Vial Returns ==========
const clinicApiBase = "/api/v1/clinic";

/** Available surgery packages for a service (for package selection in appointment/billing) */
export async function staffClinicAvailablePackages(
  branchId: string,
  serviceId: number,
  params?: { species?: string }
): Promise<{ id: number; name: string; code?: string; basePrice?: number }[]> {
  const q = new URLSearchParams();
  if (params?.species) q.set("species", params.species);
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `${clinicBase(branchId)}/services/${serviceId}/available-packages${q.toString() ? `?${q}` : ""}`
  );
  const raw = Array.isArray(res?.data) ? res.data : [];
  return raw.map((p: any) => ({ id: Number(p.id), name: p.name ?? "", code: p.code, basePrice: p.basePrice != null ? Number(p.basePrice) : undefined }));
}

/** List clinical cases for branch */
export async function staffClinicCasesList(
  branchId: string,
  params?: { status?: string; patientId?: number; petId?: number; from?: string; to?: string; limit?: number; page?: number }
): Promise<{ items: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.petId != null) q.set("petId", String(params.petId));
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; pagination: any } }>(`${clinicBase(branchId)}/cases?${q}`);
  const d = res?.data ?? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  return { items: d.items ?? [], pagination: d.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

/** Get case by id (branchId required in query) */
export async function staffClinicCaseById(branchId: string, caseId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}?branchId=${branchId}`);
  return res?.data ?? null;
}

/** Create clinical case */
export async function staffClinicCreateCase(
  branchId: string,
  body: {
    patientId?: number | null;
    petId?: number | null;
    appointmentId?: number | null;
    visitId?: number | null;
    surgeryPackageId?: number | null;
    primaryDoctorId?: number | null;
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/cases`, body);
  return res?.data;
}

/** Update case */
export async function staffClinicUpdateCase(branchId: string, caseId: number, body: { status?: string; surgeryPackageId?: number | null }): Promise<any> {
  const res = await apiPut<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}?branchId=${branchId}`, body);
  return res?.data;
}

/** Complete case */
export async function staffClinicCompleteCase(branchId: string, caseId: number): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}/complete?branchId=${branchId}`, {});
  return res?.data;
}

/** Add procedure order to case */
export async function staffClinicAddProcedureOrder(
  branchId: string,
  caseId: number,
  body: { surgeryPackageId: number; doctorId?: number | null; scheduledAt?: string }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}/procedure-orders?branchId=${branchId}`, body);
  return res?.data;
}

/** Complete procedure order */
export async function staffClinicCompleteProcedureOrder(branchId: string, caseId: number, orderId: number): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicApiBase}/cases/${caseId}/procedure-orders/${orderId}/complete?branchId=${branchId}`,
    {}
  );
  return res?.data;
}

/** Get consumption for case */
export async function staffClinicConsumptionForCase(branchId: string, caseId: number): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicApiBase}/cases/${caseId}/consumption?branchId=${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** Create planned consumption from package */
export async function staffClinicConsumptionPlanned(
  branchId: string,
  caseId: number,
  body: { surgeryPackageId: number; procedureOrderId?: number | null; visitId?: number | null }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}/consumption/planned?branchId=${branchId}`, body);
  return res?.data;
}

/** Record actual consumption */
export async function staffClinicConsumptionActual(
  branchId: string,
  caseId: number,
  body: {
    procedureOrderId?: number | null;
    visitId?: number | null;
    items: { variantId: number; productId?: number; lotId?: number; quantityActual: number; unitCost?: number; wastageFlag?: boolean }[];
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}/consumption/actual?branchId=${branchId}`, body);
  return res?.data;
}

/** Get consumption variance for case */
export async function staffClinicConsumptionVariance(branchId: string, caseId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicApiBase}/cases/${caseId}/consumption/variance?branchId=${branchId}`);
  return res?.data ?? null;
}

/** Reconcile consumption variance */
export async function staffClinicConsumptionReconcile(branchId: string, caseId: number, consumptionId: number): Promise<void> {
  await apiPost<{ success?: boolean }>(`${clinicApiBase}/cases/${caseId}/consumption/${consumptionId}/reconcile?branchId=${branchId}`, {});
}

/** List pending vial returns (enterprise) */
export async function staffClinicVialReturnsPending(
  branchId: string,
  params?: { overdueOnly?: boolean }
): Promise<Array<{ id: number; variant?: { id: number; sku: string; title: string }; returnDueAt: string; clinicalCaseId?: number }>> {
  const q = new URLSearchParams();
  if (params?.overdueOnly) q.set("overdueOnly", "true");
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `${clinicBase(branchId)}/vial-returns/pending${q.toString() ? `?${q}` : ""}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

/** Mark vial return as returned */
export async function staffClinicVialReturnMarkReturned(branchId: string, controlId: number): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vial-returns/${controlId}/return`, {});
  return res?.data;
}

// ---------- Medicine Control (CCMLPA) ----------
export async function staffClinicDispenseRequestsList(
  branchId: string,
  params?: { status?: string; take?: number; skip?: number }
): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `${clinicBase(branchId)}/medicine-control/dispense-requests${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
}

export async function staffClinicDispenseRequestApprove(branchId: string, requestId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-request/${requestId}/approve`,
    {}
  );
  return res?.data;
}

export async function staffClinicDispenseRequestIssue(branchId: string, requestId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-request/${requestId}/issue`,
    {}
  );
  return res?.data;
}

export async function staffClinicVialSessionsList(branchId: string, params?: { status?: string }): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `${clinicBase(branchId)}/medicine-control/vial-sessions${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
}

export async function staffClinicAuditBinsList(branchId: string): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/medicine-control/audit-bins`);
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.items ?? []);
}

export async function staffClinicMedicinePoliciesList(branchId: string): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/medicine-control/policies`);
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
}

/** Search appointments by ID, token, phone, owner name, pet name */
export async function staffClinicAppointmentSearch(
  branchId: string,
  params: { q: string; searchBy?: string; limit?: number }
): Promise<{ items: any[]; total: number }> {
  const q = new URLSearchParams();
  q.set("q", params.q);
  if (params.searchBy) q.set("searchBy", params.searchBy);
  if (params.limit != null) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(
    `${clinicBase(branchId)}/appointments/search?${q}`
  );
  const d = res?.data ?? { items: [], total: 0 };
  return { items: d.items ?? [], total: d.total ?? 0 };
}

export async function staffClinicAppointmentCollectPayment(
  branchId: string,
  appointmentId: number,
  body: { amount: number; method?: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/appointments/${appointmentId}/collect-payment`,
    body
  );
  return res?.data;
}

export async function staffClinicAppointmentSlip(branchId: string, appointmentId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/appointments/${appointmentId}/slip`
  );
  return res?.data;
}

export async function staffClinicAppointmentPaymentSlip(branchId: string, appointmentId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/appointments/${appointmentId}/payment-slip`
  );
  return res?.data;
}

export async function staffClinicAppointmentAssignDoctor(
  branchId: string,
  appointmentId: number,
  doctorId: number
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/appointments/${appointmentId}/assign-doctor`,
    { doctorId }
  );
  return res?.data;
}

export async function staffClinicAppointmentCheckIn(branchId: string, appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: { appointmentId: number; ticket: any } }>(`${clinicBase(branchId)}/appointments/${appointmentId}/check-in`, {});
  return res?.data;
}

export async function staffClinicAppointmentCancel(branchId: string, appointmentId: number, reason?: string) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/cancel`, { reason });
  return res?.data;
}

export async function staffClinicAppointmentReschedule(branchId: string, appointmentId: number, data: { scheduledStartAt: string; scheduledEndAt: string; doctorId?: number }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/reschedule`, data);
  return res?.data;
}

export async function staffClinicAppointmentNoShow(branchId: string, appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/no-show`, {});
  return res?.data;
}

export async function staffClinicQueueSession(branchId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/session${q}`);
  return res?.data;
}

export async function staffClinicQueueTickets(branchId: string, params?: { date?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: { tickets: any[] } }>(`${clinicBase(branchId)}/queue/tickets?${q}`);
  return res?.data?.tickets ?? [];
}

export async function staffClinicQueueIssueTicket(branchId: string, body: { appointmentId?: number; patientId?: number; petId?: number; doctorId?: number; priorityTag?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets`, body);
  return res?.data;
}

export async function staffClinicQueueAssignDoctor(branchId: string, ticketId: number, doctorId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets/${ticketId}/assign-doctor`, { doctorId });
  return res?.data;
}

export async function staffClinicQueueSetPriority(branchId: string, ticketId: number, priorityTag: string) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets/${ticketId}/priority`, { priorityTag });
  return res?.data;
}

export async function staffClinicQueueCallNext(branchId: string, doctorId?: number) {
  const res = await apiPost<{ success?: boolean; data?: { called: any } }>(`${clinicBase(branchId)}/queue/next`, { doctorId });
  return res?.data;
}

export async function staffClinicQueueSkip(branchId: string, ticketId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets/${ticketId}/skip`, {});
  return res?.data;
}

export async function staffClinicQueueStart(branchId: string, ticketId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets/${ticketId}/start`, {});
  return res?.data;
}

export async function staffClinicQueueComplete(branchId: string, ticketId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/tickets/${ticketId}/complete`, {});
  return res?.data;
}

/** PII-safe payload for waiting screen (no names/phones) */
export async function staffClinicQueueScreen(branchId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: { nowServing: any; upNext: any[]; estimates: any[] } }>(`${clinicBase(branchId)}/queue/screen${q}`);
  return res?.data ?? { nowServing: null, upNext: [], estimates: [] };
}

// ========== Clinic Patients (Pets) ==========
export async function staffClinicPatientsList(branchId: string, params?: { limit?: number; offset?: number; search?: string; ownerId?: number }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.search) q.set("search", params.search);
  if (params?.ownerId != null) q.set("ownerId", String(params.ownerId));
  const res = await apiGet<{ success?: boolean; data?: { patients: any[]; total: number } }>(`${clinicBase(branchId)}/patients${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { patients: [], total: 0 };
}

export async function staffClinicPatientGet(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/${petId}`);
  return res?.data ?? null;
}

export async function staffClinicPatientByUniqueId(branchId: string, uniquePetId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/unique/${encodeURIComponent(uniquePetId)}`);
  return res?.data ?? null;
}

export async function staffClinicOwnerLookup(branchId: string, q: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/owner-lookup?q=${encodeURIComponent(q)}`);
  return res?.data ?? null;
}

export async function staffClinicPatientRegister(branchId: string, body: { userId: number; name: string; animalTypeId: number; breedId?: number; sex?: string; dateOfBirth?: string; microchipNumber?: string; allergies?: string[]; bloodType?: string; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients`, body);
  return res?.data ?? null;
}

export async function staffClinicPatientUpdate(branchId: string, petId: number, body: Partial<{ name: string; breedId: number | null; sex: string; dateOfBirth: string | null; microchipNumber: string | null; allergies: string[]; bloodType: string | null; healthCardJson: any; notes: string | null; qrCodeUrl: string | null }>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/${petId}`, body);
  return res?.data ?? null;
}

export async function staffClinicAppointmentGet(branchId: string, appointmentId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}`);
  return res?.data ?? null;
}

export async function staffClinicIntakeGet(branchId: string, appointmentId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/intake`);
  return res?.data ?? null;
}

export async function staffClinicIntakeUpsert(
  branchId: string,
  appointmentId: number,
  data: {
    chiefComplaint?: string | null;
    complaintDuration?: string | null;
    complaintOnset?: string | null;
    symptomsJson?: string[] | null;
    additionalSymptoms?: string | null;
    weightKg?: number | null;
    tempC?: number | null;
    heartRate?: number | null;
    respRate?: number | null;
    hydrationStatus?: string | null;
    feedingJson?: Record<string, unknown> | null;
    historyJson?: Record<string, unknown> | null;
    riskFlagsJson?: Record<string, unknown> | null;
    documentsJson?: unknown[] | null;
  }
) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/intake`, data);
  return res?.data ?? null;
}

// ========== Queue session open/close ==========
export async function staffClinicQueueSessionOpen(branchId: string) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/session/open`, {});
  return res?.data;
}

export async function staffClinicQueueSessionClose(branchId: string, sessionId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/queue/session/close`, { sessionId });
  return res?.data;
}

// ========== Visits (EMR) ==========
export async function staffClinicVisitsList(branchId: string, params?: { petId?: number; patientId?: number; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.petId != null) q.set("petId", String(params.petId));
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { visits: any[]; total: number } }>(`${clinicBase(branchId)}/visits${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { visits: [], total: 0 };
}

export async function staffClinicVisitGet(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}`);
  return res?.data ?? null;
}

export async function staffClinicVisitCreate(branchId: string, body: { petId: number; patientId: number; doctorId: number; appointmentId?: number; status?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits`, body);
  return res?.data ?? null;
}

export async function staffClinicVisitUpdate(branchId: string, visitId: number, body: Partial<{ status: string; startedAt: string; completedAt: string; followUpDate: string; followUpNotes: string }>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}`, body);
  return res?.data ?? null;
}

export async function staffClinicVitalAdd(branchId: string, visitId: number, body: { weightKg?: number; tempC?: number; heartRate?: number; respRate?: number; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/vitals`, body);
  return res?.data ?? null;
}

export async function staffClinicNoteAdd(branchId: string, visitId: number, body: { noteType: string; contentJson: any }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/notes`, body);
  return res?.data ?? null;
}

export async function staffClinicAttachmentAdd(branchId: string, visitId: number, body: { fileUrl: string; fileName?: string; fileType?: string; note?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/attachments`, body);
  return res?.data ?? null;
}

// ========== Consultation templates ==========
export async function staffClinicTemplatesList(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { templates: any[] } }>(`${clinicBase(branchId)}/consultation-templates`);
  return res?.data?.templates ?? [];
}

export async function staffClinicTemplateGet(branchId: string, templateId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/consultation-templates/${templateId}`);
  return res?.data ?? null;
}

export async function staffClinicTemplateCreate(branchId: string, body: { name: string; description?: string; contentJson: any; isDefault?: boolean }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/consultation-templates`, body);
  return res?.data ?? null;
}

export async function staffClinicTemplateUpdate(branchId: string, templateId: number, body: Partial<{ name: string; description: string; contentJson: any; isDefault: boolean }>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/consultation-templates/${templateId}`, body);
  return res?.data ?? null;
}

export async function staffClinicTemplateApply(branchId: string, visitId: number, templateId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/apply-template`, { templateId });
  return res?.data ?? null;
}

export async function staffClinicDischargeAdd(branchId: string, visitId: number, body: { contentJson: any }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/discharge`, body);
  return res?.data ?? null;
}

// ========== Prescriptions ==========
export async function staffClinicPrescriptionsByVisit(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { prescriptions: any[] } }>(`${clinicBase(branchId)}/visits/${visitId}/prescriptions`);
  return res?.data?.prescriptions ?? [];
}

export async function staffClinicPrescriptionCreate(branchId: string, visitId: number, body: { petId: number; doctorId: number; notes?: string; items: any[] }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/prescriptions`, body);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionGet(branchId: string, prescriptionId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}`);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionByQr(branchId: string, qrToken: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/verify/${encodeURIComponent(qrToken)}`);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionFinalize(branchId: string, prescriptionId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}/finalize`, {});
  return res?.data ?? null;
}

export async function staffClinicPrescriptionDispense(branchId: string, prescriptionId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}/dispense`, {});
  return res?.data ?? null;
}

export async function staffClinicMedicineSearch(branchId: string, query: string, limit?: number) {
  const q = new URLSearchParams({ q: query });
  if (limit != null) q.set("limit", String(limit));
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/medicine-search?${q}`);
  return res?.data?.items ?? [];
}

// ========== Billing ==========
export async function staffClinicBillingSummary(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/billing-summary`);
  return res?.data ?? null;
}

export async function staffClinicVisitOrders(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { orders: any[] } }>(`${clinicBase(branchId)}/visits/${visitId}/orders`);
  return res?.data?.orders ?? [];
}

export async function staffClinicVisitPaymentStatus(branchId: string, visitId: number): Promise<{ serviceId: number; serviceName: string; paid: boolean; receiptNumber?: string }[]> {
  const res = await apiGet<{ success?: boolean; data?: { servicePaymentStatus: { serviceId: number; serviceName: string; paid: boolean; receiptNumber?: string }[] } }>(
    `${clinicBase(branchId)}/visits/${visitId}/payment-status`
  );
  return res?.data?.servicePaymentStatus ?? [];
}

export async function staffClinicCreateInvoice(branchId: string, visitId: number, body: { customerId: number; items: { productId: number; variantId?: number; quantity: number; price: number }[]; paymentMethod?: string; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/create-invoice`, body);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionOrderLines(branchId: string, prescriptionId: number) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}/order-lines`);
  return res?.data?.items ?? [];
}

// ========== Vaccinations ==========
export async function staffClinicVaccinationsList(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: { vaccinations: any[] } }>(`${clinicBase(branchId)}/patients/${petId}/vaccinations`);
  return res?.data?.vaccinations ?? [];
}

export async function staffClinicVaccinationsNextDue(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: { due: any[] } }>(`${clinicBase(branchId)}/patients/${petId}/vaccinations/next-due`);
  return res?.data?.due ?? [];
}

export async function staffClinicVaccinationRecord(branchId: string, body: { petId: number; vaccineTypeId: number; administeredAt?: string; nextDueDate?: string; batchNumber?: string; manufacturer?: string; vetClinic?: string; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vaccinations`, body);
  return res?.data ?? null;
}

export async function staffClinicVaccinationCertificate(branchId: string, token: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vaccinations/certificate/${encodeURIComponent(token)}`);
  return res?.data ?? null;
}

// ========== Deworming ==========
export async function staffClinicDewormingList(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: { records: any[] } }>(`${clinicBase(branchId)}/patients/${petId}/deworming`);
  return res?.data?.records ?? [];
}

export async function staffClinicDewormingRecord(branchId: string, body: { petId: number; medicationName: string; dosage?: string; weightAtTime?: number; nextDueDate?: string; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/deworming`, body);
  return res?.data ?? null;
}

// ========== Lab ==========
export async function staffClinicLabRequisitionCreate(branchId: string, body: { visitId: number; petId: number; testsJson: any; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/lab/requisitions`, body);
  return res?.data ?? null;
}

export async function staffClinicLabRequisitionsByVisit(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { requisitions: any[] } }>(`${clinicBase(branchId)}/visits/${visitId}/lab-requisitions`);
  return res?.data?.requisitions ?? [];
}

export async function staffClinicLabReportAdd(branchId: string, requisitionId: number, body: { fileUrl?: string; abnormalFlags?: any; notes?: string; items?: any[] }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/lab/requisitions/${requisitionId}/report`, body);
  return res?.data ?? null;
}

// ========== Service deliveries ==========
export async function staffClinicServiceDeliveryRecord(branchId: string, visitId: number, body: { serviceId: number; status?: string; checklistJson?: any; consumablesJson?: any; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/service-deliveries`, body);
  return res?.data ?? null;
}

export async function staffClinicServiceDeliveriesByVisit(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { deliveries: any[] } }>(`${clinicBase(branchId)}/visits/${visitId}/service-deliveries`);
  return res?.data?.deliveries ?? [];
}

// ========== Reports ==========
export async function staffClinicDashboardSummary(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: { visitCount: number; orderCount: number; revenue: number } }>(`${clinicBase(branchId)}/reports/dashboard${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { visitCount: 0, orderCount: 0, revenue: 0 };
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

/** GET /api/v1/branches/:branchId/members/invite-allowed-roles – roles current user can invite (for dropdown) */
export async function staffBranchInviteAllowedRoles(branchId: string): Promise<{ allowedRoles: string[] }> {
  const res = await apiGet<{ success?: boolean; data?: { allowedRoles?: string[] } }>(
    `/api/v1/branches/${branchId}/members/invite-allowed-roles`
  );
  const roles = res?.data?.allowedRoles ?? [];
  return { allowedRoles: Array.isArray(roles) ? roles : [] };
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
