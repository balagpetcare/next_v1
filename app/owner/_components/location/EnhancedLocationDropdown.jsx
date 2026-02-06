"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function fetchJson(path) {
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

function pickArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.data)) return x.data;
  return [];
}

/**
 * EnhancedLocationDropdown Component
 * 
 * Features:
 * - Single searchable dropdown showing all location hierarchy
 * - Displays: Division > District > Upazila > Area (for BD) or City Corporation > Zone > Ward > Area (for Dhaka)
 * - Search functionality to filter all levels simultaneously
 * - Shows full path when selected
 * - Backward compatible with existing value structure
 */
export default function EnhancedLocationDropdown({
  value,
  onChange,
  title = "Location",
  placeholder = "Search or select location...",
  lang = "en",
  mode,
  countryCode,
}) {
  const v = value || {};
  const cc = String(countryCode || v.countryCode || "BD").toUpperCase().trim() || "BD";
  const isGlobalMode = String(mode || "").toUpperCase() === "GLOBAL" || cc !== "BD";
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // All locations data
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [bdAreas, setBdAreas] = useState([]);
  const [cityCorporations, setCityCorporations] = useState([]);
  const [dhakaAreas, setDhakaAreas] = useState([]);
  const [globalResults, setGlobalResults] = useState([]);

  // Load all location data
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    async function loadAllData() {
      try {
        if (isGlobalMode) {
          if (!alive) return;
          setDivisions([]);
          setDistricts([]);
          setUpazilas([]);
          setBdAreas([]);
          setCityCorporations([]);
          setDhakaAreas([]);
          setLoading(false);
          return;
        }
        // Load divisions
        const divs = await fetchJson("/api/v1/locations/divisions?lang=" + lang);
        if (!alive) return;
        setDivisions(pickArray(divs));

        // Load districts (all)
        const dists = await fetchJson("/api/v1/locations/districts?lang=" + lang + "&limit=200");
        if (!alive) return;
        setDistricts(pickArray(dists));

        // Load upazilas (all)
        const upazs = await fetchJson("/api/v1/locations/upazilas?lang=" + lang + "&limit=500");
        if (!alive) return;
        setUpazilas(pickArray(upazs));

        // Load BD areas (all, with pagination if needed)
        const areas = await fetchJson("/api/v1/locations/bd-areas?lang=" + lang + "&limit=1000");
        if (!alive) return;
        setBdAreas(pickArray(areas));

        // Load city corporations
        const corps = await fetchJson("/api/v1/locations/city-corporations");
        if (!alive) return;
        setCityCorporations(pickArray(corps));

        // Load Dhaka areas (for each corporation)
        const dhakaAreasList = [];
        for (const corp of pickArray(corps)) {
          try {
            const areas = await fetchJson(`/api/v1/locations/areas?corp=${encodeURIComponent(corp.code)}&limit=500`);
            const areaList = pickArray(areas);
            dhakaAreasList.push(...areaList.map(a => ({ ...a, cityCorporationCode: corp.code, cityCorporationId: corp.id })));
          } catch (e) {
            console.error(`Failed to load areas for ${corp.code}:`, e);
          }
        }
        if (!alive) return;
        setDhakaAreas(dhakaAreasList);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load locations");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAllData();

    return () => {
      alive = false;
    };
  }, [lang, isGlobalMode]);

  useEffect(() => {
    let alive = true;
    if (!isGlobalMode) return () => {};

    const q = searchQuery.trim();
    if (!q || q.length < 3) {
      setGlobalResults([]);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        const raw = await fetchJson(
          `/api/v1/locations/geocode?q=${encodeURIComponent(q)}&countryCode=${encodeURIComponent(cc)}`
        );
        if (!alive) return;
        const rows = pickArray(raw);
        const items = rows.map((item) => {
          const address = item?.address || {};
          const providerPlaceId = item?.place_id
            ? String(item.place_id)
            : item?.osm_id
              ? `${String(item?.osm_type || "osm")}:${String(item.osm_id)}`
              : String(item?.display_name || "");

          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            null;

          const addressLine = [address.house_number, address.road].filter(Boolean).join(" ").trim() || null;

          return {
            kind: "GLOBAL_PLACE",
            id: providerPlaceId,
            provider: "OSM",
            providerPlaceId,
            fullPathText: String(item?.display_name || "").trim(),
            searchText: String(item?.display_name || "").toLowerCase(),
            latitude: item?.lat ? Number(item.lat) : null,
            longitude: item?.lon ? Number(item.lon) : null,
            countryCode: address.country_code ? String(address.country_code).toUpperCase() : cc,
            countryName: address.country ? String(address.country) : null,
            stateName: address.state ? String(address.state) : address.region ? String(address.region) : null,
            cityName: city ? String(city) : null,
            postalCode: address.postcode ? String(address.postcode) : null,
            addressLine,
            formattedAddress: String(item?.display_name || "").trim() || null,
          };
        });
        setGlobalResults(items);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to search locations");
      } finally {
        if (alive) setLoading(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery, cc, isGlobalMode]);

  // Build flat list of all locations with full paths
  const allLocations = useMemo(() => {
    if (isGlobalMode) return globalResults;
    const locations = [];

    // BD Areas: Division > District > Upazila > Area
    for (const area of bdAreas) {
      const upazila = upazilas.find(u => u.id === area.upazilaId);
      const district = districts.find(d => d.id === (area.districtId || upazila?.districtId));
      const division = divisions.find(d => d.id === district?.divisionId);

      const pathParts = [];
      if (division) pathParts.push(division.nameEn || division.nameBn);
      if (district) pathParts.push(district.nameEn || district.nameBn);
      if (upazila) pathParts.push(upazila.nameEn || upazila.nameBn);
      pathParts.push(area.nameEn || area.nameBn);

      locations.push({
        kind: "BD_AREA",
        id: area.id,
        bdAreaId: area.id,
        divisionId: division?.id,
        districtId: district?.id,
        upazilaId: upazila?.id,
        nameEn: area.nameEn,
        nameBn: area.nameBn,
        fullPathText: pathParts.join(" > "),
        searchText: pathParts.join(" ").toLowerCase(),
        latitude: area.latitude ? Number(area.latitude) : null,
        longitude: area.longitude ? Number(area.longitude) : null,
        locationBreakdown: {
          division: division?.nameEn || division?.nameBn,
          district: district?.nameEn || district?.nameBn,
          upazila: upazila?.nameEn || upazila?.nameBn,
          area: area.nameEn || area.nameBn,
        },
      });
    }

    // Dhaka Areas: City Corporation > Zone > Ward > Area
    for (const area of dhakaAreas) {
      const corp = cityCorporations.find(c => c.id === area.cityCorporationId);
      const pathParts = [];
      if (corp) pathParts.push(corp.nameEn || corp.nameBn || corp.code);
      pathParts.push(area.nameEn || area.nameBn);

      locations.push({
        kind: "DHAKA_AREA",
        id: area.id,
        dhakaAreaId: area.id,
        cityCorporationId: area.cityCorporationId,
        cityCorporationCode: area.cityCorporationCode,
        nameEn: area.nameEn,
        nameBn: area.nameBn,
        fullPathText: pathParts.join(" > "),
        searchText: pathParts.join(" ").toLowerCase(),
        latitude: area.latitude ? Number(area.latitude) : null,
        longitude: area.longitude ? Number(area.longitude) : null,
        locationBreakdown: {
          cityCorporation: corp?.nameEn || corp?.nameBn || corp?.code,
          area: area.nameEn || area.nameBn,
        },
      });
    }

    return locations.sort((a, b) => a.fullPathText.localeCompare(b.fullPathText));
  }, [bdAreas, upazilas, districts, divisions, dhakaAreas, cityCorporations, globalResults, isGlobalMode]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (isGlobalMode) {
      if (!searchQuery.trim()) return globalResults.slice(0, 20);
      const query = searchQuery.toLowerCase().trim();
      return globalResults
        .filter((loc) => loc.searchText.includes(query) || loc.fullPathText.toLowerCase().includes(query))
        .slice(0, 50);
    }
    if (!searchQuery.trim()) {
      return allLocations.slice(0, 100); // Limit initial display
    }

    const query = searchQuery.toLowerCase().trim();
    return allLocations.filter(loc => 
      loc.searchText.includes(query) ||
      loc.nameEn?.toLowerCase().includes(query) ||
      loc.nameBn?.toLowerCase().includes(query) ||
      loc.fullPathText.toLowerCase().includes(query)
    ).slice(0, 50); // Limit results
  }, [allLocations, searchQuery]);

  // Find selected location
  const selectedLocation = useMemo(() => {
    if (v.kind === "BD_AREA" && v.bdAreaId) {
      return allLocations.find(loc => loc.kind === "BD_AREA" && loc.bdAreaId === v.bdAreaId);
    }
    if (v.kind === "DHAKA_AREA" && v.dhakaAreaId) {
      return allLocations.find(loc => loc.kind === "DHAKA_AREA" && loc.dhakaAreaId === v.dhakaAreaId);
    }
    if (v.kind === "GLOBAL_PLACE" && (v.providerPlaceId || v.formattedAddress)) {
      const k = String(v.providerPlaceId || v.formattedAddress);
      return allLocations.find((loc) => loc.kind === "GLOBAL_PLACE" && String(loc.providerPlaceId) === k);
    }
    return null;
  }, [v, allLocations]);

  // Handle location selection
  const handleSelect = useCallback(async (location) => {
    const next = {
      kind: location.kind,
      fullPathText: location.fullPathText,
      text: location.fullPathText,
      nameEn: location.nameEn,
      nameBn: location.nameBn,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      locationBreakdown: location.locationBreakdown || {},
    };

    if (location.kind === "BD_AREA") {
      next.bdAreaId = location.bdAreaId;
      next.divisionId = location.divisionId;
      next.districtId = location.districtId;
      next.upazilaId = location.upazilaId;
    } else if (location.kind === "DHAKA_AREA") {
      next.dhakaAreaId = location.dhakaAreaId;
      next.cityCorporationId = location.cityCorporationId;
      next.cityCorporationCode = location.cityCorporationCode;
    } else if (location.kind === "GLOBAL_PLACE") {
      next.countryCode = location.countryCode || cc;
      next.countryName = location.countryName || null;
      next.stateName = location.stateName || null;
      next.cityName = location.cityName || null;
      next.postalCode = location.postalCode || null;
      next.addressLine = location.addressLine || null;
      next.formattedAddress = location.formattedAddress || location.fullPathText || null;
      next.provider = location.provider || "OSM";
      next.providerPlaceId = location.providerPlaceId || null;
    }

    // If coordinates not available, try to fetch from API
    if ((location.kind === "BD_AREA" || location.kind === "DHAKA_AREA") && (!next.latitude || !next.longitude)) {
      try {
        const queryParam = location.kind === "BD_AREA" 
          ? `bdAreaId=${location.bdAreaId}` 
          : `dhakaAreaId=${location.dhakaAreaId}`;
        const resolved = await fetchJson(`/api/v1/locations/resolve?${queryParam}`);
        if (resolved?.latitude && resolved?.longitude) {
          next.latitude = Number(resolved.latitude);
          next.longitude = Number(resolved.longitude);
        }
      } catch (e) {
        // Silently fail - coordinates are optional
        console.debug("Failed to fetch coordinates:", e);
      }
    }

    onChange?.(next);
    setSearchQuery(location.fullPathText);
    setIsOpen(false);
  }, [onChange, cc]);

  const displayText = selectedLocation?.fullPathText || v.fullPathText || v.text || "";
  const inputValue = searchQuery !== "" ? searchQuery : displayText;

  return (
    <div className="enhanced-location-dropdown">
      <label className="form-label mb-2">{title}</label>
      
      {error && (
        <div className="alert alert-warning py-2 mb-2" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="position-relative">
        <div className="input-group">
          <span className="input-group-text bg-light">
            <i className="ri-map-pin-line" />
          </span>
          <input
            type="text"
            className="form-control radius-12"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay to allow click events
              setTimeout(() => setIsOpen(false), 200);
            }}
            disabled={loading}
          />
          {loading && (
            <span className="input-group-text bg-light">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (searchQuery || filteredLocations.length > 0) && (
          <div
            className="border rounded mt-1 bg-white shadow-sm"
            style={{
              maxHeight: 300,
              overflow: "auto",
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          >
            {filteredLocations.length === 0 ? (
              <div className="p-3 text-center text-muted">
                {searchQuery ? "No locations found" : "Start typing to search..."}
              </div>
            ) : (
              filteredLocations.map((location, idx) => {
                const isSelected = 
                  (location.kind === "BD_AREA" && location.bdAreaId === v.bdAreaId) ||
                  (location.kind === "DHAKA_AREA" && location.dhakaAreaId === v.dhakaAreaId) ||
                  (location.kind === "GLOBAL_PLACE" && String(location.providerPlaceId) === String(v.providerPlaceId || v.formattedAddress || ""));

                return (
                  <button
                    key={`${location.kind}-${location.id}-${idx}`}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                      isSelected ? "active" : ""
                    }`}
                    style={{ width: "100%", border: 0, borderBottom: "1px solid #eee", textAlign: "left" }}
                    onClick={() => handleSelect(location)}
                  >
                    <div className="flex-grow-1">
                      <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: 14 }}>
                        {location.fullPathText}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {location.kind === "BD_AREA"
                          ? "Bangladesh"
                          : location.kind === "DHAKA_AREA"
                            ? "Dhaka City"
                            : location.countryCode || "Global"}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="badge text-bg-primary">Selected</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="mt-2 p-2 bg-light radius-8">
          <div className="text-secondary-light mb-1" style={{ fontSize: 12 }}>
            Selected Location
          </div>
          <div className="fw-semibold" style={{ fontSize: 14 }}>
            {selectedLocation.fullPathText}
          </div>
        </div>
      )}
    </div>
  );
}
