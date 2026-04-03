"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  allocationPlanConfirm,
  allocationPlanGet,
  allocationPlanRunFefo,
  pickListComplete,
  pickListFromPlan,
  pickListHandoff,
  pickListStart,
} from "@/lib/api";

export default function OwnerAllocationPlanDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [plan, setPlan] = useState<any>(null);
  const [toLoc, setToLoc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [acting, setActing] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const p = await allocationPlanGet(id);
      setPlan(p);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(action: string) {
    setActing(true);
    setError("");
    setMsg("");
    try {
      if (action === "fefo") await allocationPlanRunFefo(id);
      if (action === "confirm") await allocationPlanConfirm(id);
      if (action === "pick") await pickListFromPlan(id);

      const fresh = await allocationPlanGet(id);
      const pid = (fresh as any)?.pickList?.id;
      if (action === "startPick" && pid) await pickListStart(pid);
      if (action === "completePick" && pid) await pickListComplete(pid);
      if (action === "handoff" && pid) {
        if (!toLoc.trim()) throw new Error("Enter toLocationId for branch destination");
        await pickListHandoff(pid, { toLocationId: Number(toLoc) });
      }
      await load();
      if (action === "handoff") setMsg("Dispatch created. Send from challan when ready.");
      else if (action !== "startPick" && action !== "completePick" && action !== "handoff") setMsg("Updated.");
      else setMsg("Updated.");
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  if (loading && !plan) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || "Not found"}</div>
      </div>
    );
  }

  const st = (plan.status || "").toUpperCase();
  const pick = plan.pickList;
  const pickSt = pick ? (pick.status || "").toUpperCase() : "";

  return (
    <div className="container-fluid py-4">
      <PageHeader title={`Allocation plan #${plan.id}`} subtitle={`Status: ${plan.status}`} />
      <Link href="/owner/inventory/allocation" className="btn btn-outline-secondary btn-sm mb-2">
        ← Board
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card border mb-3">
        <div className="card-body d-flex flex-wrap gap-2">
          {st === "DRAFT" && (
            <>
              <button className="btn btn-sm btn-primary" disabled={acting} onClick={() => run("fefo")}>
                Run FEFO
              </button>
              <button className="btn btn-sm btn-success" disabled={acting} onClick={() => run("confirm")}>
                Confirm plan
              </button>
            </>
          )}
          {st === "CONFIRMED" && !pick && (
            <button className="btn btn-sm btn-primary" disabled={acting} onClick={() => run("pick")}>
              Generate pick list
            </button>
          )}
          {pick && ["DRAFT"].includes(pickSt) && (
            <button className="btn btn-sm btn-warning" disabled={acting} onClick={() => run("startPick")}>
              Start picking
            </button>
          )}
          {pick && ["DRAFT", "IN_PROGRESS"].includes(pickSt) && (
            <button className="btn btn-sm btn-success" disabled={acting} onClick={() => run("completePick")}>
              Complete picking
            </button>
          )}
          {pick && pickSt === "COMPLETED" && !pick.dispatch && (
            <div className="d-flex flex-wrap align-items-end gap-2 w-100">
              <div>
                <label className="form-label small mb-0">To location ID (branch)</label>
                <input className="form-control form-control-sm" value={toLoc} onChange={(e) => setToLoc(e.target.value)} style={{ width: 140 }} />
              </div>
              <button className="btn btn-sm btn-dark" disabled={acting} onClick={() => run("handoff")}>
                Handoff → dispatch
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border">
            <div className="card-header py-2">Allocation lines</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Variant</th>
                    <th>Lot</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(plan.lines || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-muted text-center py-3">
                        Run FEFO to populate lines
                      </td>
                    </tr>
                  ) : (
                    plan.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td className="small">{l.variant?.sku}</td>
                        <td className="small">{l.lot?.lotCode}</td>
                        <td>{l.quantityAllocated}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border">
            <div className="card-header py-2">Pick list</div>
            <div className="card-body">
              {!pick ? (
                <p className="text-muted small mb-0">No pick list yet.</p>
              ) : (
                <>
                  <p className="small mb-2">
                    Pick #{pick.id} — <span className="badge bg-secondary">{pick.status}</span>
                  </p>
                  {pick.dispatch && (
                    <Link href={`/owner/inventory/stock-requests/${plan.stockRequestId}/challan/${pick.dispatch.id}`} className="btn btn-sm btn-outline-primary">
                      Open dispatch / challan
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
