"use client";

import { useSubBreedsByBreed } from "@/lib/usePetTaxonomy";

export interface SubBreedSelectProps {
  breedId: string | number | null | undefined;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Sub-breed (variety) selector; options depend on selected breed.
 * Uses GET /api/v1/common/breeds/:breedId/sub-breeds. Disabled when no breed selected.
 */
export default function SubBreedSelect({
  breedId,
  value,
  onChange,
  disabled = false,
  placeholder = "—",
  className = "form-select",
  "data-testid": dataTestId,
}: SubBreedSelectProps) {
  const { subBreeds, loading } = useSubBreedsByBreed(breedId);
  const strValue = value != null && value !== "" ? String(value) : "";
  const noBreed = breedId == null || breedId === "";

  return (
    <select
      className={className}
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || noBreed || loading}
      data-testid={dataTestId}
    >
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {subBreeds.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
