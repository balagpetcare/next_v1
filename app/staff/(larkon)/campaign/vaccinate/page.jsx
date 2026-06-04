"use client";

import Link from "next/link";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { loadCampaignStaffContext } from "@/lib/campaignApi";

export default function CampaignStaffVaccinateIndexPage() {
  const ctx = loadCampaignStaffContext();

  return (
    <CampaignStaffShell title="Vaccinate" backHref="/staff/campaign">
      {!ctx ? (
        <div className="alert alert-warning mb-3">
          Select a campaign location first. <Link href="/staff/campaign">Go to home</Link>
        </div>
      ) : null}
      <p className="text-muted">
        Open a booking from scan or lookup, then tap <strong>Vaccinate</strong> on a pet — or use Rabies / Cat Flu quick actions on the vaccination screen.
      </p>
      <div className="d-grid gap-2">
        <Link href="/staff/campaign/scan" className="btn btn-primary btn-lg">
          Scan QR
        </Link>
        <Link href="/staff/campaign/lookup" className="btn btn-outline-primary btn-lg">
          Manual search
        </Link>
      </div>
    </CampaignStaffShell>
  );
}
