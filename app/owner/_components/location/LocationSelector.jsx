"use client";

/**
 * @deprecated Use LocationField -> LocationPickerUnified. No longer loads Division/District/Upazila from DB.
 */
import LocationPickerUnified from "@/components/common/LocationPickerUnified";

export default function LocationSelector({ value, onChange, lang = "en", title = "Business Location" }) {
  return (
    <LocationPickerUnified
      value={value}
      onChange={onChange}
      label={title}
      enableRecent
      enableGPS
      enableMap
    />
  );
}
