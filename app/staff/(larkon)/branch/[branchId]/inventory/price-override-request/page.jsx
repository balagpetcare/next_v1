"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { useBranchContext } from "@/lib/useBranchContext";

const REQUIRED_PERM = "pricing.branch.override.request";

async function staffJson(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

export default function StaffPriceOverrideRequestPage() {
  const params = useParams();
  const branchId = params?.branchId != null ? String(params.branchId) : "";
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const [orgId, setOrgId] = useState(null);
  const [variantId, setVariantId] = useState("");
  const [requestedPrice, setRequestedPrice] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);

  const can = useMemo(() => {
    const p = myAccess?.permissions || [];
    const set = new Set(Array.isArray(p) ? p.map(String) : []);
    return set.has(REQUIRED_PERM) || set.has("global.admin");
  }, [myAccess]);

  const load = useCallback(async () => {
    if (!orgId || !branchId) return;
    const j = await staffJson(`/api/v1/pricing/branch-override-requests?orgId=${orgId}&branchId=${encodeURIComponent(branchId)}`);
    setRows(Array.isArray(j.data) ? j.data : []);
  }, [orgId, branchId]);

  useEffect(() => {
    if (branch?.orgId != null && branch.orgId !== "") setOrgId(Number(branch.orgId));
  }, [branch]);

  useEffect(() => {
    if (orgId && branchId && can) {
      load().catch((e) => setErr(e.message));
    }
  }, [orgId, branchId, can, load]);

  if (ctxLoading) return <p className="text-muted small p-3">Loading…</p>;
  if (errorCode === "forbidden" || errorCode === "unauthorized" || !branch) return <AccessDenied />;
  if (!hasViewPermission) return <AccessDenied />;
  if (!can) return <AccessDenied message="You do not have permission to request branch price overrides." />;

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await staffJson("/api/v1/pricing/branch-override-requests", {
        method: "POST",
        body: JSON.stringify({
          orgId,
          branchId: parseInt(branchId, 10),
          variantId: parseInt(variantId, 10),
          requestedPrice: parseFloat(requestedPrice),
          reason: reason || null,
        }),
      });
      setMsg("Request submitted.");
      setVariantId("");
      setRequestedPrice("");
      setReason("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="dashboard-main-body">
      <BranchHeader branch={branch} title="Branch price override request" />
      <nav aria-label="breadcrumb" className="mb-2 small">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
          </li>
          <li className="breadcrumb-item active">Price override request</li>
        </ol>
      </nav>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="card radius-12 mb-3">
        <div className="card-body small">
          <h6 className="card-title">New request</h6>
          <form className="row g-2" onSubmit={submit}>
            <div className="col-md-2">
              <label className="form-label">Variant ID</label>
              <input className="form-control form-control-sm" required value={variantId} onChange={(e) => setVariantId(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Requested price</label>
              <input className="form-control form-control-sm" required value={requestedPrice} onChange={(e) => setRequestedPrice(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Reason</label>
              <input className="form-control form-control-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary btn-sm" type="submit">
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="card radius-12">
        <div className="card-header">Recent requests (this branch)</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead className="bg-light">
              <tr>
                <th>SKU</th>
                <th>Current</th>
                <th>Requested</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted small p-3">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="small">{r.variant?.sku}</td>
                    <td className="small">{String(r.currentPrice)}</td>
                    <td className="small">{String(r.requestedPrice)}</td>
                    <td className="small">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
