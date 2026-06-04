"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import {
  campaignPublicList,
  campaignStaffQueue,
  loadCampaignStaffContext,
  summarizeQueue,
} from "@/lib/campaignApi";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function CampaignStaffHomePage() {
  const router = useRouter();
  const [ctx, setCtx] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setCtx(loadCampaignStaffContext());
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const list = await campaignPublicList();
      setCampaigns(list);
    } catch (e) {
      setError(e?.message || "Could not load campaigns");
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!ctx?.locationId) return;
    let cancelled = false;
    campaignStaffQueue(ctx.locationId)
      .then((q) => {
        if (!cancelled) setStats(summarizeQueue(q));
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ctx?.locationId]);

  return (
    <CampaignStaffShell title="Campaign staff">
      {ctx ? (
        <>
          <div className="text-muted small mb-2">{todayLabel()}</div>
          <div className="alert alert-success mb-3">
            <strong>{ctx.campaignName}</strong>
            <br />
            <span className="small">{ctx.locationName}</span>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <div className="card border-0 shadow-sm text-center p-3 h-100">
                <div className="text-muted small">Waiting</div>
                <div className="fs-3 fw-bold text-primary">{stats?.waiting ?? "—"}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="card border-0 shadow-sm text-center p-3 h-100">
                <div className="text-muted small">In progress</div>
                <div className="fs-3 fw-bold text-info">{stats?.inProgress ?? "—"}</div>
              </div>
            </div>
          </div>
          {stats?.queue?.length ? (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body py-2">
                <div className="small text-muted text-uppercase mb-2">Queue now</div>
                {stats.queue.slice(0, 3).map((item, i) => (
                  <div key={`${item.queueNumber}-${i}`} className="d-flex justify-content-between small py-1 border-bottom">
                    <span>
                      <strong>{item.queueNumber || "—"}</strong> {item.ownerName}
                    </span>
                    <span className="text-muted">{item.waitingMinutes ?? 0}m</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="d-grid gap-2">
            <Link href="/staff/campaign/scan" className="btn btn-primary btn-lg py-3">
              <i className="ri-qr-scan-2-line me-2" aria-hidden />
              Scan QR to check-in
            </Link>
            <Link href="/staff/campaign/lookup" className="btn btn-outline-primary btn-lg py-3">
              <i className="ri-search-line me-2" aria-hidden />
              Manual token / reference search
            </Link>
            <Link href="/staff/campaign/history" className="btn btn-outline-secondary btn-lg">
              <i className="ri-history-line me-2" aria-hidden />
              Vaccination history
            </Link>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm mt-3"
            onClick={() => {
              localStorage.removeItem("bpa_campaign_ctx");
              setCtx(null);
              router.refresh();
            }}
          >
            Change location
          </button>
        </>
      ) : (
        <>
          <p className="text-muted">Sign in with your staff account, then select an active campaign and location.</p>
          <Link href="/staff/login?returnTo=/staff/campaign" className="btn btn-outline-primary w-100 mb-3">
            Staff login
          </Link>
          {error ? <div className="alert alert-warning">{error}</div> : null}
          {campaigns.map((c) => (
            <div key={c.id} className="card border-0 shadow-sm mb-2">
              <div className="card-body">
                <h6 className="mb-1">{c.name}</h6>
                <p className="small text-muted mb-2">{c.slug}</p>
                <Link href={`/staff/campaign/setup?slug=${encodeURIComponent(c.slug)}`} className="btn btn-sm btn-primary">
                  Select &amp; pick location
                </Link>
              </div>
            </div>
          ))}
        </>
      )}
    </CampaignStaffShell>
  );
}
