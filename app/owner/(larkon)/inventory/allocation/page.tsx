"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { allocationPlansList } from "@/lib/api";

export default function OwnerAllocationBoardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await allocationPlansList();
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
  }, []);

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Allocation & picking" subtitle="FEFO allocation plans and pick-list handoff to dispatch." />
      <div className="d-flex justify-content-between mb-3">
        <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">
          ← Inventory
        </Link>
        <Link href="/owner/inventory/stock-requests" className="btn btn-outline-primary btn-sm">
          Stock requests
        </Link>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="alert alert-info">
          No allocation plans. Create one from a stock request detail using the API{" "}
          <code className="small">POST /api/v1/allocation-plans/from-stock-request</code> or open a plan by ID.
        </div>
      ) : (
        <div className="card border">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Stock req</th>
                  <th>Med req</th>
                  <th>Lines</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <span className="badge bg-secondary">{p.status}</span>
                    </td>
                    <td>{p.stockRequestId || "—"}</td>
                    <td>{p.medicineRequisitionId || "—"}</td>
                    <td>{p._count?.lines ?? 0}</td>
                    <td className="text-end">
                      <Link href={`/owner/inventory/allocation/${p.id}`} className="btn btn-sm btn-outline-primary">
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
