import { getApiHeaders } from "./countryContext";
import { isWarehouseHubBranch } from "@/src/lib/branchSidebarConfig";

// In browser: use same-origin so /api/* goes through Next.js rewrite and cookies are sent.
// In Node (SSR): use explicit API URL.
const base =
  typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function parseError(res: Response): Promise<never> {
  let msg = `Request failed (${res.status})`;
  let code: string | undefined;
  let unmet: string[] | undefined;
  let errors: unknown[] | undefined;
  let requiredPermissions: string[] | undefined;
  try {
    const j = await res.json();
    if (j?.message) msg = j.message;
    if (typeof j?.code === "string") code = j.code;
    if (Array.isArray(j?.unmet)) unmet = j.unmet as string[];
    if (Array.isArray(j?.errors)) errors = j.errors as unknown[];
    if (Array.isArray(j?.requiredPermissions)) requiredPermissions = j.requiredPermissions as string[];
  } catch {
    /* non-JSON body */
  }
  const err = new Error(msg) as Error & {
    status?: number;
    code?: string;
    unmet?: string[];
    errors?: unknown[];
    requiredPermissions?: string[];
  };
  err.status = res.status;
  if (code) err.code = code;
  if (unmet?.length) err.unmet = unmet;
  if (errors?.length) err.errors = errors;
  if (requiredPermissions?.length) err.requiredPermissions = requiredPermissions;
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

async function fetchTextResponse(path: string, accept = "text/csv,*/*;q=0.8"): Promise<string> {
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: accept, ...getApiHeaders() },
  });
  if (!res.ok) return parseError(res);
  return res.text();
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

export interface OwnerVaccinationCardItem {
  vaccinationId: number;
  vaccineTypeId: number | null;
  vaccineName: string | null;
  administeredAt: string | null;
  nextDueDate: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  branchName: string | null;
  status: string | null;
  dueStatus: "OVERDUE" | "UPCOMING" | null;
}

export interface OwnerVaccinationCardPet {
  id: number;
  name: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  animalTypeNameSnapshot?: string | null;
  breedNameSnapshot?: string | null;
  subBreedNameSnapshot?: string | null;
  colorNameSnapshot?: string | null;
  sizeNameSnapshot?: string | null;
  animalType?: { id: number; name: string | null } | null;
  breed?: { id: number; name: string | null } | null;
  subBreed?: { id: number; name: string | null } | null;
  color?: { id: number; name: string | null } | null;
  size?: { id: number; name: string | null } | null;
}

export interface OwnerVaccinationCardPayload {
  pet: OwnerVaccinationCardPet;
  card: {
    vaccinations: OwnerVaccinationCardItem[];
    nextDue: OwnerVaccinationCardItem[];
    overdueCount: number;
    upcomingCount: number;
  };
}

export async function ownerPetVaccinationCardGet(petId: string | number): Promise<OwnerVaccinationCardPayload | null> {
  const res = await apiGet<{ success?: boolean; data?: OwnerVaccinationCardPayload }>(
    `/api/v1/owner/me/pets/${encodeURIComponent(String(petId))}/vaccination-card`
  );
  return res?.data ?? null;
}

// ========== Common (animal types, breeds for clinic/pet forms) ==========
/** GET /api/v1/common/animal-types */
export async function getAnimalTypes(): Promise<{ id: number; name: string }[]> {
  const res = await apiGet<{ success?: boolean; types?: { id: number; name: string }[] }>("/api/v1/common/animal-types");
  return res?.types ?? [];
}

/** GET /api/v1/common/breeds/:typeId */
export async function getBreedsByAnimalType(typeId: number): Promise<{ id: number; name: string }[]> {
  const res = await apiGet<{ success?: boolean; breeds?: { id: number; name: string }[]; data?: { breeds?: { id: number; name: string }[] } }>(`/api/v1/common/breeds/${typeId}`);
  const list = res?.breeds ?? res?.data?.breeds;
  return Array.isArray(list) ? list : [];
}

/** GET /api/v1/common/animal-categories */
export async function getAnimalCategories(): Promise<{ id: number; code: string; name: string; displayOrder: number }[]> {
  const res = await apiGet<{ success?: boolean; categories?: { id: number; code: string; name: string; displayOrder: number }[] }>("/api/v1/common/animal-categories");
  return res?.categories ?? [];
}

/** GET /api/v1/common/breeds/:breedId/sub-breeds */
export async function getSubBreedsByBreed(breedId: number): Promise<{ id: number; code: string; name: string }[]> {
  const res = await apiGet<{ success?: boolean; subBreeds?: { id: number; code: string; name: string }[] }>(`/api/v1/common/breeds/${breedId}/sub-breeds`);
  return res?.subBreeds ?? [];
}

/** GET /api/v1/common/animal-colors */
export async function getAnimalColors(): Promise<{ id: number; code: string; name: string }[]> {
  const res = await apiGet<{ success?: boolean; colors?: { id: number; code: string; name: string }[] }>("/api/v1/common/animal-colors");
  return res?.colors ?? [];
}

/** GET /api/v1/common/coat-patterns */
export async function getCoatPatterns(): Promise<{ id: number; code: string; name: string }[]> {
  const res = await apiGet<{ success?: boolean; patterns?: { id: number; code: string; name: string }[] }>("/api/v1/common/coat-patterns");
  return res?.patterns ?? [];
}

/** GET /api/v1/common/animal-sizes */
export async function getAnimalSizes(): Promise<{ id: number; code: string; name: string }[]> {
  const res = await apiGet<{ success?: boolean; sizes?: { id: number; code: string; name: string }[] }>("/api/v1/common/animal-sizes");
  return res?.sizes ?? [];
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
      vendorReceivePendingCount: 0,
    };

    const orgIdForGrn = rawBranch?.orgId != null ? Number(rawBranch.orgId) : null;
    const canSeeVendorReceiveQueue = ["purchase.receive", "grn.post", "grn.create", "inbound.grn"].some((p) =>
      (myAccess.permissions ?? []).includes(p)
    );
    if (orgIdForGrn && canSeeVendorReceiveQueue) {
      try {
        const pc = await grnPendingVendorReceiveCount({ orgId: orgIdForGrn, branchId: Number(id) });
        kpis.vendorReceivePendingCount = pc.awaitingConfirmation;
        kpis.vendorReceiveDraftCount = pc.draftVendorReceives;
      } catch {
        /* ignore — user may lack GRN route permission in edge cases */
      }
    }

    if (orgIdForGrn && isWarehouseHubBranch(branch)) {
      const canWhFulfillment = ["warehouse.view", "warehouse.operations", "warehouse.pick.execute", "warehouse.manage"].some((p) =>
        (myAccess.permissions ?? []).includes(p)
      );
      if (canWhFulfillment) {
        try {
          const whList = await warehouseAccessible();
          const firstWh =
            Array.isArray(whList) && whList.length ? Number((whList as { id?: number }[])[0]?.id) : NaN;
          if (Number.isFinite(firstWh) && firstWh > 0) {
            const sum = (await warehouseOperationsSummary(firstWh)) as {
              requisitionQueueCount?: number;
              warehouseRequisitionQueueCount?: number;
            };
            kpis.pendingWarehouseFulfillmentCount = Number(
              sum?.warehouseRequisitionQueueCount ?? sum?.requisitionQueueCount ?? 0
            );
          }
        } catch {
          /* optional — warehouse summary may fail if route blocked */
        }
      }
    }
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

export async function staffInventoryLocations(opts?: { orgId?: number; warehouseId?: number }) {
  const params = new URLSearchParams();
  if (opts?.orgId != null) params.set("orgId", String(opts.orgId));
  if (opts?.warehouseId != null) params.set("warehouseId", String(opts.warehouseId));
  const q = params.toString();
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/locations${q ? `?${q}` : ""}`);
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

/** GET /api/v1/inventory/shop-batches - SHOP lots with list sell snapshot (branch manager) */
export async function staffShopBatchesList(branchId: string) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  return apiGet<{
    success?: boolean;
    data?: {
      shopLocationId: number;
      orgId: number;
      items: any[];
      batchPricingEnabled: boolean;
    };
  }>(`/api/v1/inventory/shop-batches?${params}`);
}

/** GET /api/v1/inventory/shop-batches/:lotId - one SHOP lot detail for staff batch pricing */
export async function staffShopBatchDetail(branchId: string, lotId: number | string) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  return apiGet<{ success?: boolean; data?: any; message?: string }>(
    `/api/v1/inventory/shop-batches/${encodeURIComponent(String(lotId))}?${params}`
  );
}

/** PATCH /api/v1/inventory/shop-batches/:lotId - update expiry and batch sell rule (audit reason) */
export async function staffShopBatchUpdate(
  branchId: string,
  lotId: number,
  body: { expDate?: string | null; sellPrice?: number | null; reason: string; sellsAtRulePrice?: boolean }
) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  return apiPatch<{ success?: boolean; data?: any; message?: string }>(`/api/v1/inventory/shop-batches/${lotId}?${params}`, body);
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
export async function staffStockRequestsList(opts?: { branchId?: string; status?: string; requestIntent?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.branchId) params.set("branchId", opts.branchId);
  if (opts?.status) params.set("status", opts.status ?? "");
  if (opts?.requestIntent) params.set("requestIntent", opts.requestIntent);
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

export async function staffStockRequestCreate(body: {
  branchId: number;
  orgId?: number;
  requesterStaffId?: number;
  items: { productId: number; variantId: number; requestedQty: number; note?: string }[];
}) {
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

/** AI replenishment suggestions (Phase 4) */
export async function staffAiReplenishmentSuggestions(branchId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `/api/v1/ai/replenishment/suggestions?branchId=${encodeURIComponent(String(branchId))}`
  );
  return res?.data ?? [];
}

export async function staffAiAcceptReplenishmentSuggestion(id: number) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/ai/replenishment/suggestions/${id}/accept`, {});
}

export async function staffAiDismissReplenishmentSuggestion(id: number) {
  return apiPost<{ success?: boolean; message?: string }>(`/api/v1/ai/replenishment/suggestions/${id}/dismiss`, {});
}

export async function staffAiBulkDismissReplenishmentSuggestions(branchId: string | number, ids: number[]) {
  return apiPost<{ success?: boolean; data?: { dismissed?: number; errors?: string[] } }>(
    `/api/v1/ai/replenishment/suggestions/bulk-dismiss`,
    { ids }
  );
}

export async function staffAiBulkAcceptReplenishmentSuggestions(branchId: string | number, ids: number[]) {
  return apiPost<{ success?: boolean; data?: { accepted?: number; stockRequestIds?: number[]; errors?: string[] } }>(
    `/api/v1/ai/replenishment/suggestions/bulk-accept`,
    { ids }
  );
}

