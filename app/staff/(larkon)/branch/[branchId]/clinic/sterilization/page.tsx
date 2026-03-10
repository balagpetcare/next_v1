"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSterilizationCyclesList,
  staffClinicSterilizationCycleStart,
  staffClinicSterilizationCycleComplete,
  staffClinicSterilizationCycleFail,
  staffClinicInstrumentInstancesList,
  staffClinicSterilizationDueAlerts,
} from "@/lib/api";
import PageHeader from "@/src/bpa/components/ui/PageHeader";

type CycleRow = {
  id: number;
  cycleNo: string;
  method: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  items?: Array<{ instrument?: { id: number; name: string } }>;
};

type InstanceRow = {
  id: number;
  clinicalItemId: number;
  serialNo?: string | null;
  sterilizationStatus: string;
  conditionStatus: string;
  clinicalItem?: { id: number; name: string; itemCode?: string };
};

export default function StaffClinicSterilizationPage() {
  const params = useParams();
  const branchId = (params?.branchId as string) || "";
  const [tab, setTab] = useState<"cycles" | "instruments" | "due">("cycles");
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [totalCycles, setTotalCycles] = useState(0);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [dueAlerts, setDueAlerts] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startModal, setStartModal] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [startMethod, setStartMethod] = useState("AUTOCLAVE");
  const [startMachine, setStartMachine] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [failingId, setFailingId] = useState<number | null>(null);

  const loadCycles = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await staffClinicSterilizationCyclesList(branchId, {
        status: statusFilter || undefined,
        limit: 50,
        offset: 0,
      });
      setCycles((data.items || []) as CycleRow[]);
      setTotalCycles(data.total ?? 0);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load cycles");
    }
  }, [branchId, statusFilter]);

  const loadInstances = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await staffClinicInstrumentInstancesList(branchId);
      setInstances((data || []) as InstanceRow[]);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load instruments");
    }
  }, [branchId]);

  const loadDue = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await staffClinicSterilizationDueAlerts(branchId);
      setDueAlerts((data || []) as InstanceRow[]);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load due alerts");
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    setError("");
    setLoading(true);
    (async () => {
      try {
        if (tab === "cycles") await loadCycles();
        else if (tab === "instruments") await loadInstances();
        else await loadDue();
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId, tab, loadCycles, loadInstances, loadDue]);

  const uniqueItemIds = Array.from(new Set(instances.map((i) => i.clinicalItemId)));

  const handleStartCycle = async () => {
    if (!branchId || selectedItemIds.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await staffClinicSterilizationCycleStart(branchId, {
        instrumentIds: selectedItemIds,
        method: startMethod,
        machineName: startMachine || undefined,
      });
      setStartModal(false);
      setSelectedItemIds([]);
      loadCycles();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to start cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (cycleId: number) => {
    if (!branchId) return;
    setCompletingId(cycleId);
    setError("");
    try {
      await staffClinicSterilizationCycleComplete(branchId, cycleId, { sterileDays: 7 });
      loadCycles();
      loadDue();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to complete");
    } finally {
      setCompletingId(null);
    }
  };

  const handleFail = async (cycleId: number) => {
    if (!branchId) return;
    setFailingId(cycleId);
    setError("");
    try {
      await staffClinicSterilizationCycleFail(branchId, cycleId);
      loadCycles();
      loadDue();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to mark failed");
    } finally {
      setFailingId(null);
    }
  };

  const toggleItemForStart = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader title="Sterilization" subtitle="Instrument sterilization cycles and status" />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button
              type="button"
              className={`btn ${tab === "cycles" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTab("cycles")}
            >
              Cycles
            </button>
            <button
              type="button"
              className={`btn ${tab === "instruments" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTab("instruments")}
            >
              Instruments
            </button>
            <button
              type="button"
              className={`btn ${tab === "due" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTab("due")}
            >
              Due for sterilization ({dueAlerts.length})
            </button>
            {tab === "cycles" && (
              <>
                <select
                  className="form-select form-select-sm w-auto"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
                <button type="button" className="btn btn-success btn-sm" onClick={() => setStartModal(true)}>
                  Start cycle
                </button>
              </>
            )}
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
              <p className="text-muted mt-2 mb-0">Loading…</p>
            </div>
          ) : tab === "cycles" ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Cycle #</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Items</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.length === 0 ? (
                    <tr><td colSpan={6} className="text-muted text-center py-4">No cycles</td></tr>
                  ) : (
                    cycles.map((c) => (
                      <tr key={c.id}>
                        <td>{c.cycleNo}</td>
                        <td>{c.method}</td>
                        <td><span className="badge bg-secondary">{c.status}</span></td>
                        <td>{c.startedAt ? new Date(c.startedAt).toLocaleString() : "—"}</td>
                        <td>{(c.items || []).map((i) => i.instrument?.name).filter(Boolean).join(", ") || "—"}</td>
                        <td>
                          {c.status === "IN_PROGRESS" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-success me-1"
                                disabled={completingId !== null}
                                onClick={() => handleComplete(c.id)}
                              >
                                {completingId === c.id ? "…" : "Complete"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={failingId !== null}
                                onClick={() => handleFail(c.id)}
                              >
                                {failingId === c.id ? "…" : "Fail"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === "instruments" ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Serial</th>
                    <th>Condition</th>
                    <th>Sterilization status</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted text-center py-4">No instrument instances. Add instruments in catalog and create instances.</td></tr>
                  ) : (
                    instances.map((i) => (
                      <tr key={i.id}>
                        <td>{i.clinicalItem?.name ?? i.clinicalItemId}</td>
                        <td>{i.serialNo ?? "—"}</td>
                        <td>{i.conditionStatus}</td>
                        <td><span className="badge bg-secondary">{i.sterilizationStatus}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Serial</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dueAlerts.length === 0 ? (
                    <tr><td colSpan={3} className="text-muted text-center py-4">No instruments due for sterilization</td></tr>
                  ) : (
                    dueAlerts.map((i) => (
                      <tr key={i.id}>
                        <td>{i.clinicalItem?.name ?? i.clinicalItemId}</td>
                        <td>{i.serialNo ?? "—"}</td>
                        <td><span className="badge bg-warning">{i.sterilizationStatus}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {startModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Start sterilization cycle</h5>
                <button type="button" className="btn-close" onClick={() => setStartModal(false)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small">Select instrument types to include in this cycle (by clinical item).</p>
                <div className="mb-2">
                  {uniqueItemIds.map((itemId) => {
                    const item = instances.find((i) => i.clinicalItemId === itemId)?.clinicalItem;
                    const count = instances.filter((i) => i.clinicalItemId === itemId).length;
                    return (
                      <div key={itemId} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`item-${itemId}`}
                          checked={selectedItemIds.includes(itemId)}
                          onChange={() => toggleItemForStart(itemId)}
                        />
                        <label className="form-check-label" htmlFor={`item-${itemId}`}>
                          {item?.name ?? "Item #" + itemId} ({count})
                        </label>
                      </div>
                    );
                  })}
                </div>
                <label className="form-label">Method</label>
                <select className="form-select mb-2" value={startMethod} onChange={(e) => setStartMethod(e.target.value)}>
                  <option value="AUTOCLAVE">Autoclave</option>
                  <option value="CHEMICAL">Chemical</option>
                  <option value="DRY_HEAT">Dry heat</option>
                  <option value="ETHYLENE_OXIDE">Ethylene oxide</option>
                </select>
                <label className="form-label">Machine name (optional)</label>
                <input type="text" className="form-control" value={startMachine} onChange={(e) => setStartMachine(e.target.value)} placeholder="e.g. Autoclave #1" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStartModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={saving || selectedItemIds.length === 0} onClick={handleStartCycle}>
                  {saving ? "Starting…" : "Start cycle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
