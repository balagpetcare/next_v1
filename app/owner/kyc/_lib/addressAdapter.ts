/**
 * Converts between InternationalAddress and LocationValue / presentAddressJson.
 */

import type { LocationValue } from "@/src/lib/location/normalizeLocation";
import type { InternationalAddress } from "../_types/kyc";

export function locationValueToInternationalAddress(loc: LocationValue | null): InternationalAddress | null {
  if (!loc?.countryCode) return null;
  const lat = loc.lat ?? loc.latitude ?? 0;
  const lng = loc.lng ?? loc.longitude ?? 0;
  const addr = (loc.addressLine || loc.formattedAddress || loc.fullPathText || "").trim() || " ";
  return {
    countryCode: loc.countryCode,
    countryName: loc.countryName || loc.countryCode,
    admin1: loc.state ? { name: loc.state } : undefined,
    admin2: loc.city ? { name: loc.city } : undefined,
    locality: loc.city || undefined,
    postalCode: loc.postalCode || undefined,
    addressLine1: addr,
    addressLine2: undefined,
    landmark: undefined,
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    formattedAddress: loc.formattedAddress || loc.fullPathText || undefined,
  };
}

export function internationalAddressToLocationValue(addr: InternationalAddress | null): LocationValue | null {
  if (!addr?.countryCode) return null;
  const parts = [addr.addressLine1, addr.admin2?.name, addr.admin1?.name, addr.countryName].filter(Boolean);
  return {
    countryCode: addr.countryCode,
    countryName: addr.countryName,
    state: addr.admin1?.name,
    city: addr.admin2?.name ?? addr.locality,
    postalCode: addr.postalCode,
    addressLine: [addr.addressLine1, addr.addressLine2, addr.landmark].filter(Boolean).join(", "),
    formattedAddress: addr.formattedAddress || parts.join(", "),
    lat: addr.latitude,
    lng: addr.longitude,
    latitude: addr.latitude,
    longitude: addr.longitude,
  };
}

function pickAdmin(obj: unknown): { code?: string; name?: string } | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  const name = o.name ?? o.stateName ?? o.state;
  const code = o.code;
  if (!name && !code) return undefined;
  return {
    code: code != null ? String(code) : undefined,
    name: name != null ? String(name) : undefined,
  };
}

export function presentAddressJsonToInternationalAddress(
  json: Record<string, unknown> | null | undefined
): InternationalAddress | null {
  if (!json || typeof json !== "object") return null;
  const lat = typeof json.latitude === "number" ? json.latitude : typeof json.lat === "number" ? json.lat : 0;
  const lng = typeof json.longitude === "number" ? json.longitude : typeof json.lng === "number" ? json.lng : 0;
  const cc = String(json.countryCode || json.country || "").trim() || "BD";
  const countryName = String(json.countryName || cc).trim();
  const line1 = String(json.addressLine || json.addressLine1 || json.text || "").trim() || " ";
  const admin1 = pickAdmin(json.admin1) ?? (json.stateName || json.state ? { name: String(json.stateName || json.state) } : undefined);
  const admin2 = pickAdmin(json.admin2) ?? (json.cityName || json.city ? { name: String(json.cityName || json.city) } : undefined);
  return {
    countryCode: cc,
    countryName: countryName || cc,
    admin1,
    admin2,
    locality: json.locality ? String(json.locality) : undefined,
    postalCode: json.postalCode ? String(json.postalCode) : undefined,
    addressLine1: line1,
    addressLine2: json.addressLine2 ? String(json.addressLine2) : undefined,
    landmark: json.landmark ? String(json.landmark) : undefined,
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    formattedAddress: json.formattedAddress ? String(json.formattedAddress) : undefined,
  };
}

export function internationalAddressToPresentAddressJson(
  addr: InternationalAddress | null
): Record<string, unknown> | undefined {
  if (!addr) return undefined;
  return {
    countryCode: addr.countryCode,
    countryName: addr.countryName,
    admin1: addr.admin1 ? { code: addr.admin1.code, name: addr.admin1.name } : undefined,
    admin2: addr.admin2 ? { code: addr.admin2.code, name: addr.admin2.name } : undefined,
    state: addr.admin1?.name,
    stateName: addr.admin1?.name,
    city: addr.admin2?.name,
    cityName: addr.admin2?.name,
    locality: addr.locality,
    postalCode: addr.postalCode,
    addressLine: addr.addressLine1,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2,
    landmark: addr.landmark,
    latitude: addr.latitude,
    longitude: addr.longitude,
    formattedAddress: addr.formattedAddress,
  };
}