/** GET /api/v1/inventory/dispatches/incoming?branchId= – Incoming (IN_TRANSIT) dispatches for branch */
export async function staffGetIncomingDispatches(branchId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/inventory/dispatches/incoming?branchId=${encodeURIComponent(String(branchId))}`);
  return res?.data ?? [];
}

/** GET /api/v1/inventory/receipts/incoming-unified?branchId= – Dispatches (PACKED|IN_TRANSIT) + transfers (SENT|IN_TRANSIT) for Receive Center */
export async function staffGetIncomingInboundUnified(branchId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(
    `/api/v1/inventory/receipts/incoming-unified?branchId=${encodeURIComponent(String(branchId))}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

/** GET /api/v1/inventory/receipts/pending-po-receipts?branchId= – Approved/partially-received POs awaiting vendor GRN receipt */
export async function staffGetPendingPoReceipts(branchId: string | number): Promise<any[]> {
  try {
    const res = await apiGet<{ success?: boolean; data?: any[] }>(
      `/api/v1/inventory/receipts/pending-po-receipts?branchId=${encodeURIComponent(String(branchId))}`
    );
    return Array.isArray(res?.data) ? res.data : [];
  } catch {
    return [];
  }
}

/** Aggregated operational queues (confirmations, discrepancies, draft GRNs, blocked POS) — GET /api/v1/inventory/operations/exception-summary */
export type OperationsExceptionSummary = {
  pendingConfirmations: { vendorReceiveSessions: number; dispatchReceiveSessions: number };
  discrepancies: { inboundOpen: number; dispatchPending: number };
  queues: { draftGrns: number; inTransitDispatches: number };
  blockedSales: { posOrdersPendingPayment: number };
};

export async function inventoryOperationsExceptionSummary(orgId?: number | null): Promise<OperationsExceptionSummary | null> {
  const q =
    orgId != null && Number.isFinite(Number(orgId)) && Number(orgId) > 0
      ? `?orgId=${encodeURIComponent(String(orgId))}`
      : "";
  try {
    const res = await apiGet<{ success?: boolean; data?: OperationsExceptionSummary }>(
      `/api/v1/inventory/operations/exception-summary${q}`
    );
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/** GET /api/v1/inventory/lookup/variant-by-barcode — catalog variant for receive / scanner */
export async function inventoryLookupVariantByBarcode(
  barcode: string,
  orgId?: number | null
): Promise<{
  id: number;
  sku: string;
  title: string;
  productId: number;
  barcode: string | null;
  product?: { id: number; name: string };
} | null> {
  const trimmed = String(barcode || "").trim();
  if (!trimmed) return null;
  const params = new URLSearchParams({ barcode: trimmed });
  if (orgId != null && Number.isFinite(Number(orgId)) && Number(orgId) > 0) {
    params.set("orgId", String(orgId));
  }
  try {
    const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/inventory/lookup/variant-by-barcode?${params}`);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/** GET /api/v1/inventory/dispatches/:id – Dispatch detail with items (for receive flow) */
export async function staffGetDispatch(dispatchId: number | string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/inventory/dispatches/${dispatchId}`);
  return res?.data ?? res;
}

/**
 * POST /api/v1/inventory/dispatches/:id/receive
 * - Without receiveMode: staff without confirm permission saves verification only; managers post immediately (legacy).
 * - receiveMode: `verify` | `submit` | `confirm` for controlled draft → manager confirmation → ledger post.
 */
export async function staffReceiveDispatch(
  dispatchId: number | string,
  body: {
    items?: {
      variantId: number;
      lotId?: number;
      quantityReceived?: number;
      quantityDamaged?: number;
      quantityShort?: number;
      excessQty?: number;
      reasonCode?: string;
      lineNote?: string;
      followUpNote?: string;
    }[];
    notes?: string;
    receiveMode?: "verify" | "submit" | "confirm";
  }
) {
  return apiPost<{ success?: boolean; data?: any; message?: string; receiveMode?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive`,
    body
  );
}

/** GET /api/v1/staff/branch/:branchId/inbound-queue — actionable branch inbound (dispatches + legacy transfers). */
export async function staffInboundQueue(branchId: string | number) {
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(
    `/api/v1/staff/branch/${branchId}/inbound-queue`
  );
  return res?.data?.items ?? [];
}

/** GET /api/v1/inventory/dispatches/:id/receive-session — dispatch + DispatchReceiveSession. */
export async function staffGetDispatchReceiveSession(dispatchId: number | string) {
  const res = await apiGet<{ success?: boolean; data?: { dispatch?: any; session?: any } }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive-session`
  );
  return res?.data ?? null;
}

/** PUT — save receive draft (verify). */
export async function staffPutDispatchReceiveSession(
  dispatchId: number | string,
  body: {
    items?: {
      variantId: number;
      lotId?: number;
      quantityReceived?: number;
      quantityDamaged?: number;
      quantityShort?: number;
      excessQty?: number;
      reasonCode?: string;
      lineNote?: string;
      followUpNote?: string;
    }[];
    notes?: string;
  }
) {
  return apiPut<{ success?: boolean; data?: any; receiveMode?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive-session`,
    body
  );
}

export async function staffSubmitDispatchReceiveSession(dispatchId: number | string) {
  return apiPost<{ success?: boolean; data?: any; receiveMode?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive-session/submit`,
    {}
  );
}

export async function staffConfirmDispatchReceiveSession(
  dispatchId: number | string,
  body?: {
    notes?: string;
    items?: {
      variantId: number;
      lotId?: number;
      quantityReceived?: number;
      quantityDamaged?: number;
      quantityShort?: number;
      excessQty?: number;
      reasonCode?: string;
      lineNote?: string;
      followUpNote?: string;
    }[];
  }
) {
  return apiPost<{ success?: boolean; data?: any; receiveMode?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive-session/confirm`,
    body ?? {}
  );
}

export async function staffCancelDispatchReceiveSession(dispatchId: number | string) {
  return apiPost<{ success?: boolean; data?: any }>(
    `/api/v1/inventory/dispatches/${dispatchId}/receive-session/cancel`,
    {}
  );
}

/** GET /api/v1/inventory/stock-request-products - Paginated products with variant-wise stock for New Stock Request picker */
export async function staffStockRequestProducts(
  branchId: string,
  opts?: {
    orgId?: number;
    search?: string;
    page?: number;
    limit?: number;
    sort?: "recommended" | "low_stock" | "most_used" | "name_asc";
    stockStatus?: "all" | "low" | "out";
  }
) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (opts?.orgId != null && Number.isFinite(Number(opts.orgId))) {
    params.set("orgId", String(opts.orgId));
  }
  if (opts?.search) params.set("search", opts.search);
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.stockStatus) params.set("stockStatus", opts.stockStatus);
  const res = await apiGet<{ success?: boolean; data?: StockRequestProduct[]; pagination?: StockRequestProductsPagination; meta?: StockRequestProductsMeta }>(
    `/api/v1/inventory/stock-request-products?${params}`
  );
  return {
    items: (res as any)?.data ?? [],
    pagination: (res as any)?.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 1 },
    meta: (res as any)?.meta,
  };
}

export type StockRequestProductVariant = {
  id: number;
  sku: string;
  title: string;
  barcode: string | null;
  productId: number;
  stockOnHand: number;
  centralOnHand?: number;
  availableQty?: number;
  reservedQty?: number;
  lowStockThreshold: number;
  usageMetric: number;
  batchInfo?: {
    activeLots: number;
    nearestExpiry: Date | null;
    nearExpiryQty: number;
    expiredQty: number;
  };
};

export type StockRequestProduct = {
  id: number;
  name: string;
  slug: string;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
  variants: StockRequestProductVariant[];
};

export type StockRequestProductsMeta = {
  pickerRule?: string;
  branchLocalLocationCount?: number;
  centralLocationCount?: number;
  defaultLocationCreated?: boolean;
  catalogTruncated?: boolean;
  rawProductCount?: number;
};

export type StockRequestProductsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ========== Staff Branch POS / Sales (Phase 5B) ==========
/** GET /api/v1/pos/products?branchId=&q= – products with variants, stock, and location price for POS */
export async function staffPosProducts(branchId: string, q?: string) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/pos/products?${params}`);
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

/** POST /api/v1/pos/sale – create POS sale (branchId, items, paymentMethod, discountPercent?, taxPercent?, customerId?, notes). When org POS pricing governance is on, pass retailDiscountApprovalId on a line if an over-threshold discount was pre-approved. */
export async function staffPosSale(body: {
  branchId: number;
  items: { productId: number; variantId?: number; quantity: number; price: number; retailDiscountApprovalId?: number }[];
  paymentMethod: string;
  /** Split tender (optional); when set, backend validates sum against order total. */
  paymentSplits?: { method: string; amount: number; reference?: string }[];
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

/** POST /api/v1/pos/orders/:orderId/cancel — POS-scoped cancel; requires pos.refund on order branch */
export async function staffPosCancelOrder(orderId: number, reason?: string) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/pos/orders/${orderId}/cancel`, {
    reason: reason ?? "Refund requested",
  });
}

/** GET /api/v1/pos/membership/card?branchId=&code= */
export async function staffPosMembershipLookup(branchId: string, code: string) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  params.set("code", code);
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/membership/card?${params}`);
  return res?.data ?? null;
}

/** GET /api/v1/pos/membership/resolve?branchId=&code=&customerUserId=&phone= */
export async function staffPosMembershipResolve(
  branchId: string,
  params: { code?: string; customerUserId?: number; phone?: string }
) {
  const query = new URLSearchParams();
  query.set("branchId", branchId);
  if (params.code) query.set("code", params.code);
  if (params.customerUserId != null) query.set("customerUserId", String(params.customerUserId));
  if (params.phone) query.set("phone", params.phone);
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/membership/resolve?${query}`);
  return res?.data ?? null;
}

/** GET /api/v1/pos/customers/lookup?branchId=&q= */
export async function staffPosCustomerLookup(branchId: string, q: string) {
  const params = new URLSearchParams();
  params.set("branchId", branchId);
  params.set("q", q);
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/customers/lookup?${params}`);
  return res?.data ?? null;
}

/** POST /api/v1/pos/customers/ensure */
export async function staffPosCustomerEnsure(
  branchId: number,
  body: { phone?: string; email?: string; displayName?: string }
) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/pos/customers/ensure", {
    branchId,
    ...body,
  });
}

/** --- POS server carts --- */
export async function staffPosCartsList(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any[] }>(`/api/v1/pos/carts?branchId=${branchId}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function staffPosCartCreate(branchId: number, posShiftId?: number | null) {
  return apiPost<{ success?: boolean; data?: any }>("/api/v1/pos/carts", { branchId, posShiftId: posShiftId ?? undefined });
}

export async function staffPosCartGet(branchId: string, cartId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}?branchId=${branchId}`);
  return res?.data ?? null;
}

export async function staffPosCartPatch(branchId: number, cartId: number, body: Record<string, unknown>) {
  return apiPatch<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}`, { branchId, ...body });
}

export async function staffPosCartAddLine(branchId: number, cartId: number, body: Record<string, unknown>) {
  return apiPost<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/lines`, { branchId, ...body });
}

export async function staffPosCartPatchLine(branchId: number, cartId: number, lineId: number, body: Record<string, unknown>) {
  return apiPatch<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/lines/${lineId}`, { branchId, ...body });
}

export async function staffPosCartDeleteLine(branchId: number, cartId: number, lineId: number) {
  return apiDelete<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/lines/${lineId}?branchId=${branchId}`);
}

export async function staffPosCartHold(branchId: number, cartId: number, version?: number) {
  return apiPost<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/hold`, { branchId, ...(version != null ? { version } : {}) });
}

export async function staffPosCartResume(branchId: number, cartId: number, version?: number) {
  return apiPost<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/resume`, { branchId, ...(version != null ? { version } : {}) });
}

export async function staffPosCartPreview(branchId: number, cartId: number, body: { discountPercent?: number; taxPercent?: number }) {
  return apiPost<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/preview`, { branchId, ...body });
}

export async function staffPosCartFinalize(
  branchId: number,
  cartId: number,
  body: {
    payments: { method: string; amount: number; reference?: string }[];
    discountPercent?: number;
    taxPercent?: number;
    customerId?: number;
    notes?: string;
  }
) {
  return apiPost<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}/finalize`, { branchId, ...body });
}

export async function staffPosCartAbandon(branchId: string, cartId: number) {
  return apiDelete<{ success?: boolean; data?: any }>(`/api/v1/pos/carts/${cartId}?branchId=${branchId}`);
}

/** POST /api/v1/pos/return – line-item return (branchId, orderId, items: [{ variantId, quantity, reason? }]) */
export async function staffPosReturn(body: {
  branchId: number;
  orderId: number;
  items: { variantId: number; quantity: number; reason?: string }[];
}) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/pos/return", body);
}

// ========== POS Shift Management ==========
/** GET /api/v1/pos/shift/current?branchId= – get current open shift */
export async function staffPosGetCurrentShift(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/shift/current?branchId=${branchId}`);
  return res?.data ?? null;
}

/** POST /api/v1/pos/shift/open – open new shift */
export async function staffPosOpenShift(body: { branchId: number; startingCash: number }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/pos/shift/open", body);
}

/** POST /api/v1/pos/shift/close/:id – close shift with counted cash */
export async function staffPosCloseShift(shiftId: number, body: { closingCash: number; managerOverrideReason?: string }) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>(`/api/v1/pos/shift/close/${shiftId}`, body);
}

/** GET /api/v1/pos/shift/:id/z-report – get Z-report for shift */
export async function staffPosGetZReport(shiftId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/pos/shift/${shiftId}/z-report`);
  return res?.data ?? null;
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
  const res = await apiPost<{ success?: boolean; message?: string; data?: any }>(
    `/api/v1/me/invitations/${inviteId}/accept`,
    {}
  );
  return { success: Boolean(res?.success), message: res?.message, data: res?.data };
}

