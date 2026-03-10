"use client";

export type PriorityLevel = "EMERGENCY" | "VIP" | "NORMAL" | "ROUTINE" | string;

const PRIORITY_CONFIG: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  EMERGENCY: { label: "Emergency", badgeClass: "bg-danger", borderClass: "border-start border-danger border-3" },
  VIP: { label: "VIP", badgeClass: "bg-warning text-dark", borderClass: "" },
  NORMAL: { label: "Normal", badgeClass: "bg-secondary", borderClass: "" },
  ROUTINE: { label: "Routine", badgeClass: "bg-light text-muted", borderClass: "" },
};

export interface DoctorPriorityBadgeProps {
  priority?: PriorityLevel | null;
  /** When true, apply left border to container (e.g. table row) */
  showBorder?: boolean;
  className?: string;
}

export function DoctorPriorityBadge({ priority, showBorder = false, className = "" }: DoctorPriorityBadgeProps) {
  const key = (priority ?? "NORMAL").toString().toUpperCase();
  const config = PRIORITY_CONFIG[key] ?? PRIORITY_CONFIG.NORMAL;

  if (key === "NORMAL" || key === "ROUTINE") {
    return showBorder ? null : <span className={`badge ${config.badgeClass} ${className}`.trim()}>{config.label}</span>;
  }

  return (
    <span className={`badge ${config.badgeClass} ${className}`.trim()} title={config.label}>
      {config.label}
    </span>
  );
}

/** Utility to get row border class for emergency/high priority */
export function getPriorityRowBorderClass(priority?: PriorityLevel | null): string {
  const key = (priority ?? "").toString().toUpperCase();
  return key === "EMERGENCY" ? "border-start border-danger border-3" : "";
}
