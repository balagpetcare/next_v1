"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { purchaseOrdersList } from "@/lib/api";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

function badge(status: string) {
  const u = (status || "").toUpperCase();
  if (u === "DRAFT") return "bg-secondary";
  if (u === "SUBMITTED") return "bg-info text-dark";
  if (u === "APPROVED") return "bg-primary";
  if (u === "PARTIALLY_RECEIVED") return "bg-warning text-dark";
  if (u === "RECEIVED") return "bg-success";
  if (["CANCELLED", "REJECTED"].includes(u)) return "bg-danger";
  return "bg-light text-dark";
}

function formatMoney(amount: unknown, currency?: string | null) {
  const n = amount != null ? Number(amount) : NaN;
  const cur = (currency || "").trim();
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : "৳";
  if (!Number.isFinite(n)) return "—";
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OwnerPurchaseOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        type Me = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
        const me = await ownerGet<Me>("/api/v1/owner/me");
        if (c) return;
        const orgs = me?.organizations ?? me?.data?.organizations ?? [];
        if (orgs[0]?.id) setOrgId(orgs[0].id);
      } catch {
        if (!c) setOrgId(null);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await purchaseOrdersList({
          orgId: orgId ?? undefined,
          status: statusFilter || undefined,
          page: 1,
          limit: 50,
        });
        if (!c) setItems(res.items || []);
      } catch (e: any) {
        if (!c) setError(e?.message || "Failed to load");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [orgId, statusFilter]);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Purchase orders" subtitle="Procurement documents linked to vendors and GRNs." />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
            ← Inventory
          </Link>
          <Link href="/owner/inventory/purchase-requisitions" className="btn btn-outline-dark btn-sm">
            Requisitions
          </Link>
          <Link href="/owner/inventory/inbound-shipments" className="btn btn-outline-dark btn-sm">
            ASN
          </Link>
          <Link href="/owner/inventory/putaway" className="btn btn-outline-dark btn-sm">
            Putaway
          </Link>
          <Link href="/owner/inventory/inbound-discrepancies" className="btn btn-outline-dark btn-sm">
            Discrepancies
          </Link>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_RECEIVED">Partially received</option>
            <option value="RECEIVED">Received</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Link href="/owner/inventory/purchase-orders/new" className="btn btn-primary btn-sm">
            New purchase order
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="card border">
          <div className="card-body text-muted text-center py-5">No purchase orders yet.</div>
        </div>
      ) : (
        <div className="card border">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>PO #</th>
                  <th>Vendor</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Lines</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((po) => (
                  <tr key={po.id}>
                    <td className="fw-medium">{po.poNumber}</td>
                    <td>{po.vendor?.name || "—"}</td>
                    <td className="small text-muted">{po.warehouse?.name || "—"}</td>
                    <td>
                      <span className={`badge ${badge(po.status)}`}>{po.status}</span>
                    </td>
                    <td className="text-end small">{formatMoney(po.grandTotal ?? po.subtotal, po.currency)}</td>
                    <td className="text-end">{po.lines?.length ?? 0}</td>
                    <td className="text-end">
                      <Link href={`/owner/inventory/purchase-orders/${po.id}`} className="btn btn-sm btn-outline-primary">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
