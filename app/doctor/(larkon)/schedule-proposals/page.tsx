"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { doctorGetMe, doctorListScheduleProposals, doctorCreateScheduleProposal } from "@/lib/api";

type Proposal = {
  id: number;
  branchId: number;
  branchMemberId: number;
  proposalPayload: unknown;
  status: string;
  requestedByUserId: number;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
};

export default function DoctorScheduleProposalsPage() {
  const [profile, setProfile] = useState<{ branches: { branchId: number; branchName: string; branchMemberId: number }[] } | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newPayload, setNewPayload] = useState<string>("{}");
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

  const loadProposals = useCallback(async () => {
    if (!selectedBranchId) {
      setProposals([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await doctorListScheduleProposals(selectedBranchId);
      setProposals(Array.isArray(res?.proposals) ? res.proposals : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load proposals");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    let payload: unknown;
    try {
      payload = JSON.parse(newPayload);
    } catch {
      setSubmitError("Invalid JSON");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await doctorCreateScheduleProposal(selectedBranchId, payload);
      setNewPayload("{}");
      await loadProposals();
    } catch (e) {
      setSubmitError((e as Error)?.message || "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Schedule proposals</h6>
          <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-primary">
            Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          {error}
        </div>
      )}

      {profile?.branches && profile.branches.length > 0 && (
        <>
          <div className="card radius-12 mb-4">
            <div className="card-body">
              <label className="form-label">Clinic branch</label>
              <select
                className="form-select radius-12 w-auto"
                value={selectedBranchId ?? ""}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
              >
                {profile.branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card radius-12 mb-4">
            <div className="card-body">
              <h6 className="card-title mb-3">Submit a new proposal</h6>
              <p className="text-muted small mb-3">
                Submit a schedule change proposal for the clinic to review. If the clinic allows doctor proposals, it will appear in their review queue.
              </p>
              <form onSubmit={handleSubmit}>
                <label className="form-label">Proposal payload (JSON)</label>
                <textarea
                  className="form-control radius-12 font-monospace"
                  rows={4}
                  value={newPayload}
                  onChange={(e) => setNewPayload(e.target.value)}
                  placeholder='{"slots": [...], "note": "..."}'
                />
                {submitError && <p className="text-danger small mt-1">{submitError}</p>}
                <button type="submit" className="btn btn-primary mt-2 radius-12" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit proposal"}
                </button>
              </form>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-body">
              <h6 className="card-title mb-3">My proposals</h6>
              {loading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : proposals.length === 0 ? (
                <p className="text-muted mb-0">No proposals for this branch.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Reviewed</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p) => (
                        <tr key={p.id}>
                          <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                          <td>
                            <span className={`badge radius-8 ${p.status === "PENDING" ? "bg-warning" : p.status === "APPROVED" ? "bg-success" : "bg-secondary"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>{p.reviewedAt ? new Date(p.reviewedAt).toLocaleString() : "—"}</td>
                          <td className="small text-muted">{p.reviewNote ?? "—"}</td>
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

      {profile?.branches?.length === 0 && !error && (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">You are not assigned to any clinic branch. Schedule proposals are available once you are added as a doctor to a clinic.</p>
          </div>
        </div>
      )}
    </div>
  );
}
