/* 
 * Location normalization helpers
 * SOURCE: org location flow from components/LocationPicker.jsx
 */

export type LocationSource = "map" | "search" | "gps" | "manual" | "recent";

export type LocationValue = {
  countryCode: string;
  countryName?: string;

  state?: string;
  city?: string;
  postalCode?: string;

  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  areaId?: string;
  wardId?: string;

  formattedAddress?: string;
  lat?: number;
  lng?: number;

  source?: LocationSource;

  // Legacy/back-compat fields (kept optional)
  admin1?: string;
  stateName?: string;
  cityName?: string;
  bdAreaId?: string | number | null;
  dhakaAreaId?: string | number | null;
  cityCorporationId?: string | number | null;
  cityCorporationCode?: string | null;
  fullPathText?: string | null;
  text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  kind?: string | null;
  provider?: string | null;
  providerPlaceId?: string | null;
  addressLine?: string | null;
  /** Organization type code when present (e.g. from org context) */
  orgTypeCode?: string | null;
};

type MaybeNumber = string | number | null | undefined;

function numOrNull(x: MaybeNumber): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(x: unknown): string | null {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s ? s : null;
}

/** Like strOrNull but preserves spaces (for address line). Only null for undefined/null/empty string. */
function strOrNullPreserveSpaces(x: unknown): string | null {
  if (x === null || x === undefined) return null;
  const s = String(x);
  return s === "" ? null : s;
}

function asId(x: MaybeNumber): string | undefined {
  const s = strOrNull(x);
  return s === null ? undefined : s;
}

function pickFormattedAddress(input: any): string | undefined {
  return (
    strOrNull(input?.formattedAddress) ||
    strOrNull(input?.fullPathText) ||
    strOrNull(input?.text) ||
    strOrNull(input?.addressLine) ||
    undefined
  );
}

/**
 * Normalize any location-like object into the unified LocationValue shape.
 */
export function normalizeLocation(
  input: any,
  defaultCountryCode = "BD"
): LocationValue | null {
  const cc =
    strOrNull(input?.countryCode || input?.country || input?.cc) ||
    defaultCountryCode;
  if (!cc) return null;

  const state =
    strOrNull(input?.state) ||
    strOrNull(input?.stateName) ||
    strOrNull(input?.admin1);
  const city =
    strOrNull(input?.city) ||
    strOrNull(input?.cityName) ||
    strOrNull(input?.town);
  const postalCode = strOrNull(input?.postalCode || input?.zip);

  const divisionId =
    asId(input?.divisionId) || asId(input?.bdDivision) || undefined;
  const districtId =
    asId(input?.districtId) || asId(input?.bdDistrict) || undefined;
  const upazilaId =
    asId(input?.upazilaId) || asId(input?.bdUpazila) || undefined;
  const areaId =
    asId(input?.areaId) ||
    asId(input?.bdAreaId) ||
    asId(input?.dhakaAreaId) ||
    asId(input?.bdWard) ||
    undefined;

  const wardId = asId(input?.wardId) || undefined;

  const lat = numOrNull(input?.lat ?? input?.latitude ?? input?.geoLat);
  const lng = numOrNull(input?.lng ?? input?.longitude ?? input?.geoLng);

  const formattedAddress = pickFormattedAddress(input);

  const source = input?.source as LocationSource | undefined;

  return {
    countryCode: cc.toUpperCase(),
    countryName: strOrNull(input?.countryName) || undefined,
    state: state || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    divisionId,
    districtId,
    upazilaId,
    areaId,
    wardId,
    formattedAddress: formattedAddress || undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    source,

    // carry legacy/back-compat fields
    admin1: state || undefined,
    stateName: state || undefined,
    cityName: city || undefined,
    bdAreaId: areaId ?? undefined,
    dhakaAreaId: asId(input?.dhakaAreaId) ?? undefined,
    cityCorporationId: asId(input?.cityCorporationId) ?? undefined,
    cityCorporationCode: strOrNull(input?.cityCorporationCode) ?? undefined,
    fullPathText: formattedAddress || null,
    text: formattedAddress || null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    kind: strOrNull(input?.kind) || null,
    provider: strOrNull(input?.provider) || null,
    providerPlaceId: strOrNull(input?.providerPlaceId) || null,
    addressLine: strOrNullPreserveSpaces(input?.addressLine) ?? null,
  };
}

/**
 * Derive a display string from normalized fields if formattedAddress absent.
 */
export function buildDisplayAddress(value: LocationValue): string | null {
  if (!value) return null;
  if (value.formattedAddress) return value.formattedAddress;
  const parts = [
    value.city,
    value.state,
    value.postalCode,
    value.countryCode,
  ].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (value.lat != null && value.lng != null) {
    return `${value.lat}, ${value.lng}`;
  }
  return null;
}

/**
 * Enrich normalized LocationValue with legacy fields for backward compatibility.
 */
