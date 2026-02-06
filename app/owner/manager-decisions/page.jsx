"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function Card({ title, subtitle, children }) {
  return (
    <div className="card radius-12 mb-24">
      <div className="card-header d-flex align-items-center justify-content-between">
        <div>
          <h6 className="mb-0">{title}</h6>
          {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
        </div>
      </div>
      <div className="card-body p-24">{children}</div>
    </div>
  );
}

function safeNameFromPayload(payload) {
  try {
    const p = payload || {};
    return p.name || p.title || p.slug || "-";
  } catch {
    return "-";
  }
}

export default function OwnerManagerDecisionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      // For now, the Manager decision queue aggregates ProductChangeRequest rows only.
      // Later we can extend this to include pricing/policy/branch-level decisions.
      const j = await ownerGet("/api/v1/owner/product-change-requests?status=PENDING");
      setRows(j?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load manager decisions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id) {
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/approve`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed");
    }
  }

  async function handleReject(id) {
    const note = prompt("Reject note (optional):", "");
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/reject`, {
        note: note || undefined,
      });
      await load();
    } catch (e) {
      setError(e?.message || "Reject failed");
    }
  }

  const total = rows.length;
  const createCount = rows.filter((r) => r.type === "CREATE_PRODUCT").length;
  const variantCount = rows.filter((r) => r.type === "CREATE_VARIANT").length;
  const editCount = rows.filter((r) => r.type === "EDIT_PRODUCT").length;

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center justify-content-between mb-16">
        <div>
          <h4 className="mb-0">Manager Decision Queue</h4>
          <div className="text-secondary small">
            All pending product change requests raised from branches (create / variant / edit)
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/owner/dashboard" className="btn btn-light btn-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <Card title="Total Pending" subtitle={`${total} request(s)`}>
            <div className="fs-3 fw-semibold">{total}</div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card title="New Products" subtitle="CREATE_PRODUCT">
            <div className="fs-3 fw-semibold">{createCount}</div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card title="New Variants" subtitle="CREATE_VARIANT">
            <div className="fs-3 fw-semibold">{variantCount}</div>
          </Card>
        </div>
        <div className="col-6 col-md-3">
          <Card title="Product Edits" subtitle="EDIT_PRODUCT">
            <div className="fs-3 fw-semibold">{editCount}</div>
          </Card>
        </div>
      </div>

      <Card
        title="Pending Manager Decisions"
        subtitle={total ? `${total} request(s) awaiting your approval` : "No pending requests."}
      >
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Branch</th>
                  <th>Requested By</th>
                  <th>Payload</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows?.length ? (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <StatusBadge status={r.type || "REQUEST"} />
                      </td>
                      <td>{r?.requestedFromBranch?.name || "-"}</td>
                      <td>{r?.requestedBy?.profile?.displayName || r?.requestedBy?.auth?.phone || "-"}</td>
                      <td>
                        <div className="fw-semibold">{safeNameFromPayload(r.payload)}</div>
                        <div className="text-muted small">
                          {r?.payload?.slug ? `slug: ${r.payload.slug}` : ""}
                        </div>
                      </td>
                      <td className="text-muted small">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-BD") : "—"}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(r.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(r.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-muted">
                      No pending manager decisions right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

