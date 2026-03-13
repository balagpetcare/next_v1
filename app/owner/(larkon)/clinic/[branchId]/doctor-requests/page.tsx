"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  VISIT_FEE_CHANGE: "Visit fee change",
  SCHEDULE_CHANGE: "Schedule change",
  APPOINTMENT_CANCEL: "Appointment cancellation",
  LEAVE_CLINIC: "Leave clinic",
  JOIN_CLINIC: "Join clinic",
};

type DoctorRequestItem = {
  id: number;
  doctorUserId: number;
  branchId: number;
  type: string;
  payload: Record<string, unknown> | null;
  status: string;
  approvedByUserId: number | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  doctorUser?: { id: number; profile?: { displayName?: string } | null };
  branch?: { id: number; name: string };
};

export default function DoctorRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [branchName, setBranchName] = useState("");
  const [items, setItems] = useState<DoctorRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const q = new URLSearchParams({ status: statusFilter });
      const res = await ownerGet<{ success?: boolean; data?: { items: DoctorRequestItem[]; total: number } }>(
        `/api/v1/owner/clinic/branches/${branchId}/doctor-requests?${q}`
      );
      const data = res?.data;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));
      if (data?.items?.[0]?.branch?.name) setBranchName(data.items[0].branch.name);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load doctor requests");
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (requestId: number) => {
    if (!branchId) return;
    setActingId(requestId);
    try {
      await ownerPost<{ success?: boolean; data?: unknown }>(
        `/api/v1/owner/clinic/branches/${branchId}/doctor-requests/${requestId}/approve`,
        {}
      );
      toast.success("Request approved");
      setRejectNote("");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!branchId) return;
    setActingId(requestId);
    try {
      await ownerPost<{ success?: boolean; data?: unknown }>(
        `/api/v1/owner/clinic/branches/${branchId}/doctor-requests/${requestId}/reject`,
        { rejectionNote: rejectNote || undefined }
      );
      toast.success("Request rejected");
      setRejectNote("");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Reject failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="container-fluid py-3">
      <PageHeader
        title="Doctor Requests"
        subtitle={branchName ? `Requests for ${branchName}` : "Approve or reject doctor requests"}
      />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={`/owner/clinic/${branchId}/doctors`} className="btn btn-sm btn-outline-secondary radius-12">
          ← Doctors
        </Link>
        <select
          className="form-select form-select-sm w-auto radius-8"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-danger radius-12" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted py-4">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            No doctor requests found for this branch.
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Doctor</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Date</th>
                    {statusFilter === "PENDING" && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.doctorUser?.profile?.displayName ?? `User #${r.doctorUserId}`}</td>
                      <td>{REQUEST_TYPE_LABELS[r.type] ?? r.type}</td>
                      <td>
                        {r.payload && typeof r.payload === "object" && (
                          <span className="small">
                            {r.type === "VISIT_FEE_CHANGE" && r.payload.newFee != null && (
                              <>New fee: {String(r.payload.newFee)}</>
                            )}
                            {r.type === "APPOINTMENT_CANCEL" && r.payload.appointmentId != null && (
                              <>Appointment #{String(r.payload.appointmentId)}</>
                            )}
                            {r.type === "LEAVE_CLINIC" && <>Leave clinic</>}
                            {r.type === "SCHEDULE_CHANGE" && <>Schedule change</>}
                            {r.type === "JOIN_CLINIC" && <>Request to join</>}
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                      {statusFilter === "PENDING" && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-success me-1 radius-8"
                            disabled={actingId !== null}
                            onClick={() => handleApprove(r.id)}
                          >
                            {actingId === r.id ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger radius-8"
                            disabled={actingId !== null}
                            onClick={() => handleReject(r.id)}
                          >
                            {actingId === r.id ? "…" : "Reject"}
                          </button>
                        </td>
                      )}
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
