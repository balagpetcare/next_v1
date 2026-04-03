"use client";

import { useCallback, useRef, useState } from "react";
import { useImageCropper } from "@/src/media/cropper/useImageCropper";
import type { CropperConfig } from "@/src/media/cropper/types";
import { uploadKycFile } from "../_lib/kycApi";
import type { KycDocumentSlot, KycDocumentType } from "../_types/kyc";
import { FileImage, Upload, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const DOC_TYPE_OPTIONS: { value: KycDocumentType; label: string }[] = [
  { value: "NID", label: "National ID (NID)" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "TRADE_LICENSE", label: "Trade License" },
];

const SLOTS_BY_TYPE: Record<KycDocumentType, { slot: KycDocumentSlot; label: string; backendType: string }[]> = {
  NID: [
    { slot: "FRONT", label: "NID Front", backendType: "NID_FRONT" },
    { slot: "BACK", label: "NID Back", backendType: "NID_BACK" },
    { slot: "SELFIE", label: "Selfie with NID", backendType: "SELFIE_WITH_NID" },
  ],
  PASSPORT: [
    { slot: "FRONT", label: "Passport (main page)", backendType: "OTHER" },
    { slot: "SELFIE", label: "Selfie with Passport", backendType: "SELFIE_WITH_NID" },
  ],
  DRIVING_LICENSE: [
    { slot: "FRONT", label: "License Front", backendType: "OTHER" },
    { slot: "BACK", label: "License Back", backendType: "OTHER" },
    { slot: "SELFIE", label: "Selfie with License", backendType: "SELFIE_WITH_NID" },
  ],
  TRADE_LICENSE: [{ slot: "FRONT", label: "Trade License Document", backendType: "TRADE_LICENSE" }],
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Cropper config for KYC documents
const getKycCropperConfig = (slot: KycDocumentSlot): CropperConfig => ({
  mode: "fixed" as const,
  aspectRatio: slot === "SELFIE" ? 1 : 1.6,
  output: {
    format: "jpg" as const,
    quality: 0.92,
    maxWidth: 1800,
    maxHeight: 1800,
  },
  constraints: {
    maxFileMB: 10,
  },
  ui: {
    showGrid: true,
    allowRotate: true,
    allowFlip: false,
    allowZoom: true,
  },
  required: true,
});

function getDocUrl(doc: { url?: string; media?: { key?: string } } | null): string {
  if (!doc) return "";
  const raw = doc.url || "";
  if (!raw && doc.media?.key) {
    return `${API_BASE}/api/v1/files/${encodeURIComponent(doc.media.key)}`;
  }
  return String(raw).trim();
}

export interface KycDocumentsFormProps {
  documentType: KycDocumentType;
  onDocumentTypeChange: (t: KycDocumentType) => void;
  existingDocs: Array< { type: string; url?: string; media?: { key?: string } }>;
  onUploadComplete: () => void;
  disabled?: boolean;
}

export default function KycDocumentsForm({
  documentType,
  onDocumentTypeChange,
  existingDocs,
  onUploadComplete,
  disabled = false,
}: KycDocumentsFormProps) {
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { openCropper, CropperModal } = useImageCropper();

  const findDoc = useCallback(
    (backendType: string) => existingDocs.find((d) => String(d.type).toUpperCase() === String(backendType).toUpperCase()) ?? null,
    [existingDocs]
  );

  const handleFileSelect = useCallback(
    async (backendType: string, slot: KycDocumentSlot, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input
      e.target.value = "";

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setUploadError(`Please select a valid image file (JPEG, PNG, or WebP)`);
        return;
      }

      // Validate file size
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`File must be under ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
        return;
      }

      setUploadError(null);

      try {
        // Open crop modal
        const cropConfig = getKycCropperConfig(slot);
        const result = await openCropper(file, cropConfig);

        if (!result) {
          // User cancelled
          return;
        }

        // Upload cropped result
        setUploadingType(backendType);
        try {
          // Create File from cropped blob with proper name and type
          const uploadFile = new File(
            [result.blob],
            `kyc-${backendType.toLowerCase()}.jpg`,
            { type: "image/jpeg" }
          );

          await uploadKycFile(uploadFile, backendType);
          onUploadComplete();
        } catch (uploadError) {
          const error = uploadError as Error;
          console.error("Upload error:", error);
          setUploadError(error.message || "Upload failed. Please try again.");
        } finally {
          setUploadingType(null);
        }
      } catch (cropError) {
        console.error("Crop error:", cropError);
        setUploadError("Failed to process image. Please try again.");
      }
    },
    [openCropper, onUploadComplete]
  );

  const slots = SLOTS_BY_TYPE[documentType];

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom py-3">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary bg-opacity-10 text-primary p-2 rounded">
            <FileImage size={20} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold">Official Documents</h5>
            <small className="text-muted">Upload clear images (JPEG, PNG, WebP) or PDF • Max {MAX_SIZE_BYTES / 1024 / 1024}MB per file</small>
          </div>
        </div>
      </div>
      <div className="card-body p-4">
        <div className="mb-4">
          <label className="form-label fw-semibold">Select Document Type to Upload <span className="text-danger">*</span></label>
          <select
            className="form-select form-select-lg"
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value as KycDocumentType)}
            disabled={disabled}
          >
            {DOC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {uploadError && (
          <div className="alert alert-danger d-flex align-items-start gap-2 mb-4" role="alert">
            <AlertCircle size={20} className="flex-shrink-0 mt-1" />
            <div>
              <div className="fw-semibold mb-1">Upload Error</div>
              <div>{uploadError}</div>
            </div>
          </div>
        )}

        <div className="row g-4">
          {slots.map(({ slot, label, backendType }) => {
            const doc = findDoc(backendType);
            const url = getDocUrl(doc);
            const uploaded = !!url;
            const uploading = uploadingType === backendType;

            return (
              <div key={`${documentType}-${slot}-${backendType}`} className="col-12 col-md-6">
                <div className={`card h-100 ${uploaded ? "border-success bg-success bg-opacity-10" : "border-secondary bg-light"}`}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                      <div className="flex-grow-1">
                        <div className="fw-bold mb-1">{label} <span className="text-danger">*</span></div>
                        <small className="text-muted">
                          {slot === "SELFIE" ? "Hold your ID card next to your face" : "Clear photo of the document"}
                        </small>
                      </div>
                      {uploaded ? (
                        <span className="badge bg-success text-white d-flex align-items-center gap-1">
                          <CheckCircle2 size={14} /> Uploaded
                        </span>
                      ) : (
                        <span className="badge bg-secondary text-white">Required</span>
                      )}
                    </div>

                    <div>
                      {uploaded ? (
                        <div className="border rounded p-3 bg-white">
                          <div className="row g-3">
                            <div className="col-12 col-lg-5">
                              <div
                                className="border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center"
                                style={{ width: "100%", height: 120 }}
                              >
                                <img
                                  src={url}
                                  alt={label}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                            </div>
                            <div className="col-12 col-lg-7">
                              <a className="btn btn-sm btn-outline-secondary w-100 mb-2" href={url} target="_blank" rel="noreferrer">
                                View Full Size
                              </a>
                              {!disabled && (
                                <>
                                  <input
                                    ref={(el) => { fileInputRefs.current[backendType] = el; }}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="d-none"
                                    disabled={disabled || uploading}
                                    onChange={(e) => handleFileSelect(backendType, slot, e)}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary w-100"
                                    disabled={disabled || uploading}
                                    onClick={() => fileInputRefs.current[backendType]?.click()}
                                  >
                                    Replace Image
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded p-4 text-center bg-white">
                          <div className="mb-3">
                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded d-inline-flex">
                              <Upload size={28} />
                            </div>
                          </div>
                          <input
                            ref={(el) => { fileInputRefs.current[backendType] = el; }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="d-none"
                            disabled={disabled || uploading}
                            onChange={(e) => handleFileSelect(backendType, slot, e)}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={disabled || uploading}
                            onClick={() => fileInputRefs.current[backendType]?.click()}
                          >
                            <div>
                              <div className="fw-semibold mb-1">Click to upload {label}</div>
                              <small>Supports JPG, PNG, WebP</small>
                            </div>
                          </button>
                        </div>
                      )}
                      {uploading && (
                        <div className="d-flex align-items-center justify-content-center gap-2 mt-3 text-primary">
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <small className="fw-semibold">Uploading securely...</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {CropperModal}
    </div>
  );
}
