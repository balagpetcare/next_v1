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

// ========== Me – invitations (staff/doctor invite inbox) ==========
/** GET /api/v1/me/invitations – list staff invitations for current user */
export async function getMeInvitations(): Promise<{ id: number; branchId: number; branchName: string | null; orgName: string | null; role: string; status: string; inviteAsDoctor: boolean; expiresAt: string | null; createdAt: string | null }[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] }>("/api/v1/me/invitations");
  return res?.data ?? [];
}

/** POST /api/v1/me/invitations/:id/accept */
export async function acceptMeInvitation(inviteId: number): Promise<{ success: boolean; message?: string; data?: any }> {
  return apiPost<{ success?: boolean; message?: string; data?: any }>(`/api/v1/me/invitations/${inviteId}/accept`, {});
}

/** POST /api/v1/me/invitations/:id/decline */
export async function declineMeInvitation(inviteId: number): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success?: boolean; message?: string }>(`/api/v1/me/invitations/${inviteId}/decline`, {});
}

// ========== Doctor Panel – /api/v1/doctor/* ==========
export async function doctorGetMe(): Promise<{
  doctorBranchMemberIds: number[];
  branches: { branchId: number; branchName: string; branchMemberId: number; status: string; defaultConsultationFee: number | null; visiting: boolean; onboardingStatus?: string }[];
  onboardingCompleted?: boolean;
  displayName?: string | null;
}> {
  const res = await apiGet<{ success?: boolean; data?: any }>("/api/v1/doctor/me");
  return res?.data ?? { doctorBranchMemberIds: [], branches: [], onboardingCompleted: false, displayName: null };
}

/** POST /api/v1/doctor/onboarding/complete – set profile-level onboarding completed (no branch). */
export async function doctorCompleteProfileOnboarding(): Promise<{ success: boolean; data?: any }> {
  const res = await apiPost<{ success?: boolean; data?: any }>("/api/v1/doctor/onboarding/complete", {});
  return { success: !!res?.success, data: res?.data };
}

/** GET /api/v1/doctor/requests – list current doctor's requests (fee/schedule/cancel/leave). */
export async function doctorListRequests(params?: { branchId?: number; status?: string }): Promise<{ items: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/requests${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

/** POST /api/v1/doctor/requests – create a doctor request (requires clinic approval). */
export async function doctorCreateRequest(body: { branchId: number; type: string; payload?: Record<string, unknown> }): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>("/api/v1/doctor/requests", body);
  return res?.data ?? null;
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
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  status?: string;
  statuses?: string;
  visitType?: string;
  priority?: string;
  appointmentType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  if (params?.statuses) q.set("statuses", params.statuses);
  if (params?.visitType) q.set("visitType", params.visitType);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.appointmentType) q.set("appointmentType", params.appointmentType);
  if (params?.search) q.set("search", params.search);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { appointments: any[]; total: number } }>(`/api/v1/doctor/appointments?${q}`);
  return { appointments: res?.data?.appointments ?? [], total: res?.data?.total ?? 0 };
}

