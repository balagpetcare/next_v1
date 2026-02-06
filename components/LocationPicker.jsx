"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { postLocationEvents } from "@/lib/api";
import dynamic from "next/dynamic";
import { reverseGeocodeDebounced, forwardGeocode } from "@/lib/reverseGeocode";
import { ISO_COUNTRIES, searchCountries } from "@/lib/countries";
import { getAdmin1List } from "@/lib/admin1";
import { Search, MapPin, Navigation, Globe, ChevronDown, Loader2 } from "lucide-react";

// Dynamic import for Map to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/MapPicker"), { 
  ssr: false,
  loading: () => (
    <div className="h-100 w-100 d-flex align-items-center justify-content-center bg-light text-muted">
      <Loader2 className="animate-spin me-2" size={20} /> Loading Map...
    </div>
  )
});

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

function pickArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

/**
 * Country Dropdown with Flags
 */
function CountrySelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedCountry = ISO_COUNTRIES.find(c => c.code === value);
  const filteredCountries = searchCountries(search);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <div 
        className={`form-control d-flex align-items-center justify-content-between cursor-pointer ${disabled ? 'bg-light' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ minHeight: '42px' }}
      >
        <div className="d-flex align-items-center gap-2">
          {selectedCountry ? (
            <>
              <img 
                src={`https://flagcdn.com/24x18/${selectedCountry.code.toLowerCase()}.png`} 
                alt={selectedCountry.code}
                style={{ borderRadius: '2px' }}
              />
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-muted">Select Country</span>
          )}
        </div>
        <ChevronDown size={16} className="text-muted" />
      </div>

      {isOpen && (
        <div className="position-absolute top-100 start-0 w-100 bg-white border rounded-3 shadow-sm mt-1 z-3 overflow-hidden" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="p-2 sticky-top bg-white border-bottom">
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
                autoFocus
              />
            </div>
          </div>
          <div className="py-1">
            {filteredCountries.map(c => (
              <div 
                key={c.code}
                className="d-flex align-items-center gap-2 px-3 py-2 hover-bg-light cursor-pointer"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <img 
                  src={`https://flagcdn.com/20x15/${c.code.toLowerCase()}.png`} 
                  alt={c.code}
                  width={20}
                  height={15}
                  style={{ borderRadius: '2px' }}
                />
                <span>{c.name}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div className="text-center py-3 text-muted small">No countries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationPicker({ value, onChange, title = "Business Location", disabled = false }) {
  const v = value || {};
  const countryCode = String(v.countryCode || "BD").toUpperCase().trim().slice(0, 2) || "BD";
  const isBD = countryCode === "BD";

  // Form State
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [areas, setAreas] = useState([]);

  // Selections
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [bdAreaId, setBdAreaId] = useState("");
  const [admin1, setAdmin1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  
  // Coords
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  
  // UI State
  const [mapSearch, setMapSearch] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);

  // Derived
  const admin1List = useMemo(() => isBD ? [] : getAdmin1List(countryCode), [isBD, countryCode]);
  const useAdmin1Dropdown = !isBD && admin1List.length > 0;

  // Sync Props to State
  useEffect(() => {
    setDivisionId(v.divisionId ? String(v.divisionId) : "");
    setDistrictId(v.districtId ? String(v.districtId) : "");
    setUpazilaId(v.upazilaId ? String(v.upazilaId) : "");
    setBdAreaId(v.bdAreaId ? String(v.bdAreaId) : "");
    setAdmin1(v.admin1 || v.stateName || "");
    setCity(v.city || v.cityName || "");
    setPostalCode(v.postalCode || "");
    setLat(v.lat != null ? String(v.lat) : v.latitude != null ? String(v.latitude) : "");
    setLng(v.lng != null ? String(v.lng) : v.longitude != null ? String(v.longitude) : "");
  }, [v]);

  // Fetch BD Locations
  useEffect(() => {
    if (!isBD) return;
    let alive = true;
    fetchJson(`/api/v1/locations/divisions?lang=en`).then(d => alive && setDivisions(pickArray(d))).catch(() => alive && setDivisions([]));
    return () => { alive = false; };
  }, [isBD]);

  useEffect(() => {
    if (!isBD || !divisionId) { setDistricts([]); return; }
    let alive = true;
    fetchJson(`/api/v1/locations/districts?divisionId=${divisionId}&lang=en`).then(d => alive && setDistricts(pickArray(d))).catch(() => alive && setDistricts([]));
    return () => { alive = false; };
  }, [isBD, divisionId]);

  useEffect(() => {
    if (!isBD || !districtId) { setUpazilas([]); return; }
    let alive = true;
    fetchJson(`/api/v1/locations/upazilas?districtId=${districtId}&lang=en`).then(d => alive && setUpazilas(pickArray(d))).catch(() => alive && setUpazilas([]));
    return () => { alive = false; };
  }, [isBD, districtId]);

  useEffect(() => {
    if (!isBD || !upazilaId) { setAreas([]); return; }
    let alive = true;
    fetchJson(`/api/v1/locations/bd-areas?upazilaId=${upazilaId}&lang=en`).then(d => alive && setAreas(pickArray(d))).catch(() => alive && setAreas([]));
    return () => { alive = false; };
  }, [isBD, upazilaId]);

  // Helpers for names
  const divisionName = useMemo(() => divisions.find(d => String(d.id) === divisionId)?.nameEn || "", [divisions, divisionId]);
  const districtName = useMemo(() => districts.find(d => String(d.id) === districtId)?.nameEn || "", [districts, districtId]);
  const upazilaName = useMemo(() => upazilas.find(u => String(u.id) === upazilaId)?.nameEn || "", [upazilas, upazilaId]);
  const areaName = useMemo(() => areas.find(a => String(a.id) === bdAreaId)?.nameEn || "", [areas, bdAreaId]);

  const fullPathText = useMemo(() => {
    if (isBD) return [divisionName, districtName, upazilaName, areaName].filter(Boolean).join(" > ");
    return [admin1, city, postalCode].filter(Boolean).join(", ");
  }, [isBD, divisionName, districtName, upazilaName, areaName, admin1, city, postalCode]);

  // Patch Parent
  const applyPatch = useCallback((patch) => {
    const latNum = lat === "" ? undefined : parseFloat(lat);
    const lngNum = lng === "" ? undefined : parseFloat(lng);
    
    // Ensure we don't overwrite with stale state
    const next = { 
      ...v, 
      countryCode, 
      fullPathText, 
      text: fullPathText, 
      formattedAddress: fullPathText, 
      lat: latNum, 
      lng: lngNum, 
      latitude: latNum, 
      longitude: lngNum, 
      ...patch 
    };
    onChange?.(next);
  }, [v, countryCode, fullPathText, lat, lng, onChange]);

  // Handlers
  const handleCountryChange = (code) => {
    setDivisionId(""); setDistrictId(""); setUpazilaId(""); setBdAreaId("");
    setAdmin1(""); setCity(""); setPostalCode("");
    
    // 1. Immediate update for country selection
    // Reset state first to ensure "Select Country" placeholder doesn't show previous country name
    setAdmin1(""); setCity(""); setPostalCode("");
    const basePatch = { countryCode: code, divisionId: null, districtId: null, upazilaId: null, bdAreaId: null, admin1: "", city: "", postalCode: "", fullPathText: "", text: "" };
    onChange?.({ ...v, ...basePatch });

    // 2. Auto-center map on selected country
    const country = ISO_COUNTRIES.find(c => c.code === code);
    if (country) {
      // Auto-fill state name with country name if not BD, to give better UX
      if (code !== "BD") {
         // Optional: pre-fill country name as admin1 or similar if desired, 
         // but for now we just center map.
      }

      setIsSearchingMap(true);
      forwardGeocode(country.name)
        .then(result => {
          if (result) {
            setLat(String(result.lat));
            setLng(String(result.lng));
            applyPatch({ 
              ...basePatch, // re-apply base patch to be safe
              lat: result.lat, 
              lng: result.lng, 
              latitude: result.lat, 
              longitude: result.lng 
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsSearchingMap(false));
    }
  };

  const handleBdChange = (key, id) => {
    // Logic to reset children when parent changes
    let update = {};
    if (key === "divisionId") { setDivisionId(id); setDistrictId(""); setUpazilaId(""); setBdAreaId(""); update = { divisionId: id, districtId: null, upazilaId: null, bdAreaId: null }; }
    else if (key === "districtId") { setDistrictId(id); setUpazilaId(""); setBdAreaId(""); update = { districtId: id, upazilaId: null, bdAreaId: null }; }
    else if (key === "upazilaId") { setUpazilaId(id); setBdAreaId(""); update = { upazilaId: id, bdAreaId: null }; }
    else { setBdAreaId(id); update = { bdAreaId: id }; }
    
    // Defer the patch to next render or calculate names immediately? 
    // Calculating immediately is safer for consistency
    setTimeout(() => {
       // Re-construct names based on new IDs (requires access to latest state lists, which might not be updated yet if we fetched new ones)
       // For simplicity, we just trigger the generic update which pulls from state. 
       // But state updates are async. 
       // Better to let the useEffects and useMemos handle the text generation and just push IDs.
       const nextV = { ...v, ...update };
       onChange?.(nextV);
    }, 0);
  };

  const handleMapPick = useCallback(({ lat: newLat, lng: newLng }) => {
    setLat(String(newLat));
    setLng(String(newLng));
    
    reverseGeocodeDebounced(newLat, newLng, (result) => {
      if (result?.display_name) {
        applyPatch({ 
          lat: newLat, lng: newLng, latitude: newLat, longitude: newLng,
          formattedAddress: result.display_name, 
          fullPathText: result.display_name, 
          text: result.display_name 
        });
      } else {
        applyPatch({ lat: newLat, lng: newLng, latitude: newLat, longitude: newLng });
      }
    });
  }, [applyPatch]);

  const handleMapSearch = async (e) => {
    e.preventDefault();
    if (!mapSearch.trim()) return;
    
    setIsSearchingMap(true);
    const result = await forwardGeocode(mapSearch);
    setIsSearchingMap(false);
    
    if (result) {
      setLat(String(result.lat));
      setLng(String(result.lng));
      applyPatch({ 
        lat: result.lat, 
        lng: result.lng, 
        latitude: result.lat, 
        longitude: result.lng,
        formattedAddress: result.display_name 
      });
    }
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator?.geolocation) return;
    setCurrentLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(String(latitude));
        setLng(String(longitude));
        
        // Auto reverse geocode current location
        reverseGeocodeDebounced(latitude, longitude, (result) => {
            const address = result?.display_name || "";
            applyPatch({ 
                lat: latitude, 
                lng: longitude, 
                latitude, 
                longitude,
                formattedAddress: address,
                fullPathText: address,
                text: address 
            });
        });

        postLocationEvents({ lat: latitude, lng: longitude, source: "GPS", eventType: "PING", accuracyMeters: pos.coords.accuracy }).catch(() => {});
        setCurrentLocationLoading(false);
      },
      () => setCurrentLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [applyPatch]);

  return (
    <div className="card border-0 shadow-sm radius-12 overflow-hidden bg-white">
      <div className="card-header bg-white border-bottom py-3 px-4">
        <div className="d-flex align-items-center gap-2 text-primary">
          <MapPin size={20} />
          <h6 className="mb-0 fw-bold">{title}</h6>
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="row g-0">
          {/* Left Column: Form Inputs */}
          <div className="col-lg-5 border-end bg-light-subtle">
            <div className="p-4 h-100 overflow-y-auto" style={{ maxHeight: '600px' }}>
              <div className="row g-3">
                {/* Country */}
                <div className="col-12">
                  <label className="form-label fw-medium text-muted small text-uppercase ls-1">Country</label>
                  <CountrySelect 
                    value={countryCode} 
                    onChange={handleCountryChange} 
                    disabled={disabled} 
                  />
                </div>

                {/* Dynamic Location Fields */}
                {isBD ? (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">Division</label>
                      <select className="form-select form-select-sm h-42px" value={divisionId} onChange={(e) => handleBdChange("divisionId", e.target.value)} disabled={disabled}>
                        <option value="">Select...</option>
                        {divisions.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">District</label>
                      <select className="form-select form-select-sm h-42px" value={districtId} onChange={(e) => handleBdChange("districtId", e.target.value)} disabled={disabled || !divisionId}>
                        <option value="">Select...</option>
                        {districts.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">Upazila</label>
                      <select className="form-select form-select-sm h-42px" value={upazilaId} onChange={(e) => handleBdChange("upazilaId", e.target.value)} disabled={disabled || !districtId}>
                        <option value="">Select...</option>
                        {upazilas.map(u => <option key={u.id} value={u.id}>{u.nameEn}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">Area / Ward</label>
                      <select className="form-select form-select-sm h-42px" value={bdAreaId} onChange={(e) => handleBdChange("bdAreaId", e.target.value)} disabled={disabled || !upazilaId}>
                        <option value="">Select...</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.nameEn}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-12">
                      <label className="form-label small fw-medium">State / Province</label>
                      {useAdmin1Dropdown ? (
                        <select className="form-select h-42px" value={admin1} onChange={(e) => { setAdmin1(e.target.value); applyPatch({ admin1: e.target.value }); }} disabled={disabled}>
                          <option value="">Select State</option>
                          {admin1List.map(a => <option key={a.code} value={a.name}>{a.name}</option>)}
                        </select>
                      ) : (
                        <input className="form-control h-42px" value={admin1} onChange={(e) => { setAdmin1(e.target.value); applyPatch({ admin1: e.target.value }); }} placeholder="State Name" disabled={disabled} />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">City</label>
                      <input className="form-control h-42px" value={city} onChange={(e) => { setCity(e.target.value); applyPatch({ city: e.target.value }); }} placeholder="City Name" disabled={disabled} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-medium">Postal Code</label>
                      <input className="form-control h-42px" value={postalCode} onChange={(e) => { setPostalCode(e.target.value); applyPatch({ postalCode: e.target.value }); }} placeholder="Zip Code" disabled={disabled} />
                    </div>
                  </>
                )}

                {/* Selected Address Readonly */}
                <div className="col-12">
                  <div className="p-3 bg-white rounded border border-dashed">
                    <div className="d-flex align-items-center gap-2 mb-1 text-muted">
                      <Globe size={14} />
                      <span className="small fw-bold text-uppercase">Formatted Address</span>
                    </div>
                    <p className="mb-0 small text-dark fw-medium text-break">
                      {fullPathText || <span className="text-muted fst-italic">No location selected yet</span>}
                    </p>
                  </div>
                </div>

                {/* Coordinates Manual Input */}
                <div className="col-12">
                  <label className="form-label small fw-medium text-muted">Coordinates (Auto-filled from map)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted">Lat</span>
                    <input type="number" className="form-control" value={lat} onChange={(e) => { setLat(e.target.value); applyPatch({ lat: e.target.value }); }} placeholder="0.0000" disabled={disabled} />
                    <span className="input-group-text bg-white text-muted">Lng</span>
                    <input type="number" className="form-control" value={lng} onChange={(e) => { setLng(e.target.value); applyPatch({ lng: e.target.value }); }} placeholder="0.0000" disabled={disabled} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Map & Search */}
          <div className="col-lg-7 position-relative bg-light">
             {/* Map Search Overlay - FIXED z-index to be always visible */}
             <div className="position-absolute top-0 start-0 end-0 p-3" style={{ zIndex: 1000, pointerEvents: 'none' }}>
                <form 
                  onSubmit={handleMapSearch} 
                  className="bg-white rounded-pill shadow-sm d-flex align-items-center p-1 border mx-auto"
                  style={{ maxWidth: '400px', pointerEvents: 'auto' }}
                >
                  <Search size={18} className="text-muted ms-3" />
                  <input 
                    type="text" 
                    className="form-control border-0 shadow-none bg-transparent" 
                    placeholder="Search map location..." 
                    value={mapSearch}
                    onChange={(e) => setMapSearch(e.target.value)}
                    disabled={isSearchingMap || disabled}
                  />
                  {isSearchingMap ? (
                    <div className="pe-3"><Loader2 size={18} className="animate-spin text-primary" /></div>
                  ) : (
                    <button type="submit" className="btn btn-primary rounded-circle p-2 m-1 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }} disabled={disabled}>
                      <Navigation size={14} />
                    </button>
                  )}
                </form>
             </div>

             {/* Map Container */}
             <div style={{ height: '600px', width: '100%', zIndex: 1 }}>
                <MapPicker 
                  lat={lat === "" ? undefined : parseFloat(lat)} 
                  lng={lng === "" ? undefined : parseFloat(lng)} 
                  onPick={handleMapPick} 
                  height={600}
                />
             </div>

             {/* Current Location FAB - Fixed z-index */}
             <button 
                type="button" 
                className="position-absolute bottom-0 end-0 m-4 btn btn-white bg-white shadow p-2 rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 48, height: 48, zIndex: 1000 }}
                onClick={handleUseCurrentLocation}
                disabled={currentLocationLoading || disabled}
                title="Use Current Location"
             >
                {currentLocationLoading ? (
                  <Loader2 size={24} className="animate-spin text-primary" />
                ) : (
                  <Navigation size={24} className="text-dark" />
                )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
