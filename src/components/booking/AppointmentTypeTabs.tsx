"use client";

import type { AppointmentType } from "@/src/types/appointment";

const TYPES: { value: AppointmentType; label: string }[] = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "SERVICE", label: "Service" },
  { value: "PACKAGE", label: "Package" },
  { value: "SURGERY", label: "Surgery" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

export interface AppointmentTypeTabsProps {
  value: AppointmentType;
  onChange: (type: AppointmentType) => void;
  disabled?: boolean;
}

export default function AppointmentTypeTabs({ value, onChange, disabled }: AppointmentTypeTabsProps) {
  return (
    <div className="btn-group w-100" role="group">
      {TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          className={`btn btn-sm ${value === t.value ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => !disabled && onChange(t.value)}
          disabled={disabled}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