/** POST /api/v1/doctor/appointments/:id/confirm - BOOKED -> CONFIRMED */
export async function doctorConfirmAppointment(appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/doctor/appointments/${appointmentId}/confirm`, {});
  return res?.data ?? null;
}

export async function doctorGetAppointmentStats(params?: {
  date?: string;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
}) {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
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

/** GET /api/v1/clinic/branches/:branchId/booking/available-slots – service/package-aware slots */
export async function staffBookingAvailableSlots(
  branchId: string,
  params: { date: string; serviceId?: number; packageId?: number; doctorId?: number; durationMinutes?: number }
) {
  const q = new URLSearchParams({ date: params.date });
  if (params.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params.packageId != null) q.set("packageId", String(params.packageId));
  if (params.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params.durationMinutes != null) q.set("durationMinutes", String(params.durationMinutes));
  const res = await apiGet<{ success?: boolean; data?: { slots: { doctorId: number; doctorName: string; slots: { start: string; end: string }[] }[] } }>(
    `${clinicBase(branchId)}/booking/available-slots?${q}`
  );
  return res?.data?.slots ?? [];
}

/** GET /api/v1/clinic/branches/:branchId/booking/eligible-doctors */
export async function staffBookingEligibleDoctors(
  branchId: string,
  params?: { serviceId?: number; packageId?: number }
) {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.packageId != null) q.set("packageId", String(params.packageId));
  const res = await apiGet<{ success?: boolean; data?: { doctors: { doctorId: number; doctorName: string; specializationTags?: string[]; defaultConsultationFee?: number; serviceFee?: number; durationMin?: number }[] } }>(
    `${clinicBase(branchId)}/booking/eligible-doctors${q.toString() ? `?${q}` : ""}`
  );
  return res?.data?.doctors ?? [];
}

/** GET /api/v1/clinic/branches/:branchId/booking/price-preview */
export async function staffBookingPricePreview(
  branchId: string,
  params?: { serviceId?: number; packageId?: number; doctorId?: number; species?: string }
) {
  const q = new URLSearchParams();
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.packageId != null) q.set("packageId", String(params.packageId));
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.species) q.set("species", params.species);
  const res = await apiGet<{ success?: boolean; data?: { basePrice: number; doctorFee: number; discountAmount: number; totalPrice: number; breakdown: { label: string; amount: number }[] } }>(
    `${clinicBase(branchId)}/booking/price-preview${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/booking/constraints */
export async function staffBookingConstraints(branchId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: { isOpen: boolean; openingHours?: Record<string, string>; weeklyOffDays?: number[]; holidays?: { date: string; name: string | null; isClosed: boolean }[]; maxAdvanceDays: number; policies?: Record<string, unknown> } }>(
    `${clinicBase(branchId)}/booking/constraints${q}`
  );
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/booking/compatible-rooms */
export async function staffBookingCompatibleRooms(
  branchId: string,
  params: { start: string; end: string; serviceId?: number; surgeryPackageId?: number; doctorId?: number }
) {
  const q = new URLSearchParams({ start: params.start, end: params.end });
  if (params.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params.surgeryPackageId != null) q.set("surgeryPackageId", String(params.surgeryPackageId));
  if (params.doctorId != null) q.set("doctorId", String(params.doctorId));
  const res = await apiGet<{ success?: boolean; data?: { roomIds: number[]; rooms: { id: number; name: string; code: string | null; roomType: string }[] } }>(
    `${clinicBase(branchId)}/booking/compatible-rooms?${q}`
  );
  return res?.data ?? { roomIds: [], rooms: [] };
}

/** POST /api/v1/clinic/branches/:branchId/appointments/:id/confirm */
export async function staffAppointmentConfirm(branchId: string, appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/appointments/${appointmentId}/confirm`
  );
  return res?.data;
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

// --- Staff Doctor Management (Enterprise) ---
export async function staffDoctorsSummary(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/summary`);
  return res?.data ?? null;
}

export async function staffDoctorsAlerts(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/alerts`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorsEnriched(branchId: string, params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => v != null && v !== "" && q.set(k, String(v)));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`${clinicBase(branchId)}/doctors/enriched${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

export async function staffClinicListInvitations(
  branchId: string,
  params?: { status?: string; inviteAsDoctor?: boolean; limit?: number; offset?: number }
) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.inviteAsDoctor !== undefined) q.set("inviteAsDoctor", String(params.inviteAsDoctor));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(
    `${clinicBase(branchId)}/doctors/invitations${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? { items: [], total: 0 };
}

export async function staffClinicResendInvitation(branchId: string, inviteId: number) {
  const res = await apiPost<{ success?: boolean; data?: { invite?: any; rawToken?: string } }>(
    `${clinicBase(branchId)}/doctors/invitations/${inviteId}/resend`,
    {}
  );
  return res?.data ?? null;
}

export async function staffClinicCancelInvitation(branchId: string, inviteId: number) {
  const res = await apiPost<{ success?: boolean; data?: { invite?: any } }>(
    `${clinicBase(branchId)}/doctors/invitations/${inviteId}/cancel`,
    {}
  );
  return res?.data ?? null;
}

export async function staffDoctorProfile(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/profile`);
  return res?.data ?? null;
}

export async function staffDoctor360Summary(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/360-summary`);
  return res?.data ?? null;
}

export async function staffDoctorStatusUpdate(branchId: string, memberId: number, body: { status: "ACTIVE" | "INACTIVE" }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/status`, body);
  return res?.data ?? res;
}

export async function staffDoctorCredentials(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/credentials`);
  return res?.data ?? { documents: [], licenses: [], branchCredentials: [] };
}

export async function staffDoctorPostCredential(branchId: string, memberId: number, body: Record<string, unknown>) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/credentials`, body);
  return res?.data ?? res;
}

