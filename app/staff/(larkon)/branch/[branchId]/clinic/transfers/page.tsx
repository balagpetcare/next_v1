"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { staffClinicTransfersList } from "@/lib/api";

type TransferRow = {
  id: number;
  transferNo: string;
  fromBranchId: number;
  toBranchId: number;
  fromBranch?: { id: number; name: string };
  toBranch?: { id: number; name: string };
  status: string;
  supplyRequestId?: number | null;
  createdAt?: string;
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "CREATED", label: "Created" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "RECEIVED", label: "Received" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-secondary";
    case "IN_TRANSIT":
      return "bg-warning text-dark";
    case "RECEIVED":
      return "bg-success";
    default:
      return "bg-secondary";
  }
}

export default function StaffClinicTransfersPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [list, setList] = useState<{ items: TransferRow[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await staffClinicTransfersList(branchId, {
        direction: "to",
        status: statusFilter || undefined,
      });
      setList(data as { items: TransferRow[]; total: number });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const goToDetail = (transferId: number) => {
    if (branchId) router.push(`/staff/branch/${branchId}/clinic/transfers/${transferId}`);
  };

  if (!branchId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Incoming transfers</h1>
        <Link
          href={`/staff/branch/${branchId}/clinic/supply-requests`}
          className="btn btn-outline-secondary btn-sm radius-8"
        >
          Supply requests
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <label className="form-label mb-0">Status</label>
            <select
              className="form-select form-select-sm w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value || "all"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
              <p className="text-muted mt-2 mb-0">Loading transfers…</p>
            </div>
          ) : list.items.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-0">No incoming transfers.</p>
              <p className="small mb-0 mt-1">Transfers linked to approved supply requests will appear here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Transfer #</th>
                    <th>From</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.transferNo}</td>
                      <td>{t.fromBranch?.name ?? t.fromBranchId}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(t.status)}`}>{t.status}</span>
                      </td>
                      <td>
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary radius-8"
                          onClick={() => goToDetail(t.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