/** POST /api/v1/me/invitations/:id/decline */
export async function declineMeInvitation(inviteId: number): Promise<{ success: boolean; message?: string }> {
  const res = await apiPost<{ success?: boolean; message?: string }>(`/api/v1/me/invitations/${inviteId}/decline`, {});
  return { success: Boolean(res?.success), message: res?.message };
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

/** GET /api/v1/doctor/surgeries – list surgeries where current doctor is primary or staff */
export async function doctorListSurgeries(params?: { branchId?: number; dateFrom?: string; dateTo?: string; status?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.branchId != null) q.set("branchId", String(params.branchId));
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(`/api/v1/doctor/surgeries${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [], total: 0 };
}

/** GET /api/v1/doctor/surgeries/:id */
export async function doctorGetSurgery(id: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/surgeries/${id}`);
  return res?.data ?? null;
}

/** PATCH /api/v1/doctor/surgeries/:id/notes */
export async function doctorUpdateSurgeryNotes(id: number, body: { operativeNotes?: string; postopNotes?: string; complicationNotes?: string }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`/api/v1/doctor/surgeries/${id}/notes`, body);
  return res?.data ?? null;
}

/** POST /api/v1/doctor/surgeries/:id/start */
export async function doctorSurgeryStart(id: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/surgeries/${id}/start`, {});
  return res?.data ?? null;
}

/** POST /api/v1/doctor/surgeries/:id/complete */
export async function doctorSurgeryComplete(id: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/surgeries/${id}/complete`, {});
  return res?.data ?? null;
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

export async function doctorAddVisitNote(visitId: number, body: { noteType?: string; contentJson?: Record<string, unknown> }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/notes`, body);
  return res?.data ?? null;
}

/** `tempC` is degrees Celsius (API/DB storage). Convert in UI via `@/lib/temperature`. */
export async function doctorAddVisitVital(visitId: number, body: { weightKg?: number; tempC?: number; heartRate?: number; respRate?: number; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/vitals`, body);
  return res?.data ?? null;
}

export async function doctorGetVisitBillingSummary(visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/billing-summary`);
  return res?.data ?? null;
}

export async function doctorGetCompletionEligibility(visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { eligible: boolean; unmet: string[]; canOverride: boolean; policy?: unknown; isEmergency?: boolean; isFollowUpOnly?: boolean } }>(
    `/api/v1/doctor/visits/${visitId}/completion-eligibility`
  );
  return res?.data ?? null;
}

export async function doctorCompleteVisit(visitId: number, body?: { overrideReason?: string }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/complete`, body ?? {});
  return res?.data ?? null;
}

export async function doctorCreateVisitFollowUp(
  visitId: number,
  body: { followUpDate: string; followUpNotes?: string; createAppointment?: boolean }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/follow-up`, body);
  return res?.data ?? null;
}

export async function doctorCreateVisitLabRequisition(visitId: number, body: { testsJson: any; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/lab-requisitions`, body);
  return res?.data ?? null;
}

export type MedicineCatalogSearchItem = {
  countryMedicineBrandId: number;
  source: string;
  countryId: number;
  brandName: string;
  manufacturerName: string;
  genericName: string;
  strengthDisplay: string;
  dosageForm: string;
  packageMarkDisplay: string | null;
  isActive?: boolean;
};

export type MedicineCatalogSearchResponse = {
  items: MedicineCatalogSearchItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  notice?: string;
  /** Organization’s national catalog scope (e.g. BD = Bangladesh). */
  catalogCountry?: { code: string | null; name: string | null };
};

export async function doctorMedicineCatalogSearch(
  branchId: number,
  params: { q: string; page?: number; limit?: number; genericId?: number; manufacturerId?: number; dosageFormId?: number; strength?: string }
): Promise<MedicineCatalogSearchResponse> {
  const q = new URLSearchParams();
  q.set("branchId", String(branchId));
  q.set("q", params.q);
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.genericId != null) q.set("genericId", String(params.genericId));
  if (params.manufacturerId != null) q.set("manufacturerId", String(params.manufacturerId));
  if (params.dosageFormId != null) q.set("dosageFormId", String(params.dosageFormId));
  if (params.strength) q.set("strength", params.strength);
  const res = await apiGet<{ success?: boolean; data?: MedicineCatalogSearchResponse }>(
    `/api/v1/doctor/medicine-catalog/search?${q.toString()}`
  );
  return (
    res?.data ?? {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      catalogCountry: { code: null, name: null },
    }
  );
}

export async function doctorMedicineCatalogBrand(branchId: number, brandListingId: number) {
  const q = new URLSearchParams({ branchId: String(branchId) });
  const res = await apiGet<{ success?: boolean; data?: Record<string, unknown> }>(
    `/api/v1/doctor/medicine-catalog/brands/${brandListingId}?${q}`
  );
  return res?.data ?? null;
}

export type PrescriptionLineInput = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number;
  instructions?: string;
  productVariantId?: number;
  clinicalItemVariantId?: number;
  countryMedicineBrandId?: number | null;
};

export async function doctorCreateVisitPrescription(visitId: number, body: { notes?: string; items: PrescriptionLineInput[] }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/prescriptions`, body);
  return res?.data ?? null;
}

export async function doctorFinalizePrescription(prescriptionId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/prescriptions/${prescriptionId}/finalize`, {});
  return res?.data ?? null;
}

export async function doctorUpdatePrescription(
  prescriptionId: number,
  body: { notes?: string; items?: PrescriptionLineInput[] }
) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`/api/v1/doctor/prescriptions/${prescriptionId}`, body);
  return res?.data ?? null;
}

export async function doctorAddVisitAttachment(
  visitId: number,
  body: { fileUrl: string; fileName?: string; fileType?: string; note?: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/doctor/visits/${visitId}/attachments`, body);
  return res?.data ?? null;
}

export async function doctorGetProductivity(params?: { date?: string }) {
  const q = params?.date ? `?date=${encodeURIComponent(params.date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/doctor/productivity${q}`);
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

export async function doctorPostMyServicesAcknowledge(branchId: number, body: { serviceId: number; species?: string | null }) {
  const res = await apiPost<{ success?: boolean; data?: any[] }>(`/api/v1/doctor/clinics/${branchId}/my-services/acknowledge`, body);
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
    return raw.map((d: any) => ({
      id: Number(d.id),
      displayName:
        d.displayName ??
        d.name ??
        d.user?.profile?.displayName ??
        (Number.isFinite(Number(d.id)) ? `Doctor #${d.id}` : "Doctor"),
    }));
  } catch {
    return [];
  }
}

/** GET /api/v1/clinic/branches/:branchId/doctors-enriched – enriched doctor list for surgeries */
export async function staffClinicDoctorsEnriched(
  branchId: string,
  opts?: { limit?: number }
): Promise<{ items: any[] }> {
  try {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    const res = await apiGet<{ success?: boolean; data?: any }>(
      `${clinicBase(branchId)}/doctors-enriched?${params}`
    );
    const data = res?.data ?? {};
    return { items: Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [] };
  } catch {
    return { items: [] };
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

export type StaffClinicApprovalListParams = {
  status?: string;
  requestType?: string;
  requestTypes?: string;
  doctorQueue?: boolean;
  requestedByUserId?: number;
  memberId?: number;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

function normalizeClinicApprovalListPayload(data: unknown): { items: any[]; total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    const items = (data as { items: any[] }).items;
    const total = Number((data as { total?: unknown }).total);
    return { items, total: Number.isFinite(total) ? total : items.length };
  }
  return { items: [], total: 0 };
}

/** GET /api/v1/clinic/branches/:branchId/approval-requests — returns `{ items, total }`. */
export async function staffClinicApprovalRequestsList(
  branchId: string,
  params?: StaffClinicApprovalListParams
): Promise<{ items: any[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.requestType) q.set("requestType", params.requestType);
  if (params?.requestTypes) q.set("requestTypes", params.requestTypes);
  if (params?.doctorQueue) q.set("doctorQueue", "1");
  if (params?.requestedByUserId != null) q.set("requestedByUserId", String(params.requestedByUserId));
  if (params?.memberId != null) q.set("memberId", String(params.memberId));
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.q?.trim()) q.set("q", params.q.trim());
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: unknown }>(
    `${clinicBase(branchId)}/approval-requests${q.toString() ? `?${q}` : ""}`
  );
  return normalizeClinicApprovalListPayload(res?.data);
}

/** GET /api/v1/clinic/branches/:branchId/approval-requests/summary */
export async function staffClinicApprovalRequestsSummary(
  branchId: string,
  params?: { doctorQueue?: boolean }
): Promise<{
  totalPending: number;
  highPriority: number;
  slaBreached: number;
  approvedToday: number;
  rejectedToday: number;
} | null> {
  const q = new URLSearchParams();
  if (params?.doctorQueue) q.set("doctorQueue", "1");
  const suffix = q.toString() ? `?${q}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/approval-requests/summary${suffix}`
  );
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/approval-requests/:requestId */
export async function staffClinicApprovalRequestById(branchId: string, requestId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/approval-requests/${requestId}`
  );
  return res?.data ?? null;
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
  /** Backend filters DoctorAuditLog.action with startsWith (e.g. SERVICE_MAPPING). */
  actionPrefix?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function staffDoctorsAuditLogs(branchId: string, params?: StaffDoctorsAuditLogsParams) {
  const q = new URLSearchParams();
  if (params?.memberId != null) q.set("memberId", String(params.memberId));
  if (params?.action) q.set("action", params.action);
  if (params?.actionPrefix) q.set("actionPrefix", params.actionPrefix);
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

/** Enterprise doctor–service assignment: directory summary (doctor list + counts). */
export async function staffDoctorsServiceAssignmentSummary(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/service-assignment/summary`
  );
  return res?.data ?? { doctors: [], totalDoctors: 0, totalActiveServices: 0 };
}

/** Per-doctor assignment workspace payload (categories, allowed roles, fees). */
export async function staffDoctorsServiceAssignmentDetail(branchId: string, memberId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/${memberId}/service-assignment`
  );
  return res?.data ?? null;
}

export async function staffDoctorsPatchServiceAssignmentBulk(
  branchId: string,
  memberId: number,
  body: { ops: Array<{ op: "upsert" | "delete"; serviceId: number; role?: string; isAllowed?: boolean }> }
) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/${memberId}/service-assignment/bulk`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorsServiceAssignmentTemplates(branchId: string, params?: { memberId?: number }) {
  const q = new URLSearchParams();
  if (params?.memberId != null) q.set("memberId", String(params.memberId));
  const suffix = q.toString() ? `?${q}` : "";
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(
    `${clinicBase(branchId)}/doctors/service-assignment/templates${suffix}`
  );
  return Array.isArray(res?.data?.items) ? res.data.items : [];
}

export async function staffDoctorsPostServiceAssignmentTemplate(branchId: string, body: Record<string, unknown>) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/service-assignment/templates`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorsPatchServiceAssignmentTemplate(
  branchId: string,
  templateId: number,
  body: Record<string, unknown>
) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/service-assignment/templates/${templateId}`,
    body
  );
  return res?.data ?? res;
}

export async function staffDoctorsDeleteServiceAssignmentTemplate(branchId: string, templateId: number) {
  await apiDelete(`${clinicBase(branchId)}/doctors/service-assignment/templates/${templateId}`);
}

export async function staffDoctorsApplyServiceAssignmentTemplate(
  branchId: string,
  templateId: number,
  body: { memberId: number; mode?: "merge" | "replace" }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/doctors/service-assignment/templates/${templateId}/apply`,
    body
  );
  return res?.data ?? res;
}

export async function staffClinicServicePricingMatrix(branchId: string, params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/service-pricing/matrix${suffix}`);
  return res?.data ?? { services: [], doctors: [], feeRows: [], mappings: [] };
}

export async function staffClinicPatchServicePricing(branchId: string, serviceId: number, body: Record<string, unknown>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/services/${serviceId}/pricing`, body);
  return res?.data ?? res;
}

export async function staffClinicGetServicePricingHistory(
  branchId: string,
  serviceId: number,
  params?: { limit?: number }
): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(
    `${clinicBase(branchId)}/services/${serviceId}/pricing-history${suffix}`
  );
  const items = res?.data?.items;
  return Array.isArray(items) ? items : [];
}

export async function staffClinicGetDoctorFeeHistory(
  branchId: string,
  memberId: number,
  params?: { limit?: number }
): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(
    `${clinicBase(branchId)}/doctors/${memberId}/fee-history${suffix}`
  );
  const items = res?.data?.items;
  return Array.isArray(items) ? items : [];
}

export async function staffClinicPutService(branchId: string, serviceId: number, body: Record<string, unknown>) {
  const res = await apiPut<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/services/${serviceId}`, body);
  return res?.data ?? res;
}

