"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { purchaseRequisitionCreate } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

export default function NewPurchaseRequisitionPage() {
  const router = useRouter();
  const toast = useToast();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [lines, setLines] = useState([{ variantId: "", requestedQty: "1", unitCost: "" }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSubmitting(true);
    try {
      const payload = {
        orgId,
        vendorId: vendorId ? Number(vendorId) : undefined,
        lines: lines
          .filter((l) => l.variantId)
          .map((l) => ({
            variantId: Number(l.variantId),
            requestedQty: Number(l.requestedQty),
            unitCost: l.unitCost ? Number(l.unitCost) : undefined,
          })),
      };
      const data: any = await purchaseRequisitionCreate(payload);
      toast.success("Requisition created");
      router.push(`/owner/inventory/purchase-requisitions/${data?.id ?? ""}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 960 }}>
      <PageHeader title="New purchase requisition" subtitle="Define SKU quantities; approve then convert to a purchase order." />
      <Link href="/owner/inventory/purchase-requisitions" className="btn btn-outline-secondary btn-sm mb-3">
        ← Back
      </Link>
      <form onSubmit={submit} className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Preferred vendor ID (optional)</label>
              <input
                className="form-control"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
          </div>
          <hr />
          <div className="fw-semibold mb-2">Lines</div>
          {lines.map((l, i) => (
            <div key={i} className="row g-2 mb-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label small text-muted">Variant ID</label>
                <input
                  className="form-control form-control-sm"
                  value={l.variantId}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].variantId = e.target.value;
                    setLines(n);
                  }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Qty</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm"
                  value={l.requestedQty}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].requestedQty = e.target.value;
                    setLines(n);
                  }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Unit cost</label>
                <input
                  className="form-control form-control-sm"
                  value={l.unitCost}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].unitCost = e.target.value;
                    setLines(n);
                  }}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-link btn-sm px-0"
            onClick={() => setLines([...lines, { variantId: "", requestedQty: "1", unitCost: "" }])}
          >
            + Add line
          </button>
        </div>
        <div className="card-footer bg-white border-0 d-flex justify-content-end gap-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
