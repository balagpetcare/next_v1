"use client";

import { useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function uploadMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Upload failed (${res.status})`);
  return { id: j.data?.id, url: j.data?.url };
}

export default function ImageUploader({
  label,
  value = null,
  onChange,
  onDelete,
  required = false,
  help = "",
  accept = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const result = await uploadMedia(file);
      onChange?.(result);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove this image?")) {
      onDelete?.();
      setError("");
    }
  };

  return (
    <div className="mb-24">
      <label className="form-label fw-semibold mb-8">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {help && (
        <small className="text-muted d-block mb-8" style={{ fontSize: "12px" }}>
          {help}
        </small>
      )}

      {value ? (
        <div className="position-relative">
          <div className="border radius-12 p-16" style={{ background: "#f8f9fa" }}>
            <div className="d-flex align-items-center gap-16">
              <div
                className="flex-shrink-0"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#e9ecef",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={value.url || value}
                  alt={label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = '<i class="ri-image-line" style="font-size: 48px; color: #6c757d;"></i>';
                  }}
                />
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold mb-2">{label}</div>
                <div className="text-muted mb-2" style={{ fontSize: "12px" }}>
                  {value.fileName || "Image uploaded"}
                </div>
                {!disabled && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary radius-12"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || disabled}
                    >
                      <i className="ri-edit-line me-1" />
                      Replace
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger radius-12"
                      onClick={handleDelete}
                      disabled={uploading || disabled}
                    >
                      <i className="ri-delete-bin-line me-1" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="border radius-12 p-24 text-center"
          style={{
            background: "#f8f9fa",
            borderStyle: "dashed",
            borderWidth: "2px",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            opacity: disabled || uploading ? 0.6 : 1,
          }}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <div className="spinner-border text-primary mb-2" role="status">
                <span className="visually-hidden">Uploading...</span>
              </div>
              <div className="text-muted">Uploading image...</div>
            </>
          ) : (
            <>
              <i className="ri-upload-cloud-2-line" style={{ fontSize: "48px", color: "#6c757d" }}></i>
              <div className="mt-2 fw-semibold">Click to upload {label}</div>
              <div className="text-muted" style={{ fontSize: "12px" }}>
                Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        style={{ display: "none" }}
      />

      {error && (
        <div className="alert alert-danger radius-8 mt-8 py-8" style={{ fontSize: "12px" }}>
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}
    </div>
  );
}