export async function staffClinicListServiceMedia(branchId: string, serviceId: number) {
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(`${clinicBase(branchId)}/services/${serviceId}/media`);
  return res?.data?.items ?? [];
}

export async function staffClinicPutServiceMedia(
  branchId: string,
  serviceId: number,
  items: Array<{ mediaId: number; kind?: string; sortOrder?: number }>
) {
  const res = await apiPut<{ success?: boolean; data?: { items?: any[] } }>(`${clinicBase(branchId)}/services/${serviceId}/media`, { items });
  return res?.data?.items ?? [];
}

/** Full service row from branch services list (includes pricing/content fields when API returns them). */
export async function staffClinicGetServiceById(branchId: string, serviceId: number): Promise<any | null> {
  const res = await apiGet<{ success?: boolean; data?: { items?: any[] } }>(`${clinicBase(branchId)}/services`);
  const items = res?.data?.items ?? [];
  return items.find((s: any) => Number(s.id) === serviceId) ?? null;
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

export async function staffClinicCatalogItemById(branchId: string, itemId: string | number) {
  try {
    const res = await apiGet<{ success?: boolean; data?: any }>(
      `${clinicBase(branchId)}/catalog/items/${encodeURIComponent(String(itemId))}`
    );
    return res?.data ?? null;
  } catch {
    return null;
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

/** Owner lookup by phone or email (clinic patients). */
export async function staffClinicFindOwner(branchId: string, q: string): Promise<{ id: number; profile?: { displayName?: string; username?: string }; auth?: { email?: string | null; phone?: string | null } } | null> {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/owner-lookup?q=${encodeURIComponent(q)}`);
  return res?.data ?? null;
}

/** Ensure owner exists by phone and/or email; create minimal User + OwnerProfile if needed. At least one of phone or email is required. */
export async function staffClinicEnsureOwner(branchId: string, body: { phone?: string; email?: string; displayName?: string }): Promise<{ id: number; profile?: { displayName?: string; username?: string }; auth?: { email?: string | null; phone?: string | null } }> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/ensure-owner`, body);
  if (!res?.data) throw new Error("Ensure owner failed");
  return res.data;
}

/** Register patient (pet) for clinic; canonical Pet with userId. Same endpoint as staffClinicPatientRegister below; prefer staffClinicPatientRegister in app code. */
export async function staffClinicRegisterPatient(
  branchId: string,
  body: {
    userId: number;
    name: string;
    animalTypeId: number;
    breedId?: number;
    sex?: string;
    dateOfBirth?: string;
    microchipNumber?: string;
    allergies?: any;
    bloodType?: string;
    notes?: string;
    isRescue?: boolean;
    isNeutered?: boolean;
    foodHabits?: string;
    healthDisorders?: string;
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients`, body);
  return res?.data;
}

/** Link pet to another owner (reassign Pet.userId). */
export async function staffClinicLinkOwner(branchId: string, petId: number, userId: number): Promise<any> {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/${petId}/link-owner`, { userId });
  return res?.data;
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
  params?: { status?: string; requestType?: string; transactionType?: string; take?: number; skip?: number }
): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.requestType) q.set("requestType", params.requestType);
  if (params?.transactionType) q.set("transactionType", params.transactionType);
  if (params?.take != null) q.set("take", String(params.take));
  if (params?.skip != null) q.set("skip", String(params.skip));
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-requests${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  return Array.isArray(d) ? d : (d?.list ?? d?.items ?? []);
}

/** Create dispense request (optional prescriptionId, transactionType; items may include clinicalItemVariantId). */
export async function staffClinicDispenseRequestCreate(
  branchId: string,
  body: {
    visitId?: number | null;
    prescriptionId?: number | null;
    transactionType?: string | null;
    requestType?: string | null;
    requestReason?: string | null;
    patientId?: number | null;
    items: { variantId: number; clinicalItemVariantId?: number | null; requestedQty: number; unit?: string | null; reason?: string | null }[];
  }
): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-request`,
    body
  );
  return res?.data;
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

/** Mark dispense request as received (injection room / pharmacy handoff). Only for ISSUED or PARTIALLY_ISSUED. */
export async function staffClinicReceiveDispenseRequest(branchId: string, requestId: number): Promise<any> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/dispense-request/${requestId}/receive`,
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
  const res = await apiGet<{ success?: boolean; data?: { list?: any[]; total?: number; items?: any[] } | any[] }>(
    `${clinicBase(branchId)}/medicine-control/vial-sessions${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  if (d && typeof d === "object" && !Array.isArray(d) && "list" in d && "total" in d) {
    const obj = d as { list?: any[]; total?: number };
    return { list: Array.isArray(obj.list) ? obj.list : [], total: Number(obj.total ?? 0) };
  }
  if (Array.isArray(d)) {
    return { list: d, total: d.length };
  }
  if (d && typeof d === "object") {
    const obj = d as { list?: any[]; items?: any[] };
    const arr = Array.isArray(obj.list) ? obj.list : Array.isArray(obj.items) ? obj.items : [];
    return { list: arr, total: arr.length };
  }
  return { list: [], total: 0 };
}

export async function staffClinicAuditBinsList(branchId: string): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] | { items?: any[] } }>(
    `${clinicBase(branchId)}/medicine-control/audit-bins`
  );
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && Array.isArray((d as { items?: any[] }).items)) {
    return (d as { items: any[] }).items;
  }
  return [];
}

export async function staffClinicMedicinePoliciesList(branchId: string): Promise<any[]> {
  const res = await apiGet<{ success?: boolean; data?: any[] | { list?: any[]; items?: any[] } }>(
    `${clinicBase(branchId)}/medicine-control/policies`
  );
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    const o = d as { list?: any[]; items?: any[] };
    if (Array.isArray(o.list)) return o.list;
    if (Array.isArray(o.items)) return o.items;
  }
  return [];
}

export async function staffClinicGenerateInjectionToken(
  branchId: string,
  body: {
    visitId?: number;
    /** Legacy single medicine; omit when medicationLines is set. */
    variantId?: number;
    expectedDose?: number;
    medicationLines?: Array<{
      medicineSource: string;
      variantId?: number | null;
      manualMedicineName?: string | null;
      manualStrength?: string | null;
      manualBatch?: string | null;
      manualManufacturer?: string | null;
      route: string;
      expectedDose: number;
      unit?: string | null;
      durationText?: string | null;
      frequencyText?: string | null;
      longevityNote?: string | null;
      lineNote?: string | null;
      selectedVialSessionId?: number | null;
      medicineFeeSnapshot?: number | null;
      billingUnitPrice?: number | null;
    }>;
    prescriptionId?: number | null;
    orderId?: number | null;
    patientId?: number | null;
    petId?: number | null;
    unit?: string | null;
    medicineSource?: "INTERNAL_CLINIC" | "CLINIC_PROVIDED_MEDICINE" | "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" | string;
    encounterKind?: "INTERNAL_VISIT" | "EXTERNAL_WALK_IN";
    externalPrescriberName?: string | null;
    externalPrescriberClinic?: string | null;
    externalRxNotes?: string | null;
    externalRxEvidenceUrl?: string | null;
    serviceChargeAmount?: number | null;
    medicineChargeAmount?: number | null;
    consumablesChargeAmount?: number | null;
    expiresInHours?: number;
    treatmentCourseId?: number | null;
    treatmentDayId?: number | null;
    selectedVialSessionId?: number | null;
    /** Creates Order + OrderItem rows (and optional paid status) before token generation. */
    billingCheckout?: {
      walkIn?: { patientId: number; petId: number; doctorBranchMemberId?: number | null };
      injectionServiceId?: number | null;
      servicePrice?: number | null;
      medicineVariantId?: number | null;
      medicineQuantity?: number | null;
      medicineUnitPrice?: number | null;
      medicineLineBillings?: Array<{ variantId: number; quantity?: number; unitPrice: number }> | null;
      consumablesServiceId?: number | null;
      consumablesPrice?: number | null;
      paymentMethod?: string | null;
      markPaid: boolean;
      notes?: string | null;
    } | null;
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
    medicineSource?: string;
    encounterKind?: "INTERNAL_VISIT" | "EXTERNAL_WALK_IN";
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
  if (params?.medicineSource) q.set("medicineSource", params.medicineSource);
  if (params?.encounterKind) q.set("encounterKind", params.encounterKind);
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
    medicineSource?: "INTERNAL_CLINIC" | "CLINIC_PROVIDED_MEDICINE" | "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT" | string;
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

/** Handover summary: active vials, pending tokens, expired vials in window. */
export async function staffClinicHandoverSummary(
  branchId: string,
  params?: { expiredWithinHours?: number }
): Promise<{
  activeVialSessions: Array<{ id: number; variantId: number; variantTitle: string; remainingQty: number; validUntil: string | null }>;
  pendingTokenCount: number;
  pendingTokens: Array<{ id: number; tokenCode: string; variantTitle: string; expectedDose: number }>;
  expiredVialsInWindow: Array<{ id: number; variantTitle: string; validUntil: string }>;
}> {
  const q = new URLSearchParams();
  if (params?.expiredWithinHours != null) q.set("expiredWithinHours", String(params.expiredWithinHours));
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/handover-summary${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data ?? {};
  return {
    activeVialSessions: Array.isArray(d.activeVialSessions) ? d.activeVialSessions : [],
    pendingTokenCount: Number(d.pendingTokenCount ?? 0),
    pendingTokens: Array.isArray(d.pendingTokens) ? d.pendingTokens : [],
    expiredVialsInWindow: Array.isArray(d.expiredVialsInWindow) ? d.expiredVialsInWindow : [],
  };
}

/** EOD status: canClose, blockers, counts. */
export async function staffClinicEodStatus(
  branchId: string,
  date?: string
): Promise<{
  date: string;
  canClose: boolean;
  blockers: string[];
  pendingTokenCount: number;
  activeVialSessionCount: number;
  reconciliationDone: boolean;
  reconciliationAcknowledged: boolean;
  reconciliationHasMismatch: boolean;
}> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/eod-status${q}`
  );
  const d = res?.data ?? {};
  return {
    date: d.date ?? "",
    canClose: Boolean(d.canClose),
    blockers: Array.isArray(d.blockers) ? d.blockers : [],
    pendingTokenCount: Number(d.pendingTokenCount ?? 0),
    activeVialSessionCount: Number(d.activeVialSessionCount ?? 0),
    reconciliationDone: Boolean(d.reconciliationDone),
    reconciliationAcknowledged: Boolean(d.reconciliationAcknowledged),
    reconciliationHasMismatch: Boolean(d.reconciliationHasMismatch),
  };
}

/** EOD close: validates blockers then closes day. */
export async function staffClinicEodClose(
  branchId: string,
  body?: { date?: string; notes?: string }
): Promise<{ closed: boolean; date: string; closedAt?: string; closedByUserId?: number }> {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/eod-close`,
    body ?? {}
  );
  const d = res?.data ?? {};
  return {
    closed: Boolean(d.closed),
    date: d.date ?? "",
    closedAt: d.closedAt,
    closedByUserId: d.closedByUserId,
  };
}

export async function staffClinicDayClose(
  branchId: string,
  date?: string
): Promise<{ closeDate?: string; closedAt?: string; closedByUserId?: number; closedBy?: { profile?: { displayName?: string } } } | null> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/medicine-control/day-close${q}`
  );
  const d = res?.data ?? {};
  if (!d.closeDate && !d.closedAt) return null;
  return d;
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

