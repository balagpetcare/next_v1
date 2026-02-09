"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function OrganizationPayoutsPage() {
  const params = useParams();
  const id = params?.id;
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/v1/owner/organizations/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await res.json().catch(() => null);
        if (!cancelled && res.ok && j?.success) setOrg(j.data);
        else if (!cancelled && !res.ok) setError(j?.message || "Failed to load organization");
      } catch (e) {
        if (!cancelled) setError(e?.message || "Request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const payoutStatus = org?.payoutStatus ?? "NOT_CONFIGURED";

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-16 mt-16">
        <div>
          <h4 className="mb-0 fw-bold">Payout settings</h4>
          <div className="text-muted mt-6" style={{ fontSize: 13 }}>
            <Link className="text-decoration-none" href="/owner">Owner</Link>{" "}
            <span className="mx-1">/</span>
            <Link className="text-decoration-none" href="/owner/organizations">Organizations</Link>{" "}
            <span className="mx-1">/</span>
            {org?.name ? (
              <>
                <Link className="text-decoration-none" href={`/owner/organizations/${id}`}>{org.name}</Link>
                <span className="mx-1">/</span>
              </>
            ) : null}
            <span>Payouts</span>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link className="btn btn-outline-secondary" href={`/owner/organizations/${id}`}>
            ← Back to organization
          </Link>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body p-24">Loading...</div>
        </div>
      ) : !org ? (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="alert alert-warning mb-0">Organization not found.</div>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="d-flex align-items-center gap-2 mb-16">
              <span className="fw-semibold">Payout status:</span>
              <span className={`badge ${payoutStatus === "CONFIGURED" ? "bg-success" : payoutStatus === "PENDING_APPROVAL" ? "bg-warning" : "bg-secondary"} radius-16 px-12 py-6`}>
                {payoutStatus}
              </span>
            </div>
            <p className="text-secondary mb-16">
              Banking and payout methods are configured on this page. Providers are enabled per country; you can add bank, mobile money, or wallet accounts once the payout module is fully implemented.
            </p>
            <div className="alert alert-light border mb-0">
              <div className="fw-semibold">Coming soon</div>
              <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                Payout account setup (encrypted storage, country-based providers, admin approval) will be available in a future release. Organization creation no longer requires banking information.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