export async function staffDoctorPatchCredential(branchId: string, memberId: number, credentialId: number, body: { status: "PENDING" | "UNDER_REVIEW" }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/credentials/${credentialId}`, body);
  return res?.data ?? res;
}

export async function staffDoctorSubmitCredentialApproval(branchId: string, memberId: number, credentialId: number) {
  const res = await apiPost<{ success?: boolean; data?: { id: number; status: string } }>(`${clinicBase(branchId)}/doctors/${memberId}/credentials/${credentialId}/submit-approval`, {});
  return res?.data ?? res;
}

export async function staffDoctorServices(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/services`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorPackages(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/packages`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorSchedule(branchId: string, memberId: number, params?: { from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/schedule${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { templates: [], exceptions: [] };
}

export async function staffDoctorFees(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/fees`);
  return res?.data ?? { current: {}, proposed: null };
}

export async function staffDoctorPerformance(branchId: string, memberId: number, params?: { from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/performance${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

export async function staffDoctorLeave(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/leave`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorApprovals(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/approvals`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** GET /api/v1/clinic/branches/:branchId/approval-requests */
export async function staffClinicApprovalRequestsList(branchId: string, params?: { status?: string; requestType?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.requestType) q.set("requestType", params.requestType);
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/approval-requests${q.toString() ? `?${q}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffApprovalDecide(
  branchId: string,
  requestId: number,
  body: { decision: "APPROVED" | "REJECTED"; rejectReason?: string }
) {
  const res = await apiPut<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/approval-requests/${requestId}/decide`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorAuditLog(branchId: string, memberId: number, params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`${clinicBase(branchId)}/doctors/${memberId}/audit-log${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

export async function staffDoctorsScheduleBoard(branchId: string, params?: { from?: string; to?: string; doctorIds?: number[] }) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.doctorIds?.length) params.doctorIds.forEach((id) => q.append("doctorIds", String(id)));
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/schedule-board${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { doctors: [], templates: [], exceptions: [], appointments: [] };
}

export async function staffDoctorsServiceMatrix(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/service-matrix`);
  return res?.data ?? { doctors: [], services: [], matrix: [] };
}

export async function staffDoctorsPackageMatrix(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/package-matrix`);
  return res?.data ?? { doctors: [], packages: [], matrix: [] };
}

export async function staffDoctorsCredentialsQueue(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/credentials-queue`);
  return res?.data ?? {
    missing: [], pending: [], expiringSoon: [], rejected: [],
    credentialsPending: [], credentialsUnderReview: [], credentialsApproved: [], credentialsRejected: [], credentialsExpiringSoon: [],
  };
}

export async function staffCertificationsBoard(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; summary: any } }>(`${clinicBase(branchId)}/doctors/certifications-board`);
  return res?.data ?? { items: [], summary: { total: 0, verified: 0, expiringSoon: 0, expired: 0, unverified: 0 } };
}

export async function staffLicensesBoard(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; summary: any; alerts: any[] } }>(`${clinicBase(branchId)}/doctors/licenses-board`);
  return res?.data ?? { items: [], summary: { total: 0, active: 0, expiringSoon: 0, expired: 0, unverified: 0 }, alerts: [] };
}

export async function staffDoctorsAvailabilityBoard(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/availability-board`);
  return res?.data ?? { onLeaveToday: [], upcomingLeave: [], pendingRequests: [] };
}

export async function staffDoctorsPendingApprovals(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/pending-approvals`);
  return Array.isArray(res?.data) ? res.data : [];
}

export type StaffDoctorsPerformanceSummaryParams = { from?: string; to?: string; limit?: number; offset?: number };

export async function staffDoctorsPerformanceSummary(branchId: string, params?: StaffDoctorsPerformanceSummaryParams) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/performance-summary${suffix}`);
  return res?.data ?? null;
}

export type StaffDoctorsAuditLogsParams = {
  memberId?: number;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function staffDoctorsAuditLogs(branchId: string, params?: StaffDoctorsAuditLogsParams) {
  const q = new URLSearchParams();
  if (params?.memberId != null) q.set("memberId", String(params.memberId));
  if (params?.action) q.set("action", params.action);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`${clinicBase(branchId)}/doctors/audit-logs${suffix}`);
  return res?.data ?? { items: [], total: 0 };
}

export async function staffDoctorApprovalAction(
  branchId: string,
  requestId: number,
  body: { decision: "APPROVED" | "REJECTED"; rejectReason?: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/approvals/${requestId}/action`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorInvite(branchId: string, data: Record<string, unknown>) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/invite`, data);
  return res?.data ?? res;
}

export async function staffDoctorAssignExisting(branchId: string, data: { userId: number; roleInClinic?: string; defaultConsultationFee?: number }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/assign-existing`, data);
  return res?.data ?? res;
}

