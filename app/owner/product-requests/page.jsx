"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "CREATE_PRODUCT", label: "Create product" },
  { value: "CREATE_VARIANT", label: "Create variant" },
  { value: "EDIT_PRODUCT", label: "Edit product" },
];

export default function OwnerProductRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [detailRow, setDetailRow] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/v1/owner/product-change-requests?status=ALL"
          : `/api/v1/owner/product-change-requests?status=${statusFilter}`;
      const res = await ownerGet(url);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRows(list.sort((a, b) => (b.id || 0) - (a.id || 0)));
    } catch (e) {
      setError(e?.message || "Failed to load product requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter) {
      list = list.filter((r) => r.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const name = safeNameFromPayload(r.payload).toLowerCase();
        const slug = (r?.payload?.slug || "").toLowerCase();
        const branch = (r?.requestedFromBranch?.name || "").toLowerCase();
        const requester =
          (r?.requestedBy?.profile?.displayName ||
            r?.requestedBy?.auth?.phone ||
            r?.requestedBy?.auth?.email ||
            "").toLowerCase();
        return (
          name.includes(q) ||
          slug.includes(q) ||
          branch.includes(q) ||
          requester.includes(q)
        );
      });
    }
    return list;
  }, [rows, typeFilter, search]);

  async function handleApprove(id) {
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/approve`, {});
      setDetailRow(null);
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed");
    }
  }

  async function handleReject(id) {
    const note =
      detailRow?.id === id ? rejectNote : prompt("Reject note (optional):", "");
    setError("");
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${id}/reject`, {
        note: note || undefined,
      });
      setDetailRow(null);
      setRejectNote("");
      await load();
    } catch (e) {
      setError(e?.message || "Reject failed");
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center justify-content-between mb-16 flex-wrap gap-2">
        <div>
          <h4 className="mb-0">Product Requests</h4>
          <div className="text-secondary small">
            View and manage product change requests from branches
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Link href="/owner/product-requests/new" className="btn btn-primary btn-sm">
            New Request
          </Link>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/owner/dashboard" className="btn btn-light btn-sm">
            Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Status</label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Type</label>
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, slug, branch, requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Card
        title="Product Change Requests"
        subtitle={
          filtered.length
            ? `${filtered.length} request(s)`
            : "No requests match filters."
        }
      >
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>Requested By</th>
                  <th>Payload</th>
                  <th>Created</th>
                  <th>Reviewed</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setDetailRow(r)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>#{r.id}</td>
                      <td>
                        <StatusBadge status={r.type || "REQUEST"} />
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            r.status === "PENDING"
                              ? "PENDING_REVIEW"
                              : r.status
                          }
                        />
                      </td>
                      <td>{r?.requestedFromBranch?.name || "-"}</td>
                      <td>
                        {r?.requestedBy?.profile?.displayName ||
                          r?.requestedBy?.auth?.phone ||
                          "-"}
                      </td>
                      <td>
                        <div className="fw-semibold">
                          {safeNameFromPayload(r.payload)}
                        </div>
                        <div className="text-muted small">
                          {r?.payload?.slug ? `slug: ${r.payload.slug}` : ""}
                        </div>
                      </td>
                      <td className="text-muted small">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString("en-BD")
                          : "—"}
                      </td>
                      <td className="text-muted small">
                        {r.reviewedAt
                          ? new Date(r.reviewedAt).toLocaleString("en-BD")
                          : "—"}
                      </td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="d-inline-flex gap-2">
                          <Link href={`/owner/product-requests/${r.id}`} className="btn btn-sm btn-outline-secondary">
                            Open
                          </Link>
                          {r.status === "PENDING" && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-muted">
                      No product requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailRow && (
        <div className="position-fixed top-0 start-0 end-0 bottom-0" style={{ zIndex: 1040 }}>
          <div
            className="w-100 h-100 bg-dark bg-opacity-25"
            onClick={() => {
              setDetailRow(null);
              setRejectNote("");
            }}
          />
          <div
            className="position-absolute top-0 end-0 h-100 bg-white shadow-lg border-start"
            style={{ width: 400, maxWidth: "100vw", zIndex: 1 }}
          >
          <div className="p-24 d-flex flex-column h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Request #{detailRow.id}</h6>
              <button
                type="button"
                className="btn btn-sm btn-close"
                onClick={() => {
                  setDetailRow(null);
                  setRejectNote("");
                }}
              />
            </div>
            <div className="small text-muted mb-2">Type</div>
            <div className="mb-3">
              <StatusBadge status={detailRow.type} />
            </div>
            <div className="small text-muted mb-2">Status</div>
            <div className="mb-3">
              <StatusBadge status={detailRow.status} />
            </div>
            <div className="small text-muted mb-2">Branch</div>
            <div className="mb-3">
              {detailRow?.requestedFromBranch?.name || "-"}
            </div>
            <div className="small text-muted mb-2">Requested by</div>
            <div className="mb-3">
              {detailRow?.requestedBy?.profile?.displayName ||
                detailRow?.requestedBy?.auth?.phone ||
                "-"}
            </div>
            <div className="small text-muted mb-2">Created</div>
            <div className="mb-3">
              {detailRow.createdAt
                ? new Date(detailRow.createdAt).toLocaleString("en-BD")
                : "—"}
            </div>
            <div className="small text-muted mb-2">Payload</div>
            <pre
              className="bg-light p-3 rounded small overflow-auto"
              style={{ maxHeight: 240, fontSize: 12 }}
            >
              {JSON.stringify(detailRow.payload || {}, null, 2)}
            </pre>
            {detailRow.note && (
              <>
                <div className="small text-muted mb-2">Note</div>
                <div className="mb-3">{detailRow.note}</div>
              </>
            )}
            {detailRow.status === "PENDING" && (
              <div className="mt-auto pt-3 border-top">
                <div className="mb-2">
                  <label className="form-label small">Reject note (optional)</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Reason for rejection"
                  />
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(detailRow.id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(detailRow.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
