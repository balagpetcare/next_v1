"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import {
  getAiReplenishmentSuggestions,
  postAiBulkDismissReplenishment,
  postAiBulkAcceptReplenishment,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; name?: string };

type SugRow = {
  id: number;
  severity?: string;
  suggestedQty: number;
  onHand: number;
  rop: number;
  reasonCodes?: string[];
  reasonLabels?: string[];
  variant?: { sku?: string; title?: string };
  product?: { name?: string };
  metaJson?: Record<string, unknown>;
};

export default function PlanningReplenishmentPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [rows, setRows] = useState<SugRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches").then((r) => {
      const list = Array.isArray(r?.data) ? r!.data! : [];
      setBranches(list);
      if (list[0]?.id) setBranchId(list[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAiReplenishmentSuggestions({ branchId: Number(branchId), status: "OPEN" });
      const data = (res as { data?: SugRow[] })?.data;
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function bulkDismiss() {
    if (!selected.size) return;
    setBusy(true);
    setError(null);
    try {
      await postAiBulkDismissReplenishment([...selected]);
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  }

  async function bulkAccept() {
    if (!selected.size) return;
    setBusy(true);
    setError(null);
    try {
      await postAiBulkAcceptReplenishment([...selected]);
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  }

  async function oneAccept(id: number) {
    setBusy(true);
    setError(null);
    try {
      await ownerPost(`/api/v1/ai/replenishment/suggestions/${id}/accept`, {});
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  }

  async function oneDismiss(id: number) {
    setBusy(true);
    setError(null);
    try {
      await ownerPost(`/api/v1/ai/replenishment/suggestions/${id}/dismiss`, {});
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Replenishment queue"
        subtitle="Review suggested reorder quantities. Accept creates a draft stock request — nothing auto-submits."
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-4">
          <label className="form-label small text-muted">Branch</label>
          <select
            className="form-select form-select-sm"
            value={branchId === "" ? "" : String(branchId)}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? `Branch ${b.id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 d-flex gap-2 align-items-end">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={load} disabled={loading}>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={bulkDismiss}
            disabled={busy || selected.size === 0}
          >
            Dismiss selected
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={bulkAccept}
            disabled={busy || selected.size === 0}
          >
            Accept selected (drafts)
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" className="form-check-input" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              </th>
              <th>Priority</th>
              <th>SKU</th>
              <th>Product</th>
              <th className="text-end">Suggest</th>
              <th className="text-end">On hand</th>
              <th className="text-end">ROP</th>
              <th>Why</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted">
                  {loading ? "Loading…" : "No open suggestions."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input type="checkbox" className="form-check-input" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td>
                  <span className={`badge ${r.severity === "CRITICAL" ? "bg-danger" : "bg-warning text-dark"}`}>
                    {r.severity ?? "—"}
                  </span>
                </td>
                <td>{r.variant?.sku ?? "—"}</td>
                <td>{r.product?.name ?? "—"}</td>
                <td className="text-end">{r.suggestedQty}</td>
                <td className="text-end">{r.onHand}</td>
                <td className="text-end">{r.rop}</td>
                <td className="small text-muted" style={{ maxWidth: 280 }}>
                  {(r.reasonLabels ?? r.reasonCodes ?? []).join(" · ")}
                </td>
                <td className="text-nowrap">
                  <button type="button" className="btn btn-sm btn-primary me-1" disabled={busy} onClick={() => oneAccept(r.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => oneDismiss(r.id)}>
                    Dismiss
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
