"use client";

import { useEffect, useState } from "react";
import { campaignPublicCertificate, campaignCertificatePdfDownload } from "@/lib/campaignApi";

export default function CertificatePreview({ token, petName, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    campaignPublicCertificate(token)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not load certificate");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    try {
      await campaignCertificatePdfDownload(token);
    } catch (e) {
      setError(e?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center"
      style={{ zIndex: 1050, background: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <div className="bg-white w-100 rounded-top rounded-md shadow-lg" style={{ maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom sticky-top bg-white">
          <div>
            <div className="fw-semibold">Certificate preview</div>
            {petName ? <div className="small text-muted">{petName}</div> : null}
          </div>
          <button type="button" className="btn btn-sm btn-light" onClick={onClose} aria-label="Close">
            <i className="ri-close-line" aria-hidden />
          </button>
        </div>
        <div className="p-3">
          {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
          {!data && !error ? <p className="text-muted small">Loading certificate…</p> : null}
          {data ? (
            <div className="border rounded p-3 mb-3" style={{ borderColor: "#1a5f2a", borderWidth: 2 }}>
              <div className="text-center mb-3">
                <div className="text-success fw-bold">VACCINATION CERTIFICATE</div>
                <div className="small text-muted">{data.campaignName}</div>
              </div>
              <dl className="row small mb-0">
                <dt className="col-5 text-muted">Pet</dt>
                <dd className="col-7 fw-semibold">{data.petName}</dd>
                <dt className="col-5 text-muted">Owner</dt>
                <dd className="col-7">{data.ownerName}</dd>
                <dt className="col-5 text-muted">Vaccine</dt>
                <dd className="col-7">{data.vaccineType}</dd>
                <dt className="col-5 text-muted">Date</dt>
                <dd className="col-7">
                  {data.vaccinatedAt ? new Date(data.vaccinatedAt).toLocaleDateString() : "—"}
                </dd>
                <dt className="col-5 text-muted">Valid until</dt>
                <dd className="col-7">
                  {data.validUntil ? new Date(data.validUntil).toLocaleDateString() : "—"}
                </dd>
                <dt className="col-5 text-muted">Location</dt>
                <dd className="col-7">{data.location}</dd>
                <dt className="col-5 text-muted">Certificate ID</dt>
                <dd className="col-7 font-monospace" style={{ fontSize: "0.7rem" }}>
                  {data.certificateToken}
                </dd>
              </dl>
              {data.qrCodeImage ? (
                <div className="text-center mt-3">
                  { }
                  <img src={data.qrCodeImage} alt="Verification QR code" style={{ maxWidth: 120 }} />
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="d-grid gap-2">
            <button type="button" className="btn btn-success btn-lg" disabled={!token || downloading} onClick={downloadPdf}>
              {downloading ? "Downloading…" : "Download PDF"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
