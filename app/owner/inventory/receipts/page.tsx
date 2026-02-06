"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

type Location = { id: number; name: string; branch?: { id: number; name: string } };

export default function OwnerInventoryReceiptsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLocations(list);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const locId = Number(locationId);
    const varId = Number(variantId);
    const qty = Number(quantity);
    if (!locId || !varId || qty <= 0) {
      setError("Location, variant and a positive quantity are required.");
      return;
    }
    if (!lotCode.trim() || !mfgDate || !expDate || !orgId.trim()) {
      setError("For new lot: orgId, lotCode, mfgDate and expDate are required.");
      return;
    }
    setSubmitting(true);
    try {
      await ownerPost("/api/v1/inventory/opening", {
        locationId: locId,
        variantId: varId,
        quantity: qty,
        orgId: Number(orgId),
        lotCode: lotCode.trim(),
        mfgDate,
        expDate,
      });
      setSuccess("Opening stock recorded.");
      setQuantity("");
      setLotCode("");
      setMfgDate("");
      setExpDate("");
    } catch (e: any) {
      setError(e?.message || "Failed to record receipt");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Receipts"
        subtitle="Record opening stock (POST /inventory/opening)"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Receipts", href: "/owner/inventory/receipts" },
        ]}
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <p className="text-muted small mb-3">
            Record inbound/opening stock at a location. Provide location, variant, quantity and either an existing lot or new lot details (orgId, lotCode, mfgDate, expDate).
          </p>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small">Location</label>
                <select
                  className="form-select form-select-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small">Variant ID</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  placeholder="Variant ID"
                  required
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small">Quantity</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={1}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Org ID</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="Organization ID"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Lot code</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                  placeholder="e.g. LOT-001"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Mfg date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Expiry date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? "Saving…" : "Record opening stock"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Link href="/owner/inventory/warehouse" className="btn btn-outline-secondary btn-sm">
        ← Warehouse
      </Link>
    </div>
  );
}
