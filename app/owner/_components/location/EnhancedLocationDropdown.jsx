"use client";

/**
 * @deprecated Use LocationField -> LocationPickerUnified. No longer loads Division/District/Upazila from DB.
 */
import LocationPickerUnified from "@/components/common/LocationPickerUnified";

export default function EnhancedLocationDropdown({
  value,
  onChange,
  title = "Location",
  placeholder = "Search or select location...",
  lang = "en",
  mode,
  countryCode,
}) {
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
