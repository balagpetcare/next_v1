"use client";

import { BARCODE_LABEL_PRESETS } from "./labelPresets";

export default function LabelTemplateSelector({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`d-inline-flex align-items-center gap-2 ${className}`.trim()}>
      <span className="small text-secondary text-nowrap">Label size</span>
      <select
        className="form-select form-select-sm"
        style={{ width: "auto", minWidth: 140 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {BARCODE_LABEL_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
