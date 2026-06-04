"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import CertificatePreview from "@/src/bpa/campaign/staff/CertificatePreview";
import {
  campaignBookingPath,
  campaignCertificatePdfDownload,
  campaignPublicCertificate,
  campaignStaffGetBooking,
} from "@/lib/campaignApi";

export default function CampaignStaffCertificatePage() {
  const params = useParams();
  const bookingRef = decodeURIComponent(String(params?.bookingId ?? ""));
  const [booking, setBooking] = useState(null);
  const [certs, setCerts] = useState([]);
  const [error, setError] = useState("");
  const [previewToken, setPreviewToken] = useState(null);
  const [previewPet, setPreviewPet] = useState("");
  const [downloading, setDownloading] = useState("");

  const load = useCallback(async () => {
    try {
      const b = await campaignStaffGetBooking(bookingRef);
      setBooking(b);
      const tokens = (b.pets || [])
        .filter((p) => p.certificateToken)
        .map((p) => ({
          petName: p.name,
          token: p.certificateToken,
          status: p.vaccinationStatus,
        }));
      const details = await Promise.all(
        tokens.map(async (t) => {
          try {
            const data = await campaignPublicCertificate(t.token);
            return { ...t, data };
          } catch {
            return { ...t };
          }
        })
      );
      setCerts(details);
    } catch (e) {
      setError(e?.message || "Failed to load");
    }
  }, [bookingRef]);

  useEffect(() => {
    load();
  }, [load]);

  async function download(token) {
    setDownloading(token);
    setError("");
    try {
      await campaignCertificatePdfDownload(token);
    } catch (e) {
      setError(e?.message || "Download failed");
    } finally {
      setDownloading("");
    }
  }

  const refPath = booking ? campaignBookingPath(booking) : encodeURIComponent(bookingRef);

  return (
    <CampaignStaffShell title="Certificates" backHref={`/staff/campaign/booking/${refPath}`}>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {booking ? <p className="text-muted small mb-3">{booking.bookingRef}</p> : null}

      {certs.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-muted">No certificates yet.</p>
          <p className="small text-muted">Complete a vaccination to auto-generate a certificate.</p>
          <Link href={`/staff/campaign/vaccinate/${refPath}`} className="btn btn-success">
            Record vaccination
          </Link>
        </div>
      ) : null}

      <div className="d-grid gap-3">
        {certs.map((c) => (
          <div key={c.token} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="fw-semibold">{c.petName}</div>
                  <div className="small font-monospace text-muted">{c.token}</div>
                  {c.data?.vaccineType ? (
                    <div className="small text-muted mt-1">{c.data.vaccineType}</div>
                  ) : null}
                </div>
                <span className="badge bg-success">Generated</span>
              </div>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setPreviewToken(c.token);
                    setPreviewPet(c.petName);
                  }}
                >
                  <i className="ri-eye-line me-1" aria-hidden />
                  Preview
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={downloading === c.token}
                  onClick={() => download(c.token)}
                >
                  {downloading === c.token ? "Downloading…" : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link href={`/staff/campaign/booking/${refPath}`} className="btn btn-link mt-3">
        Back to booking
      </Link>

      {previewToken ? (
        <CertificatePreview token={previewToken} petName={previewPet} onClose={() => setPreviewToken(null)} />
      ) : null}
    </CampaignStaffShell>
  );
}
