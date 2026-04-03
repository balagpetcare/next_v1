/**
 * URL-serializable medicine listings filter state (admin search console).
 * Keep keys stable — bookmarks and presets depend on them.
 */

import type { MedicineListingsListParams } from "@/lib/adminApi";

/** Next `useSearchParams()` or `URLSearchParams`. */
export type SearchParamsLike = { get: (key: string) => string | null };

export type ListingStatus = "all" | "active" | "inactive";
export type PrescriptionState = "all" | "yes" | "no";
export type SortByField = "id" | "createdAt" | "countryId";

export type EntityPick = { id: number; label: string };

export type RelatedExpandFlags = {
  genericFamily: boolean;
  brandVariants: boolean;
  dosageSiblings: boolean;
  /** Schema has no indication; reserved for future API. */
  indicationFamily: boolean;
};

export type MedicineListingsFilterState = {
  q: string;
  countryId: string;
  includeArchived: boolean;
  listingStatus: ListingStatus;
  prescriptionState: PrescriptionState;
  sortBy: SortByField;
  sortDir: "asc" | "desc";
  page: number;
  limit: number;
  genericPick: EntityPick | null;
  brandPick: EntityPick | null;
  dosageFormPick: EntityPick | null;
  manufacturerPick: EntityPick | null;
  brandContains: string;
  genericContains: string;
  manufacturerContains: string;
  dosageFormContains: string;
  strengthContains: string;
  packageContains: string;
  sourceType: "" | "imported" | "manual";
  importBatchId: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  importDateFrom: string;
  importDateTo: string;
  importedByUserId: string;
  related: RelatedExpandFlags;
  advancedOpen: boolean;
};

/** Clear conflicting contains when exact picks win; reset page on apply. */
export function normalizeMedicineListingsFiltersForApply(s: MedicineListingsFilterState): MedicineListingsFilterState {
  return {
    ...s,
    page: 1,
    genericContains: s.genericPick ? "" : s.genericContains,
    brandContains: s.brandPick ? "" : s.brandContains,
    dosageFormContains: s.dosageFormPick ? "" : s.dosageFormContains,
    manufacturerContains: s.manufacturerPick ? "" : s.manufacturerContains,
  };
}

export const DEFAULT_MEDICINE_LISTINGS_FILTER_STATE: MedicineListingsFilterState = {
  q: "",
  countryId: "",
  includeArchived: false,
  listingStatus: "all",
  prescriptionState: "all",
  sortBy: "id",
  sortDir: "desc",
  page: 1,
  limit: 25,
  genericPick: null,
  brandPick: null,
  dosageFormPick: null,
  manufacturerPick: null,
  brandContains: "",
  genericContains: "",
  manufacturerContains: "",
  dosageFormContains: "",
  strengthContains: "",
  packageContains: "",
  sourceType: "",
  importBatchId: "",
  createdFrom: "",
  createdTo: "",
  updatedFrom: "",
  updatedTo: "",
  importDateFrom: "",
  importDateTo: "",
  importedByUserId: "",
  related: {
    genericFamily: false,
    brandVariants: false,
    dosageSiblings: false,
    indicationFamily: false,
  },
  advancedOpen: false,
};

function readBool(sp: SearchParamsLike, key: string): boolean {
  const v = sp.get(key);
  return v === "1" || v === "true";
}

