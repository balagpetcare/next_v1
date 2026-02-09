"use client";

/**
 * LocationField – unified location picker for ALL countries.
 * Uses LocationPickerUnified: Country -> State/Province -> City -> Postal + Address Line + Map.
 * No BD special-case (Division/District/Upazila); same fields for Bangladesh as for others.
 */

import LocationPickerUnified from "@/components/common/LocationPickerUnified";
import type { LocationValue } from "@/src/lib/location/normalizeLocation";

export type LocationFieldProps = {
  value: LocationValue | null;
  onChange: (next: LocationValue) => void;
  label?: string;
  required?: boolean;
  defaultCountryCode?: string;
  enableRecent?: boolean;
  enableGPS?: boolean;
  enableMap?: boolean;
  /** @deprecated No longer used – all countries use unified fields */
  enableBdHierarchy?: boolean;
};

export default function LocationField(props: LocationFieldProps) {
  return (
    <LocationPickerUnified
      value={props.value}
      onChange={props.onChange}
      label={props.label}
      required={props.required}
      defaultCountryCode={props.defaultCountryCode}
      enableRecent={props.enableRecent}
      enableGPS={props.enableGPS}
      enableMap={props.enableMap}
    />
  );
}
