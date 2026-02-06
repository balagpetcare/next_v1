"use client";

// SOURCE: org location flow from components/LocationPicker.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigation, MapPin, Globe, Clock, Search, Crosshair } from "lucide-react";
import MapPicker from "./MapPicker";
import BdHierarchyPicker from "./bd/BdHierarchyPicker";
import { useRecentLocations } from "./hooks/useRecentLocations";
import {
  LocationValue,
  buildDisplayAddress,
  normalizeLocation,
  withLegacyLocationFields,
} from "@/src/lib/location/normalizeLocation";
import { reverseGeocodeDebounced, forwardGeocode } from "@/lib/reverseGeocode";
import { ISO_COUNTRIES, searchCountries } from "@/lib/countries";
import { getAdmin1List } from "@/lib/admin1";

export type LocationFieldProps = {
  value: LocationValue | null;
  onChange: (next: LocationValue) => void;
  label?: string;
  required?: boolean;
  defaultCountryCode?: string;
  enableRecent?: boolean;
  enableGPS?: boolean;
  enableMap?: boolean;
  enableBdHierarchy?: boolean;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function fetchJson(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  const ok = res.ok && (j?.success === undefined || j?.success === true);
  if (!ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j?.data ?? j;
}

function CountrySelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => searchCountries(search), [search]);
  return (
    <div className="d-flex flex-column gap-2">
      <div className="input-group input-group-sm">
        <span className="input-group-text bg-light border-end-0">
          <Search size={14} />
        </span>
        <input
          type="text"
          className="form-control border-start-0 focus-none"
          placeholder="Search country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>
      <select
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {filtered.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.code})
          </option>
        ))}
        {filtered.length === 0 && <option value="">No countries</option>}
      </select>
    </div>
  );
}

/**
 * LocationField – reusable, controlled location picker
 * SOURCE: org location flow from components/LocationPicker.jsx
 */