function readInt(sp: SearchParamsLike, key: string): number | null {
  const n = Number(sp.get(key));
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function readPick(sp: SearchParamsLike, idKey: string, labelKey: string): EntityPick | null {
  const id = readInt(sp, idKey);
  if (id == null) return null;
  const raw = sp.get(labelKey);
  const label = raw ? decodeURIComponent(raw.replace(/\+/g, " ")) : "";
  return { id, label: label || `#${id}` };
}

function setPick(sp: URLSearchParams, idKey: string, labelKey: string, pick: EntityPick | null) {
  if (!pick) {
    sp.delete(idKey);
    sp.delete(labelKey);
    return;
  }
  sp.set(idKey, String(pick.id));
  if (pick.label && !pick.label.startsWith("#")) sp.set(labelKey, encodeURIComponent(pick.label));
  else sp.delete(labelKey);
}

function serializeRelated(r: RelatedExpandFlags): string {
  const parts: string[] = [];
  if (r.genericFamily) parts.push("genericFamily");
  if (r.brandVariants) parts.push("brandVariants");
  if (r.dosageSiblings) parts.push("dosageSiblings");
  if (r.indicationFamily) parts.push("indicationFamily");
  return parts.join(",");
}

function parseRelated(s: string | null): RelatedExpandFlags {
  const set = new Set((s || "").split(",").map((x) => x.trim()).filter(Boolean));
  return {
    genericFamily: set.has("genericFamily"),
    brandVariants: set.has("brandVariants"),
    dosageSiblings: set.has("dosageSiblings"),
    indicationFamily: set.has("indicationFamily"),
  };
}

/** Parse Next.js search params into filter state (defaults for missing keys). */
export function parseMedicineListingsFiltersFromSearchParams(sp: SearchParamsLike): MedicineListingsFilterState {
  const base = { ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE };
  const q = sp.get("q") ?? "";
  const countryId = sp.get("countryId") ?? "";
  const page = readInt(sp, "page") ?? 1;
  const limitRaw = readInt(sp, "limit");
  const limit = limitRaw != null ? Math.min(100, Math.max(5, limitRaw)) : 25;

  const st = (sp.get("listingStatus") || sp.get("st") || "all") as ListingStatus;
  const listingStatus = st === "active" || st === "inactive" ? st : "all";

  const rx = (sp.get("prescriptionState") || sp.get("rx") || "all") as PrescriptionState;
  const prescriptionState = rx === "yes" || rx === "no" ? rx : "all";

  const sortBy = (sp.get("sortBy") || "id") as SortByField;
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

  return {
    ...base,
    q,
    countryId,
    includeArchived: readBool(sp, "includeArchived") || readBool(sp, "arch"),
    listingStatus,
    prescriptionState,
    sortBy: sortBy === "createdAt" || sortBy === "countryId" ? sortBy : "id",
    sortDir,
    page: Math.max(1, page),
    limit,
    genericPick: readPick(sp, "genericId", "genericLabel"),
    brandPick: readPick(sp, "brandId", "brandLabel"),
    dosageFormPick: readPick(sp, "dosageFormId", "dosageFormLabel"),
    manufacturerPick: readPick(sp, "manufacturerId", "manufacturerLabel"),
    brandContains: sp.get("brandContains") ?? sp.get("brandQ") ?? "",
    genericContains: sp.get("genericContains") ?? sp.get("genericQ") ?? "",
    manufacturerContains: sp.get("manufacturerContains") ?? sp.get("manufacturerQ") ?? "",
    dosageFormContains: sp.get("dosageFormContains") ?? sp.get("dosageFormQ") ?? "",
    strengthContains: sp.get("strengthContains") ?? sp.get("strengthQ") ?? "",
    packageContains: sp.get("packageContains") ?? sp.get("packageQ") ?? "",
    sourceType: (sp.get("sourceType") as MedicineListingsFilterState["sourceType"]) || "",
    importBatchId: sp.get("importBatchId") ?? "",
    createdFrom: sp.get("createdFrom") ?? "",
    createdTo: sp.get("createdTo") ?? "",
    updatedFrom: sp.get("updatedFrom") ?? "",
    updatedTo: sp.get("updatedTo") ?? "",
    importDateFrom: sp.get("importDateFrom") ?? "",
    importDateTo: sp.get("importDateTo") ?? "",
    importedByUserId: sp.get("importedByUserId") ?? sp.get("impBy") ?? "",
    related: parseRelated(sp.get("relatedExpand") || sp.get("rel")),
    advancedOpen: readBool(sp, "advancedOpen") || readBool(sp, "adv"),
  };
}

/** Serialize filter state to query string (omit defaults). */
export function serializeMedicineListingsFiltersToSearchParams(state: MedicineListingsFilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.q.trim()) sp.set("q", state.q.trim());
  if (state.countryId) sp.set("countryId", state.countryId);
  if (state.includeArchived) sp.set("includeArchived", "1");
  if (state.listingStatus !== "all") sp.set("listingStatus", state.listingStatus);
  if (state.prescriptionState !== "all") sp.set("prescriptionState", state.prescriptionState);
  if (state.sortBy !== "id") sp.set("sortBy", state.sortBy);
  if (state.sortDir !== "desc") sp.set("sortDir", state.sortDir);
  if (state.page > 1) sp.set("page", String(state.page));
  if (state.limit !== 25) sp.set("limit", String(state.limit));

  setPick(sp, "genericId", "genericLabel", state.genericPick);
  setPick(sp, "brandId", "brandLabel", state.brandPick);
  setPick(sp, "dosageFormId", "dosageFormLabel", state.dosageFormPick);
  setPick(sp, "manufacturerId", "manufacturerLabel", state.manufacturerPick);

  const setIf = (k: string, v: string) => {
    if (v.trim()) sp.set(k, v.trim());
  };
  setIf("brandContains", state.brandContains);
  setIf("genericContains", state.genericContains);
  setIf("manufacturerContains", state.manufacturerContains);
  setIf("dosageFormContains", state.dosageFormContains);
  setIf("strengthContains", state.strengthContains);
  setIf("packageContains", state.packageContains);
  if (state.sourceType) sp.set("sourceType", state.sourceType);
  if (state.importBatchId.trim()) sp.set("importBatchId", state.importBatchId.trim());
  setIf("createdFrom", state.createdFrom);
  setIf("createdTo", state.createdTo);
  setIf("updatedFrom", state.updatedFrom);
  setIf("updatedTo", state.updatedTo);
  setIf("importDateFrom", state.importDateFrom);
  setIf("importDateTo", state.importDateTo);
  if (state.importedByUserId.trim()) sp.set("importedByUserId", state.importedByUserId.trim());

  const rel = serializeRelated(state.related);
  if (rel) sp.set("relatedExpand", rel);
  if (state.advancedOpen) sp.set("advancedOpen", "1");

  return sp;
}

