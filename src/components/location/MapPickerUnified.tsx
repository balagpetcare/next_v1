"use client";

/**
 * MapPickerUnified – thin wrapper around MapPicker for unified location flow.
 * Used by LocationPickerUnified; parent controls overlay z-index.
 */

import MapPicker from "./MapPicker";

export type MapPickerUnifiedProps = {
  lat?: number;
  lng?: number;
  onPick?: (coords: { lat: number; lng: number }) => void;
  height?: number;
  disabled?: boolean;
};

export default function MapPickerUnified({
  lat,
  lng,
  onPick,
  height = 420,
  disabled = false,
}: MapPickerUnifiedProps) {
  return (
    <div
      className="map-picker-unified overflow-hidden"
      style={{
        height: `${height}px`,
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <MapPicker lat={lat} lng={lng} onPick={onPick} height={height} disabled={disabled} />
    </div>
  );
}
