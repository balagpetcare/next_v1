"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import DhakaCityAreaDropdown from "./DhakaCityAreaDropdown";
import LocationSelector from "./LocationSelector";

// Dynamically import new components to avoid SSR issues
const MapLocationPicker = dynamic(() => import("./MapLocationPicker"), { ssr: false });
const EnhancedLocationDropdown = dynamic(() => import("./EnhancedLocationDropdown"), { ssr: false });
const UnifiedEnhancedLocationPicker = dynamic(() => import("./UnifiedEnhancedLocationPicker"), { ssr: false });

/**
 * @deprecated Use LocationField from @/src/components/location/LocationField for new forms.
 * Unified Location Picker (Enhanced)
 * - Bangladesh: Division > District > Upazila > Area (kind: BD_AREA)
 * - Dhaka City: City Corporation (DNCC/DSCC) + Area cascading (kind: DHAKA_AREA)
 * - Manual coordinates: Latitude/Longitude input
 * - Map preview: Optional Google Maps integration
 *
 * This component normalizes output so parent forms can reliably validate:
 * - bdAreaId / dhakaAreaId are numbers
 * - fullPathText/text are populated
 * - latitude/longitude are numbers (if provided)
 */
export default function UnifiedLocationPicker({
  value,
  onChange,
  lang = "en",
  title = "Business Location",
  showCoordinates = true,
  showMapPreview = false,
  googleMapsApiKey = null,
  useEnhanced = false, // New prop to enable enhanced picker
  defaultMode = "combined", // For enhanced picker: "map", "dropdown", "combined"
}) {
  const v = value || {};

  const initialMode = useMemo(() => {
    const k = String(v.kind || "").toUpperCase();
    if (k === "DHAKA_AREA") return "DHAKA";
    if (k === "BD_AREA") return "BD";
    if (k === "COORDINATES" || (v.latitude && v.longitude)) return "COORDINATES";
    // Backward-compatible hints
    if (v.dhakaAreaId || v.areaId || v.cityCorporationId || v.cityCorporationCode) return "DHAKA";
    return "BD";
  }, [v]);

  const [mode, setMode] = useState(initialMode);
  const [latitude, setLatitude] = useState(v.latitude ? String(v.latitude) : "");
  const [longitude, setLongitude] = useState(v.longitude ? String(v.longitude) : "");
  const [coordinateError, setCoordinateError] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setLatitude(v.latitude ? String(v.latitude) : "");
    setLongitude(v.longitude ? String(v.longitude) : "");
  }, [initialMode, v]);

  function normalize(out) {
    const n = out || {};
    const toInt = (x) => (x === null || x === undefined || x === "" ? null : Number(x));
    const toFloat = (x) => {
      const num = x === null || x === undefined || x === "" ? null : parseFloat(x);
      return isNaN(num) ? null : num;
    };

    // Prefer explicit fields
    let fullPathText = (n.fullPathText || n.text || n.label || "").trim() || "";

    // If Dhaka dropdown didn't provide text, build from dhakaAreaPath
    if (!fullPathText && Array.isArray(n.dhakaAreaPath) && n.dhakaAreaPath.length) {
      const names = n.dhakaAreaPath
        .map((x) => (lang === "bn" ? (x?.nameBn || x?.nameEn) : (x?.nameEn || x?.nameBn)))
        .filter(Boolean);
      fullPathText = names.join(" > ");
    }

    // If coordinates mode, build text from lat/lng
    if (!fullPathText && n.latitude && n.longitude) {
      fullPathText = `${n.latitude}, ${n.longitude}`;
    }

    fullPathText = fullPathText.trim() || null;

    return {
      ...n,
      kind: String(n.kind || "").toUpperCase() || null,
      bdAreaId: toInt(n.bdAreaId ?? n.areaId),
      dhakaAreaId: toInt(n.dhakaAreaId),
      cityCorporationId: toInt(n.cityCorporationId),
      latitude: toFloat(n.latitude),
      longitude: toFloat(n.longitude),
      fullPathText,
      text: fullPathText,
    };
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setCoordinateError("");

    // If switching, keep existing value but normalize kind so backend validation is consistent
    if (nextMode === "BD") {
      onChange?.(normalize({ ...v, kind: "BD_AREA", latitude: null, longitude: null }));
    } else if (nextMode === "DHAKA") {
      onChange?.(normalize({ ...v, kind: "DHAKA_AREA", latitude: null, longitude: null }));
    } else if (nextMode === "COORDINATES") {
      onChange?.(normalize({ ...v, kind: "COORDINATES", bdAreaId: null, dhakaAreaId: null }));
    }
  }

  function handleCoordinateChange(lat, lng) {
    setLatitude(lat);
    setLongitude(lng);
    setCoordinateError("");

    const latNum = lat ? parseFloat(lat) : null;
    const lngNum = lng ? parseFloat(lng) : null;

    if (lat && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      setCoordinateError("Latitude must be between -90 and 90");
      return;
    }

    if (lng && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      setCoordinateError("Longitude must be between -180 and 180");
      return;
    }

    onChange?.(
      normalize({
        ...v,
        kind: "COORDINATES",
        latitude: latNum,
        longitude: lngNum,
        bdAreaId: null,
        dhakaAreaId: null,
      })
    );
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setCoordinateError("Geolocation is not supported by your browser");
      return;
    }

    setCoordinateError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        handleCoordinateChange(lat, lng);
      },
      (error) => {
        setCoordinateError("Failed to get your location: " + error.message);
      }
    );
  }

  const mapUrl = useMemo(() => {
    if (!showMapPreview || !googleMapsApiKey) return null;
    const lat = latitude || v.latitude;
    const lng = longitude || v.longitude;
    if (!lat || !lng) return null;
    return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`;
  }, [showMapPreview, googleMapsApiKey, latitude, longitude, v]);

  // If enhanced mode is enabled, use the new unified picker
  if (useEnhanced) {
    return (
      <UnifiedEnhancedLocationPicker
        value={value}
        onChange={onChange}
        lang={lang}
        title={title}
        defaultMode={defaultMode}
        showModeSelector={true}
      />
    );
  }

  return (
    <div className="enhanced-location-picker">
      {/* Mode Selector */}
      <div className="card radius-12 mb-16">
        <div className="card-body p-20">
          <div className="d-flex align-items-center justify-content-between mb-16 flex-wrap gap-12">
            <h6 className="mb-0 fw-semibold">{title}</h6>
            <div className="btn-group" role="group" aria-label="Location mode">
              <button
                type="button"
                className={`btn btn-sm radius-12 ${mode === "BD" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => switchMode("BD")}
                aria-pressed={mode === "BD"}
              >
                <i className="ri-map-pin-line me-1" />
                Bangladesh
              </button>
              <button
                type="button"
                className={`btn btn-sm radius-12 ${mode === "DHAKA" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => switchMode("DHAKA")}
                aria-pressed={mode === "DHAKA"}
              >
                <i className="ri-building-line me-1" />
                Dhaka City
              </button>
              {showCoordinates && (
                <button
                  type="button"
                  className={`btn btn-sm radius-12 ${mode === "COORDINATES" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => switchMode("COORDINATES")}
                  aria-pressed={mode === "COORDINATES"}
                >
                  <i className="ri-crosshair-line me-1" />
                  Coordinates
                </button>
              )}
            </div>
          </div>

          {/* Location Selector Based on Mode */}
          {mode === "DHAKA" ? (
            <DhakaCityAreaDropdown
              value={v}
              onChange={(next) => onChange?.(normalize({ ...next, kind: "DHAKA_AREA" }))}
              title=""
            />
          ) : mode === "BD" ? (
            <LocationSelector
              value={v}
              onChange={(next) => onChange?.(normalize({ ...next, kind: "BD_AREA" }))}
              lang={lang}
              title=""
            />
          ) : (
            /* Coordinates Mode */
            <div className="row g-3">
              <div className="col-md-5">
                <label className="form-label">
                  Latitude <span className="text-muted">(-90 to 90)</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="ri-map-pin-2-line" />
                  </span>
                  <input
                    type="number"
                    className="form-control radius-12"
                    step="any"
                    value={latitude}
                    onChange={(e) => handleCoordinateChange(e.target.value, longitude)}
                    placeholder="23.8103"
                    min="-90"
                    max="90"
                    aria-label="Latitude"
                  />
                </div>
              </div>
              <div className="col-md-5">
                <label className="form-label">
                  Longitude <span className="text-muted">(-180 to 180)</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="ri-map-pin-2-line" />
                  </span>
                  <input
                    type="number"
                    className="form-control radius-12"
                    step="any"
                    value={longitude}
                    onChange={(e) => handleCoordinateChange(latitude, e.target.value)}
                    placeholder="90.4125"
                    min="-180"
                    max="180"
                    aria-label="Longitude"
                  />
                </div>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary radius-12 w-100"
                  onClick={getCurrentLocation}
                  title="Get current location"
                  aria-label="Get current location using GPS"
                >
                  <i className="ri-crosshair-line" />
                </button>
              </div>
              {coordinateError && (
                <div className="col-12">
                  <div className="alert alert-danger radius-12 py-8" style={{ fontSize: 12 }}>
                    <i className="ri-error-warning-line me-1" />
                    {coordinateError}
                  </div>
                </div>
              )}
              {(latitude || longitude) && (
                <div className="col-12">
                  <div className="text-success radius-12 p-12 bg-success-light" style={{ fontSize: 13 }}>
                    <i className="ri-checkbox-circle-line me-1" />
                    Coordinates: {latitude}, {longitude}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map Preview */}
          {showMapPreview && mapUrl && (
            <div className="mt-16">
              <label className="form-label mb-8">Map Preview</label>
              <div className="border radius-12 overflow-hidden" style={{ height: 300 }}>
                <iframe
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapUrl}
                  title="Location map preview"
                  aria-label="Map preview of selected location"
                />
              </div>
            </div>
          )}

          {/* Selected Location Summary */}
          {v.fullPathText && (
            <div className="mt-16 p-12 bg-light radius-8">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Selected Location
                  </div>
                  <div className="fw-semibold">{v.fullPathText}</div>
                </div>
                {v.latitude && v.longitude && (
                  <div className="text-end">
                    <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                      Coordinates
                    </div>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>
                      {v.latitude.toFixed(6)}, {v.longitude.toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