export function medicineFilterStateToListParams(state: MedicineListingsFilterState, debouncedQ: string): MedicineListingsListParams {
  const batchNum = state.importBatchId.trim() ? Number(state.importBatchId) : undefined;
  const safeBatchId = batchNum != null && Number.isFinite(batchNum) ? Math.floor(batchNum) : undefined;

  return {
    countryId: state.countryId ? Number(state.countryId) : undefined,
    q: debouncedQ.trim() || undefined,
    page: state.page,
    limit: state.limit,
    includeArchived: state.includeArchived,
    isActive: state.listingStatus === "all" ? undefined : state.listingStatus === "active",
    hasPrescriptions:
      state.prescriptionState === "yes" ? true : state.prescriptionState === "no" ? false : undefined,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    brandQ: state.brandContains.trim() || undefined,
    genericQ: state.genericContains.trim() || undefined,
    dosageFormQ: state.dosageFormContains.trim() || undefined,
    strengthQ: state.strengthContains.trim() || undefined,
    manufacturerQ: state.manufacturerContains.trim() || undefined,
    packageQ: state.packageContains.trim() || undefined,
    sourceType: state.sourceType || undefined,
    importBatchId: safeBatchId,
    genericId: state.genericPick?.id,
    brandId: state.brandPick?.id,
    dosageFormId: state.dosageFormPick?.id,
    manufacturerId: state.manufacturerPick?.id,
    listingCreatedAtFrom: state.createdFrom.trim() || undefined,
    listingCreatedAtTo: state.createdTo.trim() || undefined,
    listingUpdatedAtFrom: state.updatedFrom.trim() || undefined,
    listingUpdatedAtTo: state.updatedTo.trim() || undefined,
    firstBatchCreatedAtFrom: state.importDateFrom.trim() || undefined,
    firstBatchCreatedAtTo: state.importDateTo.trim() || undefined,
    firstBatchUploadedByUserId: state.importedByUserId.trim() ? Number(state.importedByUserId) : undefined,
    relatedExpand: serializeRelated(state.related) || undefined,
  };
}