export async function staffDoctorInviteSearch(branchId: string, query: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/invite-search?q=${encodeURIComponent(query)}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorPutServices(branchId: string, memberId: number, body: any) {
  const res = await apiPut<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/services`, body);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorDeleteServiceMapping(branchId: string, memberId: number, mappingId: number): Promise<void> {
  await apiDelete(`${clinicBase(branchId)}/doctors/${memberId}/services/${mappingId}`);
}

export async function staffDoctorDeletePackageMapping(branchId: string, memberId: number, mappingId: number): Promise<void> {
  await apiDelete(`${clinicBase(branchId)}/doctors/${memberId}/packages/${mappingId}`);
}

export async function staffDoctorPutPackages(branchId: string, memberId: number, body: any) {
  const res = await apiPut<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/doctors/${memberId}/packages`, body);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffDoctorProposeFee(branchId: string, memberId: number, body: any) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/fees/propose`, body);
  return res?.data ?? res;
}

export async function staffDoctorPostLeave(branchId: string, memberId: number, body: any) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/leave`, body);
  return res?.data ?? res;
}

export async function staffDoctorPostSchedule(branchId: string, memberId: number, body: any) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/schedule`, body);
  return res?.data ?? res;
}

export async function staffDoctorPutSchedule(branchId: string, memberId: number, scheduleId: number, body: any) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/${memberId}/schedule/${scheduleId}`, body);
  return res?.data ?? res;
}

export async function staffDoctorDeleteSchedule(branchId: string, memberId: number, scheduleId: number) {
  await apiDelete(`${clinicBase(branchId)}/doctors/${memberId}/schedule/${scheduleId}`);
}

export async function staffDoctorPostScheduleException(
  branchId: string,
  memberId: number,
  body: { date: string; type: string; startTime?: string; endTime?: string; note?: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/${memberId}/schedule/exceptions`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorPutScheduleException(
  branchId: string,
  memberId: number,
  exceptionId: number,
  body: { type?: string; startTime?: string; endTime?: string; note?: string }
) {
  const res = await apiPut<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/${memberId}/schedule/exceptions/${exceptionId}`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorDeleteScheduleException(branchId: string, memberId: number, exceptionId: number) {
  await apiDelete(`${clinicBase(branchId)}/doctors/${memberId}/schedule/exceptions/${exceptionId}`);
}

export async function staffDoctorsPutServiceMatrix(branchId: string, body: { bulkAssign?: boolean; assignments?: any[] }) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/doctors/service-matrix`, body);
  return res?.data ?? res;
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
  body: {
    items: Array<
      | { clinicalItemId: number; variantId?: number; requestedQty: number; note?: string; lineNote?: string }
      | { sourceType: "CUSTOM"; itemNameSnapshot: string; unitSnapshot: string; requestedQty: number; lineNote?: string }
    >;
    priority?: string;
    note?: string;
    department?: string;
    requestType?: string;
    neededBy?: string;
    reason?: string;
  }
): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests`, body);
  return res?.data ?? res;
}

