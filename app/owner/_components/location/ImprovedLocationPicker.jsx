"use client";

/**
 * @deprecated Use LocationField -> LocationPickerUnified. No longer loads Division/District/Upazila from DB.
 */
import LocationPickerUnified from "@/components/common/LocationPickerUnified";

export default function ImprovedLocationPicker({
  value,
  onChange,
  title = "Business Location",
  disabled = false,
  lang = "en",
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
