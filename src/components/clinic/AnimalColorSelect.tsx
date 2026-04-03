"use client";

import { useAnimalColors } from "@/lib/usePetTaxonomy";

export interface AnimalColorSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Canonical animal color selector for pet/patient forms.
 * Uses GET /api/v1/common/animal-colors.
 */
export default function AnimalColorSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select color",
  className = "form-select",
  "data-testid": dataTestId,
}: AnimalColorSelectProps) {
  const { colors, loading } = useAnimalColors();
  const strValue = value != null && value !== "" ? String(value) : "";

  return (
    <select
      className={className}
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      data-testid={dataTestId}
    >
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {colors.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
