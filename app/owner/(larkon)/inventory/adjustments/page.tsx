"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

type AdjustmentRow = {
  id: number;
  status: string;
  quantityDelta: number;
  reason?: string | null;
  createdAt: string;
  location?: { id: number; name: string; branch?: { id: number; name: string } };
  variant?: { id: number; sku: string; title: string };
  requestedBy?: { id: number; profile?: { displayName?: string } };
};

export default function InventoryAdjustmentsPage() {
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/v1/owner/adjustment-requests?status=ALL"
          : `/api/v1/owner/adjustment-requests?status=${statusFilter}`;
      const res = await ownerGet<{ data: AdjustmentRow[] }>(url);
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load adjustments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: number) {
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/adjustment-requests/${id}/approve`, {});
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Approve failed");
    }
  }

  async function handleReject(id: number) {
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/adjustment-requests/${id}/reject`, {});
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Reject failed");
    }
  }

  const branchName = (row: AdjustmentRow) =>
    row.location?.branch?.name || row.location?.name || "—";
  const summary = (row: AdjustmentRow) =>
    row.variant ? `${row.variant.sku || row.variant.title} (${row.quantityDelta > 0 ? "+" : ""}${row.quantityDelta})` : `Qty ${row.quantityDelta}`;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Inventory Adjustments"
        subtitle="Damage, expiry, loss, write-off handling"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Adjustments", href: "/owner/inventory/adjustments" },
        ]}
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={load}
                disabled={loading}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
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
                  <th>Summary</th>
                  <th>Status</th>
                  <th>Branch / Location</th>
                  <th>Requested by</th>
                  <th>Created</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-muted text-center py-4">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted text-center py-4">
                      No adjustments found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold">ADJ-{row.id}</td>
                      <td>
                        <div className="fw-semibold">{summary(row)}</div>
                        {row.reason ? (
                          <div className="text-muted small">{row.reason}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>{branchName(row)}</td>
                      <td>{row.requestedBy?.profile?.displayName ?? "—"}</td>
                      <td className="text-muted small">{formatDate(row.createdAt)}</td>
                      <td className="text-end">
                        {row.status === "PENDING" ? (
                          <div className="d-inline-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(row.id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(row.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
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
