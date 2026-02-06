"use client";

import { useEffect, useRef } from "react";

// Fix Leaflet's default icon path issues in Next.js/Webpack
const fixLeafletIcons = (L) => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

const DEFAULT_CENTER = [23.8103, 90.4125];

export default function MapPicker({ lat, lng, onPick, height = 280 }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isReadyRef = useRef(false);
  const disabledRef = useRef(false);
  const leafletRef = useRef(null);

  // Validate coordinates
  const hasValidCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  const initialCenter = hasValidCoords ? [Number(lat), Number(lng)] : DEFAULT_CENTER;

  // Initialize Map
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isReadyRef.current) return; // Prevent double initialization logic if strict mode behaves oddly with refs

    let cancelled = false;
    let container = null;

    (async () => {
      try {
        await import("leaflet/dist/leaflet.css").catch(() => {});
        const mod = await import("leaflet");
        const L = mod?.default || mod;
        leafletRef.current = L;
        fixLeafletIcons(L);

        container = mapContainerRef.current;
        if (!container) return;

        // Safety check: if container already has a map (leaflet_id), clean it
        if (container._leaflet_id) {
          container._leaflet_id = null;
        }

        if (cancelled) return;

        const map = L.map(container, {
          center: initialCenter,
          zoom: 13,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker(initialCenter, { draggable: true }).addTo(map);

        // Event: Click on map
        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onPick?.({ lat, lng });
        });

        // Event: Drag marker
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onPick?.({ lat, lng });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        isReadyRef.current = true;
      } catch {
        // ignore init errors
      }
    })();

    // Cleanup function
    return () => {
      cancelled = true;
      const map = mapInstanceRef.current;
      try {
        map?.off();
        map?.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
      isReadyRef.current = false;
      // Explicitly clear leaflet id from container to be safe
      if (container) {
        container._leaflet_id = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update marker/view when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    
    if (map && marker && hasValidCoords) {
      const currentLatLng = marker.getLatLng();
      const newLat = Number(lat);
      const newLng = Number(lng);

      // Check distance to avoid micro-movements or loops
      const dist = Math.sqrt(
          Math.pow(currentLatLng.lat - newLat, 2) + 
          Math.pow(currentLatLng.lng - newLng, 2)
      );

      if (dist > 0.00001) {
          const newPos = [newLat, newLng];
          marker.setLatLng(newPos);
          map.flyTo(newPos, map.getZoom());
      }
    }
  }, [lat, lng, hasValidCoords]);

  return (
    <div 
      className="border radius-12 overflow-hidden" 
      style={{ height: `${height}px`, width: "100%" }} 
    >
      <div 
        ref={mapContainerRef} 
        style={{ height: "100%", width: "100%" }} 
      />
    </div>
  );
}