export async function staffClinicSupplyRequestUpdateDraft(
  branchId: string,
  requestId: number,
  body: {
    department?: string | null;
    requestType?: string;
    priority?: string;
    neededBy?: string | null;
    reason?: string | null;
    note?: string | null;
    items?: Array<
      | { clinicalItemId: number; variantId?: number; requestedQty: number; note?: string; lineNote?: string }
      | { sourceType: "CUSTOM"; itemNameSnapshot: string; unitSnapshot: string; requestedQty: number; lineNote?: string }
    >;
  }
): Promise<unknown> {
  const res = await apiPatch<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests/${requestId}`, body);
  return res?.data ?? res;
}

export async function staffClinicSupplyRequestCancel(branchId: string, requestId: number): Promise<unknown> {
  const res = await apiPost<{ data?: unknown }>(`${clinicBase(branchId)}/supply-requests/${requestId}/cancel`, {});
  return res?.data ?? res;
}

export async function staffClinicSupplyRequestItemSearch(
  branchId: string,
  params?: { q?: string; limit?: number }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const res = await apiGet<{ data?: unknown[] }>(`${clinicBase(branchId)}/supply-requests/items/search${q.toString() ? `?${q}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
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
    appointmentType?: string;
    surgeryPackageId?: number;
    durationMinutes?: number;
    specialInstructions?: string;
    roomId?: number | null;
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
    surgeryPackageId?: number | null;
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

/** List surgery packages for branch (for booking wizard / Quick Appointment) */
export async function staffClinicPackagesList(branchId: string): Promise<{ id: number; serviceId: number; packageCode: string; packageName: string; baseSellingPrice: number; status?: string; packageType?: string; description?: string }[]> {
  try {
    const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(`${clinicBase(branchId)}/packages?limit=100`);
    const raw = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : null);
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      id: Number(p.id),
      serviceId: Number(p.serviceId ?? p.service?.id ?? 0),
      packageCode: p.packageCode ?? "",
      packageName: p.packageName ?? p.name ?? "",
      baseSellingPrice: Number(p.baseSellingPrice ?? p.basePrice ?? 0),
      status: p.status,
      packageType: p.packageType,
      description: p.description,
    }));
  } catch {
    return [];
  }
}

/** Available surgery packages for a service (for package selection in appointment/billing).
 * Backend returns { success, data: array }; normalize to { id, name, code, basePrice, packageType? } for UI. */
export async function staffClinicAvailablePackages(
  branchId: string,
  serviceId: number,
  params?: { species?: string }
): Promise<{ id: number; name: string; code?: string; basePrice?: number; packageType?: string }[]> {
  const q = new URLSearchParams();
  if (params?.species) q.set("species", params.species);
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/services/${serviceId}/available-packages${q.toString() ? `?${q}` : ""}`
  );
  const raw = Array.isArray(res?.data)
    ? res.data
    : Array.isArray((res?.data as any)?.items)
      ? (res?.data as any).items
      : [];
  return raw.map((p: any) => ({
    id: Number(p.id),
    name: p.packageName ?? p.name ?? "",
    code: p.packageCode ?? p.code,
    basePrice: p.baseSellingPrice != null ? Number(p.baseSellingPrice) : (p.basePrice != null ? Number(p.basePrice) : undefined),
    packageType: p.packageType ?? undefined,
  }));
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
  params?: { status?: string; requestType?: string; take?: number; skip?: number }
): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.requestType) q.set("requestType", params.requestType);
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-requests${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
}

/** Internal Order + Vial Workflow: treatment course, billing, internal orders */

export async function staffClinicTreatmentCoursesList(
  branchId: string,
  params?: { patientId?: number; status?: string; skip?: number; take?: number }
): Promise<{ list: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.status) q.set("status", params.status);
  if (params?.skip != null) q.set("skip", String(params.skip));
  if (params?.take != null) q.set("take", String(params.take));
  const res = await apiGet<{ success?: boolean; data?: { list: any[]; total: number } }>(
    `${clinicBase(branchId)}/medicine-control/treatment-courses${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  return d && typeof d === "object" && Array.isArray(d.list) ? { list: d.list, total: d.total ?? d.list.length } : { list: [], total: 0 };
}

export async function staffClinicTreatmentCourseCreateFull(
  branchId: string,
  body: {
    patientId: number;
    visitId?: number | null;
    branchId?: number;
    prescribedByDoctorId?: number | null;
    treatmentBranchId?: number | null;
    crossBranchAllowed?: boolean;
    durationDays: number;
    days: { dayNumber: number; scheduledDate: string; items: { variantId: number; medicineName: string; dosageMl: number; route?: string; frequency?: string; expectedNote?: string }[] }[];
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/full`,
    body
  );
  return res?.data;
}

export async function staffClinicTreatmentCourseSchedule(branchId: string, courseId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/schedule`
  );
  return res?.data;
}

export async function staffClinicTreatmentCourseTodayDue(branchId: string, courseId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/today-due`
  );
  return res?.data;
}

export async function staffClinicTreatmentCourseRevisions(branchId: string, courseId: number, limit?: number): Promise<any[]> {
  const q = limit != null ? `?limit=${limit}` : "";
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/revisions${q}`
  );
  const d = res?.data;
  return Array.isArray(d) ? d : [];
}

export async function staffClinicTreatmentCourseHold(branchId: string, courseId: number, reason?: string): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/hold`,
    { reason: reason ?? null }
  );
  return res?.data;
}

export async function staffClinicTreatmentCourseResume(branchId: string, courseId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/resume`,
    {}
  );
  return res?.data;
}

export async function staffClinicTreatmentCourseStop(branchId: string, courseId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/${courseId}/stop`,
    {}
  );
  return res?.data;
}

