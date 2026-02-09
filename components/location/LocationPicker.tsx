"use client";

/**
 * LocationPicker – Country (flag + name + currency, static), State/City (API), Address.
 * Map: search input + location icon on toolbar; Leaflet map with draggable pin.
 * Same pipeline for map search and "Use my location"; no auto permission; map failure does not block form.
 * SSR-safe: dynamic import with ssr: false.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";
import { reverseGeocodeNormalized } from "@/lib/location/reverseGeocode";
import {
  COUNTRIES,
  countryCodeToFlag,
  getCountryByName,
} from "@/lib/location/countries";
import SearchableSelect from "./SearchableSelect";
import type { SearchableSelectOption } from "./SearchableSelect";

export interface LocationValue {
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

const DEFAULT_VALUE: LocationValue = {
  lat: null,
  lng: null,
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const API_BASE = (typeof window !== "undefined" && (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")) || "";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || (j && (j as { success?: boolean }).success === false)) {
    throw new Error((j as { message?: string })?.message || `Request failed (${res.status})`);
  }
  return (j?.data ?? j) as T;
}

interface GeoSearchResult {
  lat: string;
  lon: string;
  display_name?: string;
}

/** Find best matching option by label (exact then case-insensitive then includes). */
function findBestOption(name: string, options: SearchableSelectOption[]): SearchableSelectOption | null {
  if (!name || !options.length) return null;
  const n = name.trim();
  const exact = options.find((o) => o.label === n || o.value === n);
  if (exact) return exact;
  const lower = n.toLowerCase();
  const ci = options.find((o) => o.label.toLowerCase() === lower || o.value.toLowerCase() === lower);
  if (ci) return ci;
  const includes = options.find((o) => o.label.toLowerCase().includes(lower) || lower.includes(o.label.toLowerCase()));
  return includes || null;
}

interface CountryStateItem {
  code: string;
  name: string;
}

const MapPicker = dynamic(
  () => import("@/src/components/location/MapPicker").then((m) => m.default),
  { ssr: false }
);

/** Catches map load errors so the form is still usable */
class MapErrorBoundary extends React.Component<
  { setError: (v: boolean) => void; fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.setError(true);
  }

  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export type LocationPickerProps = {
  value: LocationValue | null | undefined;
  onChange: (updated: LocationValue) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Default center when no coords (lat, lng) */
  defaultCenter?: [number, number];
};

