"use client";

import { formatAuditDetails, humanizeFieldLabel } from "@/src/lib/displayFormatters";

type Entry = {
  id: number | string;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedByUserId?: number;
  changedByDisplayName?: string | null;
  createdAt: string;
};

type Props = {
  items: Entry[];
  loading?: boolean;
};

export default function AuditTimelinePanel({ items, loading }: Props) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading audit log...</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <i className="ri-history-line fs-1 text-muted d-block mb-3" aria-hidden />
          <h6 className="mb-2">No audit entries</h6>
          <p className="text-muted small mb-0">Changes to this doctor will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Field</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const details = formatAuditDetails({ action: e.action, field: e.field, oldValue: e.oldValue, newValue: e.newValue });
                return (
                  <tr key={e.id}>
                    <td className="text-muted small">{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                    <td className="small">{e.changedByDisplayName ?? (e.changedByUserId != null ? `User #${e.changedByUserId}` : "—")}</td>
                    <td>{e.action ?? "—"}</td>
                    <td>{e.field ? humanizeFieldLabel(e.field) : "—"}</td>
                    <td className="small">
                      {details.length > 0 ? (
                        <ul className="list-unstyled mb-0 small">
                          {details.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
