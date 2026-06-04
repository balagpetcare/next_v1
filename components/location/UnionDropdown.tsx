"use client";

import LocationMasterDropdown, { type LocationSelectionOption } from "./LocationMasterDropdown";

type Props = {
  upazilaId?: string | number | null;
  valueId?: string | number | null;
  onChange: (next: LocationSelectionOption | null) => void;
  locale?: "en" | "bn";
  disabled?: boolean;
};

export default function UnionDropdown({ upazilaId, valueId, onChange, locale, disabled }: Props) {
  return (
    <LocationMasterDropdown
      endpoint="unions"
      label="Union"
      parentParamKey="upazilaId"
      parentId={upazilaId}
      valueId={valueId}
      onChange={onChange}
      locale={locale}
      disabled={disabled}
      placeholder="Select union"
    />
  );
}

