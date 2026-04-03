"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { inboundShipmentGet } from "@/lib/api";

export default function InboundShipmentDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!id || !orgId) return;
    let c = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await inboundShipmentGet(id, orgId);
        if (!c) setRow(data);
      } catch (e: unknown) {
        if (!c) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id, orgId]);

  const lines = Array.isArray(row?.lines) ? row.lines : [];

  return (
    <div className="container-fluid py-4">
      <PageHeader title={row ? `ASN ${row.reference}` : "Inbound shipment"} subtitle="Expected receipt detail" />
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/owner/inventory/inbound-shipments">Inbound shipments</Link>
          </li>
          <li className="breadcrumb-item active">#{id}</li>
        </ol>
      </nav>

      {err && <div className="alert alert-danger">{err}</div>}
      {loading || !row ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <>
          <div className="card border radius-12 mb-3">
            <div className="card-body p-24">
              <dl className="row small mb-0">
                <dt className="col-sm-3 text-muted">Status</dt>
                <dd className="col-sm-9">{row.status}</dd>
                <dt className="col-sm-3 text-muted">Vendor</dt>
                <dd className="col-sm-9">{row.vendor?.name ?? "—"}</dd>
                <dt className="col-sm-3 text-muted">Purchase order</dt>
                <dd className="col-sm-9">
                  {row.purchaseOrder?.id ? (
                    <Link href={`/owner/inventory/purchase-orders/${row.purchaseOrder.id}`} className="text-decoration-none">
                      {row.purchaseOrder.poNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="col-sm-3 text-muted">Expected arrival</dt>
                <dd className="col-sm-9">
                  {row.expectedArrivalAt ? new Date(row.expectedArrivalAt).toLocaleString() : "—"}
                </dd>
              </dl>
            </div>
          </div>
          <div className="card border radius-12">
            <div className="card-header py-2">
              <h6 className="mb-0">Lines</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Variant</th>
                    <th className="text-end">Expected</th>
                    <th className="text-end">Received snapshot</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l: any) => (
                    <tr key={l.id}>
                      <td>
                        <span className="small text-muted d-block">{l.variant?.sku}</span>
                        {l.variant?.title}
                      </td>
                      <td className="text-end">{l.expectedQty}</td>
                      <td className="text-end">{l.receivedQtySnapshot ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
