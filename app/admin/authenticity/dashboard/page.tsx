"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function AdminAuthenticityDashboardPage() {
  const [stats, setStats] = useState({ batches: 0, serials: 0, issued: 0, activated: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [batchesRes, serialsRes] = await Promise.all([
          apiGet("/api/v1/batches?limit=1"),
          apiGet("/api/v1/serials?limit=1"),
        ]);
        const batchesTotal = batchesRes?.data?.pagination?.total || 0;
        const serialsTotal = serialsRes?.data?.pagination?.total || 0;

        const [issuedRes, activatedRes] = await Promise.all([
          apiGet("/api/v1/serials?status=ISSUED&limit=1"),
          apiGet("/api/v1/serials?status=ACTIVATED&limit=1"),
        ]);
        const issuedTotal = issuedRes?.data?.pagination?.total || 0;
        const activatedTotal = activatedRes?.data?.pagination?.total || 0;

        if (!cancelled) {
          setStats({
            batches: batchesTotal,
            serials: serialsTotal,
            issued: issuedTotal,
            activated: activatedTotal,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Dashboard</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Batches</h6>
                <div className="h4 mb-0">{stats.batches}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Serials</h6>
                <div className="h4 mb-0">{stats.serials}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Issued</h6>
                <div className="h4 mb-0">{stats.issued}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-1">Activated</h6>
                <div className="h4 mb-0">{stats.activated}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