/** POST /enqueue — explicit CHECKED_IN → IN_QUEUE transition (adds to queue without immediately calling) */
export async function staffClinicAppointmentEnqueue(branchId: string, appointmentId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/appointments/${appointmentId}/enqueue`, {});
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
export async function staffClinicPatientsList(
  branchId: string,
  params?: { limit?: number; offset?: number; search?: string; ownerId?: number; animalTypeId?: number }
) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.search) q.set("search", params.search);
  if (params?.ownerId != null) q.set("ownerId", String(params.ownerId));
  if (params?.animalTypeId != null) q.set("animalTypeId", String(params.animalTypeId));
  const res = await apiGet<{ success?: boolean; data?: { patients: any[]; total: number } }>(`${clinicBase(branchId)}/patients${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { patients: [], total: 0 };
}

export async function staffClinicPatientGet(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/${petId}`);
  return res?.data ?? null;
}

/**
 * Staff patient workspace aggregate (GET .../patients/:petId/clinical-overview).
 * `petId` is `Pet.id` — same numeric id as Next segment `[patientId]` under staff clinic patients.
 */
export async function staffClinicPatientClinicalOverview(branchId: string, petId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients/${petId}/clinical-overview`);
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

/** Register patient (POST /patients). Prefer this over staffClinicRegisterPatient; both call the same endpoint. */
export async function staffClinicPatientRegister(branchId: string, body: {
  userId: number; name: string; animalTypeId: number;
  breedId?: number; subBreedId?: number; colorId?: number; coatPatternId?: number; sizeId?: number;
  customBreedText?: string; customColorText?: string;
  sex?: string; dateOfBirth?: string; microchipNumber?: string; allergies?: string[]; bloodType?: string; notes?: string;
}) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/patients`, body);
  return res?.data ?? null;
}

export async function staffClinicPatientUpdate(branchId: string, petId: number, body: Partial<{
  name: string; breedId: number | null; subBreedId: number | null; colorId: number | null; coatPatternId: number | null; sizeId: number | null;
  customBreedText: string | null; customColorText: string | null;
  sex: string; dateOfBirth: string | null; microchipNumber: string | null; allergies: string[]; bloodType: string | null; healthCardJson: any; notes: string | null; qrCodeUrl: string | null;
}>) {
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
    /** Degrees Celsius (storage). */
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
    status?: string | string[];
    doctorId?: number;
    appointmentId?: number;
    hasAppointment?: boolean;
    sortField?: string;
    sortDir?: "asc" | "desc";
    includeSignals?: boolean;
    unpaidOnly?: boolean;
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
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.appointmentId != null) q.set("appointmentId", String(params.appointmentId));
  if (params?.hasAppointment === true) q.set("hasAppointment", "true");
  if (params?.hasAppointment === false) q.set("hasAppointment", "false");
  if (params?.sortField) q.set("sortField", params.sortField);
  if (params?.sortDir) q.set("sortDir", params.sortDir);
  if (params?.includeSignals === false) q.set("includeSignals", "false");
  if (params?.unpaidOnly) q.set("unpaidOnly", "true");
  const st = params?.status;
  if (st != null) {
    const list = Array.isArray(st) ? st : [st];
    list.filter(Boolean).forEach((s) => q.append("status", String(s)));
  }
  const res = await apiGet<{ success?: boolean; data?: { visits: any[]; total: number } }>(`${clinicBase(branchId)}/visits${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { visits: [], total: 0 };
}

export async function staffClinicVisitsSummary(
  branchId: string,
  params?: { fromDate?: string; toDate?: string }
): Promise<{
  byStatus: Record<string, number>;
  openPipelineCount: number;
  completedInDateRange: number;
  visitsInDateRange: number;
  visitsWithUnpaidOrders: number;
}> {
  const q = new URLSearchParams();
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/summary${q.toString() ? `?${q}` : ""}`);
  return (
    res?.data ?? {
      byStatus: {},
      openPipelineCount: 0,
      completedInDateRange: 0,
      visitsInDateRange: 0,
      visitsWithUnpaidOrders: 0,
    }
  );
}

/** CSV text; caller should download as file. Uses same filters as list (except pagination uses export limit on server). */
export async function staffClinicVisitsExportCsv(
  branchId: string,
  params?: Parameters<typeof staffClinicVisitsList>[1] & { limit?: number }
): Promise<string> {
  const q = new URLSearchParams();
  if (params?.petId != null) q.set("petId", String(params.petId));
  if (params?.patientId != null) q.set("patientId", String(params.patientId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.treatmentCode) q.set("treatmentCode", params.treatmentCode);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.search) q.set("search", params.search);
  if (params?.doctorId != null) q.set("doctorId", String(params.doctorId));
  if (params?.appointmentId != null) q.set("appointmentId", String(params.appointmentId));
  if (params?.hasAppointment === true) q.set("hasAppointment", "true");
  if (params?.hasAppointment === false) q.set("hasAppointment", "false");
  if (params?.sortField) q.set("sortField", params.sortField);
  if (params?.sortDir) q.set("sortDir", params.sortDir);
  if (params?.unpaidOnly) q.set("unpaidOnly", "true");
  const st = params?.status;
  if (st != null) {
    const list = Array.isArray(st) ? st : [st];
    list.filter(Boolean).forEach((s) => q.append("status", String(s)));
  }
  return fetchTextResponse(`${clinicBase(branchId)}/visits/export${q.toString() ? `?${q}` : ""}`);
}

export async function staffClinicVisitCompletionEligibility(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/completion-eligibility`);
  return res?.data ?? null;
}

export async function staffClinicVisitComplete(branchId: string, visitId: number, body?: { overrideReason?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/complete`, body ?? {});
  return res?.data ?? null;
}

export async function staffClinicVisitQueueEvents(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { tickets: any[]; events: any[] } }>(
    `${clinicBase(branchId)}/visits/${visitId}/queue-events`
  );
  return res?.data ?? { tickets: [], events: [] };
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

/** `tempC` is degrees Celsius (API/DB storage). Convert in UI via `@/lib/temperature`. */
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

// ========== Prescriptions (staff/clinic: read + print + QR verify + billing order lines only; authoring is doctor API) ==========
export async function staffClinicPrescriptionsByVisit(branchId: string, visitId: number) {
  const res = await apiGet<{ success?: boolean; data?: { prescriptions: any[] } }>(`${clinicBase(branchId)}/visits/${visitId}/prescriptions`);
  return res?.data?.prescriptions ?? [];
}

export async function staffClinicPrescriptionGet(branchId: string, prescriptionId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}`);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionByQr(branchId: string, qrToken: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/prescriptions/verify/${encodeURIComponent(qrToken)}`);
  return res?.data ?? null;
}

export async function staffClinicMedicineSearch(branchId: string, query: string, limit?: number) {
  const q = new URLSearchParams({ q: query });
  if (limit != null) q.set("limit", String(limit));
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/medicine-search?${q}`);
  return res?.data?.items ?? [];
}

export async function staffClinicMedicineCatalogSearch(
  branchId: string,
  params: { q: string; page?: number; limit?: number; genericId?: number; manufacturerId?: number; dosageFormId?: number; strength?: string }
): Promise<MedicineCatalogSearchResponse> {
  const q = new URLSearchParams();
  q.set("q", params.q);
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.genericId != null) q.set("genericId", String(params.genericId));
  if (params.manufacturerId != null) q.set("manufacturerId", String(params.manufacturerId));
  if (params.dosageFormId != null) q.set("dosageFormId", String(params.dosageFormId));
  if (params.strength) q.set("strength", params.strength);
  const res = await apiGet<{ success?: boolean; data?: MedicineCatalogSearchResponse }>(
    `${clinicBase(branchId)}/medicine-catalog/search?${q}`
  );
  return (
    res?.data ?? {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      catalogCountry: { code: null, name: null },
    }
  );
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

export type VisitInvoiceItem =
  | { productId: number; variantId?: number; quantity: number; price: number }
  | { serviceId: number; quantity: number; price: number };

export async function staffClinicCreateInvoice(
  branchId: string,
  visitId: number,
  body: { customerId: number; items: VisitInvoiceItem[]; paymentMethod?: string; notes?: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/visits/${visitId}/create-invoice`, body);
  return res?.data ?? null;
}

export async function staffClinicPrescriptionOrderLines(branchId: string, prescriptionId: number) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/prescriptions/${prescriptionId}/order-lines`);
  return res?.data?.items ?? [];
}

// ========== Vaccinations ==========
export async function staffClinicVaccinationDashboard(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vaccinations/dashboard`);
  return res?.data ?? { summary: {}, recentRecords: [] };
}

export async function staffClinicVaccinationReminders(
  branchId: string,
  params?: { status?: string; from?: string; to?: string; overdueOnly?: boolean; petId?: number }
) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", String(params.status));
  if (params?.from) q.set("from", String(params.from));
  if (params?.to) q.set("to", String(params.to));
  if (params?.overdueOnly) q.set("overdueOnly", "true");
  if (params?.petId != null) q.set("petId", String(params.petId));
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/vaccinations/reminders${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? { branchId: Number(branchId), orgId: null, items: [] };
}

export async function staffClinicVaccineTypes(branchId: string, params?: { search?: string; q?: string; limit?: number }) {
  const q = new URLSearchParams();
  const search = params?.search ?? params?.q;
  if (search) q.set("search", search);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/vaccine-types${q.toString() ? `?${q}` : ""}`);
  return res?.data?.items ?? [];
}

export async function staffClinicVaccineTypesList(branchId: string, params?: { search?: string; q?: string; limit?: number }) {
  return staffClinicVaccineTypes(branchId, params);
}

export async function staffClinicVaccineInventoryMappings(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { items?: any[]; branchId?: number; orgId?: number } }>(
    `${clinicBase(branchId)}/vaccine-inventory-mappings`
  );
  return res?.data ?? { items: [], branchId: Number(branchId), orgId: null };
}

export async function staffClinicUpsertVaccineInventoryMapping(
  branchId: string,
  vaccineTypeId: number,
  body: {
    clinicalItemId: number;
    clinicalItemVariantId?: number | null;
    isActive?: boolean;
    notes?: string | null;
  }
) {
  const res = await apiPut<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/vaccine-inventory-mappings/${vaccineTypeId}`,
    body
  );
  return res?.data ?? null;
}

export async function staffClinicVaccineStockCandidates(
  branchId: string,
  vaccineTypeId: number,
  params?: { includeExpired?: boolean; includeZeroStock?: boolean; limit?: number }
) {
  const q = new URLSearchParams();
  q.set("vaccineTypeId", String(vaccineTypeId));
  if (params?.includeExpired) q.set("includeExpired", "true");
  if (params?.includeZeroStock) q.set("includeZeroStock", "true");
  if (params?.limit != null) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vaccinations/stock-candidates?${q.toString()}`);
  const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
  return {
    mapping: payload?.mapping ?? { status: "UNMAPPED", vaccineTypeId, matchStrategy: "none" },
    items: Array.isArray(payload?.items) ? payload.items : [],
    debug: payload?.debug,
  };
}

export async function staffClinicVaccinationBillingOptions(branchId: string) {
  const res = await apiGet<{ success?: boolean; data?: { services?: any[] } }>(`${clinicBase(branchId)}/vaccinations/billing-options`);
  return res?.data?.services ?? [];
}

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

export async function staffClinicAdministerVaccination(
  branchId: string,
  body: {
    petId: number;
    vaccineTypeId: number;
    batchId: number;
    idempotencyKey?: string;
    administeredAt?: string;
    nextDueDate?: string;
    notes?: string;
    createBilling?: boolean;
    visitId?: number;
    appointmentId?: number;
    serviceId?: number;
    pricingVariantId?: number;
    unitPrice?: number;
    quantity?: number;
    discountAmount?: number;
    billingNotes?: string;
  }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/vaccinations/administer`, body);
  return res?.data ?? null;
}

export async function staffClinicCorrectVaccination(
  branchId: string,
  vaccinationId: number,
  body: {
    correctionReason: string;
    administeredAt?: string;
    nextDueDate?: string | null;
    notes?: string | null;
    manufacturer?: string | null;
    batchNumber?: string | null;
  }
) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/vaccinations/${vaccinationId}/correct`,
    body
  );
  return res?.data ?? null;
}

