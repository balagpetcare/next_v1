"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  adminMedicineCatalogImportApi,
  type MedicineImportApplySummary,
  type MedicineImportPreviewSummary,
} from "@/lib/adminApi";
import { PaginationBar } from "@/src/components/common/PaginationBar";
import { MedicineTableSlTd, MedicineTableSlTh } from "../../_components/MedicineUiHelpers";
import { medicineTableSl } from "../../_lib/medicineTableDisplay";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../../_lib/paths";

type BatchDetail = {
  id: number;
  status: string;
  filename: string;
  totalRows: number;
  previewVersion: number;
  fileSha256?: string;
  fileSizeBytes?: number;
  provider?: string;
  previewSummaryJson: MedicineImportPreviewSummary | null;
  applySummaryJson: MedicineImportApplySummary | null;
  errorMessage: string | null;
  confirmedAt: string | null;
  appliedAt: string | null;
  country?: { code: string; name: string };
  rowCountsByClassification?: Record<string, number>;
};

type RowItem = {
  id: number;
  rowNumber: number;
  classification: string;
  applyStatus: string;
  duplicateOfRowNumber: number | null;
  issuesJson: unknown;
  rawPayloadJson: Record<string, unknown>;
};

export default function AdminMedicineImportsBatchPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = Number(params?.batchId);
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [rowTab, setRowTab] = useState<"INVALID" | "DUPLICATE_IN_FILE" | "NEEDS_REVIEW" | "ALL">("ALL");
  const [rowPage, setRowPage] = useState(1);
  const [rowTotalPages, setRowTotalPages] = useState(1);
  const [rowTotal, setRowTotal] = useState(0);
  const rowLimit = 50;
  const [purgeModal, setPurgeModal] = useState(false);
  const [workflowModal, setWorkflowModal] = useState<"confirm" | "apply" | "cancel" | null>(null);
  const [ackNeedsReviewSkip, setAckNeedsReviewSkip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadBatch = useCallback(async () => {
    if (!batchId || Number.isNaN(batchId)) return;
    const res = await adminMedicineCatalogImportApi.batch(batchId);
    setBatch(res?.data as BatchDetail);
  }, [batchId]);

  const loadRows = useCallback(async () => {
    if (!batchId || Number.isNaN(batchId)) return;
    const res = await adminMedicineCatalogImportApi.rows(batchId, {
      page: rowPage,
      limit: rowLimit,
      classification: rowTab === "ALL" ? undefined : rowTab,
    });
    const data = res?.data as { items?: RowItem[]; pagination?: { totalPages?: number; total?: number } };
    setRows((data?.items ?? []) as RowItem[]);
    setRowTotalPages(Math.max(1, Number(data?.pagination?.totalPages) || 1));
    setRowTotal(Number(data?.pagination?.total) || 0);
  }, [batchId, rowTab, rowPage]);

  useEffect(() => {
    (async () => {
      if (!batchId || Number.isNaN(batchId)) {
        router.push(ADMIN_MEDICINE_IMPORTS);
        return;
      }
      try {
        setLoading(true);
        await loadBatch();
        setError("");
      } catch (e) {
        setError((e as Error)?.message || "Failed to load batch");
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId, router, loadBatch]);

  useEffect(() => {
    if (!batchId || Number.isNaN(batchId)) return;
    loadRows().catch(() => {});
  }, [batchId, loadRows]);

  useEffect(() => {
    setRowPage(1);
  }, [rowTab]);

  const summary = batch?.previewSummaryJson;

  const onPreview = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineCatalogImportApi.preview(batchId);
      await loadBatch();
      await loadRows();
    } catch (e) {
      setError((e as Error)?.message || "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!summary?.previewVersion) {
      setError("Run preview first");
      return;
    }
    if (summary.needsReview > 0 && !ackNeedsReviewSkip) {
      setError(
        `${summary.needsReview} row(s) need review and will be skipped on apply. Check the box below to confirm anyway, or fix the CSV and re-run preview.`
      );
      return;
    }
    setWorkflowModal("confirm");
  };

  const submitConfirm = async () => {
    if (!summary?.previewVersion) {
      setError("Run preview first");
      return;
    }
    if (summary.needsReview > 0 && !ackNeedsReviewSkip) {
      setError(
        `${summary.needsReview} row(s) need review and will be skipped on apply. Check the box below to confirm anyway, or fix the CSV and re-run preview.`
      );
      return;
    }
    try {
      setBusy(true);
      setError("");
      await adminMedicineCatalogImportApi.confirm(batchId, {
        previewVersion: summary.previewVersion,
        ...(summary.needsReview > 0 && ackNeedsReviewSkip ? { acknowledgeNeedsReviewSkip: true } : {}),
      });
      setWorkflowModal(null);
      await loadBatch();
    } catch (e) {
      setError((e as Error)?.message || "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  const submitApply = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineCatalogImportApi.apply(batchId);
      setWorkflowModal(null);
      await loadBatch();
      await loadRows();
    } catch (e) {
      setError((e as Error)?.message || "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineCatalogImportApi.cancel(batchId);
      setWorkflowModal(null);
      await loadBatch();
    } catch (e) {
      setError((e as Error)?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  const onPurge = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineCatalogImportApi.purgeBatch(batchId);
      setPurgeModal(false);
      router.push(ADMIN_MEDICINE_IMPORTS);
    } catch (e) {
      setError((e as Error)?.message || "Purge failed (requires medicine.catalog.governance and eligible batch status)");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !batch) {
    return (
      <div className="dashboard-main-body p-24 text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-muted small mt-3 mb-0">Loading import batch…</p>
      </div>
    );
  }

  const st = batch.status;
  const canPurge = ["CANCELLED", "FAILED", "UPLOADED", "PARSED", "PREVIEW_READY"].includes(st);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href={ADMIN_MEDICINE_IMPORTS} className="text-muted small">
          ← Import history
        </Link>
        <span className="text-muted small">·</span>
        <Link href={ADMIN_MEDICINE_BASE} className="text-muted small">
          Medicine Control Center
        </Link>
      </div>
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Import batch</h1>
          <p className="text-muted small mb-0">
            {batch.country?.code} {batch.country?.name} · {batch.filename}
          </p>
          <p className="small text-muted mb-0">Internal batch ref. {batch.id}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {["PREVIEW_READY", "PARSED", "FAILED"].includes(st) && (
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" disabled={busy} onClick={onPreview}>
              Re-run preview
            </button>
          )}
          {st === "PREVIEW_READY" && (
            <button type="button" className="btn btn-warning btn-sm radius-8" disabled={busy} onClick={() => void onConfirm()}>
              Confirm import
            </button>
          )}
          {st === "CONFIRMED" && (
            <button type="button" className="btn btn-success btn-sm radius-8" disabled={busy} onClick={() => setWorkflowModal("apply")}>
              Apply to catalog
            </button>
          )}
          {!["APPLIED", "PARTIALLY_APPLIED", "CANCELLED", "APPLYING"].includes(st) && (
            <button type="button" className="btn btn-outline-danger btn-sm radius-8" disabled={busy} onClick={() => setWorkflowModal("cancel")}>
              Cancel batch
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {batch.errorMessage && <div className="alert alert-warning radius-12 mb-3">{batch.errorMessage}</div>}

      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Workflow</h6>
          <p className="small text-muted mb-2">
            Typical path: <strong>PREVIEW_READY</strong> (after upload) → <strong>CONFIRMED</strong> (explicit admin confirm with
            matching preview version) → <strong>APPLIED</strong> / <strong>PARTIALLY_APPLIED</strong> / <strong>FAILED</strong>. Apply
            never runs until you confirm, then click Apply.
          </p>
          <p className="text-muted small mb-2">
            Current: <span className="badge bg-primary-subtle text-dark">{st}</span>
            {batch.confirmedAt && <> · Confirmed {new Date(batch.confirmedAt).toLocaleString()}</>}
            {batch.appliedAt && <> · Applied {new Date(batch.appliedAt).toLocaleString()}</>}
          </p>
          <div className="small text-muted border-top pt-2 mt-2">
            <div>
              <strong>File audit:</strong> {batch.filename}
              {batch.fileSha256 && (
                <>
                  {" "}
                  · SHA-256 <code className="small">{batch.fileSha256}</code>
                </>
              )}
              {batch.fileSizeBytes != null && <> · {(batch.fileSizeBytes / 1024).toFixed(1)} KB</>}
              {batch.provider && <> · provider {batch.provider}</>}
            </div>
            {batch.rowCountsByClassification && Object.keys(batch.rowCountsByClassification).length > 0 && (
              <div className="mt-1">
                <strong>Rows by classification (live):</strong>{" "}
                {Object.entries(batch.rowCountsByClassification)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className="row g-3 mb-4">
          {[
            ["Total rows", summary.totalRows],
            ["Valid rows", summary.validRows],
            ["Invalid rows", summary.invalidRows],
            ["Dup in file", summary.duplicateInFile],
            ["Already in DB", summary.duplicateInDb],
            ["New generics", summary.newGenerics],
            ["New dosage forms", summary.newDosageForms],
            ["New manufacturers", summary.newManufacturers],
            ["New brands", summary.newBrands],
            ["New presentations", summary.newPresentations],
            ["New country lines", summary.newCountryBrandRows],
            ["Updatable existing", summary.updatableExisting],
            ["Needs review", summary.needsReview],
          ].map(([label, val]) => (
            <div key={String(label)} className="col-6 col-md-4 col-lg-3">
              <div className="card border-0 bg-light radius-12 h-100">
                <div className="card-body p-16">
                  <div className="text-muted small">{label}</div>
                  <div className="h5 mb-0 fw-semibold">{val as number}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <div className="text-muted small">Preview version: {summary.previewVersion} (required to confirm)</div>
          </div>
          {st === "PREVIEW_READY" && summary.needsReview > 0 && (
            <div className="col-12">
              <div className="alert alert-warning radius-12 mb-0 py-2">
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="ackNeedsReview"
                    checked={ackNeedsReviewSkip}
                    onChange={(e) => setAckNeedsReviewSkip(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="ackNeedsReview">
                    I understand {summary.needsReview} NEEDS_REVIEW row(s) will be <strong>skipped</strong> on apply.
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {batch.applySummaryJson && (
        <div className="alert alert-info radius-12 mb-4">
          <strong>Apply result ({batch.applySummaryJson.finalStatus ?? "—"})</strong>
          <ul className="small mb-0 mt-2">
            <li>New / upserted lines: {batch.applySummaryJson.applied ?? 0}</li>
            <li>Existing listings refreshed: {batch.applySummaryJson.updatedExisting ?? 0}</li>
            <li>Skipped (total): {batch.applySummaryJson.skipped ?? 0}</li>
            <li className="text-muted">
              Skip breakdown — invalid: {batch.applySummaryJson.skippedInvalid ?? 0}, duplicate in file:{" "}
              {batch.applySummaryJson.skippedDuplicateInFile ?? 0}, needs review:{" "}
              {batch.applySummaryJson.skippedNeedsReview ?? 0}, other: {batch.applySummaryJson.skippedOther ?? 0}
            </li>
            <li>Failed rows: {batch.applySummaryJson.failed ?? 0}</li>
          </ul>
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h6 className="mb-0 fw-semibold">Row samples</h6>
        <div className="d-flex flex-wrap gap-2">
          {summary && summary.invalidRows > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary radius-8"
              onClick={() => adminMedicineCatalogImportApi.downloadInvalidCsv(batchId)}
            >
              Download invalid CSV
            </button>
          )}
          {summary && summary.needsReview > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary radius-8"
              onClick={() => adminMedicineCatalogImportApi.downloadClassificationCsv(batchId, "NEEDS_REVIEW")}
            >
              Download needs-review CSV
            </button>
          )}
        </div>
      </div>
      <ul className="nav nav-tabs mb-3">
        {(["ALL", "INVALID", "DUPLICATE_IN_FILE", "NEEDS_REVIEW"] as const).map((t) => (
          <li className="nav-item" key={t}>
            <button
              type="button"
              className={`nav-link ${rowTab === t ? "active" : ""}`}
              onClick={() => setRowTab(t)}
            >
              {t === "ALL" ? "All rows (paged)" : t.replace(/_/g, " ")}
            </button>
          </li>
        ))}
      </ul>
      <div className="card radius-12">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <MedicineTableSlTh />
                  <th>Line</th>
                  <th>Class</th>
                  <th>Apply</th>
                  <th>
                    Technical <span className="text-muted fw-normal text-lowercase small">(advanced)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <MedicineTableSlTd>{medicineTableSl(rowPage, rowLimit, idx)}</MedicineTableSlTd>
                    <td className="tabular-nums">{r.rowNumber}</td>
                    <td>
                      <span className="badge bg-light text-dark">{r.classification}</span>
                      {r.duplicateOfRowNumber != null && (
                        <span className="small text-muted ms-1">of #{r.duplicateOfRowNumber}</span>
                      )}
                    </td>
                    <td>{r.applyStatus}</td>
                    <td className="small align-top">
                      <details>
                        <summary className="text-muted" style={{ cursor: "pointer" }}>
                          Parser issues &amp; raw row
                        </summary>
                        <div className="mt-2 pt-2 border-top">
                          <div className="fw-semibold small mb-1">Issues</div>
                          <pre
                            className="small p-2 bg-light rounded text-break mb-3 mb-md-2"
                            style={{ whiteSpace: "pre-wrap", maxHeight: 140, overflow: "auto", fontSize: "0.75rem" }}
                          >
                            {JSON.stringify(r.issuesJson ?? [], null, 2)}
                          </pre>
                          <div className="fw-semibold small mb-1">Raw CSV fields</div>
                          <pre
                            className="small p-2 bg-light rounded text-break mb-0"
                            style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", fontSize: "0.75rem" }}
                          >
                            {JSON.stringify(r.rawPayloadJson ?? {}, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-transparent">
          <PaginationBar
            page={rowPage}
            pageSize={rowLimit}
            total={rowTotal}
            totalPages={rowTotalPages}
            disabled={busy}
            onPageChange={setRowPage}
            className="mt-0 pt-0 border-0"
            ariaLabel="Import batch row samples"
          />
        </div>
      </div>

      {["APPLIED", "PARTIALLY_APPLIED", "CONFIRMED", "APPLYING"].includes(st) && (
        <div className="alert alert-secondary radius-12 small mb-4">
          <strong>Purge is not available</strong> for this status. Purge only removes <em>staging</em> data for cancelled/failed/pre-apply batches.
          Catalog rows created by a completed or partial apply remain; adjust them via <Link href={`${ADMIN_MEDICINE_BASE}/listings`}>Medicines</Link>{" "}
          (deactivate/archive). Requires governance role when eligible.
        </div>
      )}

      {canPurge && (
        <div className="card border-danger radius-12 mb-4">
          <div className="card-body p-24">
            <h6 className="text-danger fw-semibold mb-2">Danger zone — purge staging only</h6>
            <ul className="small text-muted mb-3 ps-3">
              <li>
                <strong>Purge</strong> permanently deletes this batch record and <strong>all import staging rows</strong> from the database.
              </li>
              <li>
                It does <strong>not</strong> delete <code className="small">CountryMedicineBrand</code> or master data that was already applied
                from an earlier run.
              </li>
              <li>
                Action is <strong>audited</strong> (<code className="small">MEDICINE_IMPORT_BATCH_PURGE</code>). Requires{" "}
                <code className="small">medicine.catalog.governance</code> — without it, the API returns 403.
              </li>
              <li>If the button is visible but you get 403, your role can view imports but not purge; ask a governance admin.</li>
            </ul>
            <button type="button" className="btn btn-outline-danger btn-sm radius-8" disabled={busy} onClick={() => setPurgeModal(true)}>
              Purge staging batch
            </button>
          </div>
        </div>
      )}

      {purgeModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Purge import batch #{batch.id}?</h5>
                <button type="button" className="btn-close" onClick={() => setPurgeModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  This will delete batch <strong>#{batch.id}</strong> ({batch.filename}) and all associated <strong>staging</strong> rows.
                  Applied catalog medicines are unchanged. This action cannot be undone.
                </p>
                {batch.fileSha256 && (
                  <p className="text-muted mb-0">
                    File SHA-256: <code className="small">{batch.fileSha256}</code>
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={() => setPurgeModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm radius-8" disabled={busy} onClick={() => void onPurge()}>
                  {busy ? "Purging…" : "Purge permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {workflowModal === "confirm" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Confirm import batch #{batch.id}?</h5>
                <button type="button" className="btn-close" onClick={() => setWorkflowModal(null)} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  Confirming locks this preview version. You will still need to click <strong>Apply to catalog</strong> to write
                  reference rows.
                </p>
                {summary && (
                  <ul className="small text-muted mb-0">
                    <li>Preview version: {summary.previewVersion}</li>
                    {summary.needsReview > 0 && (
                      <li className="text-warning">
                        {summary.needsReview} row(s) need review and will be skipped unless you acknowledged below before opening this
                        dialog.
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={() => setWorkflowModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning btn-sm radius-8" disabled={busy} onClick={() => void submitConfirm()}>
                  {busy ? "Confirming…" : "Confirm import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {workflowModal === "apply" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Apply batch #{batch.id} to catalog?</h5>
                <button type="button" className="btn-close" onClick={() => setWorkflowModal(null)} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  This creates or updates <strong>global medicine reference</strong> rows from this batch. Existing linked prescriptions
                  are not removed.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={() => setWorkflowModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success btn-sm radius-8" disabled={busy} onClick={() => void submitApply()}>
                  {busy ? "Applying…" : "Apply to catalog"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {workflowModal === "cancel" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Cancel import batch #{batch.id}?</h5>
                <button type="button" className="btn-close" onClick={() => setWorkflowModal(null)} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  Cancelling stops this batch. Staging data may be retained until purged (if your role allows purge).
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={() => setWorkflowModal(null)}>
                  Keep batch
                </button>
                <button type="button" className="btn btn-outline-danger btn-sm radius-8" disabled={busy} onClick={() => void submitCancel()}>
                  {busy ? "Cancelling…" : "Cancel batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
