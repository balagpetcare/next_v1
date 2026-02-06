"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import MapLocationPicker from "./MapLocationPicker";
import EnhancedLocationDropdown from "./EnhancedLocationDropdown";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/**
 * UnifiedEnhancedLocationPicker Component
 * 
 * Combines MapLocationPicker + EnhancedLocationDropdown with sync functionality
 * 
 * Features:
 * - Three modes: Map, Dropdown, Combined
 * - Auto-sync between map coordinates and dropdown selection
 * - When map location selected → try to match with BD_AREA/DHAKA_AREA
 * - When dropdown selected → show on map if coordinates available
 */
export default function UnifiedEnhancedLocationPicker({
  value,
  onChange,
  lang = "en",
  title = "Business Location",
  defaultMode = "combined", // "map", "dropdown", "combined"
  showModeSelector = true,
}) {
  const v = value || {};
  const [mode, setMode] = useState(defaultMode);
  const [syncing, setSyncing] = useState(false);

  // Determine initial mode from value
  const initialMode = useMemo(() => {
    if (v.latitude && v.longitude && !v.bdAreaId && !v.dhakaAreaId) {
      return "map";
    }
    if (v.bdAreaId || v.dhakaAreaId) {
      return "dropdown";
    }
    return defaultMode;
  }, [v, defaultMode]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Normalize output value (defined early so it can be used in other callbacks)
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
      divisionId: toInt(n.divisionId),
      districtId: toInt(n.districtId),
      upazilaId: toInt(n.upazilaId),
      cityCorporationId: toInt(n.cityCorporationId),
      latitude: toFloat(n.latitude),
      longitude: toFloat(n.longitude),
      fullPathText: fullPathText || null,
      text: fullPathText || null,
    };
  }, []);

  // Sync map coordinates to dropdown (try to match location)
  const syncMapToDropdown = useCallback(async (lat, lng, currentValue) => {
    if (syncing) return;
    setSyncing(true);

    try {
      // Call reverse geocode to get address and matched location
      const response = await fetch(`${API_BASE}/api/v1/locations/reverse-geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) {
        throw new Error(`Reverse geocode failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        const result = data.data;
        const baseValue = currentValue || v || {};

        // If matched location found, update with that
        if (result.matchedLocation) {
          const normalized = normalizeValue({
            ...baseValue,
            ...result.matchedLocation,
            latitude: lat,
            longitude: lng,
            mapAddress: result.display_name || "",
            mapPlaceName: result.name || "",
          });
          onChange?.(normalized);
        } else {
          // Just update coordinates and address
          const normalized = normalizeValue({
            ...baseValue,
            kind: "MAP_SELECTED",
            latitude: lat,
            longitude: lng,
            mapAddress: result.display_name || "",
            mapPlaceName: result.name || "",
            text: result.display_name || `${lat}, ${lng}`,
            fullPathText: result.display_name || `${lat}, ${lng}`,
          });
          onChange?.(normalized);
        }
      } else {
        // API returned but no data - still update with coordinates
        const normalized = normalizeValue({
          ...(currentValue || v || {}),
          kind: "MAP_SELECTED",
          latitude: lat,
          longitude: lng,
          text: `${lat}, ${lng}`,
          fullPathText: `${lat}, ${lng}`,
        });
        onChange?.(normalized);
      }
    } catch (error) {
      console.error("Failed to sync map to dropdown:", error);
      // Still update with coordinates even if sync fails
      try {
        const normalized = normalizeValue({
          ...(currentValue || v || {}),
          kind: "MAP_SELECTED",
          latitude: lat,
          longitude: lng,
          text: `${lat}, ${lng}`,
          fullPathText: `${lat}, ${lng}`,
        });
        onChange?.(normalized);
      } catch (e) {
        console.error("Failed to update location after sync error:", e);
      }
    } finally {
      setSyncing(false);
    }
  }, [v, onChange, syncing, normalizeValue]);

  // Sync dropdown selection to map (if coordinates available)
  const syncDropdownToMap = useCallback((location) => {
    // Update the value - MapLocationPicker will automatically center on coordinates
    // if they're present in the value via its useEffect hook
    onChange?.(location);
  }, [onChange]);

  // Handle map location change
  const handleMapChange = useCallback((newValue) => {
    if (!newValue || (!newValue.latitude && !newValue.longitude)) {
      return;
    }

    const lat = newValue.latitude;
    const lng = newValue.longitude;
    
    if (!lat || !lng) {
      return;
    }

    try {
      // Normalize the value first
      const normalized = normalizeValue(newValue);
      
      // If in combined mode, sync to dropdown (which will call onChange)
      // Otherwise, just update immediately
      if (mode === "combined") {
        syncMapToDropdown(lat, lng, normalized);
      } else {
        onChange?.(normalized);
      }
    } catch (error) {
      console.error("Error handling map change:", error);
      // Fallback: try to update with basic coordinates
      try {
        onChange?.({
          kind: "MAP_SELECTED",
          latitude: lat,
          longitude: lng,
          text: `${lat}, ${lng}`,
          fullPathText: `${lat}, ${lng}`,
        });
      } catch (e) {
        console.error("Failed to update location:", e);
      }
    }
  }, [onChange, mode, syncMapToDropdown, normalizeValue]);

  // Handle dropdown selection
  const handleDropdownChange = useCallback((newValue) => {
    const normalized = normalizeValue(newValue);
    onChange?.(normalized);
    
    // If in combined mode and we have coordinates, we could center map
    // For now, just update the value
    if (mode === "combined") {
      syncDropdownToMap(normalized);
    }
  }, [onChange, mode, syncDropdownToMap, normalizeValue]);

  // Wrap onChange to normalize
  const handleChange = useCallback((newValue) => {
    const normalized = normalizeValue(newValue);
    onChange?.(normalized);
  }, [onChange, normalizeValue]);

  return (
    <div className="unified-enhanced-location-picker">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-20">
          {/* Header with Mode Selector */}
          <div className="d-flex align-items-center justify-content-between mb-16 flex-wrap gap-12">
            <h6 className="mb-0 fw-semibold">{title}</h6>
            {showModeSelector && (
              <div className="btn-group" role="group" aria-label="Location mode">
                <button
                  type="button"
                  className={`btn btn-sm radius-12 ${mode === "map" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setMode("map")}
                  aria-pressed={mode === "map"}
                >
                  <i className="ri-map-line me-1" />
                  Map
                </button>
                <button
                  type="button"
                  className={`btn btn-sm radius-12 ${mode === "dropdown" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setMode("dropdown")}
                  aria-pressed={mode === "dropdown"}
                >
                  <i className="ri-list-check me-1" />
                  Dropdown
                </button>
                <button
                  type="button"
                  className={`btn btn-sm radius-12 ${mode === "combined" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setMode("combined")}
                  aria-pressed={mode === "combined"}
                >
                  <i className="ri-layout-grid-line me-1" />
                  Combined
                </button>
              </div>
            )}
          </div>

          {/* Syncing Indicator */}
          {syncing && (
            <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
              <i className="ri-refresh-line me-1" />
              Syncing location...
            </div>
          )}

          {/* Content based on mode */}
          {mode === "map" && (
            <MapLocationPicker
              key="map-only-picker"
              instanceId="unified-map-only"
              value={v}
              onChange={handleMapChange}
              height={400}
              showSearch={true}
              showCurrentLocation={true}
            />
          )}

          {mode === "dropdown" && (
            <EnhancedLocationDropdown
              value={v}
              onChange={handleDropdownChange}
              title=""
              lang={lang}
            />
          )}

          {mode === "combined" && (
            <div className="row g-3">
              <div className="col-md-6">
                <EnhancedLocationDropdown
                  value={v}
                  onChange={handleDropdownChange}
                  title="Select Location"
                  lang={lang}
                />
              </div>
              <div className="col-md-6">
                <MapLocationPicker
                  key="combined-map-picker"
                  instanceId="unified-combined-map"
                  value={v}
                  onChange={handleMapChange}
                  height={400}
                  showSearch={true}
                  showCurrentLocation={true}
                />
              </div>
            </div>
          )}

          {/* Selected Location Summary */}
          {(v.fullPathText || v.text || (v.latitude && v.longitude)) && (
            <div className="mt-16 p-12 bg-light radius-8">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="flex-grow-1">
                  <div className="text-secondary-light mb-4" style={{ fontSize: 12 }}>
                    Selected Location
                  </div>
                  <div className="fw-semibold">
                    {v.fullPathText || v.text || `${v.latitude}, ${v.longitude}`}
                  </div>
                  {v.kind && (
                    <div className="text-secondary mt-1" style={{ fontSize: 12 }}>
                      Type: {v.kind}
                    </div>
                  )}
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
