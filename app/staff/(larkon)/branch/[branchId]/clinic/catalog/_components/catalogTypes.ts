/**
 * Shared TypeScript types for staff branch clinic catalog module.
 * Aligned with backend API responses and Prisma models.
 */

export interface CatalogSummary {
  totalCatalogItems?: number;
  totalPackages?: number;
  pendingApprovalRequests?: number;
  activeServices?: number;
  draftPackages?: number;
  discountCampaignsRunning?: number;
  lowStockPackageLinkedItems?: number;
  recentlyAddedItems?: number;
  mappedDoctors?: number;
}

export interface CatalogItem {
  id: number;
  itemCode: string;
  name: string;
  domainType: string;
  categoryId?: number | null;
  categoryName?: string | null;
  baseUnit?: string | null;
  defaultSalePrice?: number | string | null;
  defaultCost?: number | string | null;
  isActive?: boolean;
  lifecycleState?: string;
  updatedAt?: string;
}

export interface MasterCatalogItem {
  id: number;
  name: string;
  itemCode: string;
  domainType?: string;
}

export interface ClinicService {
  id: number;
  name: string;
  serviceCode?: string | null;
  category: string;
  status: string;
  price: number | string;
  duration?: number | null;
  description?: string | null;
  packageAllowed?: boolean;
  allowDiscount?: boolean;
  maxDiscountPct?: number | string | null;
}

export interface SurgeryPackage {
  id: number;
  packageCode: string;
  packageName: string;
  packageType: string;
  serviceId: number;
  serviceName?: string;
  baseSellingPrice: number | string;
  status: string;
  description?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageItem {
  id: number;
  productId?: number | null;
  variantId?: number | null;
  clinicalItemId?: number | null;
  clinicalItemVariantId?: number | null;
  itemType?: string;
  quantity?: number;
  unit?: string;
  itemName?: string;
}

export interface PackagePriceRule {
  id: number;
  branchId?: number;
  species?: string | null;
  weightBand?: string | null;
  isEmergency?: boolean;
  priceOverride?: number | string | null;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
}

export interface DiscountPolicy {
  id: number;
  name: string;
  discountType: string;
  scope: string;
  calcType: string;
  maxPercent?: number | string | null;
  maxAmount?: number | string | null;
  absorptionMode?: string;
  requiresApproval?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  status: string;
  serviceIds?: number[] | null;
  packageIds?: number[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorServiceMapping {
  id: number;
  clinicStaffProfileId: number;
  serviceId: number;
  branchId: number;
  doctorName?: string;
  serviceName?: string;
  status: string;
  isAllowed?: boolean;
  customDuration?: number | null;
}

export interface DoctorPackageMapping {
  id: number;
  clinicStaffProfileId: number;
  surgeryPackageId: number;
  branchId: number;
  roleInPackage: string;
  isPrimary?: boolean;
  status: string;
  doctorName?: string;
  packageName?: string;
}

export interface ServiceMatrixRow {
  doctorId: number;
  doctorName: string;
  serviceId: number;
  serviceName: string;
  mappingId?: number;
  status: string;
  isAllowed?: boolean;
}

export interface PackageMatrixRow {
  doctorId: number;
  doctorName: string;
  packageId: number;
  packageName: string;
  mappingId?: number;
  roleInPackage: string;
  status: string;
}

export interface ClinicApprovalRequest {
  id: number;
  requestType: string;
  entityType: string;
  entityId?: number | null;
  payload: Record<string, unknown>;
  requestedByUserId: number;
  requesterName?: string;
  status: string;
  approvedByUserId?: number | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditEntry {
  id: string;
  type: string;
  action: string;
  userId?: number;
  user?: { id: number; name: string | null } | null;
  entityType?: string;
  entityId?: number;
  package?: { id: number; packageCode: string; packageName: string } | null;
  meta?: Record<string, unknown>;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  field?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiListResponse<T> {
  success?: boolean;
  data?: {
    items?: T[];
    pagination?: PaginationMeta;
  };
  items?: T[];
  pagination?: PaginationMeta;
}
