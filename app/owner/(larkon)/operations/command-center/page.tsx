"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  ownerGet,
  getOperationalExceptions,
  getOperationalExceptionDetail,
  patchOperationalException,
  postOperationalExceptionRca,
  postOperationalExceptionRefresh,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string; org?: { id: number } };

function pickBranches(resp: unknown): BranchRow[] {
  if (!resp || typeof resp !== "object") return [];
  const r = resp as { data?: unknown };
  return Array.isArray(r.data) ? (r.data as BranchRow[]) : [];
}

export default function CommandCenterPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [severity, setSeverity] = useState<string>("");
  /** Default "All" so triage sees full queue; filter down as needed. */
  const [status, setStatus] = useState<string>("");
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [breachOnly, setBreachOnly] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rcaCause, setRcaCause] = useState("UNKNOWN");
  const [rcaNotes, setRcaNotes] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const brs = pickBranches(brRes);
      setBranches(brs);
      const oid = brs[0]?.org?.id ?? null;
      setOrgId(oid);
      if (!oid) {
        setRows([]);
        setTotal(0);
        return;
      }
      const res = await getOperationalExceptions({
        orgId: oid,
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(branchId ? { branchId } : {}),
        breachOnly,
        take: 100,
      });
      const payload = (res as { data?: { rows?: Record<string, unknown>[]; total?: number } })?.data;
      setRows(payload?.rows ?? []);
      setTotal(payload?.total ?? 0);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [status, severity, branchId, breachOnly]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id: number) => {
    if (!orgId) return;
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getOperationalExceptionDetail(id, { orgId });
      const d = (res as { data?: Record<string, unknown> })?.data ?? res;
      setDetail(d as Record<string, unknown>);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setDetailLoading(false);
    }
  };

  const detailStatus = detail?.status != null ? String(detail.status) : "";
  const isTerminal = detailStatus === "RESOLVED";

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Exception command center"
        subtitle="Operational triage: discrepancies, recalls, and long-running requests. Source systems remain canonical."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {orgId != null && (
        <div className="row g-2 align-items-end mb-3">
          <div className="col-auto">
            <label className="form-label small mb-0">Status</label>
            <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="SNOOZED">SNOOZED</option>
            </select>
          </div>
          <div className="col-auto">
            <label className="form-label small mb-0">Severity</label>
            <select className="form-select form-select-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
          <div className="col-auto">
            <label className="form-label small mb-0">Branch</label>
            <select
              className="form-select form-select-sm"
              value={branchId ?? ""}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name ?? b.id}
                </option>
              ))}
            </select>
          </div>
          <div className="col-auto form-check">
            <input
              id="breach"
              type="checkbox"
              className="form-check-input"
              checked={breachOnly}
              onChange={(e) => setBreachOnly(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="breach">
              Breach only
            </label>
          </div>
          <div className="col-auto">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => loadList()}>
              Apply
            </button>
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={refreshing}
              onClick={async () => {
                if (!orgId) return;
                setRefreshing(true);
                try {
                  await postOperationalExceptionRefresh({ orgId });
                  await loadList();
                } catch (e) {
                  setError(getMessageFromApiError(e as Error));
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh index"}
            </button>
          </div>
        </div>
      )}

      {orgId == null && !loading && <div className="alert alert-warning">No organization context — ensure you have an owner branch.</div>}

      <div className="text-muted small mb-2">Total: {total}</div>

      {orgId != null && !loading && rows.length === 0 && (
        <div className="alert alert-light border mb-3">
          No exceptions match filters. Try Refresh index after operational activity, or set status to All.
        </div>
      )}

      {orgId != null && !loading && (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted small">
                      No exceptions — refresh index after operational activity, or relax filters.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={String(r.id)}>
                    <td>
                      <span className="badge bg-secondary">{String(r.severity)}</span>
                    </td>
                    <td className="small">{String(r.exceptionCode)}</td>
                    <td>{String(r.title)}</td>
                    <td>{String(r.status)}</td>
                    <td className="small">{r.openedAt ? String(r.openedAt).slice(0, 16) : "—"}</td>
                    <td>
                      <button type="button" className="btn btn-link btn-sm p-0" onClick={() => openDetail(Number(r.id))}>
                        Triage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId != null && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.4)" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Exception #{selectedId}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedId(null)} />
              </div>
              <div className="modal-body">
                {detailLoading && <p className="text-muted">Loading…</p>}
                {!detailLoading && !detail && error && <p className="text-danger small">Could not load detail.</p>}
                {detail && (
                  <>
                    <p className="small text-muted mb-1">{String(detail.exceptionCode)}</p>
                    <p className="fw-semibold">{String(detail.title)}</p>
                    <p className="small">
                      Source: {String(detail.sourceRefType)} #{String(detail.sourceRefId)}
                    </p>
                    <p className="small">Deep link hint: {String(detail.deepLinkHint ?? "—")}</p>
                    <div className="d-flex gap-2 flex-wrap mb-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={isTerminal}
                        title={isTerminal ? "Already resolved" : undefined}
                        onClick={async () => {
                          if (!orgId || isTerminal) return;
                          try {
                            await patchOperationalException(selectedId, { orgId, acknowledge: true });
                            await loadList();
                            await openDetail(selectedId);
                          } catch (e) {
                            setError(getMessageFromApiError(e as Error));
                          }
                        }}
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={isTerminal}
                        title={isTerminal ? "Already resolved" : undefined}
                        onClick={async () => {
                          if (!orgId || isTerminal) return;
                          try {
                            await patchOperationalException(selectedId, {
                              orgId,
                              status: "RESOLVED",
                              resolutionNote: "Resolved from command center",
                            });
                            setSelectedId(null);
                            await loadList();
                          } catch (e) {
                            setError(getMessageFromApiError(e as Error));
                          }
                        }}
                      >
                        Mark resolved
                      </button>
                    </div>
                    <h6 className="mt-3">Root cause (RCA)</h6>
                    <div className="mb-2">
                      <select className="form-select form-select-sm" value={rcaCause} onChange={(e) => setRcaCause(e.target.value)}>
                        <option value="UNKNOWN">UNKNOWN</option>
                        <option value="DATA_ENTRY">DATA_ENTRY</option>
                        <option value="VENDOR_SHORT">VENDOR_SHORT</option>
                        <option value="SYSTEM_BUG">SYSTEM_BUG</option>
                        <option value="TRAINING">TRAINING</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={3}
                      placeholder="Notes"
                      value={rcaNotes}
                      onChange={(e) => setRcaNotes(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={isTerminal}
                      title={isTerminal ? "Cannot add RCA to resolved row" : undefined}
                      onClick={async () => {
                        if (!orgId || isTerminal) return;
                        try {
                          await postOperationalExceptionRca(selectedId, {
                            orgId,
                            primaryCause: rcaCause,
                            notes: rcaNotes || undefined,
                          });
                          await openDetail(selectedId);
                        } catch (e) {
                          setError(getMessageFromApiError(e as Error));
                        }
                      }}
                    >
                      Save RCA
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