export async function staffClinicVoidVaccination(
  branchId: string,
  vaccinationId: number,
  body: { voidReason: string }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/vaccinations/${vaccinationId}/void`,
    body
  );
  return res?.data ?? null;
}

export async function staffClinicVaccinationAudit(branchId: string, vaccinationId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(
    `${clinicBase(branchId)}/vaccinations/${vaccinationId}/audit`
  );
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
export async function staffClinicSettlementBatchesGenerate(
  branchId: string,
  body?: { periodStart?: string; periodEnd?: string; doctorProfileIds?: number[] }
) {
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
export async function staffClinicSettlementBatchPay(
  batchId: number,
  body?: {
    amount?: number;
    paymentMethod?: string;
    reference?: string;
    receiptRef?: string;
  }
) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`/api/v1/clinic/settlement-batches/${batchId}/pay`, body ?? {});
  return res?.data ?? null;
}

// ========== Enterprise Surgery Module (staff clinic) ==========
/** GET /api/v1/clinic/branches/:branchId/surgeries */
export async function staffClinicSurgeriesList(
  branchId: string,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    primaryDoctorId?: number;
    serviceId?: number;
    petId?: number;
    limit?: number;
    offset?: number;
  }
) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.status) q.set("status", params.status);
  if (params?.primaryDoctorId != null) q.set("primaryDoctorId", String(params.primaryDoctorId));
  if (params?.serviceId != null) q.set("serviceId", String(params.serviceId));
  if (params?.petId != null) q.set("petId", String(params.petId));
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const res = await apiGet<{ success?: boolean; data?: { items: any[]; total: number } }>(
    `${clinicBase(branchId)}/surgeries${q.toString() ? `?${q}` : ""}`
  );
  const data = res?.data ?? { items: [], total: 0 };
  return data;
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/:id */
export async function staffClinicSurgeryGet(branchId: string, id: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${id}`);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/surgeries */
export async function staffClinicSurgeryCreate(branchId: string, body: Record<string, unknown>) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries`, body);
  return res?.data ?? null;
}

/** PATCH /api/v1/clinic/branches/:branchId/surgeries/:id */
export async function staffClinicSurgeryUpdate(branchId: string, id: number, body: Record<string, unknown>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${id}`, body);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/status */
export async function staffClinicSurgeryStatus(branchId: string, id: number, body: { toStatus: string; reason?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${id}/status`, body);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/staff */
export async function staffClinicSurgeryAddStaff(branchId: string, id: number, body: { branchMemberId: number; role: string; feeType?: string; feeValue?: number; notes?: string }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${id}/staff`, body);
  return res?.data ?? null;
}

/** PATCH /api/v1/clinic/branches/:branchId/surgeries/:id/staff/:staffId */
export async function staffClinicSurgeryUpdateStaff(branchId: string, surgeryId: number, staffId: number, body: Record<string, unknown>) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/staff/${staffId}`, body);
  return res?.data ?? null;
}

/** DELETE /api/v1/clinic/branches/:branchId/surgeries/:id/staff/:staffId */
export async function staffClinicSurgeryRemoveStaff(branchId: string, surgeryId: number, staffId: number) {
  const res = await apiDelete<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/staff/${staffId}`);
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/:id/checklist */
export async function staffClinicSurgeryChecklistGet(branchId: string, surgeryId: number, params?: { phase?: string }) {
  const q = new URLSearchParams();
  if (params?.phase) q.set("phase", params.phase);
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/checklist${q.toString() ? `?${q}` : ""}`);
  return res?.data ?? { items: [] };
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/checklist */
export async function staffClinicSurgeryChecklistAdd(branchId: string, surgeryId: number, body: { phase: string; itemLabel: string; sortOrder?: number }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/checklist`, body);
  return res?.data ?? null;
}

/** PATCH /api/v1/clinic/branches/:branchId/surgeries/:id/checklist/:itemId */
export async function staffClinicSurgeryChecklistUpdate(branchId: string, surgeryId: number, itemId: number, body: { isCompleted?: boolean; notes?: string }) {
  const res = await apiPatch<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/checklist/${itemId}`, body);
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/room-conflict */
export async function staffClinicSurgeryRoomConflict(branchId: string, params: { roomId: number; startAt: string; endAt: string; excludeSurgeryCaseId?: number }) {
  const q = new URLSearchParams();
  q.set("roomId", String(params.roomId));
  q.set("startAt", params.startAt);
  q.set("endAt", params.endAt);
  if (params.excludeSurgeryCaseId != null) q.set("excludeSurgeryCaseId", String(params.excludeSurgeryCaseId));
  const res = await apiGet<{ success?: boolean; data?: { conflicting: any[]; total: number } }>(`${clinicBase(branchId)}/surgeries/room-conflict?${q}`);
  return res?.data ?? { conflicting: [], total: 0 };
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/:id/consumables */
export async function staffClinicSurgeryConsumablesList(branchId: string, surgeryId: number) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/consumables`);
  return res?.data ?? { items: [] };
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/consumables */
export async function staffClinicSurgeryConsumablesPlan(branchId: string, surgeryId: number, body: { items: Array<{ clinicalItemId?: number; productId?: number; quantityPlanned: number }> }) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/consumables`, body);
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/:id/billing */
export async function staffClinicSurgeryBillingGet(branchId: string, surgeryId: number) {
  const res = await apiGet<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/billing`);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/estimate */
export async function staffClinicSurgeryEstimateCreate(branchId: string, surgeryId: number, body: Record<string, unknown>) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/estimate`, body);
  return res?.data ?? null;
}

/** POST /api/v1/clinic/branches/:branchId/surgeries/:id/finalize-bill */
export async function staffClinicSurgeryFinalizeBill(branchId: string, surgeryId: number) {
  const res = await apiPost<{ success?: boolean; data?: any }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/finalize-bill`, {});
  return res?.data ?? null;
}

/** GET /api/v1/clinic/branches/:branchId/surgeries/:id/payouts */
export async function staffClinicSurgeryPayoutsList(branchId: string, surgeryId: number) {
  const res = await apiGet<{ success?: boolean; data?: { items: any[] } }>(`${clinicBase(branchId)}/surgeries/${surgeryId}/payouts`);
  return res?.data ?? { items: [] };
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

/** POST /api/v1/branch-access/request – branch or warehouse extension (same BranchAccessPermission row) */
export async function staffRequestBranchAccess(body: {
  branchId: number;
  role?: string;
  requestScope?: "BRANCH" | "WAREHOUSE";
  warehouseId?: number | null;
  requestedPermissionKeys?: string[];
}) {
  return apiPost<{ success?: boolean; data?: any; message?: string }>("/api/v1/branch-access/request", body);
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

// ========== Medicine Requisitions (Pharmacy Supply Chain) ==========

/** Only add orgId/branchId query params when they are positive integers (avoids NaN / "undefined" strings). */
function appendMedicineRequisitionScopeParams(
  q: URLSearchParams,
  params?: { orgId?: string; branchId?: string }
): void {
  if (params?.orgId != null && String(params.orgId).trim() !== "") {
    const n = Number(params.orgId);
    if (Number.isFinite(n) && n > 0) q.set("orgId", String(Math.trunc(n)));
  }
  if (params?.branchId != null && String(params.branchId).trim() !== "") {
    const n = Number(params.branchId);
    if (Number.isFinite(n) && n > 0) q.set("branchId", String(Math.trunc(n)));
  }
}

export async function medicineRequisitionList(params?: {
  branchId?: string;
  orgId?: string;
  status?: string;
  urgency?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: unknown[]; pagination: unknown }> {
  const q = new URLSearchParams();
  appendMedicineRequisitionScopeParams(q, { orgId: params?.orgId, branchId: params?.branchId });
  if (params?.status) q.set("status", params.status);
  if (params?.urgency) q.set("urgency", params.urgency);
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(`/api/v1/medicine-requisitions${q.toString() ? `?${q}` : ""}`);
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: (res as any)?.pagination ?? {} };
}

/** Owner dashboard: GET /api/v1/medicine-requisitions/summary — same tenancy scope as list. */
export async function medicineRequisitionSummary(params?: { orgId?: string; branchId?: string }): Promise<{
  total: number;
  pending: number;
  approved: number;
  dispatched: number;
} | null> {
  const q = new URLSearchParams();
  appendMedicineRequisitionScopeParams(q, params);
  const res = await apiGet<{ success?: boolean; data?: { total?: number; pending?: number; approved?: number; dispatched?: number } }>(
    `/api/v1/medicine-requisitions/summary${q.toString() ? `?${q}` : ""}`
  );
  const d = res?.data;
  if (!d || typeof d !== "object") return null;
  return {
    total: Number(d.total) || 0,
    pending: Number(d.pending) || 0,
    approved: Number(d.approved) || 0,
    dispatched: Number(d.dispatched) || 0,
  };
}

export async function medicineRequisitionById(id: number): Promise<unknown> {
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/medicine-requisitions/${id}`);
  return res?.data ?? null;
}

export async function medicineRequisitionCreate(body: {
  branchId: number;
  urgency?: string;
  note?: string;
  items: Array<{ medicineListingId: number; requestedQty: number; unit?: string; note?: string; allowSubstitute?: boolean }>;
}): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>("/api/v1/medicine-requisitions", body);
  return res?.data ?? res;
}

export async function medicineRequisitionUpdate(id: number, body: {
  items: Array<{ medicineListingId: number; requestedQty: number; unit?: string; note?: string; allowSubstitute?: boolean }>;
}): Promise<unknown> {
  const res = await apiPatch<{ success?: boolean; data?: unknown }>(`/api/v1/medicine-requisitions/${id}`, body);
  return res?.data ?? res;
}

export async function medicineRequisitionSubmit(id: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/medicine-requisitions/${id}/submit`, {});
  return res?.data ?? res;
}

export async function medicineRequisitionCancel(id: number, reason?: string): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/medicine-requisitions/${id}/cancel`, { reason });
  return res?.data ?? res;
}

export async function medicineRequisitionReceive(id: number, items: Array<{ itemId: number; receivedQty: number }>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/medicine-requisitions/${id}/receive`, { items });
  return res?.data ?? res;
}

export async function medicineSearch(params?: {
  q?: string;
  countryId?: number;
  branchId?: string | number;
  limit?: number;
}): Promise<unknown[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.countryId != null) qs.set("countryId", String(params.countryId));
  if (params?.branchId != null && params.branchId !== "") qs.set("branchId", String(params.branchId));
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/medicine-requisitions/search-medicine${qs.toString() ? `?${qs}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
}

// ========== Central Warehouse Module ==========

export async function warehouseList(orgId: number | string, opts?: { isActive?: boolean }): Promise<unknown[]> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  if (opts?.isActive !== undefined) q.set("isActive", String(opts.isActive));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/warehouse?${q}`);
  return Array.isArray(res?.data) ? res.data : [];
}

/** Warehouses the current user may access (org owner/member or warehouse staff). */
export async function warehouseAccessible(): Promise<unknown[]> {
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>("/api/v1/warehouse/accessible");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function warehouseEnsureDefault(orgId: number | string): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>("/api/v1/warehouse/ensure-default", {
    orgId: Number(orgId),
  });
  return res?.data ?? res;
}

export async function warehouseById(id: number): Promise<unknown> {
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${id}`);
  return res?.data ?? null;
}

export async function warehouseCreate(body: {
  orgId: number;
  name: string;
  code?: string;
  type?: string;
  addressJson?: unknown;
  location?: unknown;
  managerId?: number;
}): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>("/api/v1/warehouse", body);
  return res?.data ?? res;
}

export async function warehouseUpdate(id: number, body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPatch<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${id}`, body);
  return res?.data ?? res;
}

export async function warehouseDashboard(id: number): Promise<{
  totalLocations: number;
  activeStaff: number;
  pendingDispatches: number;
  inTransitDispatches: number;
  recentGrns: number;
  lowStockCount: number;
} | null> {
  const res = await apiGet<{ success?: boolean; data?: any }>(`/api/v1/warehouse/${id}/dashboard`);
  return res?.data ?? null;
}

export async function warehouseStaffList(warehouseId: number, opts?: { isActive?: boolean }): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (opts?.isActive !== undefined) q.set("isActive", String(opts.isActive));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/warehouse/${warehouseId}/staff${q.toString() ? `?${q}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function warehouseStaffOverview(
  warehouseId: number
): Promise<{ staff: unknown[]; invites: unknown[] }> {
  const res = await apiGet<{ success?: boolean; data?: { staff?: unknown[]; invites?: unknown[] } }>(
    `/api/v1/warehouse/${warehouseId}/staff/overview`
  );
  return {
    staff: Array.isArray(res?.data?.staff) ? res!.data!.staff : [],
    invites: Array.isArray(res?.data?.invites) ? res!.data!.invites : [],
  };
}

export async function warehouseStaffInvite(
  warehouseId: number,
  body: { email?: string; phone?: string; displayName?: string; role: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/staff/invite`, body);
  return res?.data ?? res;
}

export async function warehouseStaffInviteResend(warehouseId: number, inviteId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/warehouse/${warehouseId}/staff/invitations/${inviteId}/resend`,
    {}
  );
  return res?.data ?? res;
}

export async function warehouseStaffInviteReinvite(warehouseId: number, inviteId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/warehouse/${warehouseId}/staff/invitations/${inviteId}/reinvite`,
    {}
  );
  return res?.data ?? res;
}

export async function warehouseStaffInviteCancel(warehouseId: number, inviteId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(
    `/api/v1/warehouse/${warehouseId}/staff/invitations/${inviteId}/cancel`,
    {}
  );
  return res?.data ?? res;
}

