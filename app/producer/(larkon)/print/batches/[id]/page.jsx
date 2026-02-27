"use client";
// Print Batch detail: Overview, Allocations, Export/Email. See backend-api docs/producer/PRINT_SYSTEM_STATUS.md.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useToast } from "@/src/hooks/useToast";
import { Icon } from "@iconify/react";
import ProducerPageShell from "../../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../../_components/ProducerSectionCard";
import {
  producerPrintBatchDetail,
  producerPrintBatchAllocate,
  producerPrintAllocationRevoke,
  producerMe,
} from "../../../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../../../_lib/apiErrorPopup";

const ACTION_OPTIONS = [
  { value: "PRINT", label: "Print (allocate only)" },
  { value: "DOWNLOAD_EXPORT", label: "Download CSV" },
  { value: "EMAIL_EXPORT", label: "Email CSV" },
];

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatActionType(t) {
  if (t === "PRINT") return "Print";
  if (t === "DOWNLOAD_EXPORT") return "Download";
  if (t === "EMAIL_EXPORT") return "Email";
  return t ?? "—";
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "short" }) + " " + d.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export default function ProducerPrintBatchDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const showRevokeUi = searchParams?.get("revoke") === "1";

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [me, setMe] = useState(null);
  const [allocStatusFilter, setAllocStatusFilter] = useState("");
  const [allocMethodFilter, setAllocMethodFilter] = useState("");
  const [revokingId, setRevokingId] = useState(null);

  // Export form state
  const [mode, setMode] = useState("AUTO");
  const [quantity, setQuantity] = useState(10);
  const [startSerial, setStartSerial] = useState("");
  const [endSerial, setEndSerial] = useState("");
  const [actionType, setActionType] = useState("PRINT");
  const [targetEmail, setTargetEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await producerPrintBatchDetail(id);
      setDetail(data ?? null);
    } catch (e) {
      showApiErrorPopup(normalizeApiError(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, showApiErrorPopup]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showRevokeUi) {
      producerMe().then(setMe).catch(() => setMe(null));
    }
  }, [showRevokeUi]);

  const isOwner = me?.isProducerOwner === true;
  const canShowRevoke = showRevokeUi && isOwner;

  const runAllocate = useCallback(
    async (payload) => {
      if (!id) return;
      setSubmitting(true);
      try {
        const result = await producerPrintBatchAllocate(id, payload);
        if (result?.download) {
          triggerBlobDownload(result.download.blob, result.download.filename);
          toast.success(`Issued serials ${result?.startSerial}–${result?.endSerial}. Download started.`);
        } else if (result?.emailSent) {
          toast.success(`Issued serials ${result?.startSerial}–${result?.endSerial}. Email sent to ${result.targetEmail}.`);
        } else {
          toast.success(`Issued serials ${result?.startSerial}–${result?.endSerial}.`);
        }
        await load();
      } catch (e) {
        showApiErrorPopup(normalizeApiError(e));
      } finally {
        setSubmitting(false);
      }
    },
    [id, load, showApiErrorPopup, toast]
  );

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!id) return;

    const isExport = actionType === "DOWNLOAD_EXPORT" || actionType === "EMAIL_EXPORT";
    if (actionType === "EMAIL_EXPORT" && !targetEmail?.trim()) {
      toast.error("Email address is required for email export.");
      return;
    }
    if (mode === "AUTO") {
      const q = Math.max(1, parseInt(quantity, 10) || 1);
      if (!Number.isInteger(q) || q < 1) {
        toast.error("Enter a valid quantity.");
        return;
      }
    } else {
      const start = parseInt(startSerial, 10);
      const end = parseInt(endSerial, 10);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        toast.error("Enter valid start and end serials (1-based, start ≤ end).");
        return;
      }
    }

    const payload = {
      mode,
      actionType,
      fileType: isExport ? "CSV" : undefined,
      targetEmail: actionType === "EMAIL_EXPORT" ? targetEmail?.trim() : undefined,
    };
    if (mode === "AUTO") {
      payload.quantity = Math.max(1, parseInt(quantity, 10) || 1);
    } else {
      payload.startSerial = parseInt(startSerial, 10);
      payload.endSerial = parseInt(endSerial, 10);
    }
    await runAllocate(payload);
  };

  const handleQuickAllocate = (qty, action, email = null) => {
    if (remainingCount <= 0) return;
    const payload = {
      mode: "AUTO",
      quantity: Math.min(qty, remainingCount),
      actionType: action,
      fileType: "CSV",
      targetEmail: action === "EMAIL_EXPORT" ? email : undefined,
    };
    if (action === "EMAIL_EXPORT" && !email?.trim()) {
      toast.error("Enter an email address first.");
      return;
    }
    runAllocate(payload);
  };

  const handleRevoke = useCallback(
    async (allocationId, startSerial, endSerial) => {
      if (!id || !allocationId || !window.confirm(`Revoke issued serials ${startSerial}–${endSerial}? Codes will be cleared of issuance data; next allocation will continue from the current serial.`)) return;
      setRevokingId(allocationId);
      try {
        await producerPrintAllocationRevoke(id, allocationId, { reason: "Revoked from Print Batch detail (dev)" });
        toast.success(`Revoked serials ${startSerial}–${endSerial}.`);
        await load();
      } catch (e) {
        showApiErrorPopup(normalizeApiError(e));
      } finally {
        setRevokingId(null);
      }
    },
    [id, load, showApiErrorPopup, toast]
  );

  const batch = detail?.batch;
  const totalCodes = detail?.totalCodes ?? 0;
  const allocatedCount = detail?.allocatedCount ?? 0;
  const remainingCount = detail?.remainingCount ?? 0;
  const nextAvailableSerial = detail?.nextAvailableSerial ?? null;
  const rawLogs = Array.isArray(detail?.allocationLogs) ? detail.allocationLogs : [];
  const allocationLogs = rawLogs.filter((log) => {
    if (allocStatusFilter && log.status !== allocStatusFilter) return false;
    if (allocMethodFilter && log.actionType !== allocMethodFilter) return false;
    return true;
  });

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="Print Batch"
        breadcrumbs={[
          { label: "Producer", href: "/producer" },
          { label: "Print", href: "/producer/print/batches" },
          { label: "Batches", href: "/producer/print/batches" },
          { label: id ? `Batch #${id}` : "…" },
        ]}
        actions={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {detail && (
              <>
                <span className="badge bg-secondary radius-12">Remaining: {remainingCount}</span>
                <span className="badge bg-dark radius-12">Next: {nextAvailableSerial ?? "—"}</span>
              </>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm radius-12"
              onClick={load}
              disabled={loading}
              aria-label="Refresh"
            >
              <Icon icon="solar:refresh-outline" className="me-1" aria-hidden />
              Refresh
            </button>
            <Link href="/producer/print/batches" className="btn btn-outline-primary btn-sm radius-12">
              Back to batches
            </Link>
          </div>
        }
      >
        {loading ? (
          <ProducerSectionCard title="Batch detail">
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm" /> Loading…
            </div>
          </ProducerSectionCard>
        ) : !detail ? (
          <ProducerSectionCard title="Batch detail">
            <p className="text-muted mb-0">Batch not found or you don’t have access.</p>
            <Link href="/producer/print/batches" className="btn btn-outline-primary btn-sm radius-12 mt-3">
              Back to batches
            </Link>
          </ProducerSectionCard>
        ) : (
          <>
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "allocations" ? "active" : ""}`}
                  onClick={() => setActiveTab("allocations")}
                >
                  Allocations
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "export" ? "active" : ""}`}
                  onClick={() => setActiveTab("export")}
                >
                  Export / Email
                </button>
              </li>
            </ul>

            {activeTab === "overview" && (
              <ProducerSectionCard title="Overview" className="mb-4">
                <p className="text-muted small mb-3">
                  {batch?.product?.productName ?? "—"} · Batch {batch?.batchNo ?? "—"}
                </p>
                <div className="row g-3 mb-3">
                  <div className="col-6 col-md-3">
                    <div className="card bg-light border-0 radius-12 h-100">
                      <div className="card-body py-3">
                        <div className="small text-muted">Total</div>
                        <div className="h4 mb-0">{totalCodes}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card bg-light border-0 radius-12 h-100">
                      <div className="card-body py-3">
                        <div className="small text-muted">Issued</div>
                        <div className="h4 mb-0">{allocatedCount}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card bg-light border-0 radius-12 h-100">
                      <div className="card-body py-3">
                        <div className="small text-muted">Remaining</div>
                        <div className="h4 mb-0">{remainingCount}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card bg-light border-0 radius-12 h-100">
                      <div className="card-body py-3">
                        <div className="small text-muted">Next serial</div>
                        <div className="h4 mb-0">{nextAvailableSerial != null ? String(nextAvailableSerial) : "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="small text-muted mb-1">Progress</div>
                <div className="progress radius-12" style={{ height: "8px" }}>
                  <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{ width: totalCodes ? `${(allocatedCount / totalCodes) * 100}%` : "0%" }}
                    aria-valuenow={allocatedCount}
                    aria-valuemin={0}
                    aria-valuemax={totalCodes}
                  />
                </div>
              </ProducerSectionCard>
            )}

            {activeTab === "allocations" && (
              <ProducerSectionCard title="Issuance history" className="mb-4">
                {rawLogs.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <select
                      className="form-select form-select-sm radius-12"
                      style={{ width: "auto" }}
                      value={allocStatusFilter}
                      onChange={(e) => setAllocStatusFilter(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option value="ISSUED">Issued</option>
                      <option value="REVOKED">Revoked</option>
                    </select>
                    <select
                      className="form-select form-select-sm radius-12"
                      style={{ width: "auto" }}
                      value={allocMethodFilter}
                      onChange={(e) => setAllocMethodFilter(e.target.value)}
                    >
                      <option value="">All methods</option>
                      <option value="PRINT">Print</option>
                      <option value="DOWNLOAD_EXPORT">Download</option>
                      <option value="EMAIL_EXPORT">Email</option>
                    </select>
                  </div>
                )}
                {allocationLogs.length === 0 ? (
                  <p className="text-muted mb-0">No allocations yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm align-middle radius-12">
                      <thead className="table-light">
                        <tr>
                          <th>Status</th>
                          <th>Method</th>
                          <th>Who</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Qty</th>
                          <th>Email</th>
                          <th>Date</th>
                          {canShowRevoke ? <th className="text-end">Action</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {allocationLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <span className={`badge radius-12 ${log.status === "ISSUED" ? "bg-success" : "bg-secondary"}`}>
                                {log.status === "ISSUED" ? "Issued" : "Revoked"}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border radius-12">{formatActionType(log.actionType)}</span>
                            </td>
                            <td>{log.allocatedBy?.displayName ?? "—"}</td>
                            <td>{log.startSerial}</td>
                            <td>{log.endSerial}</td>
                            <td>{log.quantity}</td>
                            <td>{log.targetEmail ?? "—"}</td>
                            <td>{formatDate(log.createdAt)}</td>
                            {canShowRevoke ? (
                              <td className="text-end">
                                {log.status === "ISSUED" ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm radius-12"
                                    disabled={revokingId !== null}
                                    onClick={() => handleRevoke(log.id, log.startSerial, log.endSerial)}
                                  >
                                    {revokingId === log.id ? (
                                      <span className="spinner-border spinner-border-sm" aria-hidden />
                                    ) : (
                                      "Revoke"
                                    )}
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ProducerSectionCard>
            )}

            {activeTab === "export" && (
              <ProducerSectionCard title="Allocate &amp; export" className="mb-4">
                {remainingCount === 0 ? (
                  <div className="alert alert-warning mb-3 radius-12">
                    No serials remaining. Allocation and export are disabled for this batch.
                  </div>
                ) : null}
                <p className="text-muted small mb-3">
                  Issuing serials reserves them; they cannot be allocated again. Choose Print (log only), Download CSV, or Email CSV.
                </p>
                {remainingCount > 0 && (
                  <div className="mb-3 d-flex flex-wrap gap-2 align-items-center">
                    <span className="small text-muted me-1">Quick:</span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm radius-12"
                      disabled={submitting || remainingCount < 100}
                      onClick={() => handleQuickAllocate(100, "DOWNLOAD_EXPORT")}
                    >
                      Next 100 Download
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm radius-12"
                      disabled={submitting || remainingCount < 500}
                      onClick={() => handleQuickAllocate(500, "DOWNLOAD_EXPORT")}
                    >
                      Next 500 Download
                    </button>
                    {targetEmail?.trim() ? (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm radius-12"
                        disabled={submitting || remainingCount < 1000}
                        onClick={() => handleQuickAllocate(1000, "EMAIL_EXPORT", targetEmail.trim())}
                      >
                        Next 1000 Email
                      </button>
                    ) : null}
                  </div>
                )}
                <form onSubmit={handleAllocate}>
                  <div className="mb-3">
                    <label className="form-label">Mode</label>
                    <div className="d-flex gap-3">
                      <label className="form-check">
                        <input
                          type="radio"
                          name="mode"
                          className="form-check-input"
                          checked={mode === "AUTO"}
                          onChange={() => setMode("AUTO")}
                        />
                        <span className="form-check-label">Auto (quantity)</span>
                      </label>
                      <label className="form-check">
                        <input
                          type="radio"
                          name="mode"
                          className="form-check-input"
                          checked={mode === "RANGE"}
                          onChange={() => setMode("RANGE")}
                        />
                        <span className="form-check-label">Range (start–end)</span>
                      </label>
                    </div>
                  </div>
                  {mode === "AUTO" ? (
                    <div className="mb-3">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-control form-control-sm radius-12"
                        style={{ maxWidth: "120px" }}
                        min={1}
                        max={remainingCount || 999999}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      {remainingCount > 0 && (
                        <span className="text-muted small ms-2">Max {remainingCount} remaining</span>
                      )}
                    </div>
                  ) : (
                    <div className="row g-2 mb-3">
                      <div className="col-auto">
                        <label className="form-label small mb-0">Start serial</label>
                        <input
                          type="number"
                          className="form-control form-control-sm radius-12"
                          style={{ width: "100px" }}
                          min={1}
                          placeholder={nextAvailableSerial ?? "1"}
                          value={startSerial}
                          onChange={(e) => setStartSerial(e.target.value)}
                        />
                      </div>
                      <div className="col-auto">
                        <label className="form-label small mb-0">End serial</label>
                        <input
                          type="number"
                          className="form-control form-control-sm radius-12"
                          style={{ width: "100px" }}
                          min={1}
                          max={totalCodes}
                          placeholder={String(totalCodes)}
                          value={endSerial}
                          onChange={(e) => setEndSerial(e.target.value)}
                        />
                      </div>
                      <div className="col-auto d-flex align-items-end">
                        <span className="text-muted small">Next available: {nextAvailableSerial ?? "—"}</span>
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Action</label>
                    <select
                      className="form-select form-select-sm radius-12"
                      style={{ maxWidth: "220px" }}
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                    >
                      {ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {actionType === "EMAIL_EXPORT" && (
                    <div className="mb-3">
                      <label className="form-label">Email address</label>
                      <input
                        type="email"
                        className="form-control form-control-sm radius-12"
                        style={{ maxWidth: "320px" }}
                        placeholder="recipient@example.com"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm radius-12"
                    disabled={submitting || remainingCount <= 0}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" aria-hidden />
                        Allocating…
                      </>
                    ) : (
                      "Allocate"
                    )}
                  </button>
                </form>
              </ProducerSectionCard>
            )}
          </>
        )}
      </ProducerPageShell>
    </>
  );
}
