"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffInventoryLocations, staffCreateAdjustmentRequest, staffInventoryList } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.adjust";
const ADJUSTMENT_TYPES = [
  { value: "DAMAGE", label: "Damage" },
  { value: "SHORTAGE", label: "Shortage" },
  { value: "FOUND", label: "Found" },
  { value: "CORRECTION", label: "Correction" },
];

export default function StaffBranchInventoryAdjustmentsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recentRequests, setRecentRequests] = useState([]);
  const [form, setForm] = useState({
    type: "DAMAGE",
    locationId: "",
    variantId: "",
    qty: "",
    reason: "",
  });

  const permissions = myAccess?.permissions ?? [];
  const canAdjust = permissions.includes(REQUIRED_PERM);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canAdjust) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([staffInventoryLocations(), staffInventoryList(branchId, { limit: 200 })])
      .then(([locs, listRes]) => {
        if (cancelled) return;
        const branchLocs = (locs || []).filter((l) => l.branch && String(l.branch.id) === String(branchId));
        setLocations(branchLocs);
        const items = listRes.items ?? [];
        const seen = new Set();
        const list = items
          .filter((i) => i.variant && !seen.has(i.variant.id))
          .map((i) => { seen.add(i.variant.id); return { id: i.variant.id, sku: i.variant.sku, title: i.variant.title }; });
        setVariants(list);
        if (branchLocs.length && !form.locationId) setForm((f) => ({ ...f, locationId: String(branchLocs[0].id) }));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [branchId, canAdjust]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(form.qty);
    if (!form.locationId || !form.variantId || !form.reason.trim()) {
      setError("Location, variant, and reason are required.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    const isNegative = form.type === "DAMAGE" || form.type === "SHORTAGE";
    const quantityDelta = isNegative ? -qty : qty;

    setSubmitting(true);
    setError("");
    try {
      await staffCreateAdjustmentRequest({
        locationId: Number(form.locationId),
        variantId: Number(form.variantId),
        quantityDelta,
        reason: form.reason.trim(),
      });
      setSuccess(true);
      setRecentRequests((prev) => [{ type: form.type, variantId: form.variantId, quantityDelta, reason: form.reason, createdAt: new Date().toISOString() }, ...prev.slice(0, 19)]);
      setForm((f) => ({ ...f, qty: "", reason: "" }));
    } catch (err) {
      setError(err?.message ?? "Failed to create adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canAdjust) {
    return (
      <AccessDenied missingPerm={REQUIRED_PERM} onBack={() => router.push(`/staff/branch/${branchId}`)} />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/inventory`} className="btn btn-outline-secondary btn-sm">
          ← Back to Inventory
        </Link>
        <h5 className="mb-0">Adjustments (Damage / Shortage / Correction)</h5>
      </div>

      {success && <div className="alert alert-success">Adjustment request created. It may require approval.</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Create adjustment" subtitle="No direct stock edit; adjustment entry with reason required.">
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : locations.length === 0 ? (
          <p className="text-secondary-light mb-0">No locations found for this branch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-16 mb-16">
              <div className="col-md-6">
                <label className="form-label text-sm">Type</label>
                <select
                  className="form-select form-select-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {ADJUSTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-sm">Location</label>
                <select
                  className="form-select form-select-sm"
                  value={form.locationId}
                  onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name ?? `Location ${loc.id}`}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-sm">Variant / Product</label>
                <select
                  className="form-select form-select-sm"
                  value={form.variantId}
                  onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}
                  required
                >
                  <option value="">Select</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.sku ?? v.title ?? v.id}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-sm">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-control form-control-sm"
                  value={form.qty}
                  onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label text-sm">Reason (required)</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Damaged in transit, count correction"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Create adjustment"}
            </button>
          </form>
        )}
      </Card>

      <Card title="Recent adjustments" subtitle="Adjustment requests (approval may be required above threshold)">
        {recentRequests.length === 0 ? (
          <p className="text-secondary-light mb-0">No adjustments recorded in this session. Create one above.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Variant</th>
                  <th>Qty delta</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r, i) => (
                  <tr key={i}>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                    <td><span className="badge bg-secondary">{r.type}</span></td>
                    <td>{r.variantId}</td>
                    <td>{r.quantityDelta}</td>
                    <td>{r.reason}</td>
                    <td><span className="badge bg-warning text-dark">PENDING_REVIEW</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
