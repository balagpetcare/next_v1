"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

const SAMPLE_CANCELLATIONS = [
  { id: "CAN-301", status: "REVIEW", reason: "Stock-out", branch: "Gulshan Branch", createdAt: new Date().toISOString() },
  { id: "CAN-302", status: "PENDING", reason: "Customer refund", branch: "Dhanmondi Branch", createdAt: new Date(Date.now() - 3600000).toISOString() },
];

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

export default function CancellationsPage() {
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    return SAMPLE_CANCELLATIONS.filter((row) => status === "ALL" || row.status === status);
  }, [status]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Cancellations"
        subtitle="Owner approvals for cancellations"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Cancellations", href: "/owner/cancellations" },
        ]}
      />

      <div className="alert alert-info">
        Shell page only. Backend wiring will be added next; navigation and filters are ready.
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>Created</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted text-center">
                      No cancellation requests yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold">{row.id}</td>
                      <td>{row.reason}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>{row.branch}</td>
                      <td className="text-muted small">{formatDate(row.createdAt)}</td>
                      <td className="text-end">
                        <Link href={`/owner/cancellations/${row.id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
