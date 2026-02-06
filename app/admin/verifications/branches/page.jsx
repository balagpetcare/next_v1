"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../../../lib/api";
import Link from "next/link";

function Badge({ text }) {
  const t = String(text || "").toUpperCase();

  const cls =
    t === "VERIFIED" || t === "APPROVED"
      ? "bg-success-focus text-success-main"
      : t === "REJECTED" || t === "BLOCKED"
      ? "bg-danger-focus text-danger-main"
      : t === "REQUEST_CHANGES"
      ? "bg-warning-focus text-warning-main"
      : t === "SUSPENDED"
      ? "bg-dark text-white"
      : t === "UNSUBMITTED" || t === "DRAFT"
      ? "bg-gray-200 text-gray-800"
      : "bg-primary-50 text-primary-600";

  return (
    <span className={`badge ${cls} radius-16 px-12 py-6 fw-semibold`}>
      {t || "—"}
    </span>
  );
}

const STATUS = ["", "SUBMITTED", "REQUEST_CHANGES", "VERIFIED", "REJECTED", "SUSPENDED", "UNSUBMITTED"];

export default function Page() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await apiGet(`/api/v1/admin/verifications/branches${qs}`);
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const branchName = String(r?.branch?.name || "").toLowerCase();
      const orgName = String(r?.branch?.org?.name || "").toLowerCase();
      const caseId = String(r?.id || "");
      const branchId = String(r?.branchId || "");
      const orgId = String(r?.branch?.orgId ?? "");
      return (
        branchName.includes(s) ||
        orgName.includes(s) ||
        caseId.includes(s) ||
        branchId.includes(s) ||
        orgId.includes(s)
      );
    });
  }, [rows, q]);

  const total = rows.length;
  const showing = filtered.length;

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-12 mb-16">
        <div>
          <div className="d-flex align-items-center gap-8 mb-6">
            <h4 className="mb-0">Branch Verification Queue</h4>
            <span className="badge bg-primary-50 text-primary-600 radius-16 px-10 py-6">
              Total {total}
            </span>
          </div>
          <div className="text-secondary-light text-sm">
            Review submitted branches, request changes, approve or reject.
          </div>
        </div>

        <div className="d-flex align-items-center gap-8 flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="btn btn-primary-600 btn-sm d-inline-flex align-items-center gap-8"
            title="Refresh list"
          >
            <iconify-icon icon="mdi:refresh" />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card radius-12 mb-16">
        <div className="card-body">
          <div className="row g-12 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label text-sm text-secondary-light">Status</label>
              <select
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s || "All Status"}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label text-sm text-secondary-light">Search</label>
              <div className="position-relative">
                <span
                  className="position-absolute top-50 translate-middle-y ms-12 text-secondary-light"
                  style={{ zIndex: 2 }}
                >
                  <iconify-icon icon="mdi:magnify" />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="form-control form-control-sm ps-40"
                  placeholder="Search by branch / org / case id / branch id..."
                />
              </div>
            </div>

            <div className="col-12 col-md-3 d-flex gap-8">
              <button
                className="btn btn-sm btn-neutral-200 w-100"
                onClick={() => setQ("")}
                disabled={!q}
                title="Clear search"
              >
                Clear
              </button>
              <button
                className="btn btn-sm btn-primary-light w-100"
                onClick={() => load()}
                disabled={loading}
                title="Apply"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-8 mt-12">
            <div className="text-secondary-light text-sm">
              Showing <span className="fw-semibold text-black">{showing}</span> of{" "}
              <span className="fw-semibold text-black">{total}</span>
            </div>

            <div className="d-flex align-items-center gap-8">
              <span className="badge bg-gray-100 text-gray-700 radius-16 px-10 py-6">
                Active Filter: {status}
              </span>
              {q ? (
                <span className="badge bg-warning-focus text-warning-main radius-16 px-10 py-6">
                  Search: “{q}”
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error ? <div className="alert alert-danger mb-16">{error}</div> : null}

      {/* Table Card */}
      <div className="card basic-data-table radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-12">
          <h6 className="mb-0">Queue Items</h6>
          <div className="text-secondary-light text-sm">
            {loading ? "Fetching latest data..." : `Updated view (${showing} item${showing === 1 ? "" : "s"})`}
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table bordered-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Case</th>
                  <th>Branch</th>
                  <th style={{ width: 120 }}>Branch ID</th>
                  <th style={{ width: 120 }}>Org ID</th>
                  <th style={{ width: 170 }}>Status</th>
                  <th style={{ width: 170 }} className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={6} className="py-18">
                        <div className="d-flex align-items-center gap-10">
                          <div
                            className="bg-gray-100 radius-8"
                            style={{ width: 48, height: 12 }}
                          />
                          <div
                            className="bg-gray-100 radius-8"
                            style={{ width: 240, height: 12 }}
                          />
                          <div
                            className="bg-gray-100 radius-8"
                            style={{ width: 120, height: 12 }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">#{r.id}</td>

                      <td>
                        <div className="fw-semibold text-black">
                          {r.branch?.name || `Branch #${r.branchId}`}
                        </div>
                        <div className="text-secondary-light text-sm">
                          Owner/Org: {r.branch?.org?.name || "—"}
                        </div>
                      </td>

                      <td>{r.branchId}</td>
                      <td>{r.branch?.orgId ?? "—"}</td>

                      <td>
                        <Badge text={r.verificationStatus} />
                      </td>

                      <td className="text-end">
                        <div className="d-inline-flex align-items-center gap-8">
                          <Link
                            href={`/admin/verifications/branches/${r.id}`}
                            className="btn btn-sm btn-primary-light d-inline-flex align-items-center gap-6"
                            title="Review"
                          >
                            <iconify-icon icon="iconamoon:eye-light" />
                            Review
                          </Link>

                          <Link
                            href={`/admin/organizations/${r.branch?.orgId || ""}`}
                            className={`btn btn-sm btn-neutral-200 d-inline-flex align-items-center gap-6 ${
                              r.branch?.orgId ? "" : "disabled"
                            }`}
                            title="Open organization"
                            aria-disabled={!r.branch?.orgId}
                            tabIndex={!r.branch?.orgId ? -1 : 0}
                          >
                            <iconify-icon icon="mdi:office-building-outline" />
                            Org
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-32">
                      <div className="d-flex flex-column align-items-center gap-10">
                        <span className="text-secondary-light" style={{ fontSize: 34 }}>
                          <iconify-icon icon="mdi:inbox-outline" />
                        </span>
                        <div className="fw-semibold text-black">No items found</div>
                        <div className="text-secondary-light text-sm">
                          Try changing status filter or search keyword.
                        </div>
                        <button
                          className="btn btn-sm btn-primary-light"
                          onClick={() => {
                            setQ("");
                            setStatus("SUBMITTED");
                          }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
