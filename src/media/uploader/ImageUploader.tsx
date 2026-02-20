"use client";

import React, { useRef, useState } from "react";
import { useImageCropper } from "../cropper";
import { getCropperConfig, type UseCaseKey } from "../cropper";
import type { CropperConfig, CropResult } from "../cropper";
import { uploadMedia } from "@/src/services/mediaUpload";

export interface ImageUploadMeta {
  id: number;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export interface ImageUploaderProps {
  /** Single file or multiple (e.g. product gallery) */
  multiple?: boolean;
  /** Use-case preset; if crop.enabled, opens cropper with this config */
  useCase?: UseCaseKey;
  /** Or pass full cropper config (overrides useCase when crop enabled) */
  cropperConfig?: CropperConfig;
  /** If true, open cropper before upload when crop is enabled for this config */
  cropEnabled?: boolean;
  /** Max file size in bytes */
  maxSizeBytes?: number;
  accept?: string;
  label?: string;
  disabled?: boolean;
  /** Current value: single = { id, url } | null, multiple = array */
  value?: ImageUploadMeta | ImageUploadMeta[] | null;
  /** Called after a file is uploaded (cropped if applicable). Single: (url, meta). Multiple: (urls, metas). */
  onUploaded?: (url: string, meta: ImageUploadMeta) => void;
  /** Called when the list of files/values changes (e.g. after remove). */
  onChange?: (value: ImageUploadMeta | ImageUploadMeta[] | null) => void;
  /** Optional success/error notifier (e.g. notify.success / notify.error) */
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  /** Help text below label */
  help?: string;
  /** Required indicator (e.g. asterisk) */
  required?: boolean;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export function ImageUploader({
  multiple = false,
  useCase = "generic",
  cropperConfig: cropperConfigProp,
  cropEnabled = true,
  maxSizeBytes = DEFAULT_MAX_BYTES,
  accept = "image/*",
  label = "Image",
  disabled = false,
  value,
  onUploaded,
  onChange,
  onSuccess,
  onError,
  help,
  required = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openCropper, CropperModal } = useImageCropper();

  const config = cropperConfigProp ?? getCropperConfig(useCase);
  const shouldCrop = cropEnabled && config != null;
  const acceptIncludesNonImage = accept !== "image/*" && accept.includes("pdf");

  const doUpload = async (file: File | Blob, meta?: { width?: number; height?: number; format?: string; size?: number }) => {
    setError(null);
    setUploading(true);
    try {
      const result = await uploadMedia(file, file instanceof File ? file.name : undefined);
      const uploadMeta: ImageUploadMeta = {
        id: result.id,
        url: result.url,
        width: meta?.width,
        height: meta?.height,
        format: meta?.format,
        size: meta?.size,
      };
      onUploaded?.(result.url, uploadMeta);
      onSuccess?.("Image updated successfully");
      if (multiple && Array.isArray(value)) {
        onChange?.([...value, uploadMeta]);
      } else if (!multiple) {
        onChange?.(uploadMeta);
      } else {
        onChange?.([uploadMeta]);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Upload failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const maxMb = maxSizeBytes / (1024 * 1024);
    for (let i = 0; i < (multiple ? files.length : 1); i++) {
      const file = files[i];
      if (!file) continue;
      const isImage = file.type.startsWith("image/");
      if (!isImage && !acceptIncludesNonImage) {
        setError("Please select an image file");
        onError?.("Please select an image file");
        break;
      }
      if (file.size > maxSizeBytes) {
        setError(`File size must be less than ${maxMb.toFixed(0)}MB`);
        onError?.(`File size must be less than ${maxMb.toFixed(0)}MB`);
        break;
      }

      if (shouldCrop && isImage) {
        const result = await openCropper(file, config);
        if (result) {
          await doUpload(result.blob, {
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.size,
          });
        }
      } else {
        await doUpload(file);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (item: ImageUploadMeta) => {
    if (multiple && Array.isArray(value)) {
      const next = value.filter((v) => v.id !== item.id);
      onChange?.(next.length ? next : null);
    } else {
      onChange?.(null);
    }
    setError(null);
  };

  const displayValue = value == null ? (multiple ? [] : null) : Array.isArray(value) ? value : [value];
  const list = Array.isArray(displayValue) ? displayValue : displayValue ? [displayValue] : [];

  return (
    <div className="mb-3">
      {label && (
        <label className="form-label fw-semibold mb-2">
          {label} {(required || config?.required) && <span className="text-danger">*</span>}
        </label>
      )}
      {help && (
        <small className="text-muted d-block mb-2" style={{ fontSize: 12 }}>
          {help}
        </small>
      )}

      <div className="d-flex flex-wrap gap-2 align-items-start">
        {list.map((item) => (
          <div
            key={item.id}
            className="position-relative border radius-12 overflow-hidden flex-shrink-0"
            style={{ width: 120, height: 120, background: "#f8f9fa" }}
          >
            <img
              src={item.url}
              alt={label}
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
            {!disabled && (
              <button
                type="button"
                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 radius-12"
                onClick={() => handleRemove(item)}
                title="Remove"
                aria-label="Remove"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {(!multiple && list.length < 1) || (multiple && true) ? (
          <div
            className="border radius-12 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 120,
              height: 120,
              borderStyle: "dashed",
              background: "#f8f9fa",
              cursor: disabled || uploading ? "not-allowed" : "pointer",
              opacity: disabled || uploading ? 0.7 : 1,
            }}
            onClick={() => !disabled && !uploading && inputRef.current?.click()}
          >
            {uploading ? (
              <span className="spinner-border spinner-border-sm text-primary" role="status" />
            ) : (
              <i className="ri-upload-cloud-2-line text-secondary" style={{ fontSize: 32 }} />
            )}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || uploading}
        onChange={handleFileSelect}
        className="d-none"
      />

      {error && (
        <div className="alert alert-danger radius-8 mt-2 py-2 small">
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}

      {CropperModal}
    </div>
  );
}
