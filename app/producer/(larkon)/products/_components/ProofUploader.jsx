"use client";

 
import { useState } from "react";
import ProducerProofUpload from "../../../_components/ProducerProofUpload";

const ACCEPT = "image/*,.pdf";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Proof upload with validation (image/PDF only, max 15MB), help text, and upload progress.
 * Calls onAdd(proofType, file) only after validation; proofType empty sends "OTHER".
 * Parent should refresh proofs list after onAdd resolves.
 */
export default function ProofUploader({
  proofs = [],
  onAdd: onAddProp,
  disabled = false,
  canAdd = true,
  requiredMin = 1,
  selectId = "proofTypeSelect",
  toast,
  getErrorMessage,
  onApiError,
}) {
  const [uploading, setUploading] = useState(false);

  const validateFile = (file) => {
    if (!file) return { ok: false, message: "Please choose a file." };
    const type = file.type || "";
    const isImage = type.startsWith("image/");
    const isPdf = type === "application/pdf";
    if (!isImage && !isPdf) {
      return { ok: false, message: "Please choose an image or PDF file." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, message: "File is too large. Maximum size is 15 MB." };
    }
    return { ok: true };
  };

  const handleAdd = async (proofType, file) => {
    if (!onAddProp || !canAdd || disabled || uploading) return;
    const validation = validateFile(file);
    if (!validation.ok) {
      if (toast) toast.error(validation.message);
      return;
    }
    setUploading(true);
    try {
      await onAddProp(proofType && proofType.trim() ? proofType : "OTHER", file);
    } catch (e) {
      if (onApiError) onApiError(e);
      else if (toast && getErrorMessage) toast.error(getErrorMessage(e) || "Failed to add proof");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-muted small mb-2">
        Upload at least one document (label, packaging photo, or license). Image or PDF only, max 15 MB.
      </p>
      {uploading && (
        <div className="mb-2 d-flex align-items-center gap-2 text-primary small">
          <span className="spinner-border spinner-border-sm" aria-hidden />
          <span>Uploading…</span>
        </div>
      )}
      <ProducerProofUpload
        proofs={proofs}
        onAdd={canAdd && !disabled && !uploading ? handleAdd : undefined}
        showEvidenceSummary={true}
        requiredMin={requiredMin}
        disabled={disabled || uploading}
        selectId={selectId}
      />
    </div>
  );
}

export { ACCEPT, MAX_BYTES };
