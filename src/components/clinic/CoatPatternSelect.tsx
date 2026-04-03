"use client";

import { useCoatPatterns } from "@/lib/usePetTaxonomy";

export interface CoatPatternSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Coat pattern selector for pet/patient forms.
 * Uses GET /api/v1/common/coat-patterns.
 */
export default function CoatPatternSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "—",
  className = "form-select",
  "data-testid": dataTestId,
}: CoatPatternSelectProps) {
  const { patterns, loading } = useCoatPatterns();
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
      {patterns.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
