"use client";

import { useState, useEffect } from "react";
import { staffDoctorProposeFee, staffClinicGetDoctorFeeHistory } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

type Props = {
  branchId: string;
  memberId: number;
  fees: { current: any; proposed: any; serviceFees?: any[] };
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

const FEE_TYPES = [
  { value: "consultation", label: "Consultation fee" },
  { value: "followUp", label: "Follow-up fee" },
  { value: "emergency", label: "Emergency fee" },
];

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

function canViewFeeHistory(permissions: string[]): boolean {
  return (
    hasPerm(permissions, "clinic.doctors.view") &&
    (hasPerm(permissions, "clinic.services.manage") || hasPerm(permissions, "manager.pricing.view"))
  );
}

export default function FeesTab({
  branchId,
  memberId,
  fees,
  loading,
  permissions,
  onRefresh,
}: Props) {
  const [showPropose, setShowPropose] = useState(false);
  const [proposeType, setProposeType] = useState("consultation");
  const [proposeValue, setProposeValue] = useState("");
  const [proposeReason, setProposeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [feeHistoryLoading, setFeeHistoryLoading] = useState(false);
  const [feeHistoryError, setFeeHistoryError] = useState<string | null>(null);
  const toast = useToast();

  const canPropose = hasPerm(permissions, "clinic.doctors.propose_fee");
  const showFeeHistory = canViewFeeHistory(permissions);

  useEffect(() => {
    if (!showFeeHistory || !branchId || !memberId || loading) return;
    let cancelled = false;
    setFeeHistoryLoading(true);
    setFeeHistoryError(null);
    staffClinicGetDoctorFeeHistory(branchId, memberId, { limit: 30 })
      .then((items) => {
        if (!cancelled) setFeeHistory(items);
      })
      .catch((e: any) => {
        if (!cancelled) setFeeHistoryError(e?.message ?? "Failed to load fee history");
      })
      .finally(() => {
        if (!cancelled) setFeeHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, memberId, showFeeHistory, loading]);
  const current = fees?.current ?? {};
  const proposed = fees?.proposed;
  const serviceFees = fees?.serviceFees ?? [];

  const handlePropose = async () => {
    const val = parseFloat(proposeValue);
    if (isNaN(val) || val < 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await staffDoctorProposeFee(branchId, memberId, {
        feeType: proposeType,
        proposedValue: val,
        reason: proposeReason || undefined,
      });
      onRefresh?.();
      setShowPropose(false);
      setProposeValue("");
      setProposeReason("");
      toast.success("Fee change proposal submitted");
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit proposal");
      toast.error(e?.message ?? "Failed to submit proposal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading fees...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {proposed && (
        <div className="alert alert-warning radius-12 mb-3">
          <strong>Pending proposal.</strong> A fee change is awaiting approval.
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show radius-12 mb-3" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
        </div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Current fees</h6>
            {canPropose && (
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={() => setShowPropose(true)}>
                Propose change
              </button>
            )}
          </div>
          <ul className="list-unstyled mb-0">
            <li className="mb-2">Consultation: {current.consultation != null ? `BDT ${current.consultation}` : "—"}</li>
            <li className="mb-2">Follow-up: {current.followUp != null ? `BDT ${current.followUp}` : "—"}</li>
            <li className="mb-0">Emergency: {current.emergency != null ? `BDT ${current.emergency}` : "—"}</li>
          </ul>
        </div>
      </div>

      {showFeeHistory && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-3">Service fee change history</h6>
            {feeHistoryLoading && <p className="text-muted small mb-0">Loading…</p>}
            {feeHistoryError && (
              <div className="alert alert-warning radius-12 small mb-0">{feeHistoryError}</div>
            )}
            {!feeHistoryLoading && !feeHistoryError && feeHistory.length === 0 && (
              <p className="text-muted small mb-0">No fee change records.</p>
            )}
            {!feeHistoryLoading && feeHistory.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>When</th>
                      <th>Actor</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeHistory.map((h: any) => (
                      <tr key={h.id}>
                        <td className="small text-nowrap">
                          {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="small">{h.actorUserId ?? "—"}</td>
                        <td className="small">{h.changeReason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {serviceFees.length > 0 && (
        <div className="card radius-12">
          <div className="card-body">
            <h6 className="mb-3">Service-wise overrides</h6>
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Service</th><th>Category</th><th>Fee (BDT)</th><th>Duration (min)</th><th>Active</th></tr>
                </thead>
                <tbody>
                  {serviceFees.map((sf: any) => (
                    <tr key={sf.serviceId}>
                      <td>{sf.serviceName ?? sf.serviceId}</td>
                      <td>{sf.category ?? "—"}</td>
                      <td>{sf.fee != null ? sf.fee : "—"}</td>
                      <td>{sf.durationMin ?? "—"}</td>
                      <td>{sf.isActive ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPropose && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Propose fee change</h6>
                <button type="button" className="btn-close" onClick={() => setShowPropose(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Fee type</label>
                  <select className="form-select form-select-sm" value={proposeType} onChange={(e) => setProposeType(e.target.value)}>
                    {FEE_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small">Proposed amount (BDT)</label>
                  <input type="number" className="form-control form-control-sm" value={proposeValue} onChange={(e) => setProposeValue(e.target.value)} min={0} step={0.01} />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Reason (optional)</label>
                  <input type="text" className="form-control form-control-sm" value={proposeReason} onChange={(e) => setProposeReason(e.target.value)} placeholder="Reason for change" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => setShowPropose(false)}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm radius-8" disabled={saving} onClick={handlePropose}>{saving ? "..." : "Submit"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
