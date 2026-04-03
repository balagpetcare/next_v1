/**
 * Staff branch clinic catalog API helpers. All paths are relative to /api/v1/clinic.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";
import type {
  CatalogSummary,
  CatalogItem,
  MasterCatalogItem,
  ClinicService,
  SurgeryPackage,
  PackageItem,
  PackagePriceRule,
  DiscountPolicy,
  ClinicApprovalRequest,
  ApiListResponse,
} from "./catalogTypes";

const base = (branchId: string) => `/api/v1/clinic/branches/${branchId}`;

// ——— Catalog summary ———
export async function getCatalogSummary(branchId: string): Promise<CatalogSummary | null> {
  const res = await apiGet<{ success?: boolean; data?: CatalogSummary }>(
    `${base(branchId)}/catalog/summary`
  );
  return (res as { data?: CatalogSummary })?.data ?? null;
}

// ——— Catalog items ———
export async function listCatalogItems(
  branchId: string,
  params: { search?: string; domainType?: string; isActive?: boolean; limit?: number; page?: number }
): Promise<{ items: CatalogItem[]; pagination?: { total?: number; page?: number; limit?: number } }> {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.domainType) q.set("domainType", params.domainType);
  if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
  q.set("limit", String(params.limit ?? 50));
  if (params.page != null) q.set("page", String(params.page));
  const res = await apiGet<ApiListResponse<CatalogItem>>(
    `${base(branchId)}/catalog/items?${q.toString()}`
  );
  const data = (res as { data?: { items?: (CatalogItem & { category?: { name?: string } })[]; pagination?: { total?: number; page?: number; limit?: number } } })?.data;
  const rawItems = data?.items ?? [];
  const items: CatalogItem[] = rawItems.map((i) => ({
    ...i,
    categoryName: i.category?.name ?? (i as CatalogItem).categoryName ?? null,
  }));
  return {
    items,
    pagination: data?.pagination,
  };
}

export async function getCatalogItemById(
  branchId: string,
  itemId: number
): Promise<CatalogItem | null> {
  const res = await apiGet<{ success?: boolean; data?: CatalogItem }>(
    `${base(branchId)}/catalog/items/${itemId}`
  );
  return (res as { data?: CatalogItem })?.data ?? null;
}

export async function setCatalogItemStatus(
  branchId: string,
  itemId: number,
  isActive: boolean
): Promise<void> {
  await apiPatch(`${base(branchId)}/catalog/items/${itemId}/status`, { isActive });
}

// ——— Master catalog (add from master) ———
export async function listMasterCatalogItems(
  branchId: string,
  limit = 100
): Promise<MasterCatalogItem[]> {
  const res = await apiGet<{ success?: boolean; data?: { items?: MasterCatalogItem[] } }>(
    `${base(branchId)}/catalog/master/items?limit=${limit}`
  );
  const data = (res as { data?: { items?: MasterCatalogItem[] } })?.data;
  return data?.items ?? [];
}

export async function executeAddFromMaster(
  branchId: string,
  masterItemIds: number[],
  option: "createMissingOnly" | "createAll" = "createMissingOnly"
): Promise<{ createdItems?: number; createdCategories?: number }> {
  const res = await apiPost<{ success?: boolean; data?: { createdItems?: number; createdCategories?: number } }>(
    `${base(branchId)}/catalog/add-from-master/execute`,
    { masterItemIds, option }
  );
  return (res as { data?: { createdItems?: number; createdCategories?: number } })?.data ?? {};
}

// ——— Services ———
export async function listServices(
  branchId: string,
  params?: { search?: string; category?: string; status?: string; limit?: number; page?: number }
): Promise<{ items: ClinicService[]; pagination?: { total?: number } }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.status) q.set("status", params.status);
  const res = await apiGet<{ success?: boolean; data?: { items?: ClinicService[]; pagination?: { total?: number } } }>(
    `${base(branchId)}/services${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = (res as { data?: { items?: ClinicService[]; pagination?: { total?: number } } })?.data;
  return {
    items: data?.items ?? [],
    pagination: data?.pagination,
  };
}

export async function createService(
  branchId: string,
  body: {
    name: string;
    category: string;
    price: number;
    duration?: number;
    serviceCode?: string;
    description?: string;
    status?: string;
  }
): Promise<ClinicService> {
  const res = await apiPost<{ success?: boolean; data?: ClinicService }>(
    `${base(branchId)}/services`,
    body
  );
  const data = (res as { data?: ClinicService })?.data;
  if (!data) throw new Error("Failed to create service");
  return data;
}

export async function updateService(
  branchId: string,
  serviceId: number,
  body: Partial<{
    name: string;
    category: string;
    price: number;
    duration: number;
    serviceCode: string;
    description: string;
    status: string;
  }>
): Promise<ClinicService> {
  const res = await apiPut<{ success?: boolean; data?: ClinicService }>(
    `${base(branchId)}/services/${serviceId}`,
    body
  );
  const data = (res as { data?: ClinicService })?.data;
  if (!data) throw new Error("Failed to update service");
  return data;
}

export async function setServiceStatus(
  branchId: string,
  serviceId: number,
  status: "ACTIVE" | "INACTIVE"
): Promise<void> {
  await apiPatch(`${base(branchId)}/services/${serviceId}/status`, { status });
}

// ——— Packages ———
export async function listPackages(
  branchId: string,
  params?: { search?: string; status?: string; limit?: number; page?: number }
): Promise<{ items: SurgeryPackage[]; pagination?: { total?: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  const res = await apiGet<ApiListResponse<SurgeryPackage>>(
    `${base(branchId)}/packages${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = (res as { data?: { items?: SurgeryPackage[]; pagination?: { total?: number } } })?.data ?? res as { items?: SurgeryPackage[]; pagination?: { total?: number } };
  return {
    items: data?.items ?? (res as { items?: SurgeryPackage[] })?.items ?? [],
    pagination: data?.pagination ?? (res as { pagination?: { total?: number } })?.pagination,
  };
}

export async function getPackageById(
  branchId: string,
  packageId: number
): Promise<SurgeryPackage | null> {
  const res = await apiGet<{ success?: boolean; data?: SurgeryPackage }>(
    `${base(branchId)}/packages/${packageId}`
  );
  return (res as { data?: SurgeryPackage })?.data ?? null;
}

export async function createPackage(
  branchId: string,
  body: {
    packageCode: string;
    packageName: string;
    serviceId: number;
    packageType?: string;
    baseSellingPrice: number;
    status?: string;
    description?: string;
  }
): Promise<SurgeryPackage> {
  const res = await apiPost<{ success?: boolean; data?: SurgeryPackage }>(
    `${base(branchId)}/packages`,
    body
  );
  const data = (res as { data?: SurgeryPackage })?.data;
  if (!data) throw new Error("Failed to create package");
  return data;
}

export async function updatePackage(
  branchId: string,
  packageId: number,
  body: Partial<{
    packageCode: string;
    packageName: string;
    serviceId: number;
    packageType: string;
    baseSellingPrice: number;
    status: string;
    description: string;
  }>
): Promise<SurgeryPackage> {
  const res = await apiPut<{ success?: boolean; data?: SurgeryPackage }>(
    `${base(branchId)}/packages/${packageId}`,
    body
  );
  const data = (res as { data?: SurgeryPackage })?.data;
  if (!data) throw new Error("Failed to update package");
  return data;
}

export async function deletePackage(branchId: string, packageId: number): Promise<void> {
  await apiDelete(`${base(branchId)}/packages/${packageId}`);
}

export async function listPackageItems(
  branchId: string,
  packageId: number
): Promise<PackageItem[]> {
  const res = await apiGet<{ success?: boolean; data?: PackageItem[] }>(
    `${base(branchId)}/packages/${packageId}/items`
  );
  return (res as { data?: PackageItem[] })?.data ?? [];
}

export async function listPackagePriceRules(
  branchId: string,
  packageId: number
): Promise<PackagePriceRule[]> {
  const res = await apiGet<{ success?: boolean; data?: PackagePriceRule[] }>(
    `${base(branchId)}/packages/${packageId}/price-rules`
  );
  return (res as { data?: PackagePriceRule[] })?.data ?? [];
}

// ——— Discount / Promotions ———
export async function listDiscountPolicies(
  branchId: string,
  params?: { status?: string; limit?: number; page?: number }
): Promise<{ items: DiscountPolicy[]; pagination?: { total?: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.page != null) q.set("page", String(params.page));
  const res = await apiGet<{ success?: boolean; data?: { items?: DiscountPolicy[]; pagination?: { total?: number } } }>(
    `${base(branchId)}/discount-policies${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = (res as { data?: { items?: DiscountPolicy[]; pagination?: { total?: number } } })?.data;
  return {
    items: data?.items ?? [],
    pagination: data?.pagination,
  };
}

export async function getDiscountPolicyById(
  branchId: string,
  policyId: number
): Promise<DiscountPolicy | null> {
  const res = await apiGet<{ success?: boolean; data?: DiscountPolicy }>(
    `${base(branchId)}/discount-policies/${policyId}`
  );
  return (res as { data?: DiscountPolicy })?.data ?? null;
}

export async function createDiscountPolicy(
  branchId: string,
  body: Partial<DiscountPolicy> & { name: string; discountType: string; scope: string; calcType: string }
): Promise<DiscountPolicy> {
  const res = await apiPost<{ success?: boolean; data?: DiscountPolicy }>(
    `${base(branchId)}/discount-policies`,
    body
  );
  const data = (res as { data?: DiscountPolicy })?.data;
  if (!data) throw new Error("Failed to create discount policy");
  return data;
}

export async function updateDiscountPolicy(
  branchId: string,
  policyId: number,
  body: Partial<DiscountPolicy>
): Promise<DiscountPolicy> {
  const res = await apiPut<{ success?: boolean; data?: DiscountPolicy }>(
    `${base(branchId)}/discount-policies/${policyId}`,
    body
  );
  const data = (res as { data?: DiscountPolicy })?.data;
  if (!data) throw new Error("Failed to update discount policy");
  return data;
}

// ——— Doctor mapping ———
export async function getServiceMatrix(branchId: string): Promise<{
  doctors: { id: number; name: string }[];
  services: { id: number; name: string; serviceCode?: string }[];
  matrix: { doctorId: number; serviceId: number; mappingId?: number; status: string }[];
}> {
  const res = await apiGet<{ success?: boolean; data?: { doctors?: { id: number; name: string }[]; services?: { id: number; name: string }[]; matrix?: { doctorId: number; serviceId: number; mappingId?: number; status: string }[] } }>(
    `${base(branchId)}/doctors/service-matrix`
  );
  const data = (res as { data?: { doctors?: { id: number; name: string }[]; services?: { id: number; name: string }[]; matrix?: { doctorId: number; serviceId: number; mappingId?: number; status: string }[] } })?.data ?? res as any;
  return {
    doctors: data?.doctors ?? [],
    services: data?.services ?? [],
    matrix: data?.matrix ?? [],
  };
}

export async function getPackageMatrix(branchId: string): Promise<{
  doctors: { id: number; name: string }[];
  packages: { id: number; packageName: string; packageCode?: string }[];
  matrix: { doctorId: number; packageId: number; mappingId?: number; roleInPackage: string; status: string }[];
}> {
  const res = await apiGet<{ success?: boolean; data?: { doctors?: { id: number; name: string }[]; packages?: { id: number; packageName: string }[]; matrix?: { doctorId: number; packageId: number; mappingId?: number; roleInPackage: string; status: string }[] } }>(
    `${base(branchId)}/doctors/package-matrix`
  );
  const data = (res as { data?: { doctors?: { id: number; name: string }[]; packages?: { id: number; packageName: string }[]; matrix?: { doctorId: number; packageId: number; mappingId?: number; roleInPackage: string; status: string }[] } })?.data ?? res as any;
  return {
    doctors: data?.doctors ?? [],
    packages: data?.packages ?? [],
    matrix: data?.matrix ?? [],
  };
}

export async function putServiceMatrix(
  branchId: string,
  body: { doctorId: number; serviceId: number; isAllowed: boolean }[]
): Promise<void> {
  await apiPut(`${base(branchId)}/doctors/service-matrix`, { mappings: body });
}

// Package mapping is edited per-doctor: PUT /doctors/:memberId/packages

// ——— Approval requests ———
export async function listApprovalRequests(
  branchId: string,
  params?: { status?: string; limit?: number }
): Promise<ClinicApprovalRequest[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit ?? 50));
  const res = await apiGet<{ success?: boolean; data?: ClinicApprovalRequest[] | { items?: ClinicApprovalRequest[] } }>(
    `${base(branchId)}/approval-requests${q.toString() ? `?${q.toString()}` : ""}`
  );
  const d = (res as { data?: unknown })?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && Array.isArray((d as { items?: ClinicApprovalRequest[] }).items)) {
    return (d as { items: ClinicApprovalRequest[] }).items;
  }
  return [];
}

export async function decideApprovalRequest(
  branchId: string,
  requestId: number,
  decision: "APPROVED" | "REJECTED",
  reason?: string
): Promise<void> {
  await apiPut(`${base(branchId)}/approval-requests/${requestId}/decide`, {
    decision,
    rejectReason: decision === "REJECTED" ? reason : undefined,
  });
}

// ——— Audit history ———
export async function getAuditHistory(
  branchId: string,
  params?: { limit?: number; offset?: number; entityType?: string }
): Promise<{ entries: import("./catalogTypes").AuditEntry[] }> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.entityType) q.set("entityType", params.entityType);
  const res = await apiGet<{ success?: boolean; data?: { entries?: import("./catalogTypes").AuditEntry[] } }>(
    `${base(branchId)}/audit-history${q.toString() ? `?${q.toString()}` : ""}`
  );
  const data = (res as { data?: { entries?: import("./catalogTypes").AuditEntry[] } })?.data;
  return { entries: data?.entries ?? [] };
}
