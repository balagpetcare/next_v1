"use client";

/**
 * LocationPickerUnified – single unified location picker for ALL countries.
 * Fields: Country (searchable) -> State/Province (searchable) -> City -> Postal -> Address Line
 * + Formatted Address (read-only) + Lat/Lng + Map with search.
 * No BD special-case; no DB-driven Division/District/Upazila.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  MapPin,
  Search,
  Crosshair,
  Clock,
} from "lucide-react";
import { getFlagEmoji } from "@/src/shared/flags/getFlagEmoji";
import {
  LocationValue,
  buildDisplayAddress,
  normalizeLocation,
  withLegacyLocationFields,
} from "@/src/lib/location/normalizeLocation";
import { useRecentLocations } from "@/src/components/location/hooks/useRecentLocations";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function fetchJson<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  const ok = res.ok && (j?.success !== false);
  if (!ok) throw new Error((j as { message?: string })?.message || `Request failed (${res.status})`);
  return (j?.data ?? j) as T;
}

interface CountryItem {
  code: string;
  name: string;
}

interface StateItem {
  code: string;
  name: string;
}

/** Searchable select – type to filter, click to select */
function SearchableCountrySelect({
  value,
  onChange,
  countries,
  placeholder = "Select country...",
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  countries: CountryItem[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  const selected = countries.find((c) => c.code === value);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  return (
    <div ref={containerRef} className="position-relative">
      <div
        className="form-control d-flex align-items-center justify-content-between radius-12"
        style={{ minHeight: 38, cursor: disabled ? "not-allowed" : "pointer" }}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="text-secondary">
          {selected ? `${getFlagEmoji(selected.code)} ${selected.name}` : placeholder}
        </span>
        <span className="text-muted">▼</span>
      </div>
      {open && (
        <div
          className="border rounded bg-white shadow position-absolute start-0 end-0 mt-1"
          style={{ zIndex: 1050, maxHeight: 260, overflow: "hidden" }}
        >
          <div className="p-2 border-bottom">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div style={{ maxHeight: 200, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-muted small">No countries found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`list-group-item list-group-item-action border-0 w-100 text-start d-flex align-items-center gap-2 ${c.code === value ? "active" : ""}`}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span aria-hidden="true">{getFlagEmoji(c.code)}</span>
                  <span>{c.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Searchable state/province select or free text */
function SearchableStateSelect({
  value,
  onChange,
  states,
  placeholder = "State / Province",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  states: StateItem[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return states.slice(0, 50);
    return states.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50);
  }, [states, search]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  if (states.length === 0) {
    return (
      <input
        type="text"
        className="form-control radius-12"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <div ref={containerRef} className="position-relative">
      <div
        className="form-control d-flex align-items-center justify-content-between radius-12"
        style={{ minHeight: 38, cursor: disabled ? "not-allowed" : "pointer" }}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span>{value || placeholder}</span>
        <span className="text-muted">▼</span>
      </div>
      {open && (
        <div
          className="border rounded bg-white shadow position-absolute start-0 end-0 mt-1"
          style={{ zIndex: 1050, maxHeight: 220, overflow: "hidden" }}
        >
          <div className="p-2 border-bottom">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: 180, overflow: "auto" }}>
            {filtered.map((s) => (
              <button
                key={s.code}
                type="button"
                className={`list-group-item list-group-item-action border-0 w-100 text-start ${s.name === value ? "active" : ""}`}
                onClick={() => {
                  onChange(s.name);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MapPickerUnified = dynamic(
  () => import("@/src/components/location/MapPickerUnified"),
  { ssr: false }
);

export type LocationPickerUnifiedProps = {
  value: LocationValue | null;
  onChange: (next: LocationValue) => void;
  label?: string;
  required?: boolean;
  defaultCountryCode?: string;
  enableRecent?: boolean;
  enableGPS?: boolean;
  enableMap?: boolean;
};

export default function LocationPickerUnified({
  value,
  onChange,
  label = "Business Location",
  required = false,
  defaultCountryCode = "BD",
  enableRecent = true,
  enableGPS = true,
  enableMap = true,
}: LocationPickerUnifiedProps) {
  const normalizedInitial =
    normalizeLocation(value, defaultCountryCode) ||
    ({ countryCode: defaultCountryCode } as LocationValue);

  const [draft, setDraft] = useState<LocationValue>(
    withLegacyLocationFields(normalizedInitial, value || {})
  );
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [mapSearch, setMapSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingGps, setIsUsingGps] = useState(false);

  const countryCode = draft.countryCode?.toUpperCase() || defaultCountryCode.toUpperCase();

  const { recentCountries, lastAddressPreview, saveRecent, clearRecent, hasAny } = useRecentLocations({
    contextKey: "owner",
  });

  useEffect(() => {
    fetchJson<CountryItem[]>("/api/v1/geo/countries")
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setStates([]);
      return;
    }
    fetchJson<StateItem[]>(`/api/v1/geo/states?country=${countryCode}`)
      .then((data) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]));
  }, [countryCode]);

  useEffect(() => {
    const n = normalizeLocation(value, defaultCountryCode);
    if (!n) return;
    setDraft(withLegacyLocationFields(n, value || {}));
  }, [value, defaultCountryCode]);

  const emit = useCallback(
    (patch: Partial<LocationValue>, source?: LocationValue["source"]) => {
      const next = withLegacyLocationFields(
        { ...draft, ...patch, source: source || draft.source },
        draft
      );
      setDraft(next);
      if (enableRecent) saveRecent(next);
      onChange?.(next);
    },
    [draft, enableRecent, onChange, saveRecent]
  );

  const handleCountryChange = useCallback(
    (code: string) => {
      emit({
        countryCode: code.toUpperCase(),
        state: undefined,
        city: undefined,
        postalCode: undefined,
        formattedAddress: undefined,
        lat: undefined,
        lng: undefined,
      });
    },
    [emit]
  );

  const handleMapPick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      emit({ lat, lng }, "map");
      fetch(`${API_BASE}/api/v1/geo/reverse?lat=${lat}&lng=${lng}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.success && j?.data?.display_name) {
            emit(
              {
                lat,
                lng,
                formattedAddress: j.data.display_name,
              },
              "map"
            );
          }
        })
        .catch(() => {});
    },
    [emit]
  );

  const handleMapSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mapSearch.trim()) return;
      setIsSearching(true);
      try {
        const j = await fetch(
          `${API_BASE}/api/v1/geo/search?q=${encodeURIComponent(mapSearch.trim())}&country=${countryCode}`,
          { credentials: "include" }
        ).then((r) => r.json());
        if (j?.success && Array.isArray(j.data) && j.data.length > 0) {
          const r = j.data[0];
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            emit(
              {
                lat,
                lng,
                formattedAddress: r.display_name,
              },
              "search"
            );
          }
        }
      } finally {
        setIsSearching(false);
      }
    },
    [emit, mapSearch, countryCode]
  );

  const handleUseGps = useCallback(() => {
    if (!enableGPS || typeof navigator === "undefined" || !navigator.geolocation) return;
    setIsUsingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        emit({ lat: latitude, lng: longitude }, "gps");
        fetch(
          `${API_BASE}/api/v1/geo/reverse?lat=${latitude}&lng=${longitude}`,
          { credentials: "include" }
        )
          .then((r) => r.json())
          .then((j) => {
            if (j?.success && j?.data?.display_name) {
              emit(
                {
                  lat: latitude,
                  lng: longitude,
                  formattedAddress: j.data.display_name,
                },
                "gps"
              );
            }
            setIsUsingGps(false);
          })
          .catch(() => setIsUsingGps(false));
      },
      () => setIsUsingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [emit, enableGPS]);

  const formatted = draft.formattedAddress || buildDisplayAddress(draft);

  return (
    <div className="card border-0 shadow-sm radius-12 overflow-hidden bg-white">
      <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center gap-2">
        <MapPin size={18} className="text-primary" />
        <div className="fw-semibold">
          {label} {required ? <span className="text-danger">*</span> : null}
        </div>
      </div>

      <div className="card-body p-3">
        <div className="row g-3">
          <div className="col-lg-5">
            <div className="bg-light-subtle p-3 radius-12 border h-100">
              <label className="form-label small fw-medium text-muted">Country</label>
              <SearchableCountrySelect
                value={countryCode}
                onChange={handleCountryChange}
                countries={countries}
                placeholder="Select country..."
              />

              <div className="mt-3">
                <label className="form-label small fw-medium">State / Province</label>
                <SearchableStateSelect
                  value={draft.state || ""}
                  onChange={(v) => emit({ state: v || undefined })}
                  states={states}
                  placeholder="State / Province"
                />
              </div>

              <div className="mt-3 row g-2">
                <div className="col-md-6">
                  <label className="form-label small fw-medium">City</label>
                  <input
                    className="form-control radius-12"
                    value={draft.city || ""}
                    onChange={(e) => emit({ city: e.target.value || undefined })}
                    placeholder="City"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Postal / ZIP</label>
                  <input
                    className="form-control radius-12"
                    value={draft.postalCode || ""}
                    onChange={(e) => emit({ postalCode: e.target.value || undefined })}
                    placeholder="Postal / ZIP"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small fw-medium">Address Line (House/Road/Area)</label>
                <input
                  className="form-control radius-12"
                  value={draft.addressLine || ""}
                  onChange={(e) => emit({ addressLine: e.target.value || undefined })}
                  placeholder="House, Road, Area..."
                />
              </div>

              <div className="mt-3">
                <div className="p-3 bg-white rounded border border-dashed">
                  <div className="d-flex align-items-center gap-2 mb-1 text-muted">
                    <Globe size={14} />
                    <span className="small fw-bold text-uppercase">Formatted Address</span>
                  </div>
                  <p className="mb-0 small text-dark fw-medium text-break">
                    {formatted || (
                      <span className="text-muted fst-italic">No location selected yet</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small fw-medium text-muted">Coordinates</label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-muted">Lat</span>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={draft.lat ?? ""}
                    onChange={(e) =>
                      emit({
                        lat:
                          e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0.0000"
                  />
                  <span className="input-group-text bg-white text-muted">Lng</span>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={draft.lng ?? ""}
                    onChange={(e) =>
                      emit({
                        lng:
                          e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0.0000"
                  />
                </div>
              </div>

              {enableRecent && hasAny && (
                <div className="mt-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="small text-muted d-flex align-items-center gap-1">
                      <Clock size={14} /> Recent
                    </span>
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={clearRecent}>
                      Clear
                    </button>
                  </div>
                  {lastAddressPreview && (
                    <div className="mb-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary radius-12 text-start text-truncate w-100"
                        style={{ maxWidth: "100%" }}
                        onClick={() =>
                          emit(
                            {
                              formattedAddress: lastAddressPreview.formattedAddress,
                              lat: lastAddressPreview.lat,
                              lng: lastAddressPreview.lng,
                              countryCode: lastAddressPreview.countryCode,
                            },
                            "recent"
                          )
                        }
                      >
                        {lastAddressPreview.formattedAddress}
                      </button>
                    </div>
                  )}
                  {recentCountries.length > 0 && (
                    <div className="d-flex flex-wrap gap-2">
                      {recentCountries.map((code) => {
                        const countryName =
                          countries.find((c) => c.code.toUpperCase() === code)?.name || code;
                        return (
                          <button
                            key={code}
                            type="button"
                            className="btn btn-sm btn-outline-secondary radius-12"
                            onClick={() => handleCountryChange(code)}
                          >
                            {countryName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-7">
            {enableMap ? (
              <div
                className="position-relative bg-light radius-12 border map-unified-wrapper"
                style={{ isolation: "isolate", overflow: "visible" }}
              >
                {/* Dedicated overlay: search bar always above tiles, survives zoom/pan */}
                <div className="map-overlay-container">
                  <div className="map-search-overlay p-0">
                    <form
                      onSubmit={handleMapSearch}
                      className="bg-white rounded-pill shadow-sm d-flex align-items-center p-1 border w-100"
                      style={{ maxWidth: 420 }}
                    >
                      <Search size={18} className="text-muted ms-3 flex-shrink-0" />
                      <input
                        type="text"
                        className="form-control border-0 shadow-none bg-transparent"
                        placeholder="Search map location..."
                        value={mapSearch}
                        onChange={(e) => setMapSearch(e.target.value)}
                        disabled={isSearching}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary rounded-circle p-2 m-1 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 32, height: 32 }}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <Search size={14} />
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <div
                  className="map-container-holder"
                  style={{ height: 420, position: "relative", zIndex: 1 }}
                >
                  <MapPickerUnified
                    lat={draft.lat}
                    lng={draft.lng}
                    onPick={handleMapPick}
                    height={420}
                  />
                </div>

                {enableGPS && (
                  <div className="map-gps-button-overlay">
                    <button
                      type="button"
                      className="btn btn-white bg-white shadow p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48 }}
                      onClick={handleUseGps}
                      disabled={isUsingGps}
                      title="Use Current Location"
                    >
                      {isUsingGps ? (
                        <span className="spinner-border spinner-border-sm text-primary" />
                      ) : (
                        <Crosshair size={22} className="text-dark" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded p-3 bg-light-subtle text-muted">
                Map disabled for this form.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
