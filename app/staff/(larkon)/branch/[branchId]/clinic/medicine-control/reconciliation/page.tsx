"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicAcknowledgeDailyReconciliation,
  staffClinicDailyReconciliations,
  staffClinicRunDailyReconciliation,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = [
  "medicine.reconciliation.read",
  "medicine.reconciliation.run",
  "medicine.reconciliation.acknowledge",
];

const STATUS_OPTIONS = ["", "PENDING", "RECONCILED", "FLAGGED", "ACKNOWLEDGED"];

export default function StaffReconciliationPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canRun = permissions.includes("medicine.reconciliation.run");
  const canAcknowledge = permissions.includes("medicine.reconciliation.acknowledge");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const res = await staffClinicDailyReconciliations(branchId, {
        fromDate: date,
        toDate: date,
        status: status || undefined,
        take: 100,
      });
      setRows(Array.isArray(res?.list) ? res.list : []);
      setTotal(Number(res?.total ?? 0));
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to load reconciliation");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, date, status]);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(async () => {
    if (!branchId) return;
    try {
      setRunning(true);
      await staffClinicRunDailyReconciliation(branchId, date);
      toast.success("Reconciliation completed");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to run reconciliation");
    } finally {
      setRunning(false);
    }
  }, [branchId, date, load]);

  const acknowledge = useCallback(
    async (id: number) => {
      if (!branchId) return;
      const note = prompt("Acknowledgement note (optional):") ?? "";
      try {
        setActingId(id);
        await staffClinicAcknowledgeDailyReconciliation(branchId, id, note || undefined);
        toast.success("Acknowledged");
        await load();
      } catch (e) {
        toast.error((e as Error)?.message || "Failed to acknowledge");
      } finally {
        setActingId(null);
      }
    },
    [branchId, load]
  );

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.reconciliation.read" onBack={() => window.history.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/medicine-control`} className="btn btn-outline-secondary btn-sm">
          ← Medicine Control
        </Link>
        <h5 className="mb-0">Daily Reconciliation</h5>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <input
          type="date"
          className="form-control form-control-sm radius-8 w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select className="form-select form-select-sm radius-8 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s || "ALL"} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        {canRun && (
          <button type="button" className="btn btn-sm btn-primary radius-8" onClick={run} disabled={running}>
            {running ? "Running..." : "Run Reconciliation"}
          </button>
        )}
        <span className="ms-auto small text-muted">Total: {total}</span>
      </div>

      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted py-5">No reconciliation rows.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Injections</th>
                    <th>mL</th>
                    <th>Tokens G/U/U</th>
                    <th>Mismatch</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.reconciliationDate ? new Date(r.reconciliationDate).toLocaleDateString() : "—"}</td>
                      <td>{Number(r.totalInjections ?? 0)}</td>
                      <td>{Number(r.totalMlUsed ?? 0)}</td>
                      <td>{Number(r.tokensGenerated ?? 0)} / {Number(r.tokensUsed ?? 0)} / {Number(r.tokensUnused ?? 0)}</td>
                      <td>
                        <span className={`badge radius-8 ${r.hasMismatch ? "bg-warning text-dark" : "bg-success"}`}>
                          {r.hasMismatch ? "Mismatch" : "OK"}
                        </span>
                      </td>
                      <td>{r.status ?? "—"}</td>
                      <td className="text-end">
                        {r.hasMismatch && r.status !== "ACKNOWLEDGED" && canAcknowledge ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary radius-8"
                            onClick={() => acknowledge(Number(r.id))}
                            disabled={actingId === r.id}
                          >
                            {actingId === r.id ? "..." : "Acknowledge"}
                          </button>
                        ) : (
                          <span className="text-muted small">—</span>
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

