"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffInventoryLocations, staffCreateOpeningStock, staffInventoryList } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.receive";

export default function StaffBranchInventoryReceivePage() {
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
  const [form, setForm] = useState({
    locationId: "",
    reference: "",
    receiveDate: new Date().toISOString().split("T")[0],
    items: [{ variantId: "", quantity: "" }],
  });

  const permissions = myAccess?.permissions ?? [];
  const canReceive = permissions.includes(REQUIRED_PERM);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canReceive) return;
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
          .map((i) => { seen.add(i.variant.id); return { id: i.variant.id, sku: i.variant.sku, title: i.variant.title, product: i.variant.product }; });
        setVariants(list);
        if (branchLocs.length && !form.locationId) setForm((f) => ({ ...f, locationId: String(branchLocs[0].id) }));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [branchId, canReceive]);

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, { variantId: "", quantity: "" }] }));
  const setLine = (idx, field, value) => setForm((f) => ({
    ...f,
    items: f.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.locationId || !form.items.some((i) => i.variantId && Number(i.quantity) > 0)) {
      setError("Select location and at least one item with quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      for (const line of form.items) {
        const qty = Number(line.quantity);
        const vid = Number(line.variantId);
        if (!vid || qty <= 0) continue;
        await staffCreateOpeningStock({
          locationId: Number(form.locationId),
          variantId: vid,
          quantity: qty,
        });
      }
      setSuccess(true);
      setTimeout(() => router.push(`/staff/branch/${branchId}/inventory`), 1500);
    } catch (err) {
      setError(err?.message ?? "Failed to record receive");
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
  if (errorCode === "forbidden" || !hasViewPermission || !canReceive) {
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
        <h5 className="mb-0">Opening stock</h5>
      </div>
      <p className="text-secondary-light small mb-24">
        To receive transfers, go to{" "}
        <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="text-primary">
          Inventory → Incoming dispatches
        </Link>
        .
      </p>

      {success && (
        <div className="alert alert-success">Received successfully. Redirecting...</div>
      )}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <Card title="Opening stock" subtitle="Record initial stock at this location">
        {loading ? (
          <p className="text-secondary-light">Loading locations...</p>
        ) : locations.length === 0 ? (
          <p className="text-secondary-light mb-0">No inventory locations found for this branch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-16 mb-16">
              <div className="col-md-4">
                <LkFormGroup label="Location" className="text-sm">
                  <LkSelect
                    size="sm"
                    className="radius-12"
                    value={form.locationId}
                    onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                    required
                  >
                    <option value="">Select</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name ?? `Location ${loc.id}`}</option>
                    ))}
                  </LkSelect>
                </LkFormGroup>
              </div>
              <div className="col-md-4">
                <LkFormGroup label="Reference / Invoice no" className="text-sm">
                  <LkInput
                    type="text"
                    size="sm"
                    className="radius-12"
                    value={form.reference}
                    onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="Optional"
                  />
                </LkFormGroup>
              </div>
              <div className="col-md-4">
                <LkFormGroup label="Receive date" className="text-sm">
                  <LkInput
                    type="date"
                    size="sm"
                    className="radius-12"
                    value={form.receiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, receiveDate: e.target.value }))}
                  />
                </LkFormGroup>
              </div>
            </div>
            <div className="mb-16">
              <div className="d-flex align-items-center justify-content-between mb-8">
                <span className="form-label text-sm mb-0">Items</span>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>Add line</button>
              </div>
              {form.items.map((line, idx) => (
                <div key={idx} className="row g-8 mb-8 align-items-end">
                  <div className="col-md-6">
                    <LkFormGroup label="Variant / Product" className="text-sm">
                      <LkSelect
                        size="sm"
                        className="radius-12"
                        value={line.variantId}
                        onChange={(e) => setLine(idx, "variantId", e.target.value)}
                      >
                        <option value="">Select</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>{v.sku ?? v.title ?? v.id}</option>
                        ))}
                      </LkSelect>
                    </LkFormGroup>
                  </div>
                  <div className="col-md-3">
                    <LkFormGroup label="Quantity" className="text-sm">
                      <LkInput
                        type="number"
                        min={1}
                        size="sm"
                        className="radius-12"
                        value={line.quantity}
                        onChange={(e) => setLine(idx, "quantity", e.target.value)}
                      />
                    </LkFormGroup>
                  </div>
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Record receive"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
