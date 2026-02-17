"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

type Location = { id: number; name: string; type?: string; branch?: { id: number; name: string } };
type InventoryItem = { locationId?: number; variantId?: number; quantity?: number; variant?: { sku: string; title: string }; location?: { name: string }; branch?: { name: string } };

export default function OwnerInventoryWarehousePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [summary, setSummary] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
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
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (!locationId) {
      setSummary([]);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    ownerGet<{ data: InventoryItem[] }>(`/api/v1/inventory?locationId=${locationId}&limit=100`)
      .then((res) => {
        if (cancelled) return;
        const items = res?.data ?? [];
        setSummary(Array.isArray(items) ? items : []);
      })
      .catch((e) => {
        if (!cancelled) setSummary([]);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Warehouse"
        subtitle="Location-based stock summary"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Warehouse", href: "/owner/inventory/warehouse" },
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

      <div className="card radius-12">
        <div className="card-body p-24">
          {!locationId ? (
            <div className="text-center text-muted py-5">
              Select a location to view stock summary.
            </div>
          ) : summaryLoading ? (
            <div className="text-center text-muted py-5">Loading…</div>
          ) : summary.length === 0 ? (
            <div className="text-center text-muted py-5">
              No stock at this location. Use Receipts to record opening stock.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, idx) => (
                    <tr key={row.variantId ?? idx}>
                      <td>{row.variant?.title ?? row.variantId ?? "—"}</td>
                      <td>{row.variant?.sku ?? "—"}</td>
                      <td>{row.quantity ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Link href="/owner/inventory/receipts" className="btn btn-outline-primary btn-sm me-2">
          Record receipt
        </Link>
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          Inventory overview
        </Link>
      </div>
    </div>
  );
}
