"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "../../../../../lib/api";

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
  return <span className={`badge ${cls} radius-16 px-12 py-6 fw-semibold`}>{t || "—"}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className="d-flex align-items-start justify-content-between gap-12 py-8 border-bottom">
      <div className="text-secondary-light text-sm" style={{ minWidth: 160 }}>{label}</div>
      <div className="text-sm text-black fw-medium text-end flex-grow-1">{String(value ?? "—")}</div>
    </div>
  );
}

function PreviewModal({ open, doc, onClose }) {
  if (!open || !doc) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.55)", zIndex: 1050 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="position-absolute top-50 start-50 translate-middle card radius-12"
        style={{ width: "min(980px, 94vw)", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-10">
          <div className="d-flex align-items-center gap-10">
            <h6 className="mb-0">{doc.type}</h6>
            {doc.status ? <span className="text-secondary-light text-sm">({doc.status})</span> : null}
          </div>
          <div className="d-flex gap-8">
            {doc?.media?.url ? (
              <a className="btn btn-sm btn-outline-secondary" href={doc.media.url} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : null}
            <button className="btn btn-sm btn-primary-600" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="card-body" style={{ overflow: "auto" }}>
          {doc?.media?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.media.url} alt={doc.type} style={{ width: "100%", height: "auto", borderRadius: 10 }} />
          ) : (
            <div className="text-secondary-light">No preview available.</div>
          )}
          {doc?.note ? <div className="mt-12 text-sm text-secondary-light">Note: {doc.note}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const [previewDoc, setPreviewDoc] = useState(null);

  async function load() {
    if (!id) return;
    setError("");
    try {
      const r = await apiGet(`/api/v1/admin/verifications/branches/${id}`);
      const data = r?.data || null;
      setRow(data);
      setNote(data?.reviewNote || "");
    } catch (e) {
      setError(e?.message || "Failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path, body) {
    setBusy(true);
    setError("");
    try {
      await apiPost(path, body || {});
      await load();
      router.refresh();
    } catch (e) {
      setError(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const docs = useMemo(() => (row?.documents || []).slice().sort((a, b) => (a?.id || 0) - (b?.id || 0)), [row]);

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-end justify-content-between flex-wrap gap-12 mb-16">
        <div>
          <h4 className="mb-0">Branch Review</h4>
          <div className="text-secondary-light text-sm">
            Case <span className="fw-semibold">#{row?.id ?? "—"}</span> • Branch #{row?.branchId ?? "—"} •{" "}
            <Badge text={row?.verificationStatus} />
          </div>
        </div>
        <Link href="/admin/verifications/branches" className="btn btn-outline-secondary btn-sm">← Back</Link>
      </div>

      {error ? <div className="alert alert-danger mb-16">{error}</div> : null}
      {!row ? <div className="text-secondary-light">Loading...</div> : null}

      {row ? (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className="card radius-12">
                <div className="card-header">
                  <h6 className="mb-0">Branch Info</h6>
                </div>
                <div className="card-body">
                  <InfoRow label="Branch name" value={row.branch?.name || "—"} />
                  <InfoRow label="Org" value={row.branch?.org ? `${row.branch.org.name} (#${row.branch.org.id})` : "—"} />
                  <InfoRow label="Phone" value={row.branchPhone || "—"} />
                  <InfoRow label="Email" value={row.branchEmail || "—"} />
                  <InfoRow label="Manager" value={`${row.managerName || "—"} (${row.managerPhone || "—"})`} />
                  <InfoRow label="Submitted at" value={row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"} />
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card radius-12">
                <div className="card-header">
                  <h6 className="mb-0">Actions</h6>
                </div>
                <div className="card-body">
                  <label className="form-label">Note</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Write a short review note"
                  />

                  <button
                    className="btn btn-success w-100 mt-12"
                    disabled={busy}
                    onClick={() => act(`/api/v1/admin/verifications/branches/${row.id}/approve`, { note })}
                  >
                    Approve
                  </button>

                  <div className="mt-12">
                    <label className="form-label">Reject reason</label>
                    <input
                      className="form-control"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Document unclear / mismatch"
                    />
                  </div>

                  <div className="d-flex gap-8 mt-12">
                    <button
                      className="btn btn-warning flex-grow-1"
                      disabled={busy}
                      onClick={() =>
                        act(`/api/v1/admin/verifications/branches/${row.id}/request-changes`, {
                          note: note || "Please update missing/unclear documents.",
                        })
                      }
                    >
                      Request changes
                    </button>
                    <button
                      className="btn btn-danger flex-grow-1"
                      disabled={busy}
                      onClick={() => act(`/api/v1/admin/verifications/branches/${row.id}/reject`, { reason, note })}
                    >
                      Reject
                    </button>
                  </div>

                  <button
                    className="btn btn-dark w-100 mt-12"
                    disabled={busy}
                    onClick={() => act(`/api/v1/admin/verifications/branches/${row.id}/suspend`, { note })}
                  >
                    Suspend
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card basic-data-table radius-12 mt-16">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-12">
              <h6 className="mb-0">Documents</h6>
              <div className="text-secondary-light text-sm">Total: {docs.length}</div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>ID</th>
                      <th style={{ width: 200 }}>Type</th>
                      <th>Preview</th>
                      <th style={{ width: 140 }}>Status</th>
                      <th style={{ width: 140 }} className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id}>
                        <td className="fw-semibold">#{d.id}</td>
                        <td className="fw-semibold text-black">{d.type}</td>
                        <td>
                          {d?.media?.url ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-8"
                              onClick={() => setPreviewDoc(d)}
                            >
                              <span
                                className="d-inline-block radius-8 overflow-hidden"
                                style={{ width: 56, height: 40, border: "1px solid #e5e7eb" }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={d.media.url}
                                  alt={d.type}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </span>
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-secondary-light text-sm">No preview</span>
                          )}
                          {d?.note ? <div className="text-secondary-light text-sm mt-4">{d.note}</div> : null}
                        </td>
                        <td><Badge text={d.status || "SUBMITTED"} /></td>
                        <td className="text-end">
                          {d?.media?.url ? (
                            <a
                              className="btn btn-sm btn-primary-light rounded-circle d-inline-flex align-items-center justify-content-center"
                              href={d.media.url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open"
                              style={{ width: 36, height: 36 }}
                            >
                              <iconify-icon icon="iconamoon:eye-light" />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {!docs.length ? (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary-light py-24">No documents.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <PreviewModal open={!!previewDoc} doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        </>
      ) : null}
    </div>
  );
}
