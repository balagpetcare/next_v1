"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { inboundShipmentCreate } from "@/lib/api";

type Line = { key: string; variantId: string; expectedQty: string; purchaseOrderLineId: string };

export default function NewInboundShipmentPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [reference, setReference] = useState("");
  const [expectedArrivalAt, setExpectedArrivalAt] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: "1", variantId: "", expectedQty: "1", purchaseOrderLineId: "" },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        variantId: "",
        expectedQty: "1",
        purchaseOrderLineId: "",
      },
    ]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!orgId) {
      setError("No organization.");
      return;
    }
    const vid = Number(vendorId);
    const ref = reference.trim();
    if (!Number.isFinite(vid) || vid < 1) {
      setError("Vendor ID is required (numeric).");
      return;
    }
    if (!ref) {
      setError("ASN reference is required.");
      return;
    }
    const built: Array<{ variantId: number; expectedQty: number; purchaseOrderLineId?: number }> = [];
    for (const l of lines) {
      const v = Number(l.variantId);
      const q = Number(l.expectedQty);
      if (!Number.isFinite(v) || v < 1) continue;
      if (!Number.isFinite(q) || q < 1) {
        setError("Each line needs variant ID and expected qty ≥ 1.");
        return;
      }
      const pol = l.purchaseOrderLineId.trim();
      built.push({
        variantId: v,
        expectedQty: q,
        ...(pol ? { purchaseOrderLineId: Number(pol) } : {}),
      });
    }
    if (!built.length) {
      setError("Add at least one line with variant ID and quantity.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        orgId,
        vendorId: vid,
        reference: ref,
        lines: built,
      };
      if (purchaseOrderId.trim()) body.purchaseOrderId = Number(purchaseOrderId);
      if (expectedArrivalAt) body.expectedArrivalAt = expectedArrivalAt;
      const res = (await inboundShipmentCreate(body)) as { id?: number };
      if (res?.id) router.push(`/owner/inventory/inbound-shipments/${res.id}`);
      else router.push("/owner/inventory/inbound-shipments");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader title="New inbound shipment (ASN)" subtitle="Register expected quantities before GRN receipt." />
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/owner/inventory/inbound-shipments">Inbound shipments</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit} className="card border radius-12 p-24">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Vendor ID *</label>
            <input
              className="form-control"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="From vendor master"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">ASN reference *</label>
            <input className="form-control" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Purchase order ID (optional)</label>
            <input className="form-control" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Expected arrival</label>
            <input
              type="datetime-local"
              className="form-control"
              value={expectedArrivalAt}
              onChange={(e) => setExpectedArrivalAt(e.target.value)}
            />
          </div>
        </div>
        <hr />
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Lines</h6>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
            + Line
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Variant ID</th>
                <th>Expected qty</th>
                <th>PO line ID (optional)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key}>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={l.variantId}
                      onChange={(e) =>
                        setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, variantId: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={l.expectedQty}
                      onChange={(e) =>
                        setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, expectedQty: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={l.purchaseOrderLineId}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) => (x.key === l.key ? { ...x, purchaseOrderLineId: e.target.value } : x))
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Create ASN"}
          </button>
          <Link href="/owner/inventory/inbound-shipments" className="btn btn-outline-secondary ms-2">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
