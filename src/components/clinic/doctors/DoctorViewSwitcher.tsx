"use client";

export type DoctorViewMode = "table" | "cards" | "schedule";

const MODES: { key: DoctorViewMode; label: string; icon: string }[] = [
  { key: "table", label: "Table", icon: "ri-list-unordered" },
  { key: "cards", label: "Cards", icon: "ri-layout-grid-line" },
  { key: "schedule", label: "Schedule", icon: "ri-calendar-schedule-line" },
];

type Props = {
  mode: DoctorViewMode;
  onChange: (mode: DoctorViewMode) => void;
  className?: string;
};

export default function DoctorViewSwitcher({ mode, onChange, className = "" }: Props) {
  return (
    <div className={`btn-group btn-group-sm ${className}`} role="group" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          className={`btn ${mode === m.key ? "btn-primary" : "btn-outline-secondary"} radius-8`}
          onClick={() => onChange(m.key)}
          aria-pressed={mode === m.key}
        >
          <i className={`${m.icon} me-1`} aria-hidden />
          {m.label}
        </button>
      ))}
    </div>
  );
}