export async function staffClinicTreatmentDayItemUpdate(
  branchId: string,
  itemId: number,
  body: { status?: string; dosageMl?: number; route?: string; expectedNote?: string }
): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-course/day-item/${itemId}`,
    body
  );
  return res?.data;
}

export async function staffClinicTreatmentBillingSummary(branchId: string, courseId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/treatment-billing/${courseId}/summary`
  );
  return res?.data;
}

export async function staffClinicTreatmentDayBillCreate(
  branchId: string,
  courseId: number,
  body: { customerId: number; treatmentDayId: number; serviceFee?: number; visitId?: number | null; paymentMethod?: string; notes?: string }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/treatment-billing/${courseId}/create-bill`,
    body
  );
  return res?.data;
}

export async function staffClinicOpenVialAvailability(
  branchId: string,
  variantId: number,
  requiredMl?: number
): Promise<any> {
  const q = requiredMl != null ? `?requiredMl=${requiredMl}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/open-vial-availability/${variantId}${q}`
  );
  return res?.data;
}

export async function staffClinicInternalOrderCreate(
  branchId: string,
  body: {
    patientId?: number | null;
    visitId?: number | null;
    treatmentCourseId?: number | null;
    tokenId?: number | null;
    treatmentDayItemId?: number | null;
    requestReason?: string | null;
    items: { variantId: number; requestedQty: number; unit?: string; reason?: string }[];
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/internal-order`,
    body
  );
  return res?.data;
}

export async function staffClinicInternalOrdersDashboard(
  branchId: string,
  params?: { requestType?: string }
): Promise<{ pending: number; approved: number; rejected: number; issued: number; activated: number; closed: number; byRequestType: Record<string, number> }> {
  const q = params?.requestType ? `?requestType=${encodeURIComponent(params.requestType)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/internal-orders/dashboard${q}`
  );
  return res?.data ?? {};
}

export async function staffClinicPatientDueMedicines(branchId: string, patientId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/patient/${patientId}/due-medicines`
  );
  return res?.data;
}

export async function staffClinicTreatmentDayComplete(branchId: string, treatmentDayId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/treatment-day/${treatmentDayId}/complete`,
    {}
  );
  return res?.data;
}

export async function staffClinicExceptionOverrideRequest(
  branchId: string,
  body: { action: string; reason: string; relatedEntityType?: string; relatedEntityId?: string; evidenceUrls?: string[] }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/exception/override-request`,
    body
  );
  return res?.data;
}

export async function staffClinicExceptionOverrideApprove(branchId: string, overrideId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/exception/override/${overrideId}/approve`,
    {}
  );
  return res?.data;
}

export async function staffClinicInjectionTokenWithContext(branchId: string, tokenId: number): Promise<any> {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/injection-token/${tokenId}/context`
  );
  return res?.data;
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

export async function staffClinicVialSessionsList(
  branchId: string,
  params?: { status?: string; variantId?: number; take?: number; skip?: number }
): Promise<{ list: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.variantId != null) q.set("variantId", String(params.variantId));
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  const res = await apiGet<{ success?: boolean; data?: { list?: any[]; total?: number } | any[] }>(
    `${clinicBase(branchId)}/medicine-control/vial-sessions${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  if (d && typeof d === "object" && "list" in d && "total" in d) {
    return { list: Array.isArray(d.list) ? d.list : [], total: Number(d.total ?? 0) };
  }
  const arr = Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
  return { list: arr, total: arr.length };
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

export async function staffClinicGenerateInjectionToken(
  branchId: string,
  body: {
    visitId: number;
    variantId: number;
    expectedDose: number;
    prescriptionId?: number | null;
    orderId?: number | null;
    patientId?: number | null;
    petId?: number | null;
    unit?: string | null;
    medicineSource?: "INTERNAL" | "EXTERNAL" | "OUTSIDE";
    expiresInHours?: number;
    treatmentCourseId?: number | null;
    treatmentDayId?: number | null;
    selectedVialSessionId?: number | null;
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/injection-token`,
    body
  );
  return res?.data;
}

export async function staffClinicValidateInjectionToken(branchId: string, tokenCode: string): Promise<any> {
  const q = new URLSearchParams();
  q.set("tokenCode", tokenCode);
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/injection-token/validate?${q.toString()}`
  );
  return res?.data;
}

export async function staffClinicInjectionTokensList(
  branchId: string,
  params?: {
    status?: string;
    visitId?: number;
    patientId?: number;
    tokenCode?: string;
    fromDate?: string;
    toDate?: string;
    take?: number;
    skip?: number;
    /** Server resolves to current user id when true (operator accountability). */
    validatedByMe?: boolean;
    /** Server resolves to current user id when true (operator accountability). */
    generatedByMe?: boolean;
  }
): Promise<{ list: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.visitId != null) q.set("visitId", String(params.visitId));
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.tokenCode) q.set("tokenCode", params.tokenCode);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  if (params?.validatedByMe === true) q.set("validatedByMe", "true");
  if (params?.generatedByMe === true) q.set("generatedByMe", "true");
  const res = await apiGet<{ success?: boolean; data?: { list?: any[]; total?: number } }>(
    `${clinicBase(branchId)}/medicine-control/injection-tokens${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = res?.data ?? {};
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    total: Number(data?.total ?? 0),
  };
}

export async function staffClinicCancelInjectionToken(
  branchId: string,
  tokenId: number,
  body?: { reason?: string | null }
): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/injection-token/${tokenId}/cancel`,
    body ?? {}
  );
  return res?.data;
}

