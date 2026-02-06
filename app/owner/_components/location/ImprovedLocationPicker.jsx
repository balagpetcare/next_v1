"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import EnhancedLocationDropdown from "./EnhancedLocationDropdown";
import CoordinateInput from "./CoordinateInput";
import LocationBreakdown from "./LocationBreakdown";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/**
 * @deprecated Use LocationField from @/src/components/location/LocationField for new forms.
 * ImprovedLocationPicker Component
 * 
 * Unified location picker that combines:
 * - City Corporation (Dhaka) locations
 * - All Bangladesh locations
 * - Coordinate input and editing
 * - Location breakdown display
 * 
 * Features:
 * - Unified searchable dropdown (BD + Dhaka together)
 * - Coordinate display and editing
 * - Auto-populate coordinates from selected location
 * - Reverse geocoding from coordinates
 * - Easy edit mode
 * - Visual location breakdown
 */
export default function ImprovedLocationPicker({
  value,
  onChange,
  lang = "en",
  title = "Business Location",
  disabled = false,
}) {
  const v = value || {};
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    String(v.countryCode || "BD").toUpperCase().trim() || "BD"
  );
  // Always show dropdown for easy editing - don't hide it behind an edit button
  const [isEditing, setIsEditing] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(!!(v.latitude || v.longitude));

  useEffect(() => {
    const next = String(v.countryCode || "BD").toUpperCase().trim() || "BD";
    setSelectedCountryCode(next);
  }, [v.countryCode]);

  useEffect(() => {
    let alive = true;
    setCountriesLoading(true);
    setCountriesError("");
    fetch(`${API_BASE}/api/v1/locations/countries?active=1`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json().catch(() => null).then((j) => ({ r, j })))
      .then(({ r, j }) => {
        if (!alive) return;
        if (!r.ok || !j?.success) {
          setCountriesError(j?.message || `Failed to load countries (${r.status})`);
          setCountries([]);
          return;
        }
        setCountries(Array.isArray(j.data) ? j.data : []);
      })
      .catch((e) => {
        if (!alive) return;
        setCountriesError(e?.message || "Failed to load countries");
        setCountries([]);
      })
      .finally(() => {
        if (alive) setCountriesLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedCountryCode]);

  // Normalize value
  const normalizeValue = useCallback((val) => {
    const n = val || {};
    const toInt = (x) => (x === null || x === undefined || x === "" ? null : Number(x));
    const toFloat = (x) => {
      const num = x === null || x === undefined || x === "" ? null : parseFloat(x);
      return isNaN(num) ? null : num;
    };

    let fullPathText = (n.fullPathText || n.text || "").trim() || "";
    if (!fullPathText && n.latitude && n.longitude) {
      fullPathText = `${n.latitude}, ${n.longitude}`;
    }

    return {
      ...n,
      kind: String(n.kind || "").toUpperCase() || null,
      bdAreaId: toInt(n.bdAreaId),
      dhakaAreaId: toInt(n.dhakaAreaId),
      cityCorporationId: toInt(n.cityCorporationId),
      divisionId: toInt(n.divisionId),
      districtId: toInt(n.districtId),
      upazilaId: toInt(n.upazilaId),
      latitude: toFloat(n.latitude),
      longitude: toFloat(n.longitude),
      fullPathText: fullPathText || null,
      text: fullPathText || null,
      countryCode: n.countryCode ? String(n.countryCode).toUpperCase().trim() : selectedCountryCode,
      countryName: n.countryName ? String(n.countryName) : null,
      stateName: n.stateName ? String(n.stateName) : null,
      cityName: n.cityName ? String(n.cityName) : null,
      postalCode: n.postalCode ? String(n.postalCode) : null,
      addressLine: n.addressLine ? String(n.addressLine) : null,
      formattedAddress: n.formattedAddress ? String(n.formattedAddress) : null,
      provider: n.provider ? String(n.provider) : null,
      providerPlaceId: n.providerPlaceId ? String(n.providerPlaceId) : null,
    };
  }, []);

  // Handle location selection from dropdown
  const handleLocationChange = useCallback((location) => {
    const normalized = normalizeValue(location);
    onChange?.(normalized);
    // Keep dropdown visible (isEditing stays true) for easy changes
    // Show coordinates if they exist
    if (normalized.latitude || normalized.longitude) {
      setShowCoordinates(true);
    }
  }, [onChange, normalizeValue]);

  // Handle coordinate change
  const handleCoordinateChange = useCallback((updated) => {
    const normalized = normalizeValue(updated);
    onChange?.(normalized);
    setShowCoordinates(true);
  }, [onChange, normalizeValue]);

  // Handle reverse geocode result
  const handleReverseGeocode = useCallback((result) => {
    const normalized = normalizeValue(result);
    onChange?.(normalized);
    // Keep dropdown visible
    setShowCoordinates(true);
  }, [onChange, normalizeValue]);

  // Determine location type badge
  const locationTypeBadge = useMemo(() => {
    const kind = String(v.kind || "").toUpperCase();
    if (kind === "BD_AREA") {
      return { text: "Bangladesh", color: "primary" };
    } else if (kind === "DHAKA_AREA") {
      return { text: "Dhaka City", color: "info" };
    } else if (kind === "GLOBAL_PLACE") {
      return { text: v.countryCode || "Global", color: "success" };
    } else if (kind === "COORDINATES" || (v.latitude && v.longitude)) {
      return { text: "Coordinates", color: "secondary" };
    }
    return null;
  }, [v]);

  const hasSelection = !!(
    v.bdAreaId ||
    v.dhakaAreaId ||
    v.formattedAddress ||
    (v.latitude && v.longitude)
  );

  const handleCountryChange = useCallback(
    (nextCode) => {
      const code = String(nextCode || "BD").toUpperCase().trim() || "BD";
      setSelectedCountryCode(code);
      onChange?.({
        countryCode: code,
        kind: null,
        bdAreaId: null,
        dhakaAreaId: null,
        cityCorporationId: null,
        divisionId: null,
        districtId: null,
        upazilaId: null,
        latitude: null,
        longitude: null,
        fullPathText: null,
        text: null,
        countryName: null,
        stateName: null,
        cityName: null,
        postalCode: null,
        addressLine: null,
        formattedAddress: null,
        provider: null,
        providerPlaceId: null,
        locationBreakdown: {},
      });
    },
    [onChange]
  );

  return (
    <div className="improved-location-picker">
      <div className="card radius-12 mb-3" style={{ background: "#f8f9fa" }}>
        <div className="card-body p-20">
          <div className="d-flex align-items-center justify-content-between mb-16 flex-wrap gap-12">
            <h6 className="mb-0 fw-semibold">{title}</h6>
            {locationTypeBadge && (
              <span className={`badge bg-${locationTypeBadge.color} radius-8`}>
                {locationTypeBadge.text}
              </span>
            )}
          </div>

          {/* Location Selection - Always show dropdown for easy editing */}
          <div className="mb-3">
            <div className="row g-2 mb-2">
              <div className="col-md-6">
                <label className="form-label mb-1">Country</label>
                <select
                  className="form-select radius-12"
                  value={selectedCountryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={disabled || countriesLoading}
                >
                  {countriesLoading ? <option value="BD">Loading...</option> : null}
                  {countries.map((c) => (
                    <option key={c.code} value={String(c.code).toUpperCase()}>
                      {c.name} ({String(c.code).toUpperCase()})
                    </option>
                  ))}
                  {!countriesLoading && countries.length === 0 ? (
                    <option value="BD">Bangladesh (BD)</option>
                  ) : null}
                </select>
                {countriesError ? (
                  <div className="text-danger mt-1" style={{ fontSize: 12 }}>
                    {countriesError}
                  </div>
                ) : null}
              </div>
            </div>
            <EnhancedLocationDropdown
              value={v}
              onChange={handleLocationChange}
              title=""
              placeholder={
                selectedCountryCode === "BD"
                  ? "Search or select location (Bangladesh or Dhaka City)..."
                  : "Search address (Global)..."
              }
              lang={lang}
              mode={selectedCountryCode === "BD" ? undefined : "GLOBAL"}
              countryCode={selectedCountryCode}
            />
            
            {/* Show selected location breakdown below dropdown */}
            {hasSelection && (
              <div className="mt-2">
                <LocationBreakdown value={v} lang={lang} />
              </div>
            )}
          </div>

          {/* Coordinate Section */}
          <div className="mt-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label mb-0">Coordinates (Optional)</label>
              <button
                type="button"
                className="btn btn-sm btn-link p-0"
                onClick={() => setShowCoordinates(!showCoordinates)}
                disabled={disabled}
              >
                {showCoordinates ? (
                  <>
                    <i className="ri-eye-off-line me-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <i className="ri-eye-line me-1" />
                    Show
                  </>
                )}
              </button>
            </div>

            {showCoordinates && (
              <div className="card border-0 shadow-sm">
                <div className="card-body p-16">
                  <CoordinateInput
                    value={v}
                    onChange={handleCoordinateChange}
                    onReverseGeocode={handleReverseGeocode}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary Display */}
          {hasSelection && (v.latitude || v.longitude) && (
            <div className="mt-3 p-12 bg-light radius-8">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
                    Location
                  </div>
                  <div className="fw-semibold" style={{ fontSize: 13 }}>
                    {v.fullPathText || v.text || "-"}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-secondary-light mb-1" style={{ fontSize: 11 }}>
                    Coordinates
                  </div>
                  <div className="fw-semibold" style={{ fontSize: 13 }}>
                    {v.latitude?.toFixed(6) || "-"}, {v.longitude?.toFixed(6) || "-"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
