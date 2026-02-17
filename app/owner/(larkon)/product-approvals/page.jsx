"use client";

import { useEffect, useState } from "react";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";

function Card({ title, children }) {
  return (
    <div className="card radius-12 mb-24">
      <div className="card-header">
        <h6 className="mb-0">{title}</h6>
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

export default function OwnerProductApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const j = await ownerGet(`/api/v1/owner/product-change-requests?status=PENDING`);
      setRows(j?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/approve`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed");
    }
  }

  async function reject(id) {
    const note = prompt("Reject note (optional):", "");
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/reject`, { note: note || undefined });
      await load();
    } catch (e) {
      setError(e?.message || "Reject failed");
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h4 className="mb-0">Product Approvals</h4>
        <button className="btn btn-light" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <Card title="Pending Requests">
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>From Branch</th>
                  <th>Requested By</th>
                  <th>Payload</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows?.length ? (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.type}</td>
                      <td>{r?.requestedFromBranch?.name || "-"}</td>
                      <td>{r?.requestedBy?.profile?.fullName || r?.requestedBy?.auth?.phone || "-"}</td>
                      <td>
                        <div className="fw-semibold">{safeNameFromPayload(r.payload)}</div>
                        <div className="text-muted small">
                          {r?.payload?.slug ? `slug: ${r.payload.slug}` : ""}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-8">
                          <button className="btn btn-sm btn-success" onClick={() => approve(r.id)}>
                            Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => reject(r.id)}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      No pending requests.
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
