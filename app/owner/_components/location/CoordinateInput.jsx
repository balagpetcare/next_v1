"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/**
 * CoordinateInput Component
 * 
 * Features:
 * - Latitude/Longitude input fields
 * - "Get Current Location" button (GPS)
 * - "Find Location from Coordinates" button (reverse geocode)
 * - Validation (lat: -90 to 90, lng: -180 to 180)
 * - Auto-sync with selected location if coordinates match
 */
export default function CoordinateInput({
  value,
  onChange,
  onReverseGeocode,
  disabled = false,
}) {
  const v = value || {};
  const [latitude, setLatitude] = useState(v.latitude ? String(v.latitude) : "");
  const [longitude, setLongitude] = useState(v.longitude ? String(v.longitude) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLatitude(v.latitude ? String(v.latitude) : "");
    setLongitude(v.longitude ? String(v.longitude) : "");
  }, [v.latitude, v.longitude]);

  function validateCoordinate(lat, lng) {
    setError("");
    
    if (lat && (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
      setError("Latitude must be between -90 and 90");
      return false;
    }

    if (lng && (isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180)) {
      setError("Longitude must be between -180 and 180");
      return false;
    }

    return true;
  }

  function handleLatitudeChange(e) {
    const lat = e.target.value;
    setLatitude(lat);
    
    if (validateCoordinate(lat, longitude)) {
      const latNum = lat ? parseFloat(lat) : null;
      const lngNum = longitude ? parseFloat(longitude) : null;
      onChange?.({
        ...v,
        latitude: latNum,
        longitude: lngNum,
      });
    }
  }

  function handleLongitudeChange(e) {
    const lng = e.target.value;
    setLongitude(lng);
    
    if (validateCoordinate(latitude, lng)) {
      const latNum = latitude ? parseFloat(latitude) : null;
      const lngNum = lng ? parseFloat(lng) : null;
      onChange?.({
        ...v,
        latitude: latNum,
        longitude: lngNum,
      });
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setError("");
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setLoading(false);
        
        onChange?.({
          ...v,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          kind: v.kind || "COORDINATES",
        });
      },
      (error) => {
        setError("Failed to get your location: " + error.message);
        setLoading(false);
      }
    );
  }

  async function findLocationFromCoordinates() {
    if (!latitude || !longitude) {
      setError("Please enter both latitude and longitude");
      return;
    }

    if (!validateCoordinate(latitude, longitude)) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/locations/reverse-geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });

      if (!response.ok) {
        throw new Error(`Reverse geocode failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        const result = data.data;
        
        // If matched location found, update with that
        if (result.matchedLocation) {
          const updated = {
            ...v,
            ...result.matchedLocation,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            mapAddress: result.display_name || "",
            mapPlaceName: result.name || "",
          };
          onChange?.(updated);
          onReverseGeocode?.(updated);
        } else {
          // Just update coordinates and address
          const updated = {
            ...v,
            kind: "COORDINATES",
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            mapAddress: result.display_name || "",
            mapPlaceName: result.name || "",
            text: result.display_name || `${latitude}, ${longitude}`,
            fullPathText: result.display_name || `${latitude}, ${longitude}`,
          };
          onChange?.(updated);
          onReverseGeocode?.(updated);
        }
      }
    } catch (e) {
      setError("Failed to find location: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="coordinate-input">
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
              onChange={handleLatitudeChange}
              placeholder="23.8103"
              min="-90"
              max="90"
              disabled={disabled || loading}
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
              onChange={handleLongitudeChange}
              placeholder="90.4125"
              min="-180"
              max="180"
              disabled={disabled || loading}
              aria-label="Longitude"
            />
          </div>
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button
            type="button"
            className="btn btn-outline-secondary radius-12 w-100"
            onClick={getCurrentLocation}
            disabled={disabled || loading}
            title="Get current location"
            aria-label="Get current location using GPS"
          >
            <i className="ri-crosshair-line" />
          </button>
        </div>
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-primary radius-12"
            onClick={findLocationFromCoordinates}
            disabled={disabled || loading || !latitude || !longitude}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Finding...
              </>
            ) : (
              <>
                <i className="ri-search-line me-1" />
                Find Location from Coordinates
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger radius-12 py-8" style={{ fontSize: 12 }}>
              <i className="ri-error-warning-line me-1" />
              {error}
            </div>
          </div>
        )}
        {(latitude || longitude) && !error && (
          <div className="col-12">
            <div className="text-success radius-12 p-12 bg-success-light" style={{ fontSize: 13 }}>
              <i className="ri-checkbox-circle-line me-1" />
              Coordinates: {latitude || "-"}, {longitude || "-"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