export async function warehouseStaffAdd(warehouseId: number, body: { targetUserId: number; role: string }): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/staff`, body);
  return res?.data ?? res;
}

export async function warehouseStaffRemove(warehouseId: number, assignmentId: number): Promise<unknown> {
  const res = await apiDelete<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/staff/${assignmentId}`);
  return res?.data ?? res;
}

export async function warehouseLinkLocation(warehouseId: number, locationId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/locations/link`, { locationId });
  return res?.data ?? res;
}

export async function warehouseUnlinkLocation(warehouseId: number, locationId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/locations/unlink`, { locationId });
  return res?.data ?? res;
}

export async function warehouseZonesList(warehouseId: number): Promise<unknown[]> {
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/warehouse/${warehouseId}/zones`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function warehouseZoneCreate(
  warehouseId: number,
  body: { code: string; name: string; purpose?: string; sortOrder?: number; note?: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/zones`, body);
  return res?.data ?? res;
}

export async function warehouseZoneUpdate(
  warehouseId: number,
  zoneId: number,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await apiPatch<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/zones/${zoneId}`, body);
  return res?.data ?? res;
}

export async function warehouseLocationSetZone(
  warehouseId: number,
  body: { locationId: number; zoneId: number | null }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/locations/zone`, body);
  return res?.data ?? res;
}

/** Same-origin CSV download path (use with session cookie or proxy). */
export function warehouseAuditExportCsvPath(
  warehouseId: number,
  opts?: { categories?: string[]; from?: string; to?: string }
): string {
  const q = new URLSearchParams();
  if (opts?.categories?.length) q.set("categories", opts.categories.join(","));
  if (opts?.from) q.set("from", opts.from);
  if (opts?.to) q.set("to", opts.to);
  const qs = q.toString();
  return `/api/v1/warehouse/${warehouseId}/audit/export.csv${qs ? `?${qs}` : ""}`;
}

export async function qcInspectionsList(
  orgId: number,
  opts?: { warehouseId?: number; status?: string; page?: number }
): Promise<unknown> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  if (opts?.warehouseId != null) q.set("warehouseId", String(opts.warehouseId));
  if (opts?.status) q.set("status", opts.status);
  if (opts?.page != null) q.set("page", String(opts.page));
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections?${q}`);
  return res?.data ?? res;
}

export async function qcInspectionQuarantineList(
  orgId: number,
  opts?: { warehouseId?: number; page?: number }
): Promise<unknown> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  if (opts?.warehouseId != null) q.set("warehouseId", String(opts.warehouseId));
  if (opts?.page != null) q.set("page", String(opts.page));
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections/quarantine?${q}`);
  return res?.data ?? res;
}

export async function qcInspectionEscalationsList(orgId: number, opts?: { warehouseId?: number }): Promise<unknown[]> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  if (opts?.warehouseId != null) q.set("warehouseId", String(opts.warehouseId));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/qc-inspections/escalations?${q}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function qcInspectionById(id: number, orgId: number): Promise<unknown> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections/${id}?${q}`);
  return res?.data ?? null;
}

export async function qcInspectionSubmit(id: number, orgId: number, body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections/${id}/submit`, { orgId, ...body });
  return res?.data ?? res;
}

export async function qcQuarantineRelease(
  id: number,
  orgId: number,
  body: { quantity: number; targetLocationId: number }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections/${id}/quarantine/release`, {
    orgId,
    ...body,
  });
  return res?.data ?? res;
}

export async function qcQuarantineDispose(
  id: number,
  orgId: number,
  body: { quantity: number; note?: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/qc-inspections/${id}/quarantine/dispose`, {
    orgId,
    ...body,
  });
  return res?.data ?? res;
}

export async function inventoryRecallReleaseAllocation(recallId: number, orgId: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; recall?: unknown }>(`/api/v1/inventory/recalls/${recallId}/release-allocation`, {
    orgId,
  });
  return (res as any)?.recall ?? res;
}

export async function inventoryListRecalls(orgId: number, opts?: { status?: string; page?: number; limit?: number }): Promise<unknown> {
  const q = new URLSearchParams();
  q.set("orgId", String(orgId));
  if (opts?.status) q.set("status", opts.status);
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  return apiGet<unknown>(`/api/v1/inventory/recalls?${q}`);
}

export async function warehouseDispatches(warehouseId: number, opts?: { take?: number; skip?: number }): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (opts?.take != null) q.set("take", String(opts.take));
  if (opts?.skip != null) q.set("skip", String(opts.skip));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/warehouse/${warehouseId}/dispatches${q.toString() ? `?${q}` : ""}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function warehouseDeliveryAssignments(warehouseId: number, opts?: { take?: number }): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (opts?.take != null) q.set("take", String(opts.take));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/warehouse/${warehouseId}/delivery-assignments${q.toString() ? `?${q}` : ""}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function warehouseReportsSummary(warehouseId: number): Promise<unknown> {
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/reports/summary`);
  return res?.data ?? null;
}

export async function warehouseOperationsSummary(warehouseId: number): Promise<unknown> {
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/${warehouseId}/operations/summary`);
  return res?.data ?? null;
}

export async function warehouseOperationsDashboard(
  warehouseId: number,
  opts?: { page?: number; limitPerQueue?: number; q?: string; sortBy?: string; sortDir?: "asc" | "desc" }
): Promise<unknown> {
  const q = new URLSearchParams();
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limitPerQueue != null) q.set("limitPerQueue", String(opts.limitPerQueue));
  if (opts?.q) q.set("q", opts.q);
  if (opts?.sortBy) q.set("sortBy", opts.sortBy);
  if (opts?.sortDir) q.set("sortDir", opts.sortDir);
  const res = await apiGet<{ success?: boolean; data?: unknown }>(
    `/api/v1/warehouse/${warehouseId}/operations/dashboard${q.toString() ? `?${q}` : ""}`
  );
  return res?.data ?? null;
}

