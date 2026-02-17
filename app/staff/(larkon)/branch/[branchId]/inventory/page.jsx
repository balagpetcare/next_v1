"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkInput from "@larkon-ui/components/LkInput";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffInventoryList,
  staffInventoryAlerts,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.read";

export default function StaffBranchInventorySummaryPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canReceive = permissions.includes("inventory.receive");
  const canAdjust = permissions.includes("inventory.adjust");
  const canTransfer = permissions.includes("inventory.transfer");
  const canReports = permissions.includes("reports.view");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canRead) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      staffInventoryList(branchId, { search: search || undefined, lowStockOnly, limit: 100 }),
      staffInventoryAlerts(branchId),
    ])
      .then(([listRes, alertsList]) => {
        if (!cancelled) {
          setItems(listRes.items ?? []);
          setAlerts(Array.isArray(alertsList) ? alertsList : []);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load inventory");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [branchId, canRead, search, lowStockOnly]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canRead) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  const totalSkus = items.length;
  const lowStockCount = alerts.length;
  const stockValue = null;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24">
        <h5 className="mb-0">Inventory Summary</h5>
        <div className="d-flex flex-wrap gap-12">
          {canReceive && (
            <Link href={`/staff/branch/${branchId}/inventory/receive`} className="btn btn-primary btn-sm">
              Receive Stock
            </Link>
          )}
          {canAdjust && (
            <Link href={`/staff/branch/${branchId}/inventory/adjustments`} className="btn btn-outline-primary btn-sm">
              Adjust Stock
            </Link>
          )}
          {canTransfer && (
            <Link href={`/staff/branch/${branchId}/inventory/transfers`} className="btn btn-outline-primary btn-sm">
              Transfers
            </Link>
          )}
          {(canTransfer || canReceive) && (
            <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-primary btn-sm">
              Stock Requests
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <div className="row g-20 mb-24">
        <div className="col-md-4">
          <Card>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-secondary-light text-sm mb-4">Total SKUs</p>
                <p className="mb-0 fw-semibold">{loading ? "—" : totalSkus}</p>
              </div>
              <i className="ri-archive-line text-primary-600 fs-24" aria-hidden />
            </div>
          </Card>
        </div>
        <div className="col-md-4">
          <Card>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-secondary-light text-sm mb-4">Low Stock Count</p>
                <p className="mb-0 fw-semibold">{loading ? "—" : lowStockCount}</p>
              </div>
              <i className="ri-error-warning-line text-warning fs-24" aria-hidden />
            </div>
          </Card>
        </div>
        {canReports && stockValue != null && (
          <div className="col-md-4">
            <Card>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-secondary-light text-sm mb-4">Stock Value</p>
                  <p className="mb-0 fw-semibold">{loading ? "—" : stockValue}</p>
                </div>
                <i className="ri-money-dollar-circle-line text-primary-600 fs-24" aria-hidden />
              </div>
            </Card>
          </div>
        )}
      </div>

      <Card title="Items" subtitle="Filter by search or low stock">
        <div className="mb-16 d-flex flex-wrap gap-12">
          <LkInput
            type="search"
            size="sm"
            className="radius-12"
            style={{ maxWidth: 240 }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="d-flex align-items-center gap-8">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            <span className="text-sm">Low stock only</span>
          </label>
        </div>
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-secondary-light mb-0">No items found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Item / SKU</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const qty = row.quantity ?? row.onHandQty ?? 0;
                  const minQ = row.minStock ?? 10;
                  const isLow = qty <= minQ;
                  const name = row.variant?.product?.name ?? row.productName ?? row.variant?.title ?? "—";
                  const sku = row.variant?.sku ?? row.sku ?? "—";
                  return (
                    <tr key={row.id ?? `${row.locationId}-${row.variantId}`}>
                      <td>
                        <span className="fw-semibold">{name}</span>
                        <span className="text-secondary-light text-sm d-block">{sku}</span>
                      </td>
                      <td>{Number(qty)}</td>
                      <td>{Number(minQ)}</td>
                      <td>
                        <span className={`badge ${isLow ? "bg-warning text-dark" : "bg-success"}`}>
                          {isLow ? "Low" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
