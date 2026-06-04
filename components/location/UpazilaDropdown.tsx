"use client";

import LocationMasterDropdown, { type LocationSelectionOption } from "./LocationMasterDropdown";

type Props = {
  districtId?: string | number | null;
  valueId?: string | number | null;
  onChange: (next: LocationSelectionOption | null) => void;
  locale?: "en" | "bn";
  disabled?: boolean;
};

export default function UpazilaDropdown({ districtId, valueId, onChange, locale, disabled }: Props) {
  return (
    <LocationMasterDropdown
      endpoint="upazilas"
      label="Upazila"
      parentParamKey="districtId"
      parentId={districtId}
      valueId={valueId}
      onChange={onChange}
      locale={locale}
      disabled={disabled}
      placeholder="Select upazila"
    />
  );
}

