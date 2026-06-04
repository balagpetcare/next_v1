"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { campaignPublicBySlug, campaignPublicList, saveCampaignStaffContext } from "@/lib/campaignApi";

export default function CampaignStaffSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const campaignId = Number(searchParams.get("campaignId"));
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (slug) {
        setCampaign(await campaignPublicBySlug(slug));
        return;
      }
      if (Number.isFinite(campaignId)) {
        const list = await campaignPublicList();
        const found = list.find((c) => c.id === campaignId);
        if (found?.slug) setCampaign(await campaignPublicBySlug(found.slug));
      }
    } catch (e) {
      setError(e?.message || "Failed to load campaign");
    }
  }, [slug, campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const locations = campaign?.locations ?? [];

  return (
    <CampaignStaffShell title="Select location" backHref="/staff/campaign">
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {locations.length === 0 ? <p className="text-muted">No active locations for this campaign.</p> : null}
      <div className="d-grid gap-2">
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            className="btn btn-outline-primary text-start p-3"
            onClick={() => {
              saveCampaignStaffContext({
                campaignId: campaign.id,
                campaignName: campaign.name,
                campaignSlug: campaign.slug,
                locationId: loc.id,
                locationName: loc.name,
              });
              router.push("/staff/campaign");
            }}
          >
            <div className="fw-semibold">{loc.name}</div>
            {loc.address ? <div className="small text-muted">{loc.address}</div> : null}
          </button>
        ))}
      </div>
    </CampaignStaffShell>
  );
}
