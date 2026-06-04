"use client";

import LocationMasterDropdown, { type LocationSelectionOption } from "./LocationMasterDropdown";

type Props = {
  valueId?: string | number | null;
  onChange: (next: LocationSelectionOption | null) => void;
  locale?: "en" | "bn";
  disabled?: boolean;
};

export default function DivisionDropdown({ valueId, onChange, locale, disabled }: Props) {
  return (
    <LocationMasterDropdown
      endpoint="divisions"
      label="Division"
      valueId={valueId}
      onChange={onChange}
      locale={locale}
      disabled={disabled}
      placeholder="Select division"
    />
  );
}

