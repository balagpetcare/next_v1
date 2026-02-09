/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Rate-limited to 1 request per second (Nominatim usage policy).
 * Returns a normalized address object for use with LocationPicker.
 */

export interface NormalizedAddress {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  displayName?: string;
}

interface NominatimAddress {
  country_code?: string;
  country?: string;
  state?: string;
  region?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
}

interface NominatimResult {
  display_name?: string;
  address?: NominatimAddress;
}

const NOMINATIM_MIN_INTERVAL_MS = 1100; // 1.1s between calls to respect 1 req/s
let lastCallTime = 0;
let queue: Array<() => void> = [];

function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    const now = Date.now();
    const elapsed = now - lastCallTime;
    if (elapsed >= NOMINATIM_MIN_INTERVAL_MS || lastCallTime === 0) {
      lastCallTime = Date.now();
      resolve();
      return;
    }
    const delay = NOMINATIM_MIN_INTERVAL_MS - elapsed;
    queue.push(() => {
      lastCallTime = Date.now();
      resolve();
    });
    if (queue.length === 1) {
      setTimeout(() => {
        const next = queue.shift();
        next?.();
      }, delay);
    }
  });
}

function runQueue() {
  if (queue.length > 0) {
    const next = queue.shift();
    next?.();
  }
}

/**
 * Reverse geocode (lat, lng) → normalized address.
 * Handles rate limits; returns null on failure or invalid response.
 */
export async function reverseGeocodeNormalized(
  lat: number,
  lng: number
): Promise<NormalizedAddress | null> {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  await waitForRateLimit();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    runQueue();
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    return normalizeNominatimResult(data);
  } catch {
    runQueue();
    return null;
  }
}

function normalizeNominatimResult(data: NominatimResult): NormalizedAddress | null {
  const addr = data?.address;
  if (!addr || typeof addr !== "object") {
    return data?.display_name
      ? { address: data.display_name, city: "", state: "", country: "", postalCode: "", displayName: data.display_name }
      : null;
  }

  const country = (addr.country || "").trim();
  const state = (addr.state || addr.region || "").trim();
  const city = (addr.city || addr.town || addr.village || addr.municipality || "").trim();
  const postalCode = (addr.postcode || "").trim();

  const streetParts = [addr.road, addr.house_number].filter(Boolean);
  const area = addr.suburb || addr.neighbourhood || "";
  const addressLine = [streetParts.join(" ").trim(), area].filter(Boolean).join(", ");
  const address = addressLine || data.display_name || [city, state, country].filter(Boolean).join(", ");

  return {
    address: address.trim() || "",
    city,
    state,
    country,
    postalCode,
    displayName: data.display_name || undefined,
  };
}
