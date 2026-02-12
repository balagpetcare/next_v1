"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const DOC_TYPES = [
  { value: "NID_FRONT", label: "NID Front" },
  { value: "NID_BACK", label: "NID Back" },
  { value: "SELFIE_WITH_NID", label: "Selfie with NID" },
  { value: "TRADE_LICENSE", label: "Trade License" },
  { value: "INCORPORATION_CERT", label: "Incorporation Certificate" },
  { value: "OTHER", label: "Other" },
];

export default function ProducerKycPage() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("TRADE_LICENSE");
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    try {
      setError(null);
      const res = await apiGet("/api/v1/producer/kyc/status");
      setStatusData(res?.data ?? null);
    } catch (e) {
      setError(e?.message || "Failed to load status");
      setStatusData(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please select a file");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("docType", uploadDocType);
      const res = await fetch(`${API_BASE}/api/v1/producer/kyc/documents`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Upload failed");
      setUploadFile(null);
      await loadStatus();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      const res = await apiPost("/api/v1/producer/kyc/submit", {});
      setStatusData(res?.data ?? statusData);
      await loadStatus();
    } catch (e) {
      setError(e?.message || "Submit failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const status = statusData?.status;
  const canSubmit = statusData?.canSubmit === true;
  const missingDocs = statusData?.missingDocs || [];
  const documents = statusData?.documents || [];

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Producer KYC</h2>
      {error && (
        <div className="alert alert-danger mb-3">
          {error}
        </div>
      )}
      {statusData && (
        <div className={`alert mb-3 ${status === "APPROVED" ? "alert-success" : status === "REJECTED" ? "alert-warning" : "alert-info"}`}>
          <strong>Status:</strong> {status}
          {status === "SUBMITTED" && " — Pending review"}
          {status === "REJECTED" && " — You can upload documents and submit again."}
        </div>
      )}

      {status === "NO_ORG" && (
        <p className="text-muted">No producer organization found. Please complete registration first.</p>
      )}

      {statusData && status !== "NO_ORG" && status !== "APPROVED" && (
        <>
          {missingDocs.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">Required</div>
              <ul className="list-group list-group-flush">
                {missingDocs.map((m, i) => (
                  <li key={i} className="list-group-item text-muted">{m}</li>
                ))}
              </ul>
            </div>
          )}

          {documents.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">Uploaded documents</div>
              <ul className="list-group list-group-flush">
                {documents.map((d) => (
                  <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>{d.docType}</span>
                    <span className="badge bg-secondary">{d.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(status === "DRAFT" || status === "REJECTED") && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title">Upload document</h6>
                <form onSubmit={handleUpload}>
                  <div className="row g-2 mb-2">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                      >
                        {DOC_TYPES.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <input
                        type="file"
                        className="form-control"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="col-md-4">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={uploading || !uploadFile}>
                        {uploading ? "Uploading…" : "Upload"}
                      </button>
                    </div>
                  </div>
                </form>
                <small className="text-muted">Allowed: JPEG, PNG, WebP, PDF. Max 15MB.</small>
              </div>
            </div>
          )}

          {canSubmit && (
            <div className="card mb-3">
              <div className="card-body">
                <button className="btn btn-success" onClick={handleSubmit} disabled={submitLoading}>
                  {submitLoading ? "Submitting…" : "Submit for review"}
                </button>
              </div>
            </div>
          )}

          {status === "SUBMITTED" && (
            <p className="text-muted">Your KYC has been submitted. You will be notified when the review is complete.</p>
          )}
        </>
      )}

      {status === "APPROVED" && (
        <p className="text-success">Your producer KYC is verified. You can use the dashboard and product features.</p>
      )}
    </div>
  );
}
