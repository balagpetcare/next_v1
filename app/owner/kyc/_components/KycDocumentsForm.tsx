"use client";

import { useCallback, useState } from "react";
import ImageUploadWithCrop from "@/src/components/common/ImageUploadWithCrop";
import { uploadKycFile } from "../_lib/kycApi";
import type { KycDocumentSlot, KycDocumentType } from "../_types/kyc";

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
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

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

  const findDoc = useCallback(
    (backendType: string) => existingDocs.find((d) => String(d.type).toUpperCase() === String(backendType).toUpperCase()) ?? null,
    [existingDocs]
  );

  const handleUpload = useCallback(
    async (backendType: string, fileOrBlob: File | Blob) => {
      const file = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], "image.jpg", { type: "image/jpeg" });
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`File must be under ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        setUploadError("Allowed: JPEG, PNG, WebP, or PDF");
        return;
      }
      setUploadError(null);
      setUploadingType(backendType);
      try {
        await uploadKycFile(file, backendType);
        onUploadComplete();
      } catch (e) {
        setUploadError((e as Error).message || "Upload failed");
      } finally {
        setUploadingType(null);
      }
    },
    [onUploadComplete]
  );

  const slots = SLOTS_BY_TYPE[documentType];

  return (
    <div className="card border radius-16">
      <div className="card-body p-20">
        <div className="fw-semibold mb-12">Documents</div>
        <p className="text-sm text-secondary-light mb-16">
          Upload clear images (JPEG, PNG, WebP) or PDF. Max {MAX_SIZE_BYTES / 1024 / 1024}MB per file.
        </p>

        <div className="mb-16">
          <label className="form-label">Document Type</label>
          <select
            className="form-select radius-12"
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
          <div className="alert alert-danger radius-12 py-8 mb-16" role="alert">
            {uploadError}
          </div>
        )}

        <div className="row g-3">
          {slots.map(({ slot, label, backendType }) => {
            const doc = findDoc(backendType);
            const url = getDocUrl(doc);
            const uploaded = !!url;
            const uploading = uploadingType === backendType;

            return (
              <div key={backendType} className="col-12 col-lg-6">
                <div className="card border radius-16 h-100">
                  <div className="card-body p-16">
                    <div className="d-flex align-items-start justify-content-between gap-12 mb-8">
                      <div>
                        <div className="fw-semibold">{label}</div>
                        <span className={`text-xs fw-semibold ${uploaded ? "text-success-main" : "text-danger-main"}`}>
                          {uploaded ? "Uploaded" : "Missing"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-12">
                      {uploaded ? (
                        <div className="border radius-12 p-12">
                          <div className="d-flex gap-12 align-items-start flex-wrap">
                            <div
                              className="border radius-12 overflow-hidden bg-light d-flex align-items-center justify-content-center"
                              style={{ width: 180, height: 120 }}
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
                            <div className="flex-grow-1">
                              <a className="btn btn-light btn-sm radius-12 me-8" href={url} target="_blank" rel="noreferrer">
                                View
                              </a>
                              {!disabled && (
                                <div className="mt-8">
                                  <ImageUploadWithCrop
                                    label="Replace"
                                    aspectRatio={slot === "SELFIE" ? 1 : 1.6}
                                    existingImageUrl={url}
                                    output={{ maxWidth: 1800, maxHeight: 1800, quality: 0.92, mime: "image/jpeg" }}
                                    disabled={disabled || uploading}
                                    onImageCropped={(blob) => blob && handleUpload(backendType, blob)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ImageUploadWithCrop
                          label={`Upload ${label}`}
                          aspectRatio={slot === "SELFIE" ? 1 : 1.6}
                          output={{ maxWidth: 1800, maxHeight: 1800, quality: 0.92, mime: "image/jpeg" }}
                          disabled={disabled || uploading}
                          onImageCropped={(blob) => blob && handleUpload(backendType, blob)}
                        />
                      )}
                      {uploading && <div className="text-xs text-secondary-light mt-8">Uploading...</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
