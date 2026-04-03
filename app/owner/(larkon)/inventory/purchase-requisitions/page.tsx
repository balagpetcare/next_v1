"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { purchaseRequisitionsList } from "@/lib/api";

function badge(status: string) {
  const u = (status || "").toUpperCase();
  if (u === "DRAFT") return "bg-secondary";
  if (u === "SUBMITTED") return "bg-info text-dark";
  if (u === "APPROVED") return "bg-primary";
  if (u === "CONVERTED") return "bg-success";
  if (u === "REJECTED") return "bg-danger";
  return "bg-light text-dark";
}

export default function PurchaseRequisitionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const me = await ownerGet<{ organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } }>(
          "/api/v1/owner/me"
        );
        if (c) return;
        const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
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
        const res = await purchaseRequisitionsList({
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
      <PageHeader
        title="Purchase requisitions"
        subtitle="Internal requests before a formal purchase order is issued to a supplier."
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
            ← Inventory
          </Link>
          <Link href="/owner/inventory/purchase-orders" className="btn btn-outline-primary btn-sm">
            Purchase orders
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
            <option value="CONVERTED">Converted</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Link href="/owner/inventory/purchase-requisitions/new" className="btn btn-primary btn-sm">
            New requisition
          </Link>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>PR #</th>
                  <th>Status</th>
                  <th>Vendor</th>
                  <th>Warehouse</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No requisitions yet.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold">{row.prNumber}</td>
                      <td>
                        <span className={`badge ${badge(row.status)}`}>{row.status}</span>
                      </td>
                      <td>{row.vendor?.name ?? "—"}</td>
                      <td>{row.warehouse?.name ?? "—"}</td>
                      <td className="text-muted small">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</td>
                      <td className="text-end">
                        <Link href={`/owner/inventory/purchase-requisitions/${row.id}`} className="btn btn-sm btn-outline-primary">
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
    </div>
  );
}
