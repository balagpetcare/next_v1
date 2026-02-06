"use client";

import { useCallback, useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Phase 3: Leaflet map (client-only). OSM tiles, draggable marker, Confirm → lat/lng.
const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

function DraggableMarker({
  position,
  setPosition,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}) {
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e: any) => {
          const p = e.target.getLatLng();
          setPosition([p.lat, p.lng]);
        },
      }}
    />
  );
}

function MapContent({
  center,
  onConfirm,
}: {
  center: [number, number];
  onConfirm: (lat: number, lng: number, address?: string) => void;
}) {
  const [position, setPosition] = useState<[number, number]>(center);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
      const res = await fetch(
        `${base}/api/v1/locations/reverse?lat=${position[0]}&lng=${position[1]}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = res.ok ? await res.json() : null;
      const displayName = data?.data?.display_name || data?.data?.address?.road || null;
      setAddress(displayName);
      onConfirm(position[0], position[1], displayName || undefined);
    } catch {
      onConfirm(position[0], position[1]);
    } finally {
      setLoading(false);
    }
  }, [position, onConfirm]);

  return (
    <div className="location-picker">
      <div style={{ height: 320, width: "100%", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        <MapContainer
          // @ts-ignore
          center={position}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            // @ts-ignore
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
        <button type="button" className="btn btnPrimary" onClick={handleConfirm} disabled={loading}>
          {loading ? "Loading…" : "Confirm location"}
        </button>
        <button type="button" className="btn" onClick={() => setPosition(DEFAULT_CENTER)}>
          Reset to Dhaka
        </button>
      </div>
      {address && <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>{address}</p>}
    </div>
  );
}

export default function MapPicker({
  value,
  onChange,
}: {
  value: { lat?: number; lng?: number };
  onChange: (v: { lat?: number; lng?: number }) => void;
}) {
  useEffect(() => {
// @ts-ignore
    import("leaflet/dist/leaflet.css");
  }, []);
  const center: [number, number] =
    value?.lat != null && value?.lng != null ? [value.lat, value.lng] : DEFAULT_CENTER;

  const handleConfirm = useCallback(
    (lat: number, lng: number) => {
      onChange({ lat, lng });
    },
    [onChange]
  );

  if (typeof window === "undefined") {
    return (
      <div style={{ padding: 24, background: "var(--card-bg)", borderRadius: 8 }}>
        <p style={{ color: "var(--muted)" }}>Map loads on client.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div>
            <label className="label">Latitude</label>
            <input
              className="input"
              type="number"
              step="any"
              value={value?.lat ?? ""}
              onChange={(e) => onChange({ ...value, lat: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              className="input"
              type="number"
              step="any"
              value={value?.lng ?? ""}
              onChange={(e) => onChange({ ...value, lng: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MapContent center={center} onConfirm={handleConfirm} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        <div>
          <label className="label">Latitude</label>
          <input
            className="input"
            type="number"
            step="any"
            value={value?.lat ?? ""}
            onChange={(e) => onChange({ ...value, lat: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input
            className="input"
            type="number"
            step="any"
            value={value?.lng ?? ""}
            onChange={(e) => onChange({ ...value, lng: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
