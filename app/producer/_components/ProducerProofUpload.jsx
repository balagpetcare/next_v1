"use client";

import { useState, useMemo } from "react";
import { Icon } from "@iconify/react";

const PROOF_TYPES = [
  { value: "LABEL_FRONT", label: "Label (front)" },
  { value: "LABEL_BACK", label: "Label (back)" },
  { value: "PACKAGING_PHOTO_FRONT", label: "Packaging photo (front)" },
  { value: "MANUFACTURING_LICENSE", label: "Manufacturing license" },
  { value: "OTHER", label: "Other" },
];

const PROOF_TYPE_LABELS = Object.fromEntries(PROOF_TYPES.map((p) => [p.value, p.label]));

function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Single proof card: image thumbnail or PDF file card with optional preview modal.
 * proof: { id?, proofType, file?: string, media?: { url?, type?, mimeType? } }
 * pendingFile: { file: File, proofType } for not-yet-uploaded
 */
function ProofCard({ proof, pendingFile, onRemove, canRemove }) {
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const isImage = useMemo(() => {
    if (pendingFile) {
      const t = pendingFile.file?.type || "";
      return t.startsWith("image/");
    }
    const m = proof?.media;
    const type = (m?.type || m?.mimeType || "").toLowerCase();
    return type.includes("image") || (m?.url && /\.(jpe?g|png|gif|webp)/i.test(m.url));
  }, [proof, pendingFile]);

  const isPdf = useMemo(() => {
    if (pendingFile) return (pendingFile.file?.type || "") === "application/pdf";
    const m = proof?.media;
    return (m?.type || m?.mimeType || "").toLowerCase().includes("pdf");
  }, [proof, pendingFile]);

  const previewUrl = useMemo(() => {
    if (pendingFile?.file && isImage) return URL.createObjectURL(pendingFile.file);
    if (pendingFile?.file && isPdf) return URL.createObjectURL(pendingFile.file);
    return proof?.media?.url || null;
  }, [proof, pendingFile, isImage, isPdf]);

  const label = proof?.proofType ? (PROOF_TYPE_LABELS[proof.proofType] || proof.proofType) : (pendingFile && (PROOF_TYPE_LABELS[pendingFile.proofType] || pendingFile.proofType));
  const name = pendingFile?.file?.name || proof?.file || "Uploaded";

  return (
    <>
      <div className="card radius-12 overflow-hidden" style={{ width: 140 }}>
        {isImage && previewUrl ? (
          <div className="position-relative" style={{ height: 100, background: "#f0f0f0" }}>
            <img src={previewUrl} alt="" className="w-100 h-100" style={{ objectFit: "cover" }} />
            {canRemove && (
              <button
                type="button"
                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle p-0"
                style={{ width: 24, height: 24 }}
                onClick={() => onRemove?.(proof?.id ?? pendingFile)}
                aria-label="Remove"
              >
                <Icon icon="solar:close-circle-bold" />
              </button>
            )}
          </div>
        ) : (
          <div className="card-body py-2 px-2 d-flex flex-column align-items-center" style={{ minHeight: 100 }}>
            <Icon icon="solar:file-outline" className="text-muted mb-1" style={{ fontSize: "2rem" }} />
            <span className="small text-break text-center">{name}</span>
            {pendingFile?.file && (
              <span className="small text-muted">{formatFileSize(pendingFile.file.size)}</span>
            )}
            {isPdf && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 mt-1"
                onClick={() => setPdfPreviewOpen(true)}
              >
                Preview
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                className="btn btn-link btn-sm text-danger p-0 mt-1"
                onClick={() => onRemove?.(proof?.id ?? pendingFile)}
              >
                Remove
              </button>
            )}
          </div>
        )}
        <div className="card-footer py-1 px-2 small text-muted text-center bg-transparent border-0">
          {label}
        </div>
      </div>

      {pdfPreviewOpen && previewUrl && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setPdfPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="PDF preview"
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">PDF preview</h6>
                <button type="button" className="btn-close" onClick={() => setPdfPreviewOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body p-0" style={{ minHeight: "70vh" }}>
                <iframe title="PDF" src={previewUrl} className="w-100 h-100" style={{ minHeight: "70vh", border: 0 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Evidence pack summary: required docs with checkmarks.
 * proofs: array of { proofType } (uploaded).
 * Backend requires "at least one proof"; we show that and optionally which types are present.
 */
export function EvidenceSummary({ proofs = [], requiredMin = 1 }) {
  const count = proofs.length;
  const met = count >= requiredMin;
  return (
    <div className="card radius-12 bg-light mb-3">
      <div className="card-body py-2">
        <h6 className="mb-2 small fw-semibold">Evidence pack summary</h6>
        <ul className="list-unstyled small mb-0">
          <li className="d-flex align-items-center gap-2">
            {met ? (
              <Icon icon="solar:check-circle-bold" className="text-success" />
            ) : (
              <Icon icon="solar:close-circle-outline" className="text-warning" />
            )}
            <span>At least {requiredMin} proof document{requiredMin !== 1 ? "s" : ""} required — {met ? "met" : "add more"}</span>
          </li>
          {proofs.map((p, i) => (
            <li key={p.id || i} className="d-flex align-items-center gap-2 ms-4 mt-1">
              <Icon icon="solar:file-check-outline" className="text-success" />
              <span>{PROOF_TYPE_LABELS[p.proofType] || p.proofType}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Proof upload area: type select + file input, grid of ProofCards, optional EvidenceSummary.
 * proofs: uploaded list (from API).
 * pendingFiles: list of { file: File, proofType } not yet uploaded (optional; parent may upload immediately).
 * onAdd(proofType, file): called when user selects file.
 * onRemove(proofIdOrPending): optional; backend may not support delete — only for pending if no API.
 */
export default function ProducerProofUpload({
  proofs = [],
  pendingFiles = [],
  onAdd,
  onRemove,
  canRemove = false,
  showEvidenceSummary = true,
  requiredMin = 1,
  disabled = false,
  selectId = "proofTypeSelect",
}) {
  const allItems = useMemo(() => {
    const a = proofs.map((p) => ({ type: "uploaded", proof: p }));
    const b = pendingFiles.map((p, i) => ({ type: "pending", key: `p-${i}`, pendingFile: p }));
    return [...a, ...b];
  }, [proofs, pendingFiles]);

  return (
    <div>
      {showEvidenceSummary && (
        <EvidenceSummary proofs={proofs} requiredMin={requiredMin} />
      )}
      {!disabled && onAdd && (
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <select id={selectId} className="form-select radius-12" style={{ width: "auto" }}>
            {PROOF_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,.pdf"
            className="form-control radius-12"
            style={{ maxWidth: 240 }}
            onChange={(e) => {
              const file = e.target?.files?.[0];
              const select = document.getElementById(selectId);
              const proofType = select?.value || "OTHER";
              if (file) onAdd(proofType, file);
              e.target.value = "";
            }}
          />
        </div>
      )}
      <div className="d-flex flex-wrap gap-3">
        {allItems.map((item) =>
          item.type === "uploaded" ? (
            <ProofCard
              key={item.proof.id}
              proof={item.proof}
              canRemove={canRemove}
              onRemove={onRemove}
            />
          ) : (
            <ProofCard
              key={item.key}
              pendingFile={item.pendingFile}
              canRemove={!!onRemove}
              onRemove={onRemove}
            />
          )
        )}
      </div>
    </div>
  );
}

export { PROOF_TYPES, PROOF_TYPE_LABELS };
