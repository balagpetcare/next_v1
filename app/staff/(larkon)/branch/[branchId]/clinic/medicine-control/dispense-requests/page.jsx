"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicDispenseRequestsList,
  staffClinicDispenseRequestApprove,
  staffClinicDispenseRequestIssue,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["medicine.dispense.request", "medicine.dispense.approve", "medicine.dispense.issue"];

export default function DispenseRequestsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("medicine.dispense.approve");
  const canIssue = permissions.includes("medicine.dispense.issue");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    staffClinicDispenseRequestsList(branchId, { status: status || undefined, take: 100 })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = useCallback(
    (id) => {
      if (!branchId) return;
      setActingId(id);
      staffClinicDispenseRequestApprove(branchId, id)
        .then(() => {
          toast.success("Request approved.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setActingId(null));
    },
    [branchId, load]
  );

  const handleIssue = useCallback(
    (id) => {
      if (!branchId) return;
      setActingId(id);
      staffClinicDispenseRequestIssue(branchId, id)
        .then(() => {
          toast.success("Issued.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setActingId(null));
    },
    [branchId, load]
  );

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.dispense.request" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">← Medicine Control</Link>
        <h5 className="mb-0">Dispense Requests</h5>
      </div>
      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="d-flex gap-2 mb-3">
            <select className="form-select form-select-sm radius-12 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ISSUED">Issued</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button type="button" className="btn btn-sm btn-primary radius-12" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {loading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">No dispense requests found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Variant / Visit</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.variantId ?? "—"} {r.visitId != null ? `/ Visit ${r.visitId}` : ""}</td>
                      <td><span className={`badge radius-8 ${r.status === "ISSUED" ? "bg-success" : r.status === "PENDING" ? "bg-warning" : "bg-secondary"}`}>{r.status ?? "—"}</span></td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                      <td className="text-end">
                        {r.status === "PENDING" && canApprove && (
                          <button type="button" className="btn btn-sm btn-outline-primary radius-8 me-1" onClick={() => handleApprove(r.id)} disabled={actingId === r.id}>
                            {actingId === r.id ? "…" : "Approve"}
                          </button>
                        )}
                        {r.status === "APPROVED" && canIssue && (
                          <button type="button" className="btn btn-sm btn-outline-success radius-8" onClick={() => handleIssue(r.id)} disabled={actingId === r.id}>
                            {actingId === r.id ? "…" : "Issue"}
                          </button>
                        )}
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