export async function warehouseOperationsInbound(
  warehouseId: number,
  opts?: { page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination?: Record<string, unknown> }> {
  const q = new URLSearchParams();
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: Record<string, unknown> }>(
    `/api/v1/warehouse/${warehouseId}/operations/inbound${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function warehouseOperationsRequisitions(
  warehouseId: number,
  opts?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    hasDispatch?: "true" | "false";
    urgency?: string;
  }
): Promise<{ items: unknown[]; pagination?: Record<string, unknown> }> {
  const q = new URLSearchParams();
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  if (opts?.q) q.set("q", opts.q);
  if (opts?.status) q.set("status", opts.status);
  if (opts?.branchId != null) q.set("branchId", String(opts.branchId));
  if (opts?.dateFrom) q.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) q.set("dateTo", opts.dateTo);
  if (opts?.sortBy) q.set("sortBy", opts.sortBy);
  if (opts?.sortDir) q.set("sortDir", opts.sortDir);
  if (opts?.hasDispatch) q.set("hasDispatch", opts.hasDispatch);
  if (opts?.urgency) q.set("urgency", opts.urgency);
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: Record<string, unknown> }>(
    `/api/v1/warehouse/${warehouseId}/operations/requisitions${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function warehouseOperationsOutbound(
  warehouseId: number,
  opts?: { page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination?: Record<string, unknown> }> {
  const q = new URLSearchParams();
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: Record<string, unknown> }>(
    `/api/v1/warehouse/${warehouseId}/operations/outbound${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function warehouseOperationsDiscrepancies(
  warehouseId: number,
  opts?: { page?: number; limit?: number }
): Promise<{ items: unknown[]; pagination?: Record<string, unknown> }> {
  const q = new URLSearchParams();
  if (opts?.page != null) q.set("page", String(opts.page));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: Record<string, unknown> }>(
    `/api/v1/warehouse/${warehouseId}/operations/discrepancies${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function warehouseOperationsVisibility(
  warehouseId: number,
  kind: "returns" | "recalls" | "near_expiry" | "expired" | "quarantine" | "writeoffs",
  opts?: { limit?: number }
): Promise<unknown[]> {
  const q = new URLSearchParams();
  q.set("kind", kind);
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(
    `/api/v1/warehouse/${warehouseId}/operations/visibility?${q}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

// ── Delivery Assignments ──

export async function deliveryAssign(dispatchId: number, body: { assignedToUserId: number; note?: string }): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/dispatches/${dispatchId}/assign-delivery`, body);
  return res?.data ?? res;
}

export async function deliveryMyAssignments(status?: string): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/warehouse/delivery/assignments${q.toString() ? `?${q}` : ""}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function deliveryAssignmentById(id: number): Promise<unknown> {
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/delivery/assignments/${id}`);
  return res?.data ?? null;
}

export async function deliveryStart(id: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/delivery/${id}/start`, {});
  return res?.data ?? res;
}

export async function deliveryArrive(id: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/delivery/${id}/arrive`, {});
  return res?.data ?? res;
}

export async function deliveryComplete(
  id: number,
  pod?: {
    receivedByName?: string;
    recipientPhone?: string;
    podNote?: string;
    gpsLat?: number;
    gpsLng?: number;
    signatureFileKey?: string;
    photoFileKey?: string;
  }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/delivery/${id}/complete`, pod || {});
  return res?.data ?? res;
}

// ── Purchase orders / allocation / pick (Phase 3 warehouse enterprise) ──

export async function purchaseOrdersList(params?: { orgId?: number; status?: string; page?: number; limit?: number }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/purchase-orders${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function purchaseOrderGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/purchase-orders/${id}${q}`);
  return res?.data ?? null;
}

export async function purchaseOrderCreate(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/purchase-orders`, body);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function purchaseOrderCreateFromRequest(requestId: number, body: { vendorId: number; warehouseId?: number; expectedDeliveryDate?: string; notes?: string; currency?: string }): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/purchase-orders/from-request/${requestId}`, body);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function purchaseOrderAction(
  id: number,
  action: "submit" | "approve" | "reject" | "cancel",
  body?: Record<string, unknown>
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/purchase-orders/${id}/${action}`,
    body || {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function grnGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/grn/${id}${q}`);
  return res?.data ?? null;
}

export type GrnListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** GET /api/v1/grn — branch-scoped list (tab filters, date range, pagination). */
export async function grnList(params: {
  orgId: number;
  branchId?: number;
  status?: string;
  sessionStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: unknown[]; pagination: GrnListPagination }> {
  const q = new URLSearchParams();
  q.set("orgId", String(params.orgId));
  if (params.branchId != null) q.set("branchId", String(params.branchId));
  if (params.status) q.set("status", params.status);
  if (params.sessionStatus) q.set("sessionStatus", params.sessionStatus);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 20));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: Partial<GrnListPagination> }>(
    `/api/v1/grn?${q.toString()}`
  );
  const p = res?.pagination;
  const pagination: GrnListPagination = {
    page: Number(p?.page) || 1,
    limit: Number(p?.limit) || 20,
    total: Number(p?.total) || 0,
    totalPages: Number(p?.totalPages) || 0,
  };
  return { items: Array.isArray(res?.data) ? res.data : [], pagination };
}

/** Same-origin paths for browser print preview (iframe); auth via cookies. */
export function grnPrintUrl(grnId: number, kind: "grn" | "discrepancy" = "grn"): string {
  return kind === "discrepancy" ? `/api/v1/grn/${grnId}/print/discrepancy` : `/api/v1/grn/${grnId}/print`;
}

/** Inventory module aliases — same HTML as GRN print where kind is `grn`. */
export function vendorReceiptPrintUrl(grnId: number, kind: "grn" | "delivery-note"): string {
  const base = `/api/v1/inventory/vendor-receipts/${grnId}/print`;
  return kind === "delivery-note" ? `${base}/delivery-note` : `${base}/grn`;
}

export function dispatchPrintUrl(
  dispatchId: number,
  kind:
    | "challan"
    | "delivery-note"
    | "branch-receiving-record"
    | "branch-confirmation"
    | "discrepancy"
    | "branch-worksheet"
): string {
  const base = `/api/v1/inventory/dispatches/${dispatchId}/print`;
  if (kind === "challan") return `${base}/challan`;
  if (kind === "delivery-note") return `${base}/delivery-note`;
  if (kind === "branch-receiving-record") return `${base}/branch-receiving-record`;
  if (kind === "branch-confirmation") return `${base}/branch-confirmation`;
  if (kind === "branch-worksheet") return `${base}/branch-worksheet`;
  return `${base}/discrepancy`;
}

/** POST — mark dispatch IN_TRANSIT (stock leaves warehouse location). */
export async function dispatchSend(dispatchId: number, body?: { orgId?: number }) {
  const q = body?.orgId ? `?orgId=${body.orgId}` : "";
  const { orgId: _o, ...rest } = body || {};
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/send${q}`,
    rest
  );
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export function purchaseOrderPrintUrl(poId: number, kind: "po" | "worksheet" = "po"): string {
  const base = `/api/v1/purchase-orders/${poId}/print`;
  return kind === "worksheet" ? `${base}/worksheet` : base;
}

export function pickListPrintUrl(pickListId: number): string {
  return `/api/v1/pick-lists/${pickListId}/print`;
}

export async function grnVoid(id: number, body?: { reason?: string }): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/grn/${id}/void`, body || {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function grnSubmitForConfirmation(id: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/grn/${id}/vendor-receive/submit`, {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function grnReceive(id: number): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/grn/${id}/receive`, {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export type GrnManagerConfirmLinePayload = {
  lineId: number;
  acceptedQty: number;
  damagedQty: number;
  shortQty?: number | null;
  extraQty: number;
  lot?: string | null;
  expiry?: string | null;
  note?: string | null;
};

export async function grnConfirm(
  id: number,
  body?: {
    lines?: GrnManagerConfirmLinePayload[];
    notes?: string;
    deliveryConditionNote?: string;
    vendorHandoverNote?: string;
  }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/grn/${id}/confirm`, body || {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

/** Warehouse manager: persist line edits on a draft GRN without posting stock. */
export async function grnSaveVendorReceiveDraft(
  id: number,
  body?: { lines?: GrnManagerConfirmLinePayload[]; notes?: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/grn/${id}/vendor-receive/draft`,
    body || {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

/** Pending vendor receive counts for branch (AWAITING_CONFIRMATION + draft sessions). */
export async function grnPendingVendorReceiveCount(params: {
  orgId: number;
  branchId: number;
}): Promise<{ awaitingConfirmation: number; draftVendorReceives: number }> {
  const q = new URLSearchParams({ orgId: String(params.orgId), branchId: String(params.branchId) });
  const res = await apiGet<{ success?: boolean; data?: { awaitingConfirmation?: number; draftVendorReceives?: number } }>(
    `/api/v1/grn/pending-count?${q.toString()}`
  );
  const data = res && typeof res === "object" && "data" in res ? (res as { data?: { awaitingConfirmation?: number; draftVendorReceives?: number } }).data : undefined;
  return {
    awaitingConfirmation: Number(data?.awaitingConfirmation ?? 0) || 0,
    draftVendorReceives: Number(data?.draftVendorReceives ?? 0) || 0,
  };
}

export async function networkBalanceRecompute(orgId: number, branchId?: number): Promise<unknown> {
  const q = new URLSearchParams({ orgId: String(orgId) });
  if (branchId != null) q.set("branchId", String(branchId));
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/network-balance/recompute?${q}`,
    {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function purchaseRequisitionsList(params?: { orgId?: number; status?: string; page?: number; limit?: number }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/purchase-requisitions${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function purchaseRequisitionGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/purchase-requisitions/${id}${q}`);
  return res?.data ?? null;
}

export async function purchaseRequisitionCreate(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/purchase-requisitions`, body);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function purchaseRequisitionAction(
  id: number,
  action: "submit" | "approve" | "reject" | "convert-to-po",
  body?: Record<string, unknown>
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/purchase-requisitions/${id}/${action}`,
    body || {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function inboundShipmentCreate(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/inbound-shipments`, body);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function inboundShipmentsList(params?: { orgId?: number; status?: string; vendorId?: number; page?: number; limit?: number }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.vendorId) q.set("vendorId", String(params.vendorId));
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/inbound-shipments${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function inboundShipmentGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/inbound-shipments/${id}${q}`);
  return res?.data ?? null;
}

export async function putawayTasksList(params?: { orgId?: number; status?: string; warehouseId?: number; page?: number; limit?: number }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.warehouseId) q.set("warehouseId", String(params.warehouseId));
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/putaway/tasks${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function putawayRecommendations(grnLineId: number, orgId?: number): Promise<unknown | null> {
  const q = new URLSearchParams();
  q.set("grnLineId", String(grnLineId));
  if (orgId) q.set("orgId", String(orgId));
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/putaway/recommendations?${q}`);
  return res?.data ?? null;
}

export async function putawayTaskConfirm(id: number, body: { toLocationId: number; orgId?: number }): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/putaway/tasks/${id}/confirm`, body);
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function inboundDiscrepanciesList(params?: { orgId?: number; status?: string; grnId?: number; page?: number; limit?: number }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  if (params?.grnId) q.set("grnId", String(params.grnId));
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/inbound-discrepancies${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function inboundDiscrepancyCreate(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/inbound-discrepancies`, body);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function inboundDiscrepancyResolve(id: number, body?: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/inbound-discrepancies/${id}/resolve`,
    body || {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

/** GET /api/v1/inventory/locations — org-scoped list for owner dispatch destination picker */
export type InventoryLocationRow = {
  id: number;
  name: string;
  type: string;
  branchId?: number;
  branch?: {
    id: number;
    name: string;
    orgId?: number;
    typeLinks?: Array<{
      isPrimary: boolean;
      branchType: { code: string; nameEn: string } | null;
    }>;
  };
};

export async function inventoryLocationsList(orgId?: number): Promise<InventoryLocationRow[]> {
  const q = new URLSearchParams();
  if (orgId != null) q.set("orgId", String(orgId));
  const qs = q.toString();
  const res = await apiGet<{ success?: boolean; data?: InventoryLocationRow[] }>(
    `/api/v1/inventory/locations${qs ? `?${qs}` : ""}`
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function allocationPlansList(params?: { orgId?: number; status?: string }): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/allocation-plans${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function allocationPlanGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/allocation-plans/${id}${q}`);
  return res?.data ?? null;
}

export async function allocationPlanFromStockRequest(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/allocation-plans/from-stock-request`, body);
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function allocationPlanRunFefo(id: number, orgId?: number): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/allocation-plans/${id}/run-fefo${q}`, {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function allocationPlanConfirm(
  id: number,
  orgId?: number,
  opts?: { expectedVersion?: number }
): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const payload: Record<string, unknown> = {};
  if (opts?.expectedVersion != null) payload.expectedVersion = opts.expectedVersion;
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/allocation-plans/${id}/confirm${q}`,
    payload
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function allocationPlanReallocate(id: number, orgId?: number): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/allocation-plans/${id}/reallocate${q}`,
    orgId != null ? { orgId } : {}
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function allocationPlanManualLine(
  id: number,
  body: { variantId: number; lotId: number; locationId: number; quantity: number; orgId?: number }
): Promise<unknown> {
  const q = body.orgId ? `?orgId=${body.orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/allocation-plans/${id}/lines/manual${q}`,
    body
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function allocationPlanCancel(id: number, orgId?: number, reason?: string): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/allocation-plans/${id}/cancel${q}`,
    { reason: reason ?? undefined }
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

/** Parent plan id: creates supplementary plan from open backorder remaining qty and runs FEFO. */
export async function allocationPlanSupplementaryFromBackorders(
  parentPlanId: number,
  body: { fromLocationId: number; orgId?: number }
): Promise<unknown> {
  const q = body.orgId ? `?orgId=${body.orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/allocation-plans/${parentPlanId}/supplementary-from-backorders${q}`,
    body
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function pickListsList(params?: {
  orgId?: number;
  /** Only lists explicitly assigned to the current user. */
  mine?: boolean;
  /** Unclaimed (null assignee) or assigned to you — needed for allocation-plan picks that start unassigned. */
  workQueue?: boolean;
  branchId?: number;
  status?: string;
}): Promise<{ items: unknown[]; pagination?: unknown }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", String(params.orgId));
  if (params?.mine) q.set("mine", "1");
  if (params?.workQueue) q.set("workQueue", "1");
  if (params?.branchId != null && Number.isFinite(Number(params.branchId))) q.set("branchId", String(params.branchId));
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: unknown[]; pagination?: unknown }>(
    `/api/v1/pick-lists${q.toString() ? `?${q}` : ""}`
  );
  return { items: Array.isArray(res?.data) ? res.data : [], pagination: res?.pagination };
}

export async function pickListGet(id: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/pick-lists/${id}${q}`);
  return res?.data ?? null;
}

export async function pickListFromPlan(planId: number, orgId?: number): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/pick-lists/from-plan/${planId}${q}`, {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function pickListStart(id: number, orgId?: number): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(`/api/v1/pick-lists/${id}/start${q}`, {});
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function pickListComplete(
  id: number,
  orgId?: number,
  body?: { lines?: Array<{ lineId: number; quantityPicked: number; id?: number; pickedQty?: number }> }
): Promise<unknown> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const payload =
    body?.lines?.length && Array.isArray(body.lines)
      ? {
          lines: body.lines.map((l) => ({
            lineId: l.lineId ?? l.id,
            quantityPicked: l.quantityPicked ?? l.pickedQty,
          })),
        }
      : {};
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/pick-lists/${id}/complete${q}`,
    payload
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function pickListUpdateLine(
  pickListId: number,
  lineId: number,
  body: { quantityPicked: number; orgId?: number }
): Promise<unknown> {
  const q = body.orgId ? `?orgId=${body.orgId}` : "";
  const { orgId, ...rest } = body;
  const res = await apiPatch<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/pick-lists/${pickListId}/lines/${lineId}${q}`,
    rest
  );
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message?: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function pickListHandoff(
  id: number,
  body: { orgId?: number; toLocationId: number; transport?: Record<string, unknown> }
): Promise<unknown> {
  const q = body.orgId ? `?orgId=${body.orgId}` : "";
  const { orgId, ...rest } = body;
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/pick-lists/${id}/handoff-dispatch${q}`,
    rest
  );
  if (!res?.success && res?.message) throw new Error(res.message);
  return res?.data ?? res;
}

export async function deliveryFail(id: number, reason: string): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown }>(`/api/v1/warehouse/delivery/${id}/fail`, { reason });
  return res?.data ?? res;
}

/** POST /api/v1/fulfillment/stock-requests/:id/start — create allocation plan draft for enterprise path (idempotent: returns existing plan with meta.existingPlan) */
export async function fulfillmentStartFromStockRequest(
  stockRequestId: number,
  body: { fromLocationId: number; warehouseId?: number; orgId?: number }
): Promise<{ data: unknown; meta?: { existingPlan?: boolean } }> {
  const q = body.orgId ? `?orgId=${body.orgId}` : "";
  const { orgId, ...rest } = body;
  const res = await apiPost<{
    success?: boolean;
    data?: unknown;
    message?: string;
    meta?: { existingPlan?: boolean };
  }>(`/api/v1/fulfillment/stock-requests/${stockRequestId}/start${q}`, rest);
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message?: string }).message);
  return { data: (res as { data?: unknown }).data ?? res, meta: (res as { meta?: { existingPlan?: boolean } }).meta };
}

/** GET /api/v1/fulfillment/stock-requests/:id/status — plan / pick / dispatch aggregate */
export async function fulfillmentStockRequestStatus(stockRequestId: number, orgId?: number): Promise<unknown | null> {
  const q = orgId ? `?orgId=${orgId}` : "";
  const res = await apiGet<{ success?: boolean; data?: unknown }>(`/api/v1/fulfillment/stock-requests/${stockRequestId}/status${q}`);
  return res?.data ?? null;
}

export async function dispatchDiscrepanciesList(dispatchId: number): Promise<unknown[]> {
  const res = await apiGet<{ success?: boolean; data?: unknown[] }>(`/api/v1/inventory/dispatches/${dispatchId}/discrepancies`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function dispatchDiscrepancyCreate(
  dispatchId: number,
  body: { variantId: number; lotId?: number; reasonCode: string; quantity: number; notes?: string }
): Promise<unknown> {
  const res = await apiPost<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/inventory/dispatches/${dispatchId}/discrepancies`,
    body
  );
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message?: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}

export async function dispatchDiscrepancyResolve(discrepancyId: number, resolutionNote?: string): Promise<unknown> {
  const res = await apiPatch<{ success?: boolean; data?: unknown; message?: string }>(
    `/api/v1/inventory/dispatches/discrepancies/${discrepancyId}/resolve`,
    { resolutionNote: resolutionNote ?? "" }
  );
  if (!res?.success && (res as { message?: string })?.message) throw new Error((res as { message?: string }).message);
  return (res as { data?: unknown })?.data ?? res;
}
