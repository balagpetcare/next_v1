"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { doctorGetMe, doctorListRequests, doctorCreateRequest } from "@/lib/api";

type RequestItem = {
  id: number;
  branchId: number;
  type: string;
  status: string;
  payload?: Record<string, unknown>;
  branch?: { id: number; name: string };
  approvedByUser?: { id: number; profile?: { displayName?: string } };
  approvedAt?: string | null;
  rejectionNote?: string | null;
  createdAt: string;
};

const REQUEST_TYPES: { value: string; label: string }[] = [
  { value: "VISIT_FEE_CHANGE", label: "Fee change" },
  { value: "SCHEDULE_CHANGE", label: "Schedule change" },
  { value: "APPOINTMENT_CANCEL", label: "Appointment cancellation" },
  { value: "LEAVE_CLINIC", label: "Leave clinic" },
];

export default function DoctorRequestsPage() {
  const [profile, setProfile] = useState<{ branches: { branchId: number; branchName: string; branchMemberId: number }[] } | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createType, setCreateType] = useState("VISIT_FEE_CHANGE");
  const [newFee, setNewFee] = useState("");
  const [payloadJson, setPayloadJson] = useState("{}");
  const [submitError, setSubmitError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const me = await doctorGetMe();
      setProfile(me ?? null);
      const branches = me?.branches ?? [];
      if (branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branches[0].branchId);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load profile");
      setProfile(null);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await doctorListRequests({
        branchId: selectedBranchId ?? undefined,
        status: undefined,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      setRequests(items);
      setTotal(typeof res?.total === "number" ? res.total : items.length);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load requests");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    let payload: Record<string, unknown> = {};
    if (createType === "VISIT_FEE_CHANGE") {
      const fee = parseFloat(newFee);
      if (Number.isNaN(fee) || fee < 0) {
        setSubmitError("Enter a valid fee amount");
        return;
      }
      payload = { newFee: fee };
    } else {
      try {
        payload = JSON.parse(payloadJson || "{}");
      } catch {
        setSubmitError("Invalid JSON payload");
        return;
      }
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await doctorCreateRequest({
        branchId: selectedBranchId,
        type: createType,
        payload,
      });
      await loadRequests();
      setNewFee("");
      setPayloadJson("{}");
    } catch (e) {
      setSubmitError((e as Error)?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const branches = profile?.branches ?? [];
  const hasClinic = branches.length > 0;

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link href="/doctor/dashboard" className="btn btn-outline-secondary btn-sm radius-8">
          ← Dashboard
        </Link>
        <h1 className="h5 mb-0 fw-semibold">My Requests</h1>
      </div>

      {!hasClinic && profile && (
        <div className="card radius-12 mb-3 border-primary">
          <div className="card-body text-center py-4">
            <p className="text-muted mb-0">You are not assigned to any clinic yet. Join a clinic to submit fee, schedule, or leave requests.</p>
            <Link href="/doctor/dashboard#invitations" className="btn btn-primary btn-sm mt-2 radius-8">
              View invitations
            </Link>
          </div>
        </div>
      )}

      {hasClinic && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-body">
              <label className="form-label small text-muted">Branch</label>
              <select
                className="form-select form-select-sm"
                value={selectedBranchId ?? ""}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
              >
                {branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card radius-12 mb-3">
            <div className="card-header bg-transparent border-0">
              <h6 className="mb-0">New request</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreate}>
                <div className="mb-3">
                  <label className="form-label small">Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                  >
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {createType === "VISIT_FEE_CHANGE" && (
                  <div className="mb-3">
                    <label className="form-label small">New consultation fee</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={newFee}
                      onChange={(e) => setNewFee(e.target.value)}
                    />
                  </div>
                )}
                {createType !== "VISIT_FEE_CHANGE" && (
                  <div className="mb-3">
                    <label className="form-label small">Payload (JSON)</label>
                    <textarea
                      className="form-control form-control-sm font-monospace small"
                      rows={3}
                      placeholder='e.g. {"startDate":"2025-04-01","endDate":"2025-04-05","reason":"Leave"}'
                      value={payloadJson}
                      onChange={(e) => setPayloadJson(e.target.value)}
                    />
                  </div>
                )}
                {submitError && <div className="alert alert-danger py-2 small mb-2">{submitError}</div>}
                <button type="submit" className="btn btn-primary btn-sm radius-8" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit request"}
                </button>
              </form>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Request history</h6>
              <span className="badge bg-secondary">{total}</span>
            </div>
            <div className="card-body">
              {loading ? (
                <p className="text-muted small mb-0">Loading…</p>
              ) : requests.length === 0 ? (
                <p className="text-muted small mb-0">No requests yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Branch</th>
                        <th>Status</th>
                        <th>Decided by</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id}>
                          <td>{r.type.replace(/_/g, " ")}</td>
                          <td>{r.branch?.name ?? r.branchId}</td>
                          <td>
                            <span
                              className={`badge ${
                                r.status === "APPROVED" ? "bg-success" : r.status === "REJECTED" ? "bg-danger" : "bg-warning text-dark"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="small">{r.approvedByUser?.profile?.displayName ?? (r.rejectionNote ? "—" : "—")}</td>
                          <td className="small text-muted">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
