"use client";

import type { ServiceAssignmentServiceRow } from "@/src/types/doctorServiceAssignment";

type Props = {
  row: ServiceAssignmentServiceRow;
  allowedRoles: string[];
  canEdit: boolean;
  bulkMode: boolean;
  selected: boolean;
  onToggleBulk: (serviceId: number, next: boolean) => void;
  onAssignChange: (serviceId: number, nextAssigned: boolean, role?: string) => void;
  onRoleChange: (serviceId: number, role: string) => void;
  saving: boolean;
  showFees: boolean;
};

export default function ServiceAssignmentCard({
  row,
  allowedRoles,
  canEdit,
  bulkMode,
  selected,
  onToggleBulk,
  onAssignChange,
  onRoleChange,
  saving,
  showFees,
}: Props) {
  const m = row.mapping;
  const assigned = !!(m?.effectiveAssigned);
  const inactiveService = row.serviceStatus !== "ACTIVE";
  const readOnly = !canEdit || (inactiveService && !m);

  return (
    <div
      className={`card radius-12 mb-2 ${selected ? "border-primary shadow-sm" : "border-light"}`}
    >
      <div className="card-body py-2 px-3">
        <div className="d-flex flex-wrap align-items-start gap-2 justify-content-between">
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {bulkMode && canEdit && (
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={selected}
                  onChange={(e) => onToggleBulk(row.serviceId, e.target.checked)}
                  aria-label={`Select ${row.name}`}
                />
              )}
              <span className="fw-medium text-truncate">{row.name}</span>
              <span className="badge bg-light text-dark radius-6">{row.category}</span>
              {inactiveService && <span className="badge bg-warning-subtle text-warning-emphasis radius-6">Inactive</span>}
              {m?.requiresApproval && (
                <span className="badge bg-info-subtle text-info-emphasis radius-6">Approval</span>
              )}
            </div>
            <div className="small text-muted mt-1">
              List {row.listPrice != null ? `৳${Number(row.listPrice).toLocaleString()}` : "—"}
              {showFees && row.doctorFee != null && (
                <span className="ms-2">Fee ৳{Number(row.doctorFee).toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {readOnly ? (
              assigned ? (
                <span className="badge bg-success-subtle text-success-emphasis radius-8">{m?.role ?? "Assigned"}</span>
              ) : (
                <span className="text-muted">—</span>
              )
            ) : (
              <>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={assigned}
                    disabled={saving || (inactiveService && !m)}
                    onChange={(e) => onAssignChange(row.serviceId, e.target.checked, m?.role ?? "CONSULTANT")}
                    aria-label={`Assign ${row.name}`}
                  />
                </div>
                {(assigned || m) && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto", minWidth: 110 }}
                    value={m?.role ?? "CONSULTANT"}
                    disabled={saving || inactiveService}
                    onChange={(e) => onRoleChange(row.serviceId, e.target.value)}
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            {saving && <span className="spinner-border spinner-border-sm text-primary" role="status" />}
          </div>
        </div>
      </div>
    </div>
  );
}
