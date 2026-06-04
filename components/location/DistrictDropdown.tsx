"use client";

import LocationMasterDropdown, { type LocationSelectionOption } from "./LocationMasterDropdown";

type Props = {
  divisionId?: string | number | null;
  valueId?: string | number | null;
  onChange: (next: LocationSelectionOption | null) => void;
  locale?: "en" | "bn";
  disabled?: boolean;
};

export default function DistrictDropdown({ divisionId, valueId, onChange, locale, disabled }: Props) {
  return (
    <LocationMasterDropdown
      endpoint="districts"
      label="District"
      parentParamKey="divisionId"
      parentId={divisionId}
      valueId={valueId}
      onChange={onChange}
      locale={locale}
      disabled={disabled}
      placeholder="Select district"
    />
  );
}

