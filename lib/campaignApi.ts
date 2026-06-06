/**
 * BPA 2026 Vaccination Campaign — admin & staff API client.
 * Uses shared lib/api (cookies + country headers).
 */

import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "./api";
import { getApiHeaders } from "./countryContext";

function campaignApiBase(): string {
  return typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export type CampaignExportFormat = "csv" | "xlsx" | "pdf";

async function campaignDownloadBlob(
  path: string,
  filename: string,
  accept: string
): Promise<void> {
  const res = await fetch(`${campaignApiBase()}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: accept, ...getApiHeaders() },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { message?: string; error?: { message?: string } })?.error?.message
      || (j as { message?: string })?.message
      || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const admin = "/api/v1/campaign/admin";
const staff = "/api/v1/campaign/staff";
const pub = "/api/v1/campaign/public";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type BookingStatus =
  | "DRAFT"
  | "PENDING_ASSIGNMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export type CampaignSummary = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  bookingStartAt?: string | null;
  bookingEndAt?: string | null;
  countdownEnabled?: boolean;
  status: CampaignStatus;
  visibility?: string;
  pricingType: string;
  priceAmount?: number | string | null;
  currency?: string;
  _count?: { bookings?: number; staff?: number };
};

export type CampaignIncludedVaccine = {
  id: number;
  name: string;
  description?: string | null;
  coveredDiseases: string[];
  displayOrder: number;
};

export type CampaignPricing = {
  vaccineCost: number;
  serviceCharge: number;
  totalPrice: number;
  currency: string;
  packageFeatures: string[];
  packageFeatureLines: string[];
  isFree: boolean;
};

export type CampaignDetail = CampaignSummary & {
  locations?: Array<{ id: number; name: string; address?: string | null; isActive?: boolean }>;
  vaccineTypes?: Array<{ vaccineTypeId: number; vaccineType?: { id: number; name: string } }>;
  includedVaccines?: CampaignIncludedVaccine[];
  vaccineCost?: number | string | null;
  serviceCharge?: number | string | null;
  packageFeatures?: string[];
  pricing?: CampaignPricing;
};

export type CampaignStats = {
  totalBookings: number;
  totalVaccinations: number;
  completionRate: number;
  showRate: number;
  byLocation: Array<{ locationId: number; locationName: string; bookings: number; vaccinations: number }>;
  byDay: Array<{ date: string; bookings: number; vaccinations: number }>;
};

export type CampaignPetRow = {
  id: number;
  name: string;
  vaccinationStatus: string;
  certificateToken?: string | null;
  gender?: string | null;
  ageMonths?: number | null;
};

export type CampaignBookingRow = {
  id: number;
  bookingRef: string;
  qrToken?: string;
  ownerName: string;
  ownerPhone: string;
  owner?: { name?: string; phone?: string };
  petCount?: number;
  status: BookingStatus;
  bookingDate?: string;
  queueNumber?: string | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  bookingArea?: string | null;
  coverageZoneName?: string | null;
  cityCorporation?: string | null;
  area?: string | null;
  locationLabel?: string | null;
  location?: {
    id?: number;
    name?: string;
    address?: string | null;
    cityCorporation?: string;
    area?: string;
    locationLabel?: string;
  };
  slot?: { startTime?: string; endTime?: string };
  pets?: CampaignPetRow[];
};

/** Display label for booking location (venue or Dhaka corporation + area). */
export function formatCampaignBookingLocation(row: CampaignBookingRow): string {
  if (row.locationLabel?.trim()) return row.locationLabel.trim();
  if (row.location?.locationLabel?.trim()) return row.location.locationLabel.trim();
  if (row.location?.name?.trim()) return row.location.name.trim();
  if (row.cityCorporation && row.area) return `${row.cityCorporation} → ${row.area}`;
  if (row.location?.cityCorporation && row.location?.area) {
    return `${row.location.cityCorporation} → ${row.location.area}`;
  }
  if (row.area?.trim()) return row.area.trim();
  if (row.location?.area?.trim()) return row.location.area.trim();
  if (row.cityCorporation?.trim()) return row.cityCorporation.trim();
  if (row.location?.cityCorporation?.trim()) return row.location.cityCorporation.trim();
  if (row.bookingArea?.trim()) return row.bookingArea.trim();
  if (row.coverageZoneName?.trim()) return row.coverageZoneName.trim();
  return '—';
}

export type CampaignQueueItem = {
  queueNumber?: string | null;
  ownerName?: string;
  petCount?: number;
  status?: BookingStatus;
  checkedInAt?: string | null;
  waitingMinutes?: number;
  position?: number;
  bookingRef?: string;
};

export type CampaignCertificateData = {
  certificateToken: string;
  petName: string;
  ownerName: string;
  ownerPhone?: string;
  animalType?: string;
  breed?: string;
  vaccineType: string;
  vaccinatedAt?: string;
  validUntil?: string;
  batchNumber?: string;
  location?: string;
  campaignName?: string;
  qrCodeImage?: string;
  issuedAt?: string;
};

export type VaccinationStats = {
  total: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  deferred?: number;
  skipped?: number;
  byStatus?: Array<{ status: string; count: number }>;
  byVaccineType: Array<{ vaccineTypeId: number; name: string; count: number }>;
};

export type CampaignStaffRow = {
  id: number;
  userId: number;
  role: string;
  locationId?: number | null;
  location?: { id: number; name: string } | null;
  user?: { profile?: { displayName?: string } | null; auth?: { email?: string } | null };
};

export type CampaignStaffStatsRow = {
  staffId: number;
  userId: number;
  displayName: string;
  role: string;
  locationName: string;
  totalActions: number;
  totalCheckIns: number;
};

export type CampaignSlotRow = {
  /** CampaignSlot.id — always set after normalizeCampaignSlotRow(). */
  id: number;
  /** Public availability API may send slotId only; normalized to id. */
  slotId?: number;
  date: string;
  sessionName?: string;
  startTime: string;
  endTime: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  checkInStartTime?: string | null;
  bookingCutoffTime?: string | null;
  capacity: number;
  bookedCount?: number;
  remainingCapacity?: number;
  availableCount?: number;
  status: string;
  available?: number;
};

/** Resolve CampaignSlot.id from admin/public slot payloads (never use locationId/campaignId). */
export function resolveCampaignSlotId(row: Pick<CampaignSlotRow, "id" | "slotId">): number {
  const id = Number(row.id ?? row.slotId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid slot: missing CampaignSlot id");
  }
  return id;
}

function normalizeCampaignSlotRow(raw: Record<string, unknown>): CampaignSlotRow | null {
  const id = Number(raw.id ?? raw.slotId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    slotId: raw.slotId != null ? Number(raw.slotId) : id,
    date: String(raw.date ?? ""),
    sessionName: raw.sessionName != null ? String(raw.sessionName) : undefined,
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    startTimeLabel: raw.startTimeLabel != null ? String(raw.startTimeLabel) : undefined,
    endTimeLabel: raw.endTimeLabel != null ? String(raw.endTimeLabel) : undefined,
    checkInStartTime: raw.checkInStartTime != null ? String(raw.checkInStartTime) : null,
    bookingCutoffTime: raw.bookingCutoffTime != null ? String(raw.bookingCutoffTime) : null,
    capacity: Number(raw.capacity ?? 0),
    bookedCount: raw.bookedCount != null ? Number(raw.bookedCount) : undefined,
    remainingCapacity:
      raw.remainingCapacity != null
        ? Number(raw.remainingCapacity)
        : raw.availableCount != null
          ? Number(raw.availableCount)
          : undefined,
    availableCount: raw.availableCount != null ? Number(raw.availableCount) : undefined,
    status: String(raw.status ?? ""),
    available:
      raw.availableCount != null
        ? Number(raw.availableCount)
        : raw.available != null
          ? Number(raw.available)
          : undefined,
  };
}

export type CampaignCoverageZone = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  zoneType: string;
};

export type CampaignBdAreaOption = {
  id: number;
  code: string;
  nameEn: string;
  nameBn: string | null;
};

export type CampaignLocationRow = {
  id: number;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
  dailyCapacity?: number;
  isActive?: boolean;
  coverageZoneId?: number | null;
  coverageZoneName?: string | null;
  coverageZoneSlug?: string | null;
  bookingArea?: string | null;
  bdAreaId?: number | null;
  addressJson?: Record<string, unknown> | null;
  _count?: { slots?: number; bookings?: number };
};

export type CampaignDashboardOverview = {
  totalBookings: number;
  totalCats: number;
  totalVaccinated: number;
  pendingVaccination: number;
  revenue: number;
  certificatesIssued: number;
  smsSentEstimate: number;
  currency: string;
  pricingType: string;
};

function unwrap<T>(res: { success?: boolean; data?: T }): T {
  if (res?.data !== undefined) return res.data as T;
  return res as unknown as T;
}

// —— Admin ——

export async function campaignAdminList(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ campaigns: CampaignSummary[]; total?: number }> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  const res = await apiGet<{
    success: boolean;
    items?: CampaignSummary[];
    campaigns?: CampaignSummary[];
    data?: CampaignSummary[] | { campaigns?: CampaignSummary[] };
    total?: number;
  }>(`${admin}/campaigns${qs ? `?${qs}` : ""}`);
  if (Array.isArray(res.items)) return { campaigns: res.items, total: res.total };
  if (Array.isArray(res.campaigns)) return { campaigns: res.campaigns, total: res.total };
  const data = unwrap(res);
  if (Array.isArray(data)) return { campaigns: data };
  return { campaigns: (data as { campaigns?: CampaignSummary[] }).campaigns ?? [] };
}

export async function campaignAdminGet(id: number): Promise<CampaignDetail> {
  const res = await apiGet<{ success: boolean; data: CampaignDetail }>(`${admin}/campaigns/${id}`);
  return unwrap(res);
}

export async function campaignAdminCreate(body: Record<string, unknown>): Promise<CampaignDetail> {
  const res = await apiPost<{ success: boolean; data: CampaignDetail }>(`${admin}/campaigns`, body);
  return unwrap(res);
}

export async function campaignAdminUpdate(id: number, body: Record<string, unknown>): Promise<CampaignDetail> {
  const res = await apiPatch<{ success: boolean; data: CampaignDetail }>(`${admin}/campaigns/${id}`, body);
  return unwrap(res);
}

export async function campaignAdminActivate(id: number): Promise<CampaignDetail> {
  const res = await apiPost<{ success: boolean; data: CampaignDetail }>(`${admin}/campaigns/${id}/activate`, {});
  return unwrap(res);
}

export async function campaignAdminPause(id: number): Promise<CampaignDetail> {
  const res = await apiPost<{ success: boolean; data: CampaignDetail }>(`${admin}/campaigns/${id}/pause`, {});
  return unwrap(res);
}

export async function campaignAdminStats(id: number): Promise<CampaignStats> {
  const res = await apiGet<{ success: boolean; data: CampaignStats }>(`${admin}/campaigns/${id}/stats`);
  return unwrap(res);
}

export async function campaignAdminDailySummary(id: number, date?: string): Promise<unknown> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiGet<{ success: boolean; data: unknown }>(`${admin}/campaigns/${id}/daily-summary${qs}`);
  return unwrap(res);
}

export async function campaignAdminVaccinationStats(id: number): Promise<VaccinationStats> {
  const res = await apiGet<{ success: boolean; data: VaccinationStats }>(
    `${admin}/campaigns/${id}/vaccination-stats`
  );
  return unwrap(res);
}

export type CampaignBookingListSummary = {
  totalBookings: number;
  totalPets: number;
  filteredBookings: number;
  filteredPets: number;
};

export type CampaignBookingFilterOptions = {
  cityCorporations: string[];
  areas: string[];
  coverageZones: string[];
  bookingModes: string[];
  paymentStatuses: string[];
};

export type CampaignBookingListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  cityCorporation?: string;
  area?: string;
  coverageZone?: string;
  bookingMode?: string;
  dateFrom?: string;
  dateTo?: string;
  date?: string;
  ownerName?: string;
  phone?: string;
  reference?: string;
  paymentStatus?: string;
  petCountMin?: number;
  petCountMax?: number;
  locationId?: number;
};

function appendBookingListParams(sp: URLSearchParams, params?: CampaignBookingListParams) {
  if (!params) return;
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.status) sp.set('status', params.status);
  if (params.cityCorporation) sp.set('cityCorporation', params.cityCorporation);
  if (params.area) sp.set('area', params.area);
  if (params.coverageZone) sp.set('coverageZone', params.coverageZone);
  if (params.bookingMode) sp.set('bookingMode', params.bookingMode);
  if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params.dateTo) sp.set('dateTo', params.dateTo);
  if (params.date) sp.set('date', params.date);
  if (params.ownerName) sp.set('ownerName', params.ownerName);
  if (params.phone) sp.set('phone', params.phone);
  if (params.reference) sp.set('reference', params.reference);
  if (params.paymentStatus) sp.set('paymentStatus', params.paymentStatus);
  if (params.petCountMin != null) sp.set('petCountMin', String(params.petCountMin));
  if (params.petCountMax != null) sp.set('petCountMax', String(params.petCountMax));
  if (params.locationId) sp.set('locationId', String(params.locationId));
}

export async function campaignAdminBookings(
  campaignId: number,
  params?: CampaignBookingListParams
): Promise<{
  items: CampaignBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary?: CampaignBookingListSummary;
}> {
  const sp = new URLSearchParams();
  appendBookingListParams(sp, params);
  const qs = sp.toString();
  return apiGet(`${admin}/campaigns/${campaignId}/bookings${qs ? `?${qs}` : ''}`);
}

export async function campaignAdminBookingFilterOptions(
  campaignId: number
): Promise<CampaignBookingFilterOptions> {
  const res = await apiGet<{ success: boolean; data: CampaignBookingFilterOptions }>(
    `${admin}/campaigns/${campaignId}/bookings/filter-options`
  );
  return unwrap(res);
}

export async function campaignAdminLocations(
  campaignId: number,
  options?: { includeInactive?: boolean }
): Promise<CampaignLocationRow[]> {
  const qs = options?.includeInactive ? "?includeInactive=true" : "";
  const res = await apiGet<{ success: boolean; data: CampaignLocationRow[] }>(
    `${admin}/campaigns/${campaignId}/locations${qs}`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminListIncludedVaccines(
  campaignId: number,
  options?: { includeInactive?: boolean }
): Promise<CampaignIncludedVaccine[]> {
  const qs = options?.includeInactive ? "?includeInactive=true" : "";
  const res = await apiGet<{ success: boolean; data: CampaignIncludedVaccine[] }>(
    `${admin}/campaigns/${campaignId}/included-vaccines${qs}`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminCreateIncludedVaccine(
  campaignId: number,
  body: {
    name: string;
    description?: string | null;
    coveredDiseases: string[];
    displayOrder?: number;
  }
): Promise<CampaignIncludedVaccine> {
  const res = await apiPost<{ success: boolean; data: CampaignIncludedVaccine }>(
    `${admin}/campaigns/${campaignId}/included-vaccines`,
    body
  );
  return unwrap(res);
}

export async function campaignAdminUpdateIncludedVaccine(
  campaignId: number,
  vaccineId: number,
  body: Partial<{
    name: string;
    description: string | null;
    coveredDiseases: string[];
    displayOrder: number;
    isActive: boolean;
  }>
): Promise<CampaignIncludedVaccine> {
  const res = await apiPatch<{ success: boolean; data: CampaignIncludedVaccine }>(
    `${admin}/campaigns/${campaignId}/included-vaccines/${vaccineId}`,
    body
  );
  return unwrap(res);
}

export async function campaignAdminDeleteIncludedVaccine(
  campaignId: number,
  vaccineId: number
): Promise<void> {
  await apiDelete(`${admin}/campaigns/${campaignId}/included-vaccines/${vaccineId}`);
}

export async function campaignAdminReorderIncludedVaccines(
  campaignId: number,
  orderedIds: number[]
): Promise<CampaignIncludedVaccine[]> {
  const res = await apiPut<{ success: boolean; data: CampaignIncludedVaccine[] }>(
    `${admin}/campaigns/${campaignId}/included-vaccines/reorder`,
    { orderedIds }
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminCoverageZones(): Promise<CampaignCoverageZone[]> {
  const res = await apiGet<{ success: boolean; data: CampaignCoverageZone[] }>(
    `${admin}/coverage-zones`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminBdAreasByZone(
  zoneId: number,
  q?: string
): Promise<CampaignBdAreaOption[]> {
  const sp = new URLSearchParams();
  if (q?.trim()) sp.set("q", q.trim());
  const qs = sp.toString();
  const res = await apiGet<{ success: boolean; data: CampaignBdAreaOption[] }>(
    `${admin}/coverage-zones/${zoneId}/bd-areas${qs ? `?${qs}` : ""}`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminCreateLocation(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success: boolean; data: unknown }>(`${admin}/locations`, body);
  return unwrap(res);
}

export async function campaignAdminUpdateLocation(id: number, body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPatch<{ success: boolean; data: unknown }>(`${admin}/locations/${id}`, body);
  return unwrap(res);
}

export async function campaignAdminLocationStats(locationId: number): Promise<unknown> {
  const res = await apiGet<{ success: boolean; data: unknown }>(`${admin}/locations/${locationId}/stats`);
  return unwrap(res);
}

export async function campaignAdminCreateSlot(body: Record<string, unknown>): Promise<CampaignSlotRow> {
  const res = await apiPost<{ success: boolean; data: CampaignSlotRow }>(`${admin}/slots`, body);
  return unwrap(res);
}

export async function campaignAdminBulkCreateSlots(body: Record<string, unknown>): Promise<unknown> {
  const res = await apiPost<{ success: boolean; data: unknown }>(`${admin}/slots/bulk`, body);
  return unwrap(res);
}

export async function campaignAdminUpdateSlot(id: number, body: { capacity?: number; status?: string }): Promise<CampaignSlotRow> {
  const res = await apiPatch<{ success: boolean; data: CampaignSlotRow }>(`${admin}/slots/${id}`, body);
  return unwrap(res);
}

export async function campaignAdminCloseSlot(id: number): Promise<CampaignSlotRow> {
  const slotId = resolveCampaignSlotId({ id });
  const res = await apiPost<{ success: boolean; data: CampaignSlotRow }>(`${admin}/slots/${slotId}/close`, {});
  const data = unwrap(res);
  return normalizeCampaignSlotRow(data as unknown as Record<string, unknown>) ?? { ...data, id: slotId };
}

export async function campaignAdminOpenSlot(id: number): Promise<CampaignSlotRow> {
  const slotId = resolveCampaignSlotId({ id });
  const res = await apiPost<{ success: boolean; data: CampaignSlotRow }>(`${admin}/slots/${slotId}/open`, {});
  const data = unwrap(res);
  return normalizeCampaignSlotRow(data as unknown as Record<string, unknown>) ?? { ...data, id: slotId };
}

export async function campaignPublicLocationSlots(
  locationId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<CampaignSlotRow[]> {
  const sp = new URLSearchParams();
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  const qs = sp.toString();
  const res = await apiGet<{ success: boolean; data: CampaignSlotRow[] }>(
    `${pub}/locations/${locationId}/slots${qs ? `?${qs}` : ""}`
  );
  const data = unwrap(res);
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => normalizeCampaignSlotRow(row as unknown as Record<string, unknown>))
    .filter((row): row is CampaignSlotRow => row !== null);
}

/** Admin slot list — all statuses (OPEN, FULL, CLOSED, CANCELLED). */
export async function campaignAdminLocationSlots(
  locationId: number,
  params?: { startDate?: string; endDate?: string }
): Promise<CampaignSlotRow[]> {
  const sp = new URLSearchParams();
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  const qs = sp.toString();
  const res = await apiGet<{ success: boolean; data: CampaignSlotRow[] }>(
    `${admin}/locations/${locationId}/slots${qs ? `?${qs}` : ""}`
  );
  const data = unwrap(res);
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => normalizeCampaignSlotRow(row as unknown as Record<string, unknown>))
    .filter((row): row is CampaignSlotRow => row !== null);
}

export async function campaignAdminStaffList(campaignId: number): Promise<CampaignStaffRow[]> {
  const res = await apiGet<{ success: boolean; data: CampaignStaffRow[] }>(`${admin}/campaigns/${campaignId}/staff`);
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminAssignStaff(body: {
  campaignId: number;
  userId: number;
  role: string;
  locationId?: number;
}): Promise<CampaignStaffRow> {
  const res = await apiPost<{ success: boolean; data: CampaignStaffRow }>(`${admin}/staff`, body);
  return unwrap(res);
}

export async function campaignAdminUpdateStaffRole(staffId: number, role: string): Promise<CampaignStaffRow> {
  const res = await apiPatch<{ success: boolean; data: CampaignStaffRow }>(`${admin}/staff/${staffId}`, { role });
  return unwrap(res);
}

export async function campaignAdminRemoveStaff(staffId: number): Promise<void> {
  await apiDelete(`${admin}/staff/${staffId}`);
}

export async function campaignAdminStaffStats(campaignId: number): Promise<CampaignStaffStatsRow[]> {
  const res = await apiGet<{ success: boolean; data: CampaignStaffStatsRow[] }>(
    `${admin}/campaigns/${campaignId}/staff-stats`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignPublicVerify(token: string): Promise<unknown> {
  const res = await apiGet<{ success: boolean; data: unknown }>(`${pub}/verify/${encodeURIComponent(token)}`);
  return unwrap(res);
}

/** Aggregate dashboard KPIs from existing admin endpoints. */
export async function campaignAdminDashboardOverview(campaignId: number): Promise<CampaignDashboardOverview> {
  const [stats, vax, campaign, completedBookings] = await Promise.all([
    campaignAdminStats(campaignId),
    campaignAdminVaccinationStats(campaignId),
    campaignAdminGet(campaignId),
    campaignAdminBookings(campaignId, { status: "COMPLETED", pageSize: 1 }),
  ]);
  const price = Number(campaign.priceAmount ?? 0);
  const paidCount = campaign.pricingType === "PAID" ? completedBookings.total ?? 0 : 0;
  return {
    totalBookings: stats.totalBookings,
    totalCats: vax.total,
    totalVaccinated: vax.completed ?? stats.totalVaccinations,
    pendingVaccination: vax.pending ?? 0,
    revenue: paidCount * price,
    certificatesIssued: vax.completed ?? stats.totalVaccinations,
    smsSentEstimate: stats.totalBookings + (vax.completed ?? 0),
    currency: campaign.currency ?? "BDT",
    pricingType: campaign.pricingType,
  };
}

export async function campaignPublicList(): Promise<CampaignSummary[]> {
  const res = await apiGet<{ success: boolean; data: CampaignSummary[] | CampaignSummary[] }>(
    `${pub}/campaigns`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignPublicBySlug(slug: string): Promise<CampaignDetail> {
  const res = await apiGet<{ success: boolean; data: CampaignDetail }>(
    `${pub}/campaigns/${encodeURIComponent(slug)}`
  );
  return unwrap(res);
}

export async function campaignPublicCertificate(token: string): Promise<CampaignCertificateData> {
  const res = await apiGet<{ success: boolean; data: CampaignCertificateData }>(
    `${pub}/certificates/${encodeURIComponent(token)}`
  );
  return unwrap(res);
}

export function campaignCertificatePdfUrl(token: string): string {
  return `/api/v1/campaign/public/certificates/${encodeURIComponent(token)}/pdf`;
}

/** Download certificate PDF (base64 JSON response from API). */
export async function campaignCertificatePdfDownload(token: string): Promise<void> {
  const res = await apiGet<{ success: boolean; data?: { pdf?: string; filename?: string } }>(
    campaignCertificatePdfUrl(token)
  );
  const payload = res?.data ?? (res as unknown as { pdf?: string; filename?: string });
  const pdf = payload?.pdf;
  if (!pdf) {
    throw new Error("PDF not available. Try opening the certificate preview instead.");
  }
  const binary = atob(pdf);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = payload.filename || `certificate-${token}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// —— Staff ——

export async function campaignStaffCheckIn(identifier: string, locationId: number): Promise<unknown> {
  const res = await apiPost<{ success: boolean; data: unknown }>(`${staff}/check-in`, { identifier, locationId });
  return unwrap(res);
}

export async function campaignStaffValidateQr(token: string): Promise<{ valid: boolean; bookingRef?: string }> {
  const res = await apiPost<{
    success: boolean;
    data: { valid: boolean; booking?: { bookingRef?: string } };
  }>(`${staff}/qr/validate`, {
    token,
  });
  const data = res.data ?? { valid: res.success };
  return {
    valid: !!data.valid,
    bookingRef: data.booking?.bookingRef,
  };
}

export async function campaignStaffGetBooking(idOrRef: string): Promise<CampaignBookingRow> {
  const res = await apiGet<{ success: boolean; data: CampaignBookingRow }>(
    `${staff}/bookings/${encodeURIComponent(idOrRef)}`
  );
  return unwrap(res);
}

export async function campaignStaffQueue(locationId: number): Promise<CampaignQueueItem[]> {
  const res = await apiGet<{ success: boolean; data: CampaignQueueItem[] }>(
    `${staff}/locations/${locationId}/queue`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export type CampaignStaffDashboardStats = {
  waiting: number;
  inProgress: number;
  queue: CampaignQueueItem[];
};

export function summarizeQueue(queue: CampaignQueueItem[]): CampaignStaffDashboardStats {
  const items = queue ?? [];
  return {
    waiting: items.filter((q) => q.status === "CHECKED_IN").length,
    inProgress: items.filter((q) => q.status === "IN_PROGRESS").length,
    queue: items,
  };
}

export async function campaignStaffRecordVaccination(body: {
  campaignPetId: number;
  vaccineTypeId: number;
  batchNumber: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
}): Promise<{ success: boolean; vaccinationId?: number; certificateToken?: string }> {
  const res = await apiPost<{ success: boolean; data: { success: boolean; vaccinationId?: number; certificateToken?: string } }>(
    `${staff}/vaccinations/record`,
    body
  );
  return unwrap(res);
}

// —— National rollout ——

export type RolloutPhaseRow = {
  id: number;
  phaseCode: string;
  name: string;
  description?: string | null;
  status: string;
  sortOrder: number;
  nationwideGoalPets: number;
  startDate?: string | null;
  endDate?: string | null;
  regions?: RolloutRegionRow[];
};

export type RolloutRegionRow = {
  id: number;
  phaseId: number;
  campaignId: number;
  divisionId?: number | null;
  districtId?: number | null;
  upazilaId?: number | null;
  city?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  locationId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  targetCapacity: number;
  bookedCount?: number;
  isActive: boolean;
};

export type BdGeoRow = { id: number; nameEn: string; code?: string };

export async function campaignAdminRolloutPhases(campaignId: number): Promise<RolloutPhaseRow[]> {
  const res = await apiGet<{ success: boolean; data: RolloutPhaseRow[] }>(
    `${admin}/campaigns/${campaignId}/rollout/phases`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminCreateRolloutPhase(body: Record<string, unknown>): Promise<RolloutPhaseRow> {
  const res = await apiPost<{ success: boolean; data: RolloutPhaseRow }>(`${admin}/rollout/phases`, body);
  return unwrap(res);
}

export async function campaignAdminUpdateRolloutPhase(id: number, body: Record<string, unknown>): Promise<RolloutPhaseRow> {
  const res = await apiPatch<{ success: boolean; data: RolloutPhaseRow }>(`${admin}/rollout/phases/${id}`, body);
  return unwrap(res);
}

export async function campaignAdminCreateRolloutRegion(body: Record<string, unknown>): Promise<RolloutRegionRow> {
  const res = await apiPost<{ success: boolean; data: RolloutRegionRow }>(`${admin}/rollout/regions`, body);
  return unwrap(res);
}

export async function campaignAdminUpdateRolloutRegion(id: number, body: Record<string, unknown>): Promise<RolloutRegionRow> {
  const res = await apiPatch<{ success: boolean; data: RolloutRegionRow }>(`${admin}/rollout/regions/${id}`, body);
  return unwrap(res);
}

export async function campaignAdminRolloutRegionStats(campaignId: number, regionId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/rollout/regions/${regionId}/stats`
  );
  return unwrap(res);
}

export async function campaignAdminCheckoutSessions(campaignId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/checkout-sessions`
  );
  return unwrap(res);
}

export async function campaignPublicBdDistricts(divisionId: number): Promise<BdGeoRow[]> {
  const res = await apiGet<{ success: boolean; data: BdGeoRow[] }>(
    `${pub}/rollout/districts?divisionId=${divisionId}`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignPublicBdUpazilas(districtId: number): Promise<BdGeoRow[]> {
  const res = await apiGet<{ success: boolean; data: BdGeoRow[] }>(
    `${pub}/rollout/upazilas?districtId=${districtId}`
  );
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function campaignAdminPreBookingDashboard(campaignId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/rollout/dashboard/pre-bookings`
  );
  return unwrap(res);
}

export async function campaignAdminAreaDemandDashboard(campaignId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/rollout/dashboard/area-demand`
  );
  return unwrap(res);
}

export async function campaignAdminWaitingListDashboard(campaignId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/rollout/dashboard/waiting-list`
  );
  return unwrap(res);
}

export async function campaignAdminRolloutDemandReports(campaignId: number) {
  const res = await apiGet<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/rollout/reports/demand`
  );
  return unwrap(res);
}

export type DemandIntelligenceReport = {
  campaign: {
    id: number;
    name: string;
    pricePerCat: number;
    currency: string;
    pricingType: string;
    targetVaccinations?: number;
    startDate?: string;
    endDate?: string;
  };
  generatedAt: string;
  executiveSummary: {
    totalPreRegistrations: number;
    totalPreRegCats: number;
    totalBookings: number;
    totalBookingCats: number;
    totalVaccinated: number;
    conversionRate: number;
    currentDemandCats: number;
    projectedDemand: number;
    projectedRevenue: number;
    horizonDays: number;
    weeklyVelocityCats: number;
    forecast: {
      horizonDays: number;
      currentDemandCats: number;
      vaccinatedToDate: number;
      weeklyPreRegCats: number;
      weeklyBookingCats: number;
      projectedNewDemandCats: number;
      projectedTotalDemandCats: number;
      projectedVaccinations: number;
      confidence: string;
    };
  };
  geographic: {
    divisionRanking: Array<{ rank: number; divisionId: number; divisionName: string; totalCats: number; demandScore: number }>;
    districtRanking: Array<{
      rank: number;
      districtId: number;
      districtName: string;
      divisionName?: string | null;
      totalCats: number;
      demandScore: number;
      preRegCats: number;
      bookingCats: number;
    }>;
    upazilaRanking: Array<{ rank: number; upazilaId: number; upazilaName: string; districtName?: string | null; totalCats: number; demandScore: number }>;
    locationRanking: Array<{
      rank: number;
      locationId: number;
      locationName: string;
      totalCats: number;
      demandScore: number;
      utilizationPercent: number;
      isActive: boolean;
    }>;
    topAreas: Array<{ rank: number; areaName: string; districtName: string | null; totalCats: number; demandScore: number }>;
    heatmap: {
      division: Array<{ id: number; name: string; demandScore: number; totalCats: number }>;
      district: Array<{ id: number; name: string; demandScore: number; totalCats: number; latitude?: number | null; longitude?: number | null }>;
      upazila: Array<{ id: number; name: string; demandScore: number; totalCats: number }>;
      area: Array<{ id: number; name: string; demandScore: number; totalCats: number }>;
    };
  };
  vaccineForecast: {
    vaccinesPerCat: number;
    requiredQuantity: number;
    bufferPercent: number;
    bufferQuantity: number;
    totalWithBuffer: number;
    availableInventory: number;
    netShortage: number;
    hasShortageWarning: boolean;
    byVaccine: Array<{
      vaccineId: number;
      name: string;
      totalRequired: number;
      availableInventory: number | null;
      shortage: number;
      hasShortage: boolean;
    }>;
  };
  resourcePlanning: {
    recommendedDoctors: number;
    recommendedVolunteers: number;
    recommendedCoordinators: number;
    currentStaff: { vaccinators: number; support: number; coordinators: number; total: number };
    requiredSlots: number;
    existingSlots: number;
    openSlotCapacity: number;
    estimatedWorkingDays: number;
    catsPerDayCapacity: number;
    dailyCapacityAnalysis: Array<{ date: string; totalCapacity: number; booked: number; utilizationPercent: number }>;
    capacityByDistrict: Array<{
      districtId: number;
      districtName: string;
      totalDemandCats: number;
      currentCapacity: number;
      recommendedCapacity: number;
      capacityGap: number;
      priority: string;
    }>;
  };
  recommendations: Array<{
    id: string;
    category: string;
    priority: string;
    title: string;
    detail: string;
    actionHint?: string;
  }>;
  charts: {
    demandTrend: Array<{
      date: string;
      preRegCats: number;
      bookingCats: number;
      vaccinations: number;
    }>;
    districtComparison: Array<{ name: string; totalCats: number; demandScore: number }>;
    vaccineDemand: Array<{ name: string; totalRequired: number; available: number }>;
    capacityUtilization: Array<{ date: string; capacity: number; booked: number; utilization: number }>;
  };
  summary: {
    topRequestedAreas: Array<{ rank: number; areaName: string; totalCats: number; demandScore: number }>;
    topRequestedDistricts: Array<{ rank: number; districtName: string; totalCats: number; demandScore: number }>;
    projectedVaccineDemand: number;
    projectedRevenue: number;
    currentDemandCats: number;
    totalPreRegistrations: number;
    totalBookings: number;
  };
  heatmap: {
    district: Array<{ id: number; name: string; demandScore: number; totalCats: number; latitude?: number | null; longitude?: number | null }>;
    city: Array<{ id: number; name: string; demandScore: number; totalCats: number }>;
    area: Array<{ name: string; demandScore: number; totalCats: number }>;
  };
  districtRanking: Array<{
    rank: number;
    districtId: number;
    districtName: string;
    totalCats: number;
    demandScore: number;
    preRegCats: number;
    bookingCats: number;
  }>;
  vaccinationForecast: {
    horizonDays: number;
    projectedTotalDemandCats: number;
    projectedVaccinations: number;
    vaccinatedToDate: number;
    weeklyPreRegCats: number;
    weeklyBookingCats: number;
    confidence: string;
  };
  capacityRecommendations: Array<{
    districtId: number;
    districtName: string;
    totalDemandCats: number;
    currentCapacity: number;
    recommendedCapacity: number;
    capacityGap: number;
    priority: string;
  }>;
  tracking: {
    districtDemand: Array<{ rank: number; districtName: string; totalCats: number }>;
    cityDemand: Array<{ rank: number; upazilaName?: string; cityName?: string; totalCats: number }>;
    areaDemand: Array<{ rank: number; areaName: string; totalCats: number }>;
  };
};

export async function campaignAdminDemandIntelligence(campaignId: number): Promise<DemandIntelligenceReport> {
  const res = await apiGet<{ success: boolean; data: DemandIntelligenceReport }>(
    `${admin}/campaigns/${campaignId}/demand-intelligence`
  );
  return unwrap(res);
}

export async function campaignAdminNotifyPreRegistered(
  campaignId: number,
  body?: { regionId?: number; phaseId?: number }
) {
  const res = await apiPost<{ success: boolean; data: { notified: number } }>(
    `${admin}/campaigns/${campaignId}/rollout/notify-pre-registered`,
    body ?? {}
  );
  return unwrap(res);
}

export async function campaignPublicBdDivisions(): Promise<BdGeoRow[]> {
  const res = await apiGet<{ success: boolean; data: BdGeoRow[] }>(`${pub}/rollout/divisions`);
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export const CAMPAIGN_CTX_KEY = "bpa_campaign_ctx";

export type CampaignStaffContext = {
  campaignId: number;
  campaignName: string;
  campaignSlug?: string;
  locationId: number;
  locationName: string;
};

export function loadCampaignStaffContext(): CampaignStaffContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CAMPAIGN_CTX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CampaignStaffContext;
  } catch {
    return null;
  }
}

export function saveCampaignStaffContext(ctx: CampaignStaffContext) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CAMPAIGN_CTX_KEY, JSON.stringify(ctx));
}

export function campaignCertificateUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/api/v1/campaign/public/certificates/${encodeURIComponent(token)}`;
}

/** Booking route segment — prefer bookingRef for staff API compatibility. */
export function campaignBookingPath(booking: { bookingRef: string; id?: number }): string {
  return encodeURIComponent(booking.bookingRef);
}

// ============================================================================
// Campaign Config Engine
// ============================================================================

export type CampaignConfigData = {
  campaignId: number;
  version: number;
  bookingEnabled: boolean;
  onlinePaymentEnabled: boolean;
  payAtVenueEnabled: boolean;
  walkInAllowed: boolean;
  approvalRequired: boolean;
  slotRequired: boolean;
  autoCloseWhenFull: boolean;
  maxCapacity: number;
  maxCatsPerBooking: number;
  showRemainingSlots: boolean;
  lateBookingAllowed: boolean;
};

export async function campaignAdminGetConfig(campaignId: number): Promise<CampaignConfigData> {
  const r = await apiGet(`${admin}/campaigns/${campaignId}/config`);
  return r.data;
}

export async function campaignAdminUpdateConfig(
  campaignId: number,
  data: Partial<CampaignConfigData>,
): Promise<CampaignConfigData> {
  const r = await apiPatch(`${admin}/campaigns/${campaignId}/config`, data);
  return r.data;
}

export async function campaignAdminSaveConfig(
  campaignId: number,
  data: Partial<CampaignConfigData>,
): Promise<CampaignConfigData> {
  const r = await apiPut(`${admin}/campaigns/${campaignId}/config`, data);
  return (r as any).data;
}

export type CampaignConfigHistoryEntry = {
  id: number;
  campaignId: number;
  version: number;
  changedBy: number | null;
  changeReason: string | null;
  configJson: Record<string, unknown>;
  createdAt: string;
};

export async function campaignAdminGetConfigHistory(
  campaignId: number,
): Promise<CampaignConfigHistoryEntry[]> {
  const r = await apiGet(`${admin}/campaigns/${campaignId}/config/history`);
  return r.data;
}

// ============================================================================
// Campaign Analytics
// ============================================================================

export type CampaignAnalyticsData = {
  bookingsByLocation: Array<{
    locationId: number;
    locationName: string;
    address: string | null;
    dailyCapacity: number;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
  }>;
  bookingsByCoverageZone: Array<{
    rowKey?: string;
    coverageZoneId: number | null;
    coverageZoneName: string | null;
    coverageZoneSlug: string | null;
    city: string | null;
    zoneType: string | null;
    bookingArea: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
  }>;
  bookingsByBdArea?: Array<{
    bdAreaId: number | null;
    areaCode: string | null;
    areaName: string;
    coverageZoneName: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
  }>;
  bookingsByArea?: Array<{
    bdAreaId: number | null;
    areaName: string;
    coverageZoneName?: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
  }>;
  catsByZone?: Array<{ coverageZoneId: number | null; coverageZoneName: string | null; totalCats: number }>;
  catsByArea?: Array<{ bdAreaId: number | null; areaName: string; totalCats: number }>;
  revenueByZone?: Array<{ coverageZoneId: number | null; coverageZoneName: string | null; totalRevenue: number }>;
  revenueByArea?: Array<{ bdAreaId: number | null; areaName: string; totalRevenue: number }>;
  revenueByLocation: Array<{
    locationId: number;
    locationName: string;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
  }>;
  paymentAnalytics: {
    onlinePayments: number;
    onlineRevenue: number;
    venuePayments: number;
    venueRevenue: number;
    pendingPayments: number;
    expectedRevenue: number;
    collectedRevenue: number;
    revenue: number;
    totalBookings: number;
    paymentSplit: Array<{ channel: string; count: number; amountBdt: number }>;
  };
  topLocations: Array<{
    rank: number;
    locationId: number;
    locationName: string;
    address: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
    totalVaccinations: number;
  }>;
  generatedAt: string;
};

export async function campaignAdminAnalytics(campaignId: number): Promise<CampaignAnalyticsData> {
  const r = await apiGet(`${admin}/campaigns/${campaignId}/analytics`);
  return r.data;
}

export type CampaignPlanningData = {
  campaign: {
    id: number;
    name: string;
    pricingType: string;
    priceAmount: unknown;
    startDate: string;
    endDate: string;
  } | null;
  pendingVenueAssignment: number;
  topZones: Array<{
    rank: number;
    coverageZoneId: number | null;
    coverageZoneName: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
    expectedRevenue: number;
  }>;
  topAreas: Array<{
    rank: number;
    bdAreaId: number | null;
    areaName: string;
    coverageZoneName: string | null;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
    expectedRevenue: number;
  }>;
  demandRanking: Array<{
    rank?: number;
    coverageZoneId?: number | null;
    coverageZoneName?: string | null;
    bdAreaId?: number | null;
    areaName?: string;
    totalBookings: number;
    totalCats: number;
    totalRevenue: number;
    expectedRevenue?: number;
  }>;
  zoneDemand: CampaignAnalyticsData['bookingsByCoverageZone'];
  areaDemand: NonNullable<CampaignAnalyticsData['bookingsByBdArea']>;
  generatedAt: string;
};

export async function campaignAdminPlanning(campaignId: number): Promise<CampaignPlanningData> {
  const r = await apiGet(`${admin}/campaigns/${campaignId}/planning`);
  return r.data;
}

export async function campaignAdminAssignBookingVenue(
  bookingId: number,
  body: { locationId: number; slotId: number; bookingDate?: string }
): Promise<unknown> {
  const r = await apiPost(`${admin}/bookings/${bookingId}/assign-venue`, body);
  return r.data;
}

// ============================================================================
// Exports (CSV / XLSX / PDF)
// ============================================================================

const exportAccept =
  "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,*/*;q=0.8";

export async function campaignAdminExportBookings(
  campaignId: number,
  format: CampaignExportFormat,
  params?: CampaignBookingListParams
): Promise<void> {
  const sp = new URLSearchParams({ format });
  appendBookingListParams(sp, params);
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  await campaignDownloadBlob(
    `${admin}/campaigns/${campaignId}/bookings/export?${sp}`,
    `campaign-${campaignId}-bookings.${ext}`,
    exportAccept
  );
}

export async function campaignAdminExportAnalytics(
  campaignId: number,
  format: CampaignExportFormat
): Promise<void> {
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  await campaignDownloadBlob(
    `${admin}/campaigns/${campaignId}/analytics/export?format=${format}`,
    `campaign-${campaignId}-analytics.${ext}`,
    exportAccept
  );
}

// ============================================================================
// SMS Center
// ============================================================================

export type CampaignSmsLogRow = {
  id: number;
  bookingId: number | null;
  phone: string;
  templateCode: string | null;
  message: string;
  status: string;
  provider: string | null;
  segmentCount: number | null;
  estimatedCostBdt: number | null;
  errorMessage: string | null;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
};

export type CampaignSmsCostSummary = {
  campaignId?: number;
  from: string;
  to: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalSegments: number;
  estimatedCostBdt: number;
  byProvider: Record<string, { count: number; segments: number; costBdt: number }>;
  byTemplate: Record<string, { count: number; costBdt: number }>;
};

export async function campaignAdminSmsLogs(
  campaignId: number,
  params?: { page?: number; pageSize?: number; status?: string }
): Promise<{ items: CampaignSmsLogRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  const r = await apiGet<{ success: boolean; data: { items: CampaignSmsLogRow[]; total: number; page: number; pageSize: number; totalPages: number } }>(
    `${admin}/campaigns/${campaignId}/sms/logs${qs ? `?${qs}` : ""}`
  );
  return r.data;
}

export async function campaignAdminSmsCostSummary(campaignId: number): Promise<CampaignSmsCostSummary> {
  const r = await apiGet<{ success: boolean; data: CampaignSmsCostSummary }>(
    `${admin}/campaigns/${campaignId}/sms/cost-summary`
  );
  return r.data;
}

export type CampaignSmsTemplateRow = {
  id: number;
  campaignId: number;
  code: string;
  template: string;
  isActive: boolean;
};

export async function campaignAdminSmsTemplates(campaignId: number): Promise<CampaignSmsTemplateRow[]> {
  const r = await apiGet<{ success: boolean; data: CampaignSmsTemplateRow[] }>(
    `${admin}/campaigns/${campaignId}/sms/templates`
  );
  return r.data ?? [];
}

export async function campaignAdminUpsertSmsTemplate(
  campaignId: number,
  body: { code: string; template: string; isActive?: boolean }
): Promise<CampaignSmsTemplateRow> {
  const r = await apiPut<{ success: boolean; data: CampaignSmsTemplateRow }>(
    `${admin}/campaigns/${campaignId}/sms/templates`,
    body
  );
  return r.data;
}

export type BulkSmsResult = {
  dryRun: boolean;
  recipientCount: number;
  queued: number;
  failed: number;
  skipped: number;
  errors: string[];
};

export async function campaignAdminRecoverStuckSms(campaignId: number): Promise<unknown> {
  const r = await apiPost<{ success: boolean; data: unknown }>(
    `${admin}/campaigns/${campaignId}/sms/recover-stuck`,
    {}
  );
  return r.data;
}

export async function campaignAdminSendBulkSms(
  campaignId: number,
  body: {
    message: string;
    phones?: string[];
    sendToAll?: boolean;
    bookingStatus?: string;
    locationIds?: number[];
    bookingDate?: string;
    dryRun?: boolean;
  }
): Promise<BulkSmsResult> {
  const r = await apiPost<{ success: boolean; data: BulkSmsResult }>(
    `${admin}/campaigns/${campaignId}/sms/bulk`,
    body
  );
  return r.data;
}
