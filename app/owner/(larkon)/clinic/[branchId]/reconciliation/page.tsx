"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  ownerClinicAcknowledgeReconciliation,
  ownerClinicReconciliations,
  ownerClinicRunReconciliation,
} from "@/app/owner/_lib/ownerApi";

const STATUS_OPTIONS = ["", "PENDING", "RECONCILED", "FLAGGED", "ACKNOWLEDGED"];

export default function OwnerClinicReconciliationPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicReconciliations(branchId, {
        fromDate: date,
        toDate: date,
        status: status || undefined,
        take: 100,
      });
      setItems(Array.isArray(res?.list) ? res.list : []);
      setTotal(Number(res?.total ?? 0));
    } catch (e) {
      setError((e as Error)?.message || "Failed to load reconciliation");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchId, date, status]);

  useEffect(() => {
    load();
  }, [load]);

  const runReconciliation = useCallback(async () => {
    if (!branchId) return;
    try {
      setRunning(true);
      await ownerClinicRunReconciliation(branchId, { date });
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
        await ownerClinicAcknowledgeReconciliation(branchId, id, note || undefined);
        toast.success("Mismatch acknowledged");
        await load();
      } catch (e) {
        toast.error((e as Error)?.message || "Failed to acknowledge");
      } finally {
        setActingId(null);
      }
    },
    [branchId, load]
  );

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Daily Reconciliation"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Reconciliation", href: `/owner/clinic/${branchId}/reconciliation` },
        ]}
        actions={[
          <Link key="monitor" href={`/owner/clinic/${branchId}/injection-monitor`} className="btn btn-outline-primary radius-12">
            Injection Monitor
          </Link>,
        ]}
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-sm btn-outline-secondary radius-12">
          ← Branch Overview
        </Link>
        <input
          type="date"
          className="form-control form-control-sm radius-8"
          style={{ width: 180 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="form-select form-select-sm radius-8"
          style={{ width: 170 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s || "ALL"} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        <button type="button" className="btn btn-sm btn-primary radius-12" onClick={runReconciliation} disabled={running}>
          {running ? "Running..." : "Run Reconciliation"}
        </button>
        <span className="ms-auto small text-muted">Total: {total}</span>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted py-5">No reconciliation rows found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Injections</th>
                    <th>mL Used</th>
                    <th>Tokens (G/U/U)</th>
                    <th>Mismatch</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.reconciliationDate ? new Date(row.reconciliationDate).toLocaleDateString() : "—"}</td>
                      <td>{Number(row.totalInjections ?? 0)}</td>
                      <td>{Number(row.totalMlUsed ?? 0)}</td>
                      <td>
                        {Number(row.tokensGenerated ?? 0)} / {Number(row.tokensUsed ?? 0)} / {Number(row.tokensUnused ?? 0)}
                      </td>
                      <td>
                        <span className={`badge radius-8 ${row.hasMismatch ? "bg-warning text-dark" : "bg-success"}`}>
                          {row.hasMismatch ? "Mismatch" : "OK"}
                        </span>
                      </td>
                      <td>{row.status ?? "—"}</td>
                      <td className="text-end">
                        {row.hasMismatch && row.status !== "ACKNOWLEDGED" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary radius-8"
                            onClick={() => acknowledge(Number(row.id))}
                            disabled={actingId === row.id}
                          >
                            {actingId === row.id ? "..." : "Acknowledge"}
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

