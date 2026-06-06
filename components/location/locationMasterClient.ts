"use client";

export type LocationMasterItem = {
  id: number;
  code: string;
  nameEn: string;
  nameBn?: string | null;
};

type CacheEntry = {
  expiresAt: number;
  data: LocationMasterItem[];
};

const API_BASE = (typeof window !== "undefined" ? "" : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000")).replace(/\/+$/, "");
const CACHE_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "bd_master_cache_v1:";
const memoryCache = new Map<string, CacheEntry>();

function cacheKey(endpoint: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("&");
  return `${endpoint}?${query}`;
}

function readStorage(key: string): LocationMasterItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.expiresAt || !Array.isArray(parsed?.data)) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStorage(key: string, data: LocationMasterItem[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEntry = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / private mode issues.
  }
}

function parseItems(json: any): LocationMasterItem[] {
  const items = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json?.data?.items)
        ? json.data.items
        : [];
  return items
    .map((row: any) => ({
      id: Number(row?.id),
      code: String(row?.code || ""),
      nameEn: String(row?.nameEn || row?.label || ""),
      nameBn: row?.nameBn || null,
    }))
    .filter((row: LocationMasterItem) => Number.isFinite(row.id) && row.id > 0 && row.nameEn.trim().length > 0);
}

export async function fetchLocationMasterList(
  endpoint: "divisions" | "districts" | "upazilas" | "unions",
  params: Record<string, string | number | undefined> = {}
): Promise<LocationMasterItem[]> {
  const key = cacheKey(endpoint, params);
  const fromMemory = memoryCache.get(key);
  if (fromMemory && fromMemory.expiresAt > Date.now()) return fromMemory.data;

  const fromStorage = readStorage(key);
  if (fromStorage) {
    memoryCache.set(key, { data: fromStorage, expiresAt: Date.now() + CACHE_TTL_MS });
    return fromStorage;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") searchParams.set(k, String(v));
  });

  const response = await fetch(`${API_BASE}/api/v1/location-master/${endpoint}?${searchParams.toString()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const json = await response.json().catch(() => null);
  const ok = response.ok && (json?.success !== false);
  if (!ok) {
    throw new Error((json as { message?: string })?.message || `Failed to fetch ${endpoint}`);
  }

  const data = parseItems(json);
  memoryCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  writeStorage(key, data);
  return data;
}

export async function prefetchBangladeshLocationMaster() {
  await fetchLocationMasterList("divisions", { pageSize: 64, locale: "en" }).catch(() => []);
}

export function clearBangladeshLocationMasterCache() {
  memoryCache.clear();
}

