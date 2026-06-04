"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  cancelProcurementDemandLine,
  getProcurementDemand,
  linkProcurementDemandPoLine,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { id: number; org?: { id: number } };

export default function ProcurementDemandDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [row, setRow] = useState<any>(null);
  const [poLineId, setPoLineId] = useState("");

  const load = useCallback(async () => {
    if (!orgId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await getProcurementDemand(Number(id), orgId);
      setRow(res?.data ?? res);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, id]);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as BranchRow[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title={`Procurement demand #${id}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Procurement demand", href: "/owner/inventory/procurement-demand" },
        ]}
        actions={[
          <Link
            key="po"
            href={`/owner/inventory/purchase-orders/new?fromProcurementDemand=${encodeURIComponent(String(id))}`}
            className="btn btn-primary btn-sm"
          >
            Create PO (prefill)
          </Link>,
          <Link key="back" href="/owner/inventory/procurement-demand" className="btn btn-outline-secondary btn-sm">
            ← List
          </Link>,
        ]}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {loading || !row ? (
        <p className="text-secondary">{loading ? "Loading…" : "Not found."}</p>
      ) : (
        <div className="card radius-12">
          <div className="card-body">
            <div className="row g-2 small">
              <div className="col-md-4">
                <strong>Status</strong>
                <div>{row.status}</div>
              </div>
              <div className="col-md-4">
                <strong>Demand / fulfilled</strong>
                <div>
                  {row.demandQty} / {row.fulfilledQty}
                </div>
              </div>
              <div className="col-md-4">
                <strong>Variant</strong>
                <div>
                  {row.variant?.sku} — {row.variant?.title}
                </div>
              </div>
              <div className="col-md-4">
                <strong>Stock request</strong>
                <div>
                  <Link href={`/owner/inventory/stock-requests/${row.stockRequestId}`}>#{row.stockRequestId}</Link>
                </div>
              </div>
              <div className="col-md-4">
                <strong>PO line</strong>
                <div>
                  {row.purchaseOrderLineId != null ? (
                    <span>
                      PO #{row.purchaseOrderId} / line #{row.purchaseOrderLineId}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>

            {orgId != null && row.status !== "CANCELLED" && row.status !== "DISPATCHED" && (
              <div className="mt-4 border-top pt-3">
                <h6 className="small fw-semibold">Link to purchase order line</h6>
                <p className="small text-muted mb-2">
                  Enter the <code>purchase_order_lines.id</code> from your PO (same variant as this demand).
                </p>
                <div className="d-flex flex-wrap gap-2 align-items-end">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ maxWidth: 200 }}
                    placeholder="PO line id"
                    value={poLineId}
                    onChange={(e) => setPoLineId(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!poLineId}
                    onClick={async () => {
                      setError(null);
                      setSuccess(null);
                      try {
                        await linkProcurementDemandPoLine(Number(id), {
                          orgId,
                          purchaseOrderLineId: Number(poLineId),
                        });
                        setSuccess("Linked.");
                        await load();
                      } catch (e) {
                        setError(getMessageFromApiError(e as Error));
                      }
                    }}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={async () => {
                      if (!confirm("Cancel this demand line?")) return;
                      setError(null);
                      setSuccess(null);
                      try {
                        await cancelProcurementDemandLine(Number(id), { orgId, reason: "Owner cancel" });
                        setSuccess("Cancelled.");
                        await load();
                      } catch (e) {
                        setError(getMessageFromApiError(e as Error));
                      }
                    }}
                  >
                    Cancel demand
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
