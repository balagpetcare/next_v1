"use client";

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface DoctorClinicSwitcherProps {
  branches: BranchOption[];
  value: string;
  onChange: (branchId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DoctorClinicSwitcher({
  branches,
  value,
  onChange,
  className = "",
  disabled = false,
}: DoctorClinicSwitcherProps) {
  return (
    <select
      className={`form-select form-select-sm ${className}`.trim()}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ width: "auto", minWidth: "140px" }}
      aria-label="Select clinic"
    >
      <option value="">All clinics</option>
      {branches.map((b) => (
        <option key={b.branchId} value={b.branchId}>
          {b.branchName}
        </option>
      ))}
    </select>
  );
}
