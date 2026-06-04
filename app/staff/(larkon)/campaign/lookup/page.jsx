"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { loadCampaignStaffContext } from "@/lib/campaignApi";

export default function CampaignStaffLookupPage() {
  const router = useRouter();
  const ctx = loadCampaignStaffContext();
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    setError("");
    const id = ref.trim();
    if (!id) {
      setError("Enter a booking reference or QR token");
      return;
    }
    const normalized = /^VAC-/i.test(id) ? id.toUpperCase() : id;
    router.push(`/staff/campaign/booking/${encodeURIComponent(normalized)}`);
  }

  return (
    <CampaignStaffShell title="Manual search" backHref="/staff/campaign">
      {!ctx ? (
        <div className="alert alert-warning">
          Select campaign location on the home screen first.{" "}
          <Link href="/staff/campaign">Go to home</Link>
        </div>
      ) : null}
      <p className="text-muted small mb-3">
        Search by booking reference (e.g. <span className="font-monospace">VAC-ABC123</span>) or the 32-character QR token from the confirmation SMS.
      </p>
      <form onSubmit={submit}>
        <label className="form-label fw-semibold">Booking reference or QR token</label>
        <input
          className="form-control form-control-lg mb-2 font-monospace"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="VAC-ABC123 or a1b2c3d4…"
          autoComplete="off"
          inputMode="text"
        />
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <button type="submit" className="btn btn-primary btn-lg w-100 py-3">
          <i className="ri-search-line me-2" aria-hidden />
          Open booking
        </button>
      </form>
      <div className="mt-4 d-grid gap-2">
        <Link href="/staff/campaign/scan" className="btn btn-outline-primary">
          <i className="ri-qr-scan-2-line me-2" aria-hidden />
          Scan QR instead
        </Link>
      </div>
    </CampaignStaffShell>
  );
}