export default function LocationField({
  value,
  onChange,
  label = "Business Location",
  required = false,
  defaultCountryCode = "BD",
  enableRecent = true,
  enableGPS = true,
  enableMap = true,
  enableBdHierarchy = true,
}: LocationFieldProps) {
  const normalizedInitial =
    normalizeLocation(value, defaultCountryCode) || ({ countryCode: defaultCountryCode } as LocationValue);

  const [draft, setDraft] = useState<LocationValue>(
    withLegacyLocationFields(normalizedInitial, value || {})
  );
  const [mapSearch, setMapSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingGps, setIsUsingGps] = useState(false);

  const countryCode = draft.countryCode?.toUpperCase() || defaultCountryCode.toUpperCase();
  const isBD = countryCode === "BD" && enableBdHierarchy;

  const admin1List = useMemo(() => (isBD ? [] : getAdmin1List(countryCode)), [isBD, countryCode]);
  const useAdmin1Dropdown = !isBD && admin1List.length > 0;

  const { recentLocations, saveRecent, clearRecent } = useRecentLocations({ contextKey: "owner" });

  // Sync external value -> internal
  useEffect(() => {
    const n = normalizeLocation(value, defaultCountryCode);
    if (!n) return;
    setDraft(withLegacyLocationFields(n, value || {}));
  }, [value, defaultCountryCode]);

  const emit = useCallback(
    (patch: Partial<LocationValue>, source?: LocationValue["source"]) => {
      const next = withLegacyLocationFields(
        {
          ...draft,
          ...patch,
          source: source || draft.source,
        },
        draft
      );
      setDraft(next);
      if (enableRecent) {
        saveRecent(next);
      }
      onChange?.(next);
    },
    [draft, enableRecent, onChange, saveRecent]
  );

  const handleCountryChange = useCallback(
    (code: string) => {
      const cc = code.toUpperCase();
      emit(
        {
          countryCode: cc,
          state: undefined,
          city: undefined,
          postalCode: undefined,
          divisionId: undefined,
          districtId: undefined,
          upazilaId: undefined,
          areaId: undefined,
          wardId: undefined,
          formattedAddress: undefined,
          lat: undefined,
          lng: undefined,
        },
        "manual"
      );
    },
    [emit]
  );

  const handleMapPick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      emit({ lat, lng }, "map");
      reverseGeocodeDebounced(lat, lng, (result) => {
        const formatted = result?.display_name || buildDisplayAddress({ ...draft, lat, lng });
        emit(
          {
            lat,
            lng,
            formattedAddress: formatted || undefined,
          },
          "map"
        );
      });
    },
    [draft, emit]
  );

  const handleMapSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mapSearch.trim()) return;
      setIsSearching(true);
      try {
        const result = await forwardGeocode(mapSearch.trim());
        if (result) {
          emit(
            {
              lat: result.lat,
              lng: result.lng,
              formattedAddress: result.display_name,
            },
            "search"
          );
        }
      } finally {
        setIsSearching(false);
      }
    },
    [emit, mapSearch]
  );

  const handleUseGps = useCallback(() => {
    if (!enableGPS || typeof navigator === "undefined" || !navigator.geolocation) return;
    setIsUsingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        emit({ lat: latitude, lng: longitude }, "gps");
        reverseGeocodeDebounced(latitude, longitude, (result) => {
          const formatted =
            result?.display_name || buildDisplayAddress({ ...draft, lat: latitude, lng: longitude });
          emit(
            {
              lat: latitude,
              lng: longitude,
              formattedAddress: formatted || undefined,
            },
            "gps"
          );
          setIsUsingGps(false);
        });
      },
      () => setIsUsingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [draft, emit, enableGPS]);

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
              <CountrySelect value={countryCode} onChange={handleCountryChange} disabled={false} />

              {isBD && (
                <div className="mt-3">
                  <BdHierarchyPicker value={draft} onChange={(next) => emit(next, "manual")} />
                </div>
              )}

              {!isBD && (
                <div className="mt-3 row g-2">
                  <div className="col-12">
                    <label className="form-label small fw-medium">State / Province</label>
                    {useAdmin1Dropdown ? (
                      <select
                        className="form-select h-42px"
                        value={draft.state || ""}
                        onChange={(e) => emit({ state: e.target.value || undefined }, "manual")}
                      >
                        <option value="">Select State</option>
                        {admin1List.map((a) => (
                          <option key={a.code} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-control h-42px"
                        value={draft.state || ""}
                        onChange={(e) => emit({ state: e.target.value || undefined }, "manual")}
                        placeholder="State / Province"
                      />
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">City</label>
                    <input
                      className="form-control h-42px"
                      value={draft.city || ""}
                      onChange={(e) => emit({ city: e.target.value || undefined }, "manual")}
                      placeholder="City"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Postal Code</label>
                    <input
                      className="form-control h-42px"
                      value={draft.postalCode || ""}
                      onChange={(e) => emit({ postalCode: e.target.value || undefined }, "manual")}
                      placeholder="Postal / ZIP"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="p-3 bg-white rounded border border-dashed">
                  <div className="d-flex align-items-center gap-2 mb-1 text-muted">
                    <Globe size={14} />
                    <span className="small fw-bold text-uppercase">Formatted Address</span>
                  </div>
                  <p className="mb-0 small text-dark fw-medium text-break">
                    {formatted || <span className="text-muted fst-italic">No location selected yet</span>}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small fw-medium text-muted">Coordinates</label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-muted">Lat</span>
                  <input
                    type="number"
                    className="form-control"
                    value={draft.lat ?? ""}
                    onChange={(e) =>
                      emit(
                        { lat: e.target.value === "" ? undefined : Number(e.target.value) },
                        "manual"
                      )
                    }
                    placeholder="0.0000"
                  />
                  <span className="input-group-text bg-white text-muted">Lng</span>
                  <input
                    type="number"
                    className="form-control"
                    value={draft.lng ?? ""}
                    onChange={(e) =>
                      emit(
                        { lng: e.target.value === "" ? undefined : Number(e.target.value) },
                        "manual"
                      )
                    }
                    placeholder="0.0000"
                  />
                </div>
              </div>

              {enableRecent && recentLocations.length > 0 && (
                <div className="mt-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="small text-muted d-flex align-items-center gap-1">
                      <Clock size={14} /> Recent
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={clearRecent}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {recentLocations.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-sm btn-outline-secondary radius-12"
                        onClick={() => emit(r, "recent")}
                      >
                        {buildDisplayAddress(r) || r.countryCode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-7">
            {enableMap ? (
              <div className="position-relative bg-light radius-12 border">
                <div
                  className="position-absolute top-0 start-0 end-0 p-3"
                  style={{ zIndex: 10, pointerEvents: "none" }}
                >
                  <form
                    onSubmit={handleMapSearch}
                    className="bg-white rounded-pill shadow-sm d-flex align-items-center p-1 border mx-auto"
                    style={{ maxWidth: 420, pointerEvents: "auto" }}
                  >
                    <Search size={18} className="text-muted ms-3" />
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
                      className="btn btn-primary rounded-circle p-2 m-1 d-flex align-items-center justify-content-center"
                      style={{ width: 32, height: 32 }}
                      disabled={isSearching}
                    >
                      {isSearching ? <span className="spinner-border spinner-border-sm" /> : <Navigation size={14} />}
                    </button>
                  </form>
                </div>

                <div style={{ height: 420, width: "100%", zIndex: 1 }}>
                  <MapPicker
                    lat={draft.lat}
                    lng={draft.lng}
                    onPick={handleMapPick}
                    height={420}
                  />
                </div>

                {enableGPS && (
                  <button
                    type="button"
                    className="position-absolute bottom-0 end-0 m-3 btn btn-white bg-white shadow p-2 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48, zIndex: 10 }}
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
