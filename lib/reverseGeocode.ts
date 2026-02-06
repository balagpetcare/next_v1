/**
 * Reverse geocode via Nominatim (OpenStreetMap). Best effort, debounced.
 */

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

export interface NominatimResult {
  display_name?: string;
  address?: {
    country_code?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    return data;
  } catch {
    return null;
  }
}

export async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function reverseGeocodeDebounced(
  lat: number,
  lng: number,
  onResult: (result: NominatimResult | null) => void
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    reverseGeocode(lat, lng).then(onResult);
  }, DEBOUNCE_MS);
}
