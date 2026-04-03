"use client";

import { useAnimalSizes } from "@/lib/usePetTaxonomy";

export interface AnimalSizeSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Animal size selector for pet/patient forms.
 * Uses GET /api/v1/common/animal-sizes.
 */
export default function AnimalSizeSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "—",
  className = "form-select",
  "data-testid": dataTestId,
}: AnimalSizeSelectProps) {
  const { sizes, loading } = useAnimalSizes();
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
      {sizes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
