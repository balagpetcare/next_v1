"use client";

import { useEffect, useState, useMemo } from "react";
import { CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import DocumentUploader from "./DocumentUploader";

type Body = { id: number; name: string; abbreviation?: string | null; jurisdiction?: string | null };
type License = {
  id: number;
  licenseNumber: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  regulatoryBody?: Body;
  documents?: { id: number; documentType: string; url?: string }[];
};

const DEFAULT_DOC_TYPES = [
  { value: "VET_LICENSE", label: "Veterinary License/Registration" },
  { value: "VET_DEGREE", label: "Veterinary Degree" },
  { value: "GOV_ID_FRONT", label: "Government ID (Front)" },
  { value: "GOV_ID_BACK", label: "Government ID (Back)" },
  { value: "PROFILE_PHOTO", label: "Professional Photo" },
  { value: "ADDITIONAL", label: "Additional Document" },
];

function daysUntilExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export default function LicenseForm({
  countryCode,
  license,
  onUpdate,
  onRemove,
  onUploadDoc,
  onRemoveDoc,
  disabled,
}: {
  countryCode: string;
  license: License;
  onUpdate: (id: number, data: { licenseNumber?: string; issueDate?: string; expiryDate?: string }) => void;
  onRemove: (id: number) => void;
  onUploadDoc: (licenseId: number, file: File, documentType: string) => Promise<void>;
  onRemoveDoc: (docId: number) => void;
  disabled?: boolean;
}) {
  const [licenseNumber, setLicenseNumber] = useState(license.licenseNumber || "");
  const [issueDate, setIssueDate] = useState(
    license.issueDate ? license.issueDate.slice(0, 10) : ""
  );
  const [expiryDate, setExpiryDate] = useState(
    license.expiryDate ? license.expiryDate.slice(0, 10) : ""
  );
  const [docTypes] = useState(DEFAULT_DOC_TYPES);

  useEffect(() => {
    setLicenseNumber(license.licenseNumber || "");
    setIssueDate(license.issueDate ? license.issueDate.slice(0, 10) : "");
    setExpiryDate(license.expiryDate ? license.expiryDate.slice(0, 10) : "");
  }, [license.id, license.licenseNumber, license.issueDate, license.expiryDate]);

  const handleBlur = () => {
    onUpdate(license.id, { licenseNumber, issueDate: issueDate || undefined, expiryDate: expiryDate || undefined });
  };

  const documents = license.documents || [];
  const isComplete = !!licenseNumber?.trim();
  const daysExpiry = useMemo(() => daysUntilExpiry(expiryDate || null), [expiryDate]);
  const expiryBadgeVariant =
    daysExpiry === null
      ? "secondary"
      : daysExpiry < 0
        ? "danger"
        : daysExpiry <= 90
          ? "warning"
          : "success";

  return (
    <div className="card radius-12 mb-3 border">
      <div className="card-header bg-transparent border-0 pt-3 pb-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h6 className="mb-0">
            {license.regulatoryBody?.abbreviation || license.regulatoryBody?.name || "License"}
          </h6>
          {license.regulatoryBody?.jurisdiction && (
            <span className="badge bg-light text-dark border">
              {license.regulatoryBody.jurisdiction}
            </span>
          )}
          {isComplete ? (
            <span className="badge bg-success bg-opacity-10 text-success d-flex align-items-center gap-1">
              <CheckCircle size={12} /> Complete
            </span>
          ) : (
            <span className="badge bg-warning bg-opacity-10 text-warning d-flex align-items-center gap-1">
              <AlertCircle size={12} /> Incomplete
            </span>
          )}
          {daysExpiry !== null && (
            <span className={`badge bg-${expiryBadgeVariant} bg-opacity-10 text-${expiryBadgeVariant === "secondary" ? "dark" : expiryBadgeVariant}`}>
              {daysExpiry < 0 ? "Expired" : daysExpiry === 0 ? "Expires today" : `${daysExpiry} days until expiry`}
            </span>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={() => onRemove(license.id)}
            aria-label="Remove license"
          >
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label small">License number *</label>
            <input
              type="text"
              className="form-control"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Issue date</label>
            <input
              type="date"
              className="form-control"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Expiry date</label>
            <input
              type="date"
              className="form-control"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
            />
          </div>
        </div>
        <label className="form-label small text-muted">Documents for this license</label>
        <DocumentUploader
          documentTypes={docTypes}
          documents={documents}
          onUpload={(file, type) => onUploadDoc(license.id, file, type)}
          onRemove={onRemoveDoc}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
