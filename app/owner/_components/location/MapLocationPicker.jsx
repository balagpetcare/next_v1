"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

// We'll check for leaflet availability at runtime in the component

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Default center: Dhaka, Bangladesh
const DEFAULT_CENTER = [23.8103, 90.4125];
const DEFAULT_ZOOM = 13;

/**
 * MapLocationPicker Component
 * 
 * Features:
 * - Interactive map with draggable marker
 * - Geocoding search (using backend Nominatim proxy)
 * - Reverse geocoding to get address
 * - Extracts latitude/longitude from marker position
 * - Integrates with existing location value structure
 */
export default function MapLocationPicker({
  value,
  onChange,
  height = 400,
  showSearch = true,
  showCurrentLocation = true,
  instanceId, // Optional unique ID for this instance
}) {
  const v = value || {};
  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");
  const [leafletAvailable, setLeafletAvailable] = useState(false);
  const [MapComponents, setMapComponents] = useState({ MapContainer: null, TileLayer: null, Marker: null, Popup: null });
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const containerRef = useRef(null);
  const isInitializingRef = useRef(false);
  const renderAttemptedRef = useRef(false);
  // Generate unique ID once per component instance
  const mapInstanceIdRef = useRef(null);
  if (!mapInstanceIdRef.current) {
    mapInstanceIdRef.current = instanceId || `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize position from value or use default
  const [position, setPosition] = useState(() => {
    if (v.latitude && v.longitude) {
      return [parseFloat(v.latitude), parseFloat(v.longitude)];
    }
    return DEFAULT_CENTER;
  });

  // Check for leaflet availability at runtime (only once)
  useEffect(() => {
    if (typeof window !== "undefined" && !leafletAvailable && !isInitializingRef.current) {
      const checkLeaflet = async () => {
        // Prevent concurrent initialization attempts
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;
        
        try {
          const reactLeaflet = await import("react-leaflet");
          const leaflet = await import("leaflet");
          
          // Check if container already has a map instance BEFORE doing anything
          if (containerRef.current && containerRef.current._leaflet_id) {
            console.warn("Container already has a Leaflet map instance, skipping initialization");
            mapInitializedRef.current = true;
            isInitializingRef.current = false;
            setShouldRenderMap(false);
            return;
          }
          
          // Fix Leaflet icon paths
          delete leaflet.default.Icon.Default.prototype._getIconUrl;
          leaflet.default.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          });
          
          // Import CSS
          await import("leaflet/dist/leaflet.css");
          
          setMapComponents({
            MapContainer: reactLeaflet.MapContainer,
            TileLayer: reactLeaflet.TileLayer,
            Marker: reactLeaflet.Marker,
            Popup: reactLeaflet.Popup,
          });
          setLeafletAvailable(true);
          
          // Only render map if not already initialized and container is clean
          if (!mapInitializedRef.current) {
            // Double-check container is still clean before rendering
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
              if (containerRef.current && !containerRef.current._leaflet_id && !mapInitializedRef.current) {
                setShouldRenderMap(true);
              } else if (containerRef.current && containerRef.current._leaflet_id) {
                // Map already exists, mark as initialized
                mapInitializedRef.current = true;
                setShouldRenderMap(false);
              }
            }, 0);
          }
        } catch (e) {
          // Dependencies not installed
          setLeafletAvailable(false);
          console.warn("Leaflet not installed. Please run: npm install react-leaflet leaflet");
        } finally {
          isInitializingRef.current = false;
        }
      };
      
      checkLeaflet();
    }
  }, [leafletAvailable]);

  // Additional safety check: prevent rendering if container has a map
  useEffect(() => {
    // Check container on every render to catch any map that might have been initialized
    if (containerRef.current && containerRef.current._leaflet_id) {
      if (shouldRenderMap || !mapInitializedRef.current) {
        console.warn("Detected existing map in container (_leaflet_id), preventing render");
        setShouldRenderMap(false);
        mapInitializedRef.current = true;
        renderAttemptedRef.current = false;
      }
    }
  }, [shouldRenderMap, mapInitializedRef.current]);

  // Geocoding search function
  const performGeocode = useCallback(async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/locations/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performGeocode(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performGeocode]);

  // Reverse geocoding function
  const performReverseGeocode = useCallback(async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/locations/reverse-geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setCurrentAddress(data.data.display_name || data.data.address || "");
        
        // Update value with address info
        onChange?.({
          ...v,
          kind: "MAP_SELECTED",
          latitude: lat,
          longitude: lng,
          mapAddress: data.data.display_name || data.data.address || "",
          mapPlaceName: data.data.name || "",
          text: data.data.display_name || `${lat}, ${lng}`,
          fullPathText: data.data.display_name || `${lat}, ${lng}`,
        });
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setCurrentAddress("");
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [v, onChange]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(() => {
    if (markerRef.current) {
      const marker = markerRef.current;
      const latlng = marker.getLatLng();
      const lat = latlng.lat;
      const lng = latlng.lng;
      
      setPosition([lat, lng]);
      
      // Update value immediately with coordinates
      onChange?.({
        ...v,
        kind: "MAP_SELECTED",
        latitude: lat,
        longitude: lng,
        text: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        fullPathText: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });

      // Perform reverse geocoding
      performReverseGeocode(lat, lng);
    }
  }, [v, onChange, performReverseGeocode]);

  // Handle search result selection
  const handleSearchResultClick = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setPosition([lat, lng]);
      setSearchQuery(result.display_name || result.name || "");
      setSearchResults([]);
      
      // Update value
      onChange?.({
        ...v,
        kind: "MAP_SELECTED",
        latitude: lat,
        longitude: lng,
        mapAddress: result.display_name || result.name || "",
        mapPlaceName: result.name || "",
        text: result.display_name || result.name || `${lat}, ${lng}`,
        fullPathText: result.display_name || result.name || `${lat}, ${lng}`,
      });

      // Perform reverse geocoding for more details
      performReverseGeocode(lat, lng);

      // Center map on selected location
      if (map) {
        map.setView([lat, lng], 15);
      }
    }
  }, [v, onChange, performReverseGeocode, map]);

  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPosition([lat, lng]);
        
        onChange?.({
          ...v,
          kind: "MAP_SELECTED",
          latitude: lat,
          longitude: lng,
          text: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          fullPathText: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });

        performReverseGeocode(lat, lng);

        if (map) {
          map.setView([lat, lng], 15);
        }
      },
      (error) => {
        alert("Failed to get your location: " + error.message);
      }
    );
  }, [v, onChange, performReverseGeocode, map]);

  // Initialize map when position changes from props
  useEffect(() => {
    if (v.latitude && v.longitude) {
      const lat = parseFloat(v.latitude);
      const lng = parseFloat(v.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const newPos = [lat, lng];
        setPosition(newPos);
        if (map && mapInitializedRef.current) {
          try {
            map.setView(newPos, 15);
          } catch (e) {
            // Map might be destroyed, ignore
            console.warn("Map view update failed:", e);
          }
        }
      }
    }
  }, [v.latitude, v.longitude, map]);

  // Cleanup on unmount - properly remove map instance
  useEffect(() => {
    return () => {
      if (map && mapInitializedRef.current) {
        try {
          // Remove all layers first
          map.eachLayer((layer) => {
            try {
              map.removeLayer(layer);
            } catch (e) {
              // Ignore layer removal errors
            }
          });
          // Remove the map instance
          map.remove();
        } catch (e) {
          // Ignore cleanup errors
          console.warn("Map cleanup error:", e);
        } finally {
          mapInitializedRef.current = false;
          isInitializingRef.current = false;
          setMap(null);
          setShouldRenderMap(false);
          // Clear Leaflet ID from container if it exists
          if (containerRef.current && containerRef.current._leaflet_id) {
            delete containerRef.current._leaflet_id;
          }
        }
      } else {
        // Reset flags even if map ref is null
        mapInitializedRef.current = false;
        isInitializingRef.current = false;
        setShouldRenderMap(false);
        if (containerRef.current && containerRef.current._leaflet_id) {
          delete containerRef.current._leaflet_id;
        }
      }
    };
  }, [map]);


  return (
    <div className="map-location-picker">
      {/* Search Bar */}
      {showSearch && (
        <div className="mb-3">
          <div className="input-group">
            <span className="input-group-text bg-light">
              <i className="ri-search-line" />
            </span>
            <input
              type="text"
              className="form-control radius-12"
              placeholder="Search location (e.g., Banasree, Dhaka, Bangladesh)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery && searchResults.length === 0) {
                  performGeocode(searchQuery);
                }
              }}
            />
            {isSearching && (
              <span className="input-group-text bg-light">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              </span>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div
              className="border rounded mt-2 bg-white"
              style={{ maxHeight: 200, overflow: "auto", position: "relative", zIndex: 1000 }}
            >
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                  style={{ width: "100%", border: 0, borderBottom: "1px solid #eee", textAlign: "left" }}
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="flex-grow-1">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {result.display_name || result.name || "Unknown"}
                    </div>
                    {result.type && (
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {result.type}
                      </div>
                    )}
                  </div>
                  <span className="badge text-bg-light">Select</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={(el) => {
          containerRef.current = el;
          // Critical: Check immediately when ref is set
          if (el && el._leaflet_id && !mapInitializedRef.current) {
            console.warn("Container ref callback: _leaflet_id detected, marking as initialized");
            mapInitializedRef.current = true;
            setShouldRenderMap(false);
            renderAttemptedRef.current = false;
          }
        }}
        id={mapInstanceIdRef.current}
        className="border radius-12 overflow-hidden" 
        style={{ height, position: "relative" }}
      >
        {(() => {
          // CRITICAL: Check container DOM element directly before any render decision
          const containerHasMap = containerRef.current && containerRef.current._leaflet_id;
          
          // If container already has a map, NEVER render MapContainer
          if (containerHasMap) {
            if (!mapInitializedRef.current) {
              console.warn("Map container check: _leaflet_id detected in DOM, preventing render");
              mapInitializedRef.current = true;
              setShouldRenderMap(false);
            }
            renderAttemptedRef.current = false;
            // Show fallback UI
            return (
              <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: "100%", minHeight: 200 }}>
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="ri-map-pin-line" style={{ fontSize: 48, color: "#ccc" }} />
                  </div>
                  <div className="text-muted mb-2">Map is already initialized.</div>
                </div>
              </div>
            );
          }
          
          // If we've already attempted to render and it failed, don't try again
          if (renderAttemptedRef.current && mapInitializedRef.current) {
            return (
              <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: "100%", minHeight: 200 }}>
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="ri-map-pin-line" style={{ fontSize: 48, color: "#ccc" }} />
                  </div>
                  <div className="text-muted mb-2">Map initialization in progress...</div>
                </div>
              </div>
            );
          }
          
          // Final safety check right before render
          const canRender = 
            shouldRenderMap && 
            !mapInitializedRef.current && 
            !isInitializingRef.current &&
            !containerHasMap &&
            leafletAvailable && 
            MapComponents.MapContainer && 
            MapComponents.TileLayer && 
            MapComponents.Marker;
          
          if (!canRender) {
            // Show fallback UI
            return (
              <div className="d-flex align-items-center justify-content-center bg-light" style={{ height: "100%", minHeight: 200 }}>
                <div className="text-center p-4">
                  <div className="mb-3">
                    <i className="ri-map-pin-line" style={{ fontSize: 48, color: "#ccc" }} />
                  </div>
                  <div className="text-muted mb-2">
                    {!leafletAvailable 
                      ? "Map component requires dependencies to be installed."
                      : "Map is being initialized..."}
                  </div>
                  {!leafletAvailable && (
                    <>
                      <div className="alert alert-info mb-0" style={{ fontSize: 13 }}>
                        <strong>Installation required:</strong><br />
                        <code className="d-block mt-2 p-2 bg-white rounded">npm install react-leaflet leaflet</code>
                      </div>
                      <div className="mt-3 text-secondary" style={{ fontSize: 12 }}>
                        After installation, restart the development server.
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          }
          
          // Mark that we're attempting to render
          renderAttemptedRef.current = true;
          
          // All checks passed, render the map
          return (
            <MapComponents.MapContainer
              key={mapInstanceIdRef.current} // Unique stable key - prevents re-initialization
              center={position}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                // Guard against double initialization
                if (!mapInstance) return;
                
                // CRITICAL: Check container BEFORE doing anything
                if (containerRef.current && containerRef.current._leaflet_id) {
                  console.warn("whenCreated: Container already has _leaflet_id, destroying duplicate map");
                  try {
                    // Check if this is a different map instance
                    const existingMapId = containerRef.current._leaflet_id;
                    if (mapInstance._leaflet_id && mapInstance._leaflet_id !== existingMapId) {
                      mapInstance.remove();
                    } else if (mapInstance._leaflet_id === existingMapId) {
                      // Same instance, just mark as initialized
                      mapInitializedRef.current = true;
                      setMap(mapInstance);
                      return;
                    }
                  } catch (e) {
                    console.error("Error removing duplicate map:", e);
                  }
                  setShouldRenderMap(false);
                  mapInitializedRef.current = true;
                  return;
                }
                
                // Final check - if already initialized, destroy duplicate immediately
                if (mapInitializedRef.current || isInitializingRef.current) {
                  console.warn("whenCreated: Already initialized, removing duplicate");
                  try {
                    mapInstance.remove();
                  } catch (e) {
                    // Ignore
                  }
                  setShouldRenderMap(false);
                  return;
                }
                
                // Double-check container one more time (race condition protection)
                if (containerRef.current && containerRef.current._leaflet_id) {
                  console.warn("whenCreated: Race condition detected - container has map, removing duplicate");
                  try {
                    mapInstance.remove();
                  } catch (e) {
                    // Ignore
                  }
                  setShouldRenderMap(false);
                  mapInitializedRef.current = true;
                  return;
                }
                
                // Safe to initialize - mark as initializing first
                isInitializingRef.current = true;
                
                // Set the map instance
                setMap(mapInstance);
                mapInitializedRef.current = true;
                renderAttemptedRef.current = true;
                
                // Clear initializing flag after a brief delay to ensure state is set
                setTimeout(() => {
                  isInitializingRef.current = false;
                }, 100);
              }}
            >
              <MapComponents.TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapComponents.Marker
                position={position}
                draggable={true}
                ref={markerRef}
                eventHandlers={{
                  dragend: handleMarkerDragEnd,
                }}
              >
                <MapComponents.Popup>
                  <div>
                    <strong>Selected Location</strong>
                    <br />
                    {currentAddress || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}
                    {isReverseGeocoding && (
                      <div className="mt-1">
                        <small className="text-muted">Loading address...</small>
                      </div>
                    )}
                  </div>
                </MapComponents.Popup>
              </MapComponents.Marker>
            </MapComponents.MapContainer>
          );
        })()}
      </div>

      {/* Controls */}
      <div className="mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex gap-2">
          {showCurrentLocation && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary radius-12"
              onClick={handleGetCurrentLocation}
            >
              <i className="ri-crosshair-line me-1" />
              Use Current Location
            </button>
          )}
        </div>
        <div className="text-secondary" style={{ fontSize: 13 }}>
          {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      </div>

      {/* Current Address Display */}
      {currentAddress && (
        <div className="mt-2 p-2 bg-light radius-8">
          <div className="text-secondary-light mb-1" style={{ fontSize: 12 }}>
            Address
          </div>
          <div className="fw-semibold" style={{ fontSize: 14 }}>
            {currentAddress}
          </div>
        </div>
      )}
    </div>
  );
}
