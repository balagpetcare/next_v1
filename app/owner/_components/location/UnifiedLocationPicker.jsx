"use client";

/**
 * @deprecated Use LocationField from @/src/components/location/LocationField for new forms.
 * Delegates to LocationPickerUnified. BD Division/District/Upazila no longer loaded from DB.
 */
import LocationPickerUnified from "@/components/common/LocationPickerUnified";

export default function UnifiedLocationPicker({
  value,
  onChange,
  title = "Business Location",
  useEnhanced = false,
  defaultMode = "combined",
  ...rest
}) {
  return (
    <LocationPickerUnified
      value={value}
      onChange={onChange}
      label={title}
      enableRecent
      enableGPS
      enableMap
      {...rest}
    />
  );
}
