"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { medicineRequisitionList } from "@/lib/api";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";
import { useToast } from "@/src/hooks/useToast";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIALLY_APPROVED", label: "Partially Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED", label: "Received" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (["DRAFT"].includes(u)) return "bg-secondary";
  if (["SUBMITTED", "UNDER_REVIEW"].includes(u)) return "bg-info";
  if (["APPROVED", "PARTIALLY_APPROVED", "READY_TO_DISPATCH"].includes(u)) return "bg-primary";
  if (["DISPATCHED", "IN_TRANSIT"].includes(u)) return "bg-warning text-dark";
  if (["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED"].includes(u)) return "bg-success";
  if (["REJECTED", "CANCELLED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

export default function BranchPharmacyRequisitionsPage() {
  const params = useParams();
  const toast = useToast();
  const branchId = params?.branchId as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const res = await medicineRequisitionList({ branchId, status: statusFilter || undefined, limit: 100 });
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: unknown) {
      logPharmacyApiError("requisition list", e);
      toast.error(pharmacyApiUserMessage(e, "Could not load requisitions."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Medicine Requisitions</h5>
        <Link href={`/staff/branch/${branchId}/pharmacy/requisition-create`} className="btn btn-primary btn-sm">
          + New Requisition
        </Link>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-3">
            <label className="form-label small mb-0">Status:</label>
            <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
            <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={load}>Refresh</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card radius-12"><div className="card-body text-center py-4 text-secondary">Loading…</div></div>
      ) : items.length === 0 ? (
        <div className="card radius-12"><div className="card-body text-center py-4 text-secondary">No medicine requisitions yet. Create one to request medicines from central pharmacy.</div></div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Requisition #</th>
                    <th>Date</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r: any) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.requisitionNumber || `#${r.id}`}</td>
                      <td className="text-muted small">{formatDate(r.createdAt)}</td>
                      <td>
                        {r.urgency === "CRITICAL" && <span className="badge bg-danger">Critical</span>}
                        {r.urgency === "URGENT" && <span className="badge bg-warning text-dark">Urgent</span>}
                        {(!r.urgency || r.urgency === "NORMAL") && <span className="text-muted small">Normal</span>}
                      </td>
                      <td><span className={`badge ${statusClass(r.status || "")}`}>{r.status ?? "—"}</span></td>
                      <td>{r._count?.items ?? r.items?.length ?? 0}</td>
                      <td className="text-end">
                        <Link href={`/staff/branch/${branchId}/pharmacy/requisitions/${r.id}`} className="btn btn-outline-primary btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
