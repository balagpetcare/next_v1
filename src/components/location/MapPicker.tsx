"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

// Fix Leaflet default icon paths (CDN) for Next.js/webpack
type LeafletModule = typeof import("leaflet");

const ensureIcons = (L: LeafletModule) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
};

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];

export type MapPickerProps = {
  lat?: number;
  lng?: number;
  onPick?: (coords: { lat: number; lng: number }) => void;
  height?: number;
  disabled?: boolean;
};

/**
 * Leaflet map picker with proper cleanup to avoid
 * "Map container is already initialized" errors.
 * Create once per mount; on unmount: map.off(), map.remove(), clear container._leaflet_id.
 * To get a fresh map (e.g. after closing a modal), remount with a new key.
 * SOURCE: org location flow from components/MapPicker.jsx
 */
export default function MapPicker({
  lat,
  lng,
  onPick,
  height = 280,
  disabled = false,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const readyRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const hasCoords =
    lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const initialCenter: [number, number] = hasCoords
    ? [Number(lat), Number(lng)]
    : DEFAULT_CENTER;

  // Initialize map once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readyRef.current) return;

    let cancelled = false;
    let container: any = null;

    (async () => {
      try {
        // Load CSS on client
        await import("leaflet/dist/leaflet.css").catch(() => {});
        const mod = await import("leaflet");
        const L = (mod as any).default || mod;
        if (cancelled) return;

        ensureIcons(L);

        container = containerRef.current as any;
        if (!container) return;

        // Clean any zombie map id if present
        if (container._leaflet_id) {
          container._leaflet_id = null;
        }

        const map = L.map(container, {
          center: initialCenter,
          zoom: 13,
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker(initialCenter, { draggable: !disabledRef.current }).addTo(map);

        map.on("click", (e: any) => {
          if (disabledRef.current) return;
          const { lat: cLat, lng: cLng } = e.latlng;
          marker.setLatLng([cLat, cLng]);
          onPick?.({ lat: cLat, lng: cLng });
        });

        marker.on("dragend", () => {
          if (disabledRef.current) return;
          const pos = marker.getLatLng();
          onPick?.({ lat: pos.lat, lng: pos.lng });
        });

        mapRef.current = map;
        markerRef.current = marker;
        readyRef.current = true;
      } catch {
        // ignore init errors (e.g. leaflet not available)
      }
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current;
      try {
        map?.off();
        map?.remove();
      } catch {
        // ignore
      } finally {
        mapRef.current = null;
        markerRef.current = null;
        readyRef.current = false;
        if (container) {
          // eslint-disable-next-line no-underscore-dangle
          (container as any)._leaflet_id = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Update marker / view on prop change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!hasCoords) return;
    const current = marker.getLatLng();
    const next: [number, number] = [Number(lat), Number(lng)];
    const dist = Math.sqrt(
      Math.pow(current.lat - next[0], 2) + Math.pow(current.lng - next[1], 2)
    );
    if (dist > 0.00001) {
      marker.setLatLng(next);
      map.flyTo(next, map.getZoom());
    }
  }, [hasCoords, lat, lng]);

  return (
    <div
      className="border radius-12 overflow-hidden"
      style={{ height: `${height}px`, width: "100%" }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
