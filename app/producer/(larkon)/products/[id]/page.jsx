"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import { producerProductCreateBatch, producerProductGet, producerProductResubmit } from "../../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../../_lib/apiErrorPopup";
import ProducerPageShell from "../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import EnforcementHoldBanner from "../../../_components/EnforcementHoldBanner";
import { PROOF_TYPE_LABELS } from "../../../_components/ProducerProofUpload";

function StatusBadge({ status }) {
  const s = status || "DRAFT";
  const cls =
    s === "ACTIVE"
      ? "bg-success"
      : s === "APPROVED"
        ? "bg-info"
        : s === "SUBMITTED" || s === "UNDER_REVIEW"
          ? "bg-warning text-dark"
          : s === "CHANGES_REQUESTED"
            ? "bg-warning text-dark"
            : s === "REJECTED" || s === "DECLINED"
              ? "bg-danger"
              : "bg-secondary";
  return <span className={`badge ${cls}`}>{s.replace(/_/g, " ")}</span>;
}

const TIMELINE_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "CHANGES_REQUESTED", label: "Changes requested" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { dateStyle: "medium" }) + " " + date.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export default function ProducerProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const id = params?.id;
  const [product, setProduct] = useState(null);
  const [batchForm, setBatchForm] = useState({ batchNo: "", mfgDate: "", expDate: "", qtyPlanned: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await producerProductGet(id);
      setProduct(res || null);
    } catch (e) {
      if (e?.status === 401) {
        router.replace(`/producer/login?from=/producer/products/${id}`);
        return;
      }
      setProduct(null);
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const createBatch = async () => {
    if (!batchForm.batchNo || !batchForm.qtyPlanned) {
      toast.error("Batch No and Qty Planned are required");
      return;
    }
    setLoading(true);
    try {
      const res = await producerProductCreateBatch(id, {
        batchNo: batchForm.batchNo,
        mfgDate: batchForm.mfgDate || undefined,
        expDate: batchForm.expDate || undefined,
        qtyPlanned: Number(batchForm.qtyPlanned),
      });
      const batchId = res?.id;
      if (!batchId) {
        toast.error("Batch created but missing id");
        return;
      }
      toast.success("Batch created");
      router.push(`/producer/batches/${batchId}`);
      router.refresh();
    } catch (e) {
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const productName = product?.productName || "Product";
  const isLoading = loading && !product;
  const proofs = product?.proofs || [];
  const status = product?.status || "DRAFT";

  const timelineWithDates = useMemo(() => {
    const submittedAt = product?.submittedAt ? new Date(product.submittedAt) : null;
    const reviewedAt = product?.reviewedAt ? new Date(product.reviewedAt) : null;
    const createdAt = product?.createdAt ? new Date(product.createdAt) : null;
    return TIMELINE_STEPS.map((step) => {
      let date = null;
      if (step.key === "DRAFT") date = createdAt;
      if (step.key === "SUBMITTED") date = submittedAt;
      if (step.key === "UNDER_REVIEW") date = submittedAt;
      if (step.key === "APPROVED" || step.key === "REJECTED") date = reviewedAt;
      const isReached =
        step.key === status ||
        (status === "APPROVED" && step.key === "APPROVED") ||
        (status === "ACTIVE" && step.key === "APPROVED") ||
        (status === "REJECTED" && step.key === "REJECTED") ||
        (status === "CHANGES_REQUESTED" && (step.key === "CHANGES_REQUESTED" || step.key === "UNDER_REVIEW" || step.key === "SUBMITTED" || step.key === "DRAFT")) ||
        (status === "UNDER_REVIEW" && (step.key === "UNDER_REVIEW" || step.key === "SUBMITTED" || step.key === "DRAFT")) ||
        (status === "SUBMITTED" && (step.key === "SUBMITTED" || step.key === "DRAFT")) ||
        (status === "DRAFT" && step.key === "DRAFT");
      return { ...step, date, isReached };
    });
  }, [product, status]);

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title={product ? productName : "Product"}
        breadcrumbs={[
          { label: "Products", href: "/producer/products" },
          { label: product ? productName : "…" },
      ]}
      actions={
        <div className="d-flex gap-2 flex-wrap">
          {(status === "DRAFT" || status === "REJECTED" || status === "CHANGES_REQUESTED") && (
            <Link href={`/producer/products/${id}/edit`} className="btn btn-primary btn-sm radius-12">
              <Icon icon="solar:pen-outline" className="me-1" /> Edit
            </Link>
          )}
          {status === "DRAFT" && (
            <Link href={`/producer/products/new?edit=${id}`} className="btn btn-outline-primary btn-sm radius-12">
              Complete and submit
            </Link>
          )}
          {(status === "CHANGES_REQUESTED" || status === "REJECTED") && (
            <button
              type="button"
              className="btn btn-warning btn-sm radius-12"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await producerProductResubmit(id);
                  toast.success("Product resubmitted for approval.");
                  await load();
                } catch (e) {
                  showApiErrorPopup(normalizeApiError(e));
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Icon icon="solar:refresh-outline" className="me-1" /> Resubmit
            </button>
          )}
          <Link href="/producer/products" className="btn btn-outline-secondary btn-sm radius-12">
            <Icon icon="solar:arrow-left-outline" className="me-1" /> Back to products
          </Link>
        </div>
      }
    >
      {isLoading ? (
        <div className="placeholder-glow">
          <div className="card radius-12 mb-3">
            <div className="card-body">
              <span className="placeholder col-6" />
              <span className="placeholder col-8 d-block mt-2" />
              <span className="placeholder col-5 d-block mt-2" />
            </div>
          </div>
        </div>
      ) : !product ? (
        <ProducerSectionCard title="Product">
          <p className="text-muted mb-0">Product not found or you don't have access.</p>
          <Link href="/producer/products" className="btn btn-outline-primary btn-sm mt-3 radius-12">
            Back to products
          </Link>
        </ProducerSectionCard>
      ) : (
        <>
          <EnforcementHoldBanner productId={id} />
          {/* Overview header */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <h5 className="mb-1">{product.productName}</h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <StatusBadge status={product.status} />
                <span className="small text-muted">
                  Last updated {formatDate(product.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Changes requested / rejection feedback */}
          {(status === "CHANGES_REQUESTED" || status === "REJECTED") && product.reviewNotes && (
            <div className={`alert mb-4 ${status === "CHANGES_REQUESTED" ? "alert-warning" : "alert-danger"} d-flex align-items-start gap-2`}>
              <Icon icon="solar:info-circle-outline" className="flex-shrink-0 mt-1" style={{ fontSize: "1.25rem" }} />
              <div className="flex-grow-1">
                <strong>{status === "CHANGES_REQUESTED" ? "Changes requested" : "Rejection reason"}</strong>
                <p className="mb-0 mt-1 small">{product.reviewNotes}</p>
                <p className="mb-0 mt-2 small text-muted">Edit the product above and click Resubmit when ready.</p>
              </div>
            </div>
          )}

          {/* Status timeline */}
          <ProducerSectionCard title="Status timeline" className="mb-4">
            <div className="d-flex flex-wrap align-items-center gap-2 gap-md-4">
              {timelineWithDates.map((step, i) => (
                <div key={step.key} className="d-flex align-items-center">
                  <div
                    className={`d-flex flex-column align-items-center ${step.isReached ? "text-primary fw-medium" : "text-muted"}`}
                  >
                    <span className="small">{step.label}</span>
                    {step.date && <span className="small" style={{ fontSize: "0.75rem" }}>{formatDate(step.date)}</span>}
                  </div>
                  {i < timelineWithDates.length - 1 && (
                    <Icon icon="solar:arrow-right-outline" className="mx-2 text-muted" style={{ fontSize: "1rem" }} />
                  )}
                </div>
              ))}
            </div>
          </ProducerSectionCard>

          {/* Basic info */}
          <ProducerSectionCard title="Basic information" className="mb-4">
            <div className="row g-3">
              <div className="col-md-6">
                <dl className="row mb-0 small">
                  <dt className="col-4 text-secondary fw-normal">Name</dt>
                  <dd className="col-8 mb-0 fw-medium">{product.productName || "—"}</dd>
                  <dt className="col-4 text-secondary fw-normal">Brand</dt>
                  <dd className="col-8 mb-0">{product.brandName || "—"}</dd>
                  <dt className="col-4 text-secondary fw-normal">SKU</dt>
                  <dd className="col-8 mb-0">{product.sku || "—"}</dd>
                </dl>
              </div>
              <div className="col-md-6">
                <dl className="row mb-0 small">
                  <dt className="col-4 text-secondary fw-normal">Status</dt>
                  <dd className="col-8 mb-0"><StatusBadge status={product.status} /></dd>
                  {product.packSize && (
                    <>
                      <dt className="col-4 text-secondary fw-normal">Pack size</dt>
                      <dd className="col-8 mb-0">{product.packSize}</dd>
                    </>
                  )}
                  {product.productType && (
                    <>
                      <dt className="col-4 text-secondary fw-normal">Type</dt>
                      <dd className="col-8 mb-0">{product.productType.replace(/_/g, " ")}</dd>
                    </>
                  )}
                </dl>
              </div>
              {product.description && (
                <div className="col-12 pt-2 border-top">
                  <span className="text-secondary small">Description</span>
                  <p className="mb-0 small">{product.description}</p>
                </div>
              )}
            </div>
          </ProducerSectionCard>

          {/* Factory / batch link */}
          {product.factory && (
            <ProducerSectionCard title="Manufacturing" className="mb-4">
              <dl className="row mb-0 small">
                <dt className="col-3 text-secondary fw-normal">Factory</dt>
                <dd className="col-9 mb-0">{product.factory.name} {product.factory.isVerified ? <span className="badge bg-success">Verified</span> : null}</dd>
              </dl>
              <Link href="/producer/batches" className="btn btn-outline-secondary btn-sm mt-2 radius-12">
                View batches
              </Link>
            </ProducerSectionCard>
          )}

          {/* Specifications (specJson) */}
          {product.specJson && typeof product.specJson === "object" && Object.keys(product.specJson).length > 0 && (
            <ProducerSectionCard title="Specifications" className="mb-4">
              <dl className="row mb-0 small">
                {Object.entries(product.specJson).filter(([k]) => k !== "textFingerprintHash").map(([key, val]) => (
                  <React.Fragment key={key}>
                    <dt className="col-4 text-secondary fw-normal">{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                    <dd className="col-8 mb-1">{String(val)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </ProducerSectionCard>
          )}

          {/* Documents / Evidence */}
          <ProducerSectionCard title="Documents & evidence" className="mb-4">
            {proofs.length === 0 ? (
              <p className="text-muted small mb-0">No proof documents attached.</p>
            ) : (
              <div className="row g-3">
                {proofs.map((p) => (
                  <div key={p.id} className="col-sm-6 col-md-4 col-lg-3">
                    <div className="card radius-12 h-100 overflow-hidden">
                      {p.media?.url && (p.media?.type === "IMAGE" || (p.media?.mimeType || "").startsWith("image/")) ? (
                        <a href={p.media.url} target="_blank" rel="noopener noreferrer" className="d-block" style={{ height: 120, background: "#f0f0f0" }}>
                          <img src={p.media.url} alt="" className="w-100 h-100" style={{ objectFit: "cover" }} />
                        </a>
                      ) : (
                        <div className="card-body py-3 d-flex flex-column align-items-center" style={{ minHeight: 100 }}>
                          <Icon icon="solar:file-outline" className="text-muted mb-1" style={{ fontSize: "1.5rem" }} />
                          <span className="small text-center">{PROOF_TYPE_LABELS[p.proofType] || p.proofType}</span>
                          {p.media?.url && (
                            <a href={p.media.url} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm p-0 mt-1">
                              Download
                            </a>
                          )}
                        </div>
                      )}
                      <div className="card-footer py-1 px-2 small text-muted text-center bg-transparent border-0">
                        {PROOF_TYPE_LABELS[p.proofType] || p.proofType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProducerSectionCard>

          {/* Review notes */}
          {(product.reviewNotes || (product.status === "APPROVED" && product.reviewedAt)) && (
            <ProducerSectionCard title="Review" className="mb-4">
              {product.status === "REJECTED" && product.reviewNotes && (
                <div className="mb-2">
                  <span className="text-danger small fw-medium">Rejection reason / required corrections</span>
                  <p className="mb-0 small">{product.reviewNotes}</p>
                </div>
              )}
              {product.status === "APPROVED" && product.reviewedAt && (
                <p className="small text-muted mb-0">
                  Approved on {formatDate(product.reviewedAt)}.
                  {product.reviewNotes && <span className="d-block mt-1">{product.reviewNotes}</span>}
                </p>
              )}
            </ProducerSectionCard>
          )}

          {/* Create batch — only when product is approved */}
          {(product.status === "APPROVED" || product.status === "ACTIVE") && (
            <ProducerSectionCard title="Create batch">
              <p className="text-muted small mb-3">
                Add a new batch for this product. After creating, you can generate and export codes from the batch page.
              </p>
              <div className="row g-3">
                <div className="col-md-3">
                  <label htmlFor="batchNo" className="form-label fw-medium">Batch No</label>
                  <input
                    id="batchNo"
                    type="text"
                    className="form-control radius-12"
                    placeholder="e.g. BATCH-2025-001"
                    value={batchForm.batchNo}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNo: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="mfgDate" className="form-label fw-medium">MFG Date</label>
                  <input
                    id="mfgDate"
                    type="date"
                    className="form-control radius-12"
                    value={batchForm.mfgDate}
                    onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
                    aria-label="Manufacturing date"
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="expDate" className="form-label fw-medium">EXP Date</label>
                  <input
                    id="expDate"
                    type="date"
                    className="form-control radius-12"
                    value={batchForm.expDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expDate: e.target.value })}
                    aria-label="Expiry date"
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="qtyPlanned" className="form-label fw-medium">Qty Planned</label>
                  <input
                    id="qtyPlanned"
                    type="number"
                    min="1"
                    className="form-control radius-12"
                    placeholder="e.g. 500"
                    value={batchForm.qtyPlanned}
                    onChange={(e) => setBatchForm({ ...batchForm, qtyPlanned: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="btn btn-primary radius-12"
                  onClick={createBatch}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-1" /> Creating…</>
                  ) : (
                    <><Icon icon="solar:add-circle-outline" className="me-1" /> Create Batch</>
                  )}
                </button>
              </div>
            </ProducerSectionCard>
          )}
        </>
      )}
    </ProducerPageShell>
    </>
  );
}
