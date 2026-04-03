"use client";

import DetailDrawer from "@/src/components/dashboard/DetailDrawer";
import { formatAuditDetails } from "@/src/lib/displayFormatters";

type AuditItem = {
  id: number;
  action: string;
  createdAt: string;
  changedByDisplayName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

type Props = {
  open: boolean;
  onClose: () => void;
  doctorName: string;
  items: AuditItem[];
  loading: boolean;
  /** Shown when the audit API request fails (does not replace empty-state when load succeeded). */
  error?: string;
};

export default function AssignmentAuditDrawer({ open, onClose, doctorName, items, loading, error }: Props) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={`Assignment history`}
      subtitle={doctorName}
      placement="end"
      width="420px"
    >
      {loading ? (
        <p className="text-muted small">Loading…</p>
      ) : error ? (
        <p className="text-danger small mb-0">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-muted small mb-0">No service mapping changes recorded.</p>
      ) : (
        <ul className="list-unstyled small mb-0">
          {items.map((row) => (
            <li key={row.id} className="border-bottom pb-2 mb-2">
              <div className="d-flex justify-content-between gap-2">
                <span className="badge bg-light text-dark radius-6">{row.action}</span>
                <span className="text-muted text-nowrap">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-muted mt-1">{row.changedByDisplayName ?? "—"}</div>
              <pre className="mt-1 mb-0 p-2 bg-light rounded small text-wrap text-break" style={{ whiteSpace: "pre-wrap" }}>
                {formatAuditDetails({
                  action: row.action,
                  oldValue: row.oldValue,
                  newValue: row.newValue,
                }).join("\n")}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </DetailDrawer>
  );
}
