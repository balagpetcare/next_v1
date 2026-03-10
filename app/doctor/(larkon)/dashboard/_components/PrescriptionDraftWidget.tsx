"use client";

import Link from "next/link";

export function PrescriptionDraftWidget({ items }: { items: any[] }) {
  return (
    <div className="card radius-12">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Prescription Drafts / Pending</h6>
        <Link href="/doctor/prescriptions" className="btn btn-sm btn-outline-primary radius-12">
          Open Prescriptions
        </Link>
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p className="small text-muted mb-0">No draft prescriptions.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pet</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.visit?.pet?.name ?? "—"}</td>
                    <td>{row.visit?.patient?.profile?.displayName ?? "—"}</td>
                    <td>
                      <span className={`badge radius-8 ${row.status === "DRAFT" ? "bg-warning text-dark" : "bg-success"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
