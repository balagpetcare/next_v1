"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

export default function ProductRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const displayId = useMemo(() => {
    return id ? String(id).replace(/^PR-/, "") : "";
  }, [id]);

  async function load() {
    if (!displayId) return;
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet(`/api/v1/owner/product-change-requests/${displayId}`);
      setRequest(res?.data ?? null);
      if (!res?.data) setError("Request not found.");
    } catch (e) {
      setRequest(null);
      setError(e?.message || "Failed to load request");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function approve() {
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${displayId}/approve`, {});
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed");
    }
  }

  async function reject() {
    try {
      await ownerPatch(`/api/v1/owner/product-change-requests/${displayId}/reject`, { note: note || undefined });
      setNote("");
      await load();
    } catch (e) {
      setError(e?.message || "Reject failed");
    }
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Product Request ${displayId ? `#${displayId}` : ""}`}
        subtitle="Branch demand → Owner approval → Transfer draft"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Product Requests", href: "/owner/product-requests" },
          { label: displayId || "Detail", href: `/owner/product-requests/${displayId}` },
        ]}
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body p-24 text-muted">Loading request…</div>
        </div>
      ) : !request ? (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="d-flex justify-content-between align-items-center">
              <div>No request data available.</div>
              <button className="btn btn-outline-primary btn-sm" onClick={load}>
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="card radius-12 mb-3">
                <div className="card-body p-24">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="text-muted small mb-1">Request ID</div>
                      <h5 className="mb-1">#{request.id}</h5>
                      <div className="d-flex align-items-center gap-2">
                        <StatusBadge status={request.type || "REQUEST"} />
                        <StatusBadge status={request.status || "PENDING"} />
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-light btn-sm" onClick={() => router.back()}>
                        Back
                      </button>
                      <Link href="/owner/product-requests" className="btn btn-outline-secondary btn-sm">
                        List
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-muted small mb-1">Branch</div>
                    <div>{request?.requestedFromBranch?.name || "—"}</div>
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-6">
                      <div className="text-muted small mb-1">Created</div>
                      <div className="text-secondary">{formatDate(request.createdAt)}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small mb-1">Reviewed</div>
                      <div className="text-secondary">{formatDate(request.reviewedAt)}</div>
                    </div>
                  </div>

                  {request.note ? (
                    <div className="mt-3">
                      <div className="text-muted small mb-1">Note</div>
                      <div className="text-secondary">{request.note}</div>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="text-muted small mb-1">Payload</div>
                    <pre className="bg-light p-3 rounded small" style={{ maxHeight: 320, overflow: "auto" }}>
                      {JSON.stringify(request.payload || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="card radius-12 mb-3">
                <div className="card-body p-24">
                  <h6 className="mb-3">Actions</h6>
                  <div className="d-flex flex-column gap-2">
                    <button className="btn btn-success w-100" disabled={request.status !== "PENDING"} onClick={approve}>
                      Approve
                    </button>
                    <button className="btn btn-danger w-100" disabled={request.status !== "PENDING"} onClick={reject}>
                      Reject
                    </button>
                    <div>
                      <label className="form-label small text-muted">Reject note (optional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Reason"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
