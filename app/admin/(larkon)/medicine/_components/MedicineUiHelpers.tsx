"use client";

import type { ReactNode } from "react";

/** Compact serial column header (enterprise listings). */
export function MedicineTableSlTh() {
  return (
    <th scope="col" className="text-muted small text-uppercase text-nowrap" style={{ width: 44 }}>
      SL
    </th>
  );
}

/** Compact serial cell; use `medicineTableSl` from `../_lib/medicineTableDisplay` for values. */
export function MedicineTableSlTd({ children }: { children: ReactNode }) {
  return (
    <td className="text-muted small tabular-nums align-middle" style={{ width: 44 }}>
      {children}
    </td>
  );
}

/** Consistent empty states for master-data tables (enterprise admin). */
export function MedicineTableEmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="text-center py-5 px-24">
      <p className="text-muted mb-1 fw-medium">{title}</p>
      {hint ? <div className="small text-muted mb-0">{hint}</div> : null}
    </div>
  );
}

/** Active / inactive / archived for catalog rows (listings). */
export function ListingStatusBadge({ isActive, archivedAt }: { isActive: boolean; archivedAt: string | null }) {
  if (archivedAt) {
    return <span className="badge rounded-pill bg-secondary">Archived</span>;
  }
  if (isActive) {
    return <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">Active</span>;
  }
  return <span className="badge rounded-pill bg-warning-subtle text-dark border border-warning-subtle">Inactive</span>;
}

/** Master entity row: active flag only (lists exclude archived rows). */
export function MasterActiveBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">Active</span>;
  }
  return <span className="badge rounded-pill bg-secondary-subtle text-dark border border-secondary-subtle">Inactive</span>;
}