export async function staffClinicRecordDose(
  branchId: string,
  body: {
    patientId: number;
    variantId: number;
    administeredDose: number;
    visitId?: number | null;
    surgeryCaseId?: number | null;
    vialSessionId?: number | null;
    injectionTokenId?: number | null;
    medicineSource?: "INTERNAL" | "EXTERNAL" | "OUTSIDE";
    prescribedDose?: number | null;
    unit?: string | null;
    route?: string | null;
    witnessedByUserId?: number | null;
    emergencyBypass?: boolean;
    emergencyBypassReason?: string | null;
    medicineApprovalRequestId?: number | null;
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dose`,
    body
  );
  return res?.data;
}

/** GET dose history by visit (for injection room dose history drawer). */
export async function staffClinicDoseByVisit(branchId: string, visitId: number): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: { list?: any[] } }>(
    `${clinicBase(branchId)}/medicine-control/dose/visit/${visitId}`
  );
  const list = res?.data?.list;
  return Array.isArray(list) ? list : [];
}

export async function staffClinicInjectionMonitor(branchId: string, date?: string): Promise<any> {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dashboard/injection-monitor${q.toString() ? `?${q.toString()}` : ""}`
  );
  return res?.data;
}

/** GET injection room operations board: pending, unassigned (no vial), completed today, bypass, expired/problem. Optional roomId, validatedByMe, administeredByMe. */
export async function staffClinicInjectionRoomBoard(
  branchId: string,
  params?: { date?: string; roomId?: number | null; validatedByMe?: boolean; administeredByMe?: boolean }
): Promise<{
  date: string;
  pendingTokens: any[];
  unassignedTokens: any[];
  completedToday: any[];
  bypassToday: any[];
  expiredOrProblemToday: any[];
}> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.roomId != null) q.set("roomId", String(params.roomId));
  if (params?.validatedByMe === true) q.set("validatedByMe", "true");
  if (params?.administeredByMe === true) q.set("administeredByMe", "true");
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/injection-room/board${q.toString() ? `?${q.toString()}` : ""}`
  );
  const d = res?.data;
  return d ?? { date: "", pendingTokens: [], unassignedTokens: [], completedToday: [], bypassToday: [], expiredOrProblemToday: [] };
}

export async function staffClinicRunDailyReconciliation(branchId: string, date?: string): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/reconciliation/run`,
    date ? { date } : {}
  );
  return res?.data;
}

export async function staffClinicDailyReconciliations(
  branchId: string,
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
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/reconciliation${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = res?.data ?? {};
  if (data?.row) return { list: data.row ? [data.row] : [], total: data.row ? 1 : 0, row: data.row };
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    total: Number(data?.total ?? 0),
  };
}

