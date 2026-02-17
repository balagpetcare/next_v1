"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

type Location = { id: number; name: string; branch?: { id: number; name: string } };
type LotRow = { lotId: number; lotCode?: string; variantId?: number; variant?: { sku: string; title: string }; quantity?: number; expDate?: string; mfgDate?: string };
type ExpiringRow = { variantId?: number; variant?: { sku: string; title: string }; lotCode?: string; quantity?: number; expDate?: string; daysUntilExpiry?: number };

export default function OwnerInventoryBatchesPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [lots, setLots] = useState<LotRow[]>([]);
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLocations(list);
      if (list.length && !locationId) setLocationId(String(list[0].id));
    } catch (e) {
      setError((e as Error)?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (!locationId) {
      setLots([]);
      setExpiring([]);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    Promise.all([
      ownerGet<{ data: LotRow[] }>(`/api/v1/inventory/lots?locationId=${locationId}`).catch(() => ({ data: [] })),
      ownerGet<{ data: ExpiringRow[] }>(`/api/v1/inventory/expiring?locationId=${locationId}&daysAhead=90`).catch(() => ({ data: [] })),
    ]).then(([lotsRes, expRes]) => {
      if (cancelled) return;
      setLots(Array.isArray(lotsRes?.data) ? lotsRes.data : []);
      setExpiring(Array.isArray(expRes?.data) ? expRes.data : []);
    }).finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Batches"
        subtitle="Lot-wise stock and expiring items"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Batches", href: "/owner/inventory/batches" },
        ]}
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted">Location</label>
              <select
                className="form-select form-select-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadLocations} disabled={loading}>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!locationId ? (
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-muted py-5">
            Select a location to view lots and expiring items.
          </div>
        </div>
      ) : dataLoading ? (
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-muted py-5">
            Loading…
          </div>
        </div>
      ) : (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-header">
              <h6 className="mb-0">Lots at location</h6>
            </div>
            <div className="card-body p-0">
              {lots.length === 0 ? (
                <div className="p-24 text-center text-muted">No lots at this location.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Lot</th>
                        <th>Variant</th>
                        <th>Quantity</th>
                        <th>Mfg</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((row) => (
                        <tr key={row.lotId}>
                          <td>{row.lotCode ?? row.lotId}</td>
                          <td>{row.variant?.title ?? row.variant?.sku ?? row.variantId ?? "—"}</td>
                          <td>{row.quantity ?? 0}</td>
                          <td className="text-muted small">{formatDate(row.mfgDate)}</td>
                          <td className="text-muted small">{formatDate(row.expDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header">
              <h6 className="mb-0">Expiring (next 90 days)</h6>
            </div>
            <div className="card-body p-0">
              {expiring.length === 0 ? (
                <div className="p-24 text-center text-muted">No expiring items in the next 90 days.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>Lot</th>
                        <th>Quantity</th>
                        <th>Expiry</th>
                        <th>Days left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiring.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.variant?.title ?? row.variant?.sku ?? row.variantId ?? "—"}</td>
                          <td>{row.lotCode ?? "—"}</td>
                          <td>{row.quantity ?? 0}</td>
                          <td className="text-muted small">{formatDate(row.expDate)}</td>
                          <td>{row.daysUntilExpiry ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          Inventory overview
        </Link>
      </div>
    </div>
  );
}
