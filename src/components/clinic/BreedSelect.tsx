"use client";

import { useBreedsByAnimalType } from "@/lib/usePetTaxonomy";

export interface BreedSelectProps {
  animalTypeId: string | number | null | undefined;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Canonical breed selector; options depend on selected species.
 * Uses GET /api/v1/common/breeds/:typeId. Disabled when no species selected.
 */
export default function BreedSelect({
  animalTypeId,
  value,
  onChange,
  disabled = false,
  placeholder = "—",
  className = "form-select",
  "data-testid": dataTestId,
}: BreedSelectProps) {
  const { breeds, loading } = useBreedsByAnimalType(animalTypeId);
  const strValue = value != null && value !== "" ? String(value) : "";
  const noSpecies = animalTypeId == null || animalTypeId === "";

  return (
    <select
      className={className}
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || noSpecies || loading}
      data-testid={dataTestId}
    >
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {breeds.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