export function withLegacyLocationFields(
  base: LocationValue,
  prev?: any
): LocationValue {
  const display = buildDisplayAddress(base);
  const formatted = base.formattedAddress || display || null;
  const lat = base.lat ?? null;
  const lng = base.lng ?? null;
  const areaId = base.areaId ?? base.bdAreaId;

  const derivedKind =
    base.kind ||
    (base.dhakaAreaId ? "DHAKA_AREA" : areaId ? "BD_AREA" : lat && lng ? "COORDINATES" : null);

  return {
    ...prev,
    ...base,
    orgTypeCode: (prev as { orgTypeCode?: string | null } | undefined)?.orgTypeCode ?? undefined,
    admin1: base.state ?? prev?.admin1 ?? null,
    stateName: base.state ?? prev?.stateName ?? null,
    cityName: base.city ?? prev?.cityName ?? null,
    bdAreaId: areaId ?? null,
    dhakaAreaId: base.dhakaAreaId ?? prev?.dhakaAreaId ?? null,
    cityCorporationId: base.cityCorporationId ?? prev?.cityCorporationId ?? null,
    cityCorporationCode: base.cityCorporationCode ?? prev?.cityCorporationCode ?? null,
    formattedAddress: formatted || null,
    fullPathText: formatted || null,
    text: formatted || null,
    latitude: lat,
    longitude: lng,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    kind: derivedKind,
  };
}

/**
 * Build addressJson payload compatible with existing backend expectations.
 */
export function locationValueToAddressJson(
  value: any,
  options?: { addressText?: string }
): Record<string, any> {
  const normalized = normalizeLocation(value);
  if (!normalized) return {};
  const enriched = withLegacyLocationFields(normalized, value);
  const text = options?.addressText ?? enriched.text ?? enriched.fullPathText ?? "";

  const numOrUndefined = (v: any) => {
    const n = numOrNull(v);
    return n === null ? undefined : n;
  };

  return {
    text,
    orgTypeCode: enriched?.orgTypeCode,
    locationKind: enriched.kind ?? null,
    countryCode: normalized.countryCode,
    countryName: enriched.countryName ?? null,
    stateName: enriched.state ?? enriched.stateName ?? null,
    cityName: enriched.city ?? enriched.cityName ?? null,
    postalCode: enriched.postalCode ?? null,
    addressLine: enriched.addressLine ?? null,
    formattedAddress: enriched.formattedAddress ?? null,
    provider: enriched.provider ?? null,
    providerPlaceId: enriched.providerPlaceId ?? null,
    cityCorporationId: enriched.cityCorporationId ?? null,
    cityCorporationCode: enriched.cityCorporationCode ?? null,
    dhakaAreaId: enriched.dhakaAreaId ?? null,
    bdAreaId: enriched.bdAreaId ?? null,
    areaId: enriched.bdAreaId ?? null,
    divisionId: numOrUndefined(enriched.divisionId),
    districtId: numOrUndefined(enriched.districtId),
    upazilaId: numOrUndefined(enriched.upazilaId),
    fullPathText: enriched.fullPathText ?? text ?? null,
    latitude: numOrNull(enriched.latitude ?? enriched.lat),
    longitude: numOrNull(enriched.longitude ?? enriched.lng),
  };
}

/**
 * Build payload for POST /me/location/manual (backward compatible).
 */
export function locationValueToPlaceInput(
  value: any
): {
  countryCode: string;
  admin1?: string;
  admin2?: string;
  city?: string;
  postalCode?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  bdDivision?: string;
  bdDistrict?: string;
  bdUpazila?: string;
  bdWard?: string;
} | null {
  const normalized = normalizeLocation(value);
  if (!normalized) return null;
  const enriched = withLegacyLocationFields(normalized, value);
  const place: any = { countryCode: normalized.countryCode };

  // Unified: prefer state/city for all countries (no DB hierarchy)
  if (normalized.state) place.admin1 = normalized.state;
  if (normalized.city) place.city = normalized.city;
  if (normalized.postalCode) place.postalCode = normalized.postalCode;
  // Legacy BD mapping (when divisionId etc provided)
  if (normalized.countryCode === "BD" && enriched.divisionId) place.bdDivision = String(enriched.divisionId);
  if (normalized.countryCode === "BD" && enriched.districtId) place.bdDistrict = String(enriched.districtId);
  if (normalized.countryCode === "BD" && enriched.upazilaId) place.bdUpazila = String(enriched.upazilaId);
  if (normalized.countryCode === "BD" && enriched.bdAreaId) place.bdWard = String(enriched.bdAreaId);

  const formatted = enriched.formattedAddress ?? enriched.fullPathText ?? enriched.text;
  if (formatted) place.formattedAddress = formatted;

  if (enriched.lat != null) place.lat = enriched.lat;
  if (enriched.lng != null) place.lng = enriched.lng;

  return place;
}
