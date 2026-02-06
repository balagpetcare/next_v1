/**
 * API helpers for user location / LocationPlace.
 */
import { apiPost } from "./api";
import { locationValueToPlaceInput } from "@/src/lib/location/normalizeLocation";

/**
 * Build place payload for POST /api/v1/me/location/manual from LocationPicker value.
 */
export function locationToPlace(location: Record<string, unknown> | null | undefined): LocationPlaceInput | null {
  // Delegate to the normalized helper for backward compatibility
  // Supports both legacy shapes and the new LocationValue shape.
  const normalized = locationValueToPlaceInput(location);
  if (!normalized) return null;
  const place: LocationPlaceInput = { countryCode: normalized.countryCode };
  if (normalized.admin1) place.admin1 = normalized.admin1.slice(0, 255);
  if (normalized.admin2) place.admin2 = normalized.admin2.slice(0, 255);
  if (normalized.city) place.city = normalized.city.slice(0, 255);
  if (normalized.postalCode) place.postalCode = normalized.postalCode.slice(0, 64);
  if (normalized.formattedAddress) place.formattedAddress = normalized.formattedAddress.slice(0, 1024);
  if (normalized.lat != null) place.lat = normalized.lat;
  if (normalized.lng != null) place.lng = normalized.lng;
  if (normalized.bdDivision) place.bdDivision = normalized.bdDivision.slice(0, 255);
  if (normalized.bdDistrict) place.bdDistrict = normalized.bdDistrict.slice(0, 255);
  if (normalized.bdUpazila) place.bdUpazila = normalized.bdUpazila.slice(0, 255);
  if (normalized.bdWard) place.bdWard = normalized.bdWard.slice(0, 64);
  return place;
}

export interface LocationPlaceInput {
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
}

export interface PostLocationManualResponse {
  success: boolean;
  data?: { placeId: number };
}

/**
 * POST /api/v1/me/location/manual
 * Upsert LocationPlace, set manualOverridePlaceId + currentPlaceId.
 */
export async function postLocationManual(place: LocationPlaceInput): Promise<{ placeId: number }> {
  const res = (await apiPost("/api/v1/me/location/manual", { place })) as PostLocationManualResponse;
  if (!res?.success || res?.data?.placeId == null) {
    throw new Error("Failed to save location");
  }
  return { placeId: res.data.placeId };
}
