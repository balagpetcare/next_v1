"use client";

import { useAnimalTypes } from "@/lib/usePetTaxonomy";

export interface SpeciesSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Canonical species (animal type) selector for pet/patient forms.
 * Options come from GET /api/v1/common/animal-types.
 */
export default function SpeciesSelect({
  value,
  onChange,
  disabled = false,
  loading: loadingProp,
  placeholder = "Select species",
  className = "form-select",
  "data-testid": dataTestId,
}: SpeciesSelectProps) {
  const { types, loading } = useAnimalTypes();
  const loadingState = loadingProp ?? loading;
  const strValue = value != null && value !== "" ? String(value) : "";

  return (
    <select
      className={className}
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loadingState}
      data-testid={dataTestId}
    >
      <option value="">{loadingState ? "Loading…" : placeholder}</option>
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