export async function staffClinicAcknowledgeDailyReconciliation(
  branchId: string,
  reconciliationId: number,
  note?: string
): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/reconciliation/${reconciliationId}/acknowledge`,
    { note: note ?? undefined }
  );
  return res?.data;
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
export async function staffClinicVisitsList(
  branchId: string,
  params?: {
    petId?: number;
    patientId?: number;
    limit?: number;
    offset?: number;
    treatmentCode?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }
) {
  const q = new URLSearchParams();
  if (params?.petId != null) q.set("petId", String(params.petId));
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.treatmentCode) q.set("treatmentCode", params.treatmentCode);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.search) q.set("search", params.search);
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

// ========== Settlement (staff clinic) ==========
/** GET /api/v1/clinic/branches/:branchId/settlement-batches */
export async function staffClinicSettlementBatchesList(branchId: string, params?: { limit?: number; page?: number; status?: string }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: { items?: any[]; pagination?: { total: number; page: number; totalPages: number } } }>(
    `${clinicBase(branchId)}/settlement-batches${q.toString() ? `?${q}` : ""}`
  );
  const data = res?.data;
  const items = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;
  return { batches: items, total };
}

/** GET /api/v1/clinic/settlement-batches/:batchId */
export async function staffClinicSettlementBatchGet(batchId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/clinic/settlement-batches/${batchId}`);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/settlement-batches/generate */
export async function staffClinicSettlementBatchesGenerate(branchId: string, body?: { periodStart?: string; periodEnd?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/settlement-batches/generate`, body ?? {});
  return res?.data ?? null;
}

/** PUT /api/v1/clinic/settlement-batches/:batchId/review */
export async function staffClinicSettlementBatchReview(batchId: number, body: { notes?: string }) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`/api/v1/clinic/settlement-batches/${batchId}/review`, body);
  return res?.data ?? null;
}

/** PUT /api/v1/clinic/settlement-batches/:batchId/approve */
export async function staffClinicSettlementBatchApprove(batchId: number) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`/api/v1/clinic/settlement-batches/${batchId}/approve`, {});
  return res?.data ?? null;
}

/** POST /api/v1/clinic/settlement-batches/:batchId/pay */
export async function staffClinicSettlementBatchPay(batchId: number, body?: { paidAt?: string; reference?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/clinic/settlement-batches/${batchId}/pay`, body ?? {});
  return res?.data ?? null;
}

// ========== Clinic reports (analytics) ==========
export async function staffClinicReportProfitability(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/reports/profitability${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

export async function staffClinicReportSettlementSummary(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/reports/settlement-summary${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

export async function staffClinicReportDiscountAnalysis(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/reports/discount-analysis${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

export async function staffClinicReportInventoryVariance(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/reports/inventory-variance${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

export async function staffClinicReportDoctorContribution(branchId: string, params?: { dateFrom?: string; dateTo?: string }) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/reports/doctor-contribution${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? null;
}

// ========== Clinic rooms (staff) ==========
/** GET /api/v1/clinic/branches/:branchId/rooms */
export async function staffClinicRoomsList(branchId: string, params?: { summary?: boolean; roomType?: string; operationalStatus?: string }) {
  const q = new URLSearchParams();
  if (params?.summary) q.set("summary", "1");
  if (params?.roomType) q.set("roomType", params.roomType);
  if (params?.operationalStatus) q.set("operationalStatus", params.operationalStatus);
  const url = `${clinicBase(branchId)}/rooms${q.toString() ? `?${q.toString()}` : ""}`;
  const res = await apiGet<{ success?: boolean; data?: any[] | { items: any[]; summary: any } }>(url);
  const data = res?.data;
  if (data && typeof data === "object" && "items" in data && Array.isArray(data.items))
    return { items: data.items, summary: (data as { summary?: any }).summary };
  return { items: Array.isArray(data) ? data : [], summary: null };
}

/** GET /api/v1/clinic/branches/:branchId/rooms/:roomId */
export async function staffClinicRoomDetail(branchId: string, roomId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/rooms/${roomId}`);
  return res?.data ?? null;
}

/** PATCH /api/v1/clinic/branches/:branchId/rooms/:roomId (e.g. operationalStatus) */
export async function staffClinicRoomPatch(branchId: string, roomId: string | number, data: { operationalStatus?: string }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/rooms/${roomId}`, data);
  return res?.data ?? res;
}

/** GET schedule board: appointments in date range with conflicts */
export async function staffClinicScheduleBoard(
  branchId: string,
  params?: { dateFrom?: string; dateTo?: string; roomId?: number; doctorId?: number; serviceId?: number }
) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.roomId != null) q.set("roomId", String(params.roomId));
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/schedule-board${q.toString() ? `?${q.toString()}` : ""}`);
  return res?.data ?? null;
}

/** GET room schedule for a date (e.g. today) */
export async function staffClinicRoomSchedule(branchId: string, roomId: string | number, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`${clinicBase(branchId)}/rooms/${roomId}/schedule${q}`);
  return Array.isArray(res?.data) ? res.data : [];
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