function LocationPickerInner({
  value,
  onChange,
  label = "Location",
  required = false,
  disabled = false,
  defaultCenter = [23.8103, 90.4125],
}: LocationPickerProps) {
  const current = value ?? DEFAULT_VALUE;
  const [mapKey, setMapKey] = useState(0);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapLoadError, setMapLoadError] = useState<boolean>(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearching, setMapSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [states, setStates] = useState<CountryStateItem[]>([]);
  const [cities, setCities] = useState<CountryStateItem[]>([]);

  const countryCode = useMemo(() => {
    const rec = getCountryByName(current.country || "");
    return rec?.code ?? "";
  }, [current.country]);

  useEffect(() => {
    if (!API_BASE || !countryCode) {
      setStates([]);
      return;
    }
    fetchJson<CountryStateItem[]>(`/api/v1/geo/states?country=${encodeURIComponent(countryCode)}`)
      .then((data) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]));
  }, [countryCode]);

  useEffect(() => {
    if (!API_BASE || !countryCode || !current.state?.trim()) {
      setCities([]);
      return;
    }
    fetchJson<CountryStateItem[]>(
      `/api/v1/geo/cities?country=${encodeURIComponent(countryCode)}&state=${encodeURIComponent(current.state)}`
    )
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]));
  }, [countryCode, current.state]);

  const countryOptions: SearchableSelectOption[] = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.name,
        label: `${countryCodeToFlag(c.code)} ${c.name} (${c.currencyCode})`,
      })),
    []
  );
  const stateOptions: SearchableSelectOption[] = useMemo(
    () => states.map((s) => ({ value: s.name, label: s.name })),
    [states]
  );
  const cityOptions: SearchableSelectOption[] = useMemo(
    () => cities.map((c) => ({ value: c.name, label: c.name })),
    [cities]
  );

  const reverseGeocodeAndApply = useCallback(
    async (lat: number, lng: number) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setGeocodeLoading(true);
      try {
        const addr = await reverseGeocodeNormalized(lat, lng);
        if (abortRef.current?.signal.aborted) return;
        const countryMatch = addr?.country
          ? findBestOption(addr.country, countryOptions)
          : null;
        const resolvedCountry = countryMatch ? countryMatch.value : (addr?.country ?? current.country);
        const countryCodeRes =
          getCountryByName(resolvedCountry)?.code || countryCode;
        let resolvedState = current.state;
        let resolvedCity = current.city;
        if (countryCodeRes && addr?.state && API_BASE) {
          const stateList = await fetchJson<CountryStateItem[]>(
            `/api/v1/geo/states?country=${countryCodeRes}`
          ).then((d) => (Array.isArray(d) ? d : []));
          const stateOpts = stateList.map((s) => ({ value: s.name, label: s.name }));
          const stateMatch = findBestOption(addr.state, stateOpts);
          if (stateMatch) {
            resolvedState = stateMatch.value;
            if (addr?.city) {
              const cityList = await fetchJson<CountryStateItem[]>(
                `/api/v1/geo/cities?country=${countryCodeRes}&state=${encodeURIComponent(resolvedState)}`
              ).then((d) => (Array.isArray(d) ? d : []));
              const cityOpts = cityList.map((c) => ({ value: c.name, label: c.name }));
              const cityMatch = findBestOption(addr.city, cityOpts);
              if (cityMatch) resolvedCity = cityMatch.value;
            }
          }
        }
        if (abortRef.current?.signal.aborted) return;
        onChange({
          ...current,
          lat,
          lng,
          address: addr?.address ?? current.address,
          city: resolvedCity,
          state: resolvedState,
          country: resolvedCountry,
          postalCode: addr?.postalCode ?? current.postalCode,
        });
      } finally {
        if (!abortRef.current?.signal.aborted) setGeocodeLoading(false);
      }
    },
    [current, onChange, countryOptions, countryCode]
  );

  const handleMapPick = useCallback(
    (coords: { lat: number; lng: number }) => {
      setMapError(null);
      reverseGeocodeAndApply(coords.lat, coords.lng);
    },
    [reverseGeocodeAndApply]
  );

  const handleUseMyLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setGpsError("Geolocation is not supported.");
      return;
    }
    setGpsError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLoading(false);
        reverseGeocodeAndApply(latitude, longitude);
      },
      () => {
        setGpsLoading(false);
        setGpsError("Location denied or unavailable. You can enter address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [reverseGeocodeAndApply]);

  const handleMapSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = mapSearchQuery.trim();
      if (!q || q.length < 2 || !API_BASE) return;
      setMapSearching(true);
      setMapError(null);
      try {
        const countryParam = countryCode ? `&country=${encodeURIComponent(countryCode)}` : "";
        const res = await fetch(
          `${API_BASE}/api/v1/geo/search?q=${encodeURIComponent(q)}${countryParam}`,
          { credentials: "include", headers: { Accept: "application/json" } }
        );
        const j = await res.json().catch(() => null);
        const data = (j?.data ?? j) as GeoSearchResult[];
        if (!Array.isArray(data) || data.length === 0) {
          setMapError("No results found. Try a different search.");
          return;
        }
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setMapError("Invalid search result.");
          return;
        }
        await reverseGeocodeAndApply(lat, lng);
      } catch {
        setMapError("Search failed. You can still pick on the map or enter manually.");
      } finally {
        setMapSearching(false);
      }
    },
    [mapSearchQuery, countryCode, reverseGeocodeAndApply]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hasCoords =
    current.lat != null &&
    current.lng != null &&
    Number.isFinite(current.lat) &&
    Number.isFinite(current.lng);

  return (
    <div className="card border radius-16 overflow-hidden">
      <div className="card-header bg-white border-bottom py-3 px-4">
        <span className="fw-semibold">
          {label}
          {required ? <span className="text-danger ms-1">*</span> : null}
        </span>
      </div>
      <div className="card-body p-4">
        {mapError && (
          <div className="alert alert-warning py-2 mb-3" role="alert">
            {mapError}
          </div>
        )}

        <div className="row g-3">
          <div className="col-lg-5">
            <div className="mb-3">
              <SearchableSelect
                label="Country"
                options={countryOptions}
                value={current.country}
                onChange={(v) =>
                  onChange({
                    ...current,
                    country: v,
                    state: "",
                    city: "",
                  })
                }
                placeholder="Select country..."
                disabled={disabled}
              />
            </div>
            <div className="mb-3">
              <SearchableSelect
                label="State / Province"
                options={stateOptions}
                value={current.state}
                onChange={(v) =>
                  onChange({
                    ...current,
                    state: v,
                    city: "",
                  })
                }
                placeholder={countryCode ? "Select state..." : "Select country first"}
                disabled={disabled || !countryCode}
              />
            </div>
            <div className="mb-3">
              <SearchableSelect
                label="City"
                options={cityOptions}
                value={current.city}
                onChange={(v) => onChange({ ...current, city: v })}
                placeholder={current.state ? "Select city..." : "Select state first"}
                disabled={disabled || !current.state?.trim()}
              />
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Address</label>
              <input
                type="text"
                className="form-control radius-12"
                value={current.address}
                onChange={(e) =>
                  onChange({ ...current, address: e.target.value })
                }
                placeholder="Street, area"
                disabled={disabled}
              />
            </div>
            <div className="row g-2 mt-1">
              <div className="col-12">
                <label className="form-label small text-muted">Postal code</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  value={current.postalCode}
                  onChange={(e) =>
                    onChange({ ...current, postalCode: e.target.value })
                  }
                  placeholder="Postal code"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="mt-2 small text-muted">
              {hasCoords
                ? `Coordinates: ${Number(current.lat).toFixed(5)}, ${Number(current.lng).toFixed(5)}`
                : "Use map search or Enable location to set coordinates."}
              {geocodeLoading && " (fetching address…)"}
            </div>
          </div>
          <div className="col-lg-7">
            <div className="d-flex flex-column gap-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <form onSubmit={handleMapSearch} className="d-flex gap-2 flex-grow-1" style={{ minWidth: 0 }}>
                  <input
                    type="text"
                    className="form-control radius-12"
                    placeholder="Search map (e.g. city, address)"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    disabled={disabled || mapSearching}
                  />
                  <button
                    type="submit"
                    className="btn btn-outline-secondary radius-12"
                    disabled={disabled || mapSearching || !mapSearchQuery.trim()}
                  >
                    {mapSearching ? <span className="spinner-border spinner-border-sm" /> : "Search"}
                  </button>
                </form>
                <button
                  type="button"
                  className="btn btn-outline-secondary radius-12 d-flex align-items-center justify-content-center"
                  onClick={handleUseMyLocation}
                  disabled={disabled || gpsLoading}
                  title="Use my current location"
                  aria-label="Use my current location"
                >
                  {gpsLoading ? (
                    <span className="spinner-border spinner-border-sm" style={{ width: 18, height: 18 }} />
                  ) : (
                    <Crosshair size={18} />
                  )}
                </button>
              </div>
              {gpsError && (
                <div className="small text-warning" role="alert">
                  {gpsError}
                </div>
              )}
              <MapErrorBoundary
                setError={setMapLoadError}
                fallback={
                  <div className="border radius-12 p-4 bg-light text-muted text-center" style={{ minHeight: 320 }}>
                    Map could not be loaded. You can still enter location above.
                  </div>
                }
              >
                <div
                  className="border radius-12 overflow-hidden"
                  style={{ minHeight: 320 }}
                >
                  <MapPicker
                    key={mapKey}
                    lat={current.lat ?? undefined}
                    lng={current.lng ?? undefined}
                    onPick={handleMapPick}
                    height={320}
                    disabled={disabled}
                  />
                </div>
              </MapErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SSR-safe export: no Leaflet/window on server
const LocationPicker = dynamic(
  () => Promise.resolve({ default: LocationPickerInner }),
  { ssr: false }
);

export default LocationPicker;
