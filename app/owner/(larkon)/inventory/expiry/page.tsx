"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type ExpiringItem = {
  id: number;
  quantity: number;
  expiryDate: string;
  product?: { id: number; name: string };
  variant?: { id: number; sku: string; title: string };
  branch?: { id: number; name: string };
  lot?: { id: number; lotCode: string; expDate: string };
};

export default function OwnerInventoryExpiryPage() {
  const toast = useToast();
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(30);
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);

  const loadLocations = useCallback(async () => {
    try {
      const res = await ownerGet<{ data: { id: number; name: string }[] }>("/api/v1/inventory/locations");
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setLocations([]);
    }
  }, []);

  const loadExpiring = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("daysAhead", String(daysAhead));
      if (locationId) params.set("locationId", locationId);
      const res = await ownerGet<{ data: ExpiringItem[] }>(`/api/v1/inventory/expiring?${params.toString()}`);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [daysAhead, locationId, toast]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadExpiring();
  }, [loadExpiring]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Expiring soon"
        subtitle="Lots expiring in the selected period. Use FEFO for sales; move or discount expiring stock."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Expiring", href: "/owner/inventory/expiry" },
        ]}
      />

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3 align-items-end">
            <div className="col-auto">
              <label className="form-label small">Within (days)</label>
              <select
                className="form-select form-select-sm"
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label small">Location (optional)</label>
              <select
                className="form-select form-select-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">All</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button type="button" className="btn btn-primary btn-sm" onClick={loadExpiring} disabled={loading}>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3">Expiring lots ({items.length})</h6>
          {loading ? (
            <p className="text-muted small">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted small">No lots expiring in the selected period.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th>Lot</th>
                    <th>Expiry</th>
                    <th>Qty</th>
                    <th>Location / Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={`${i.lot?.id ?? i.id}-${i.variant?.id}`}>
                      <td>{i.product?.name} — {i.variant?.sku} {i.variant?.title}</td>
                      <td>{i.lot?.lotCode ?? "—"}</td>
                      <td>{i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : "—"}</td>
                      <td>{i.quantity}</td>
                      <td>{i.branch?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm mt-2">← Inventory</Link>
    </div>
  );
}
