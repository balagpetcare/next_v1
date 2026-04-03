"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicEodStatus, staffClinicEodClose, staffClinicDayClose } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const PERMS = ["medicine.reconciliation.run", "medicine.reconciliation.acknowledge", "medicine.reconciliation.read"];

export default function EodClosePage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canClose = permissions.includes("medicine.reconciliation.run") || permissions.includes("medicine.reconciliation.acknowledge");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<{
    date: string;
    canClose: boolean;
    blockers: string[];
    pendingTokenCount: number;
    activeVialSessionCount: number;
    reconciliationDone: boolean;
    reconciliationAcknowledged: boolean;
    reconciliationHasMismatch: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [dayCloseRecord, setDayCloseRecord] = useState<{
    closedAt?: string;
    closedBy?: { profile?: { displayName?: string } };
  } | null>(null);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setClosed(false);
    Promise.all([
      staffClinicEodStatus(branchId, date),
      staffClinicDayClose(branchId, date),
    ])
      .then(([s, dc]) => {
        setStatus(s);
        setDayCloseRecord(dc && (dc.closedAt || dc.closeDate) ? dc : null);
      })
      .catch(() => {
        setStatus(null);
        setDayCloseRecord(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = useCallback(() => {
    if (!branchId || !status?.canClose) return;
    setClosing(true);
    staffClinicEodClose(branchId, { date })
      .then((res) => {
        if (res.closed) {
          setClosed(true);
          toast.success("Day closed successfully.");
          load();
        } else {
          toast.warning("Close did not complete.");
        }
      })
      .catch((e) => toast.error((e as Error)?.message || "Failed to close day"))
      .finally(() => setClosing(false));
  }, [branchId, date, status?.canClose, load]);

  if (isLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="medicine.reconciliation.read" onBack={() => window.history.back()} />;
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">
          ← Medicine Control
        </Link>
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control/reconciliation`} className="btn btn-outline-primary btn-sm">
          Reconciliation
        </Link>
        <h5 className="mb-0">EOD Close</h5>
        <input
          type="date"
          className="form-control form-control-sm w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="button" className="btn btn-sm btn-primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh status"}
        </button>
      </div>

      {loading && !status ? (
        <div className="text-center py-5 text-muted">Loading…</div>
      ) : (
        <div className="card radius-12">
          <div className="card-body">
            <h6 className="card-title">Status for {status?.date ?? date}</h6>
            {status && (
              <>
                {dayCloseRecord?.closedAt && (
                  <div className="alert alert-success py-2 small mb-3">
                    Day closed at {new Date(dayCloseRecord.closedAt).toLocaleString()}
                    {dayCloseRecord.closedBy?.profile?.displayName && (
                      <> by {dayCloseRecord.closedBy.profile.displayName}</>
                    )}
                  </div>
                )}
                <div className="mb-3">
                  {dayCloseRecord?.closedAt ? (
                    <span className="badge bg-secondary">Already closed</span>
                  ) : status.canClose ? (
                    <span className="badge bg-success">Ready to close</span>
                  ) : (
                    <span className="badge bg-warning text-dark">Blockers present</span>
                  )}
                  <span className="ms-2 small text-muted">
                    Reconciliation: {status.reconciliationDone ? "Done" : "Not run"}
                    {status.reconciliationHasMismatch && (status.reconciliationAcknowledged ? " · Mismatch acknowledged" : " · Mismatch not acknowledged")}
                  </span>
                </div>
                {status.blockers?.length > 0 && (
                  <ul className="list-unstyled mb-3">
                    {status.blockers.map((b, i) => (
                      <li key={i} className="text-danger small">• {b}</li>
                    ))}
                  </ul>
                )}
                <dl className="row small mb-0">
                  <dt className="col-sm-3">Pending tokens</dt>
                  <dd className="col-sm-9">{status.pendingTokenCount}</dd>
                  <dt className="col-sm-3">Active vial sessions (opened that day)</dt>
                  <dd className="col-sm-9">{status.activeVialSessionCount}</dd>
                </dl>
                {canClose && !dayCloseRecord?.closedAt && (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleClose}
                      disabled={!status.canClose || closing}
                    >
                      {closing ? "Closing…" : "Close day"}
                    </button>
                    {closed && <span className="ms-2 text-success">Day closed.</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PageWorkspace>
  );
}
