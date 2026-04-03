"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { inboundShipmentsList } from "@/lib/api";

function badge(status: string) {
  const u = (status || "").toUpperCase();
  if (u === "ANNOUNCED") return "bg-secondary";
  if (u === "IN_TRANSIT") return "bg-info text-dark";
  if (u === "ARRIVED") return "bg-warning text-dark";
  if (u === "CLOSED") return "bg-success";
  if (u === "CANCELLED") return "bg-danger";
  return "bg-light text-dark";
}

export default function InboundShipmentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await inboundShipmentsList({ orgId: orgId ?? undefined, page: 1, limit: 50 });
        if (!c) setItems(res.items || []);
      } catch (e: any) {
        if (!c) setError(e?.message || "Failed");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [orgId]);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Inbound shipments (ASN)" subtitle="Expected deliveries aligned to purchase orders and GRN receipts." />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          ← Inventory
        </Link>
        <Link href="/owner/inventory/inbound-shipments/new" className="btn btn-primary btn-sm">
          New ASN
        </Link>
        <Link href="/owner/inventory/receipts" className="btn btn-outline-primary btn-sm">
          Receiving / GRN
        </Link>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Reference</th>
                <th>Status</th>
                <th>Vendor</th>
                <th>PO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No inbound shipments. Create via API or operations desk.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td className="fw-semibold">{row.reference}</td>
                    <td>
                      <span className={`badge ${badge(row.status)}`}>{row.status}</span>
                    </td>
                    <td>{row.vendor?.name}</td>
                    <td>{row.purchaseOrder?.poNumber ?? "—"}</td>
                    <td className="text-end">
                    <Link href={`/owner/inventory/inbound-shipments/${row.id}`} className="btn btn-sm btn-outline-primary">
                      Open
                    </Link>
                  </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
