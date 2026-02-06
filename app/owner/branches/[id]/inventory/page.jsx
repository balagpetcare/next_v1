"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

function pickList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  return [];
}

export default function BranchInventoryPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [stock, setStock] = useState({ summary: {}, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const id = parseInt(branchId, 10);
        const data = await ownerGet(`/api/v1/reports/stock?branchId=${id}`).catch(() => ({}));
        const d = data?.data ?? data;
        setStock({
          summary: d?.summary || {},
          items: pickList(d?.items ?? d) || [],
        });
      } catch (e) {
        setError(e?.message || "Failed to load inventory");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const { summary, items } = stock;

  return (
    <BranchPageShell
      title="Inventory"
      subtitle="Stock levels and alerts for this branch"
      breadcrumbLabel="Inventory"
      loading={loading}
      actions={[
        <Link key="transfers" href="/owner/transfers" className="btn btn-outline-primary radius-12">
          <i className="ri-arrow-left-right-line me-1" />
          Transfers
        </Link>,
        <Link key="returns" href="/owner/returns" className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-go-back-line me-1" />
          Returns
        </Link>,
      ]}
    >
      {error && (
        <div className="alert alert-danger radius-12 mb-4">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card radius-12">
            <div className="card-body text-center p-24">
              <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Total Items</div>
              <h4 className="mb-0 fw-bold text-primary">{summary?.totalItems ?? 0}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12">
            <div className="card-body text-center p-24">
              <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Low Stock</div>
              <h4 className="mb-0 fw-bold text-warning">{summary?.lowStockCount ?? 0}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12">
            <div className="card-body text-center p-24">
              <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Out of Stock</div>
              <h4 className="mb-0 fw-bold text-danger">{summary?.outOfStockCount ?? 0}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card radius-12">
            <div className="card-body text-center p-24">
              <div className="text-secondary-light mb-2" style={{ fontSize: 12 }}>Total Value</div>
              <h4 className="mb-0 fw-bold text-success">
                ৳{Number(summary?.totalValue ?? 0).toLocaleString("en-BD")}
              </h4>
            </div>
          </div>
        </div>
      </div>
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Stock by product</h6>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Min</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No inventory data. Stock reports are filtered by branch.
                    </td>
                  </tr>
                )}
                {items.map((row, idx) => (
                  <tr key={row.id ?? idx}>
                    <td>{row.product?.name ?? "—"}</td>
                    <td>{row.variant?.title ?? "Standard"}</td>
                    <td className="text-end">{row.quantity ?? 0}</td>
                    <td className="text-end">{row.minStock ?? 0}</td>
                    <td>
                      {row.quantity === 0 ? (
                        <span className="badge bg-danger radius-8">Out of Stock</span>
                      ) : row.minStock != null && row.quantity <= row.minStock ? (
                        <span className="badge bg-warning radius-8">Low</span>
                      ) : (
                        <span className="badge bg-success radius-8">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BranchPageShell>
  );
}
