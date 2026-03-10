"use client";

import { useState, useRef } from "react";
import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";

type DocType = { value: string; label: string };
type Doc = { id: number; documentType: string; url?: string };

function isImageType(documentType: string): boolean {
  const imageTypes = [
    "PROFILE_PHOTO",
    "DOCTOR_PHOTO",
    "NID_FRONT",
    "NID_BACK",
    "GOV_ID_FRONT",
    "GOV_ID_BACK",
  ];
  return imageTypes.includes(documentType);
}

function getDocLabel(documentTypes: DocType[], documentType: string): string {
  return documentTypes.find((t) => t.value === documentType)?.label ?? documentType;
}

export default function DocumentUploader({
  documentTypes,
  documents,
  onUpload,
  onRemove,
  disabled,
}: {
  documentTypes: DocType[];
  documents: Doc[];
  onUpload: (file: File, documentType: string) => Promise<void>;
  onRemove: (docId: number) => void;
  disabled?: boolean;
}) {
  const [uploadType, setUploadType] = useState(documentTypes[0]?.value ?? "VET_LICENSE");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function doUpload(file: File) {
    if (!file || disabled) return;
    const valid = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!valid) return;
    setUploading(true);
    try {
      await onUpload(file, uploadType);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  return (
    <div className="mb-3">
      <label className="form-label small text-muted mb-2">Document type</label>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {documentTypes.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`btn btn-sm rounded-pill ${
              uploadType === t.value ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => setUploadType(t.value)}
            disabled={disabled}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`border rounded-3 border-2 d-flex flex-column align-items-center justify-content-center py-4 px-3 mb-3 ${
          dragOver ? "border-primary bg-primary bg-opacity-5" : "border-secondary border-dashed"
        }`}
        style={{ minHeight: 140 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="d-none"
          accept=".pdf,image/*"
          onChange={onFileSelect}
          disabled={uploading || disabled}
        />
        {uploading ? (
          <span className="text-muted small">Uploading...</span>
        ) : (
          <>
            <Upload size={32} className="text-muted mb-2" />
            <span className="small text-muted text-center">
              Drag & drop or click to upload
            </span>
            <span className="small text-muted mt-1">PDF or image</span>
          </>
        )}
      </div>

      {documents.length > 0 && (
        <div className="d-flex flex-wrap gap-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="d-flex align-items-center gap-2 rounded-3 border bg-light bg-opacity-50 px-3 py-2"
              style={{ minWidth: 200 }}
            >
              <div className="flex-shrink-0">
                {isImageType(d.documentType) ? (
                  <ImageIcon size={20} className="text-success" />
                ) : (
                  <FileText size={20} className="text-danger" />
                )}
              </div>
              <span className="small text-truncate flex-grow-1" title={getDocLabel(documentTypes, d.documentType)}>
                {getDocLabel(documentTypes, d.documentType)}
              </span>
              <span className="d-flex gap-1 flex-shrink-0">
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary py-0 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger py-0 px-2"
                  onClick={() => onRemove(d.id)}
                  disabled={disabled}
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
