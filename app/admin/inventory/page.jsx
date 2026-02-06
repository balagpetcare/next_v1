"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import StatCard from "@/src/bpa/admin/components/StatCard";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const EXPIRY_BUCKETS = [7, 15, 30];

export default function Page() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expiring, setExpiring] = useState({ 7: [], 15: [], 30: [] });
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [expiryBucket, setExpiryBucket] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (lowStockOnly) params.append("lowStockOnly", "true");
      const [inv, stock, exp7, exp15, exp30] = await Promise.all([
        apiGet(`/api/v1/inventory?${params.toString()}`),
        apiGet("/api/v1/reports/stock"),
        apiGet("/api/v1/inventory/expiring?daysAhead=7").catch(() => ({ data: [] })),
        apiGet("/api/v1/inventory/expiring?daysAhead=15").catch(() => ({ data: [] })),
        apiGet("/api/v1/inventory/expiring?daysAhead=30").catch(() => ({ data: [] })),
      ]);
      setInventory(Array.isArray(inv?.data) ? inv.data : inv?.data?.items ?? []);
      setSummary(stock?.data ?? null);
      setExpiring({
        7: Array.isArray(exp7?.data) ? exp7.data : [],
        15: Array.isArray(exp15?.data) ? exp15.data : [],
        30: Array.isArray(exp30?.data) ? exp30.data : [],
      });
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((item) => {
      const productName = (item.product?.name ?? "").toLowerCase();
      const sku = (item.variant?.sku ?? "").toLowerCase();
      const branchName = (item.branch?.name ?? "").toLowerCase();
      return productName.includes(q) || sku.includes(q) || branchName.includes(q);
    });
  }, [inventory, search]);

  const expiringList = expiring[expiryBucket] ?? [];

  return (
    <div className="container-fluid">
      <PageHeader
        title="Inventory"
        subtitle="Global stock snapshot, alerts, expiry watchlist"
        right={
          <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={load} disabled={loading}>
            <Icon icon="solar:refresh-outline" />
            {loading ? "Loading..." : "Refresh"}
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {summary && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Items" value={summary.summary?.totalItems} icon={<Icon icon="solar:box-bold" />} tone="info" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Low Stock" value={summary.summary?.lowStockCount} icon={<Icon icon="solar:warning-bold" />} tone="warning" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Out of Stock" value={summary.summary?.outOfStockCount} icon={<Icon icon="solar:close-circle-bold" />} tone="danger" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Value" value={summary.summary?.totalValue != null ? `৳${Number(summary.summary.totalValue).toLocaleString()}` : "—"} icon={<Icon icon="solar:wallet-money-bold" />} tone="success" />
          </div>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-12">
          <SectionCard title="Expiry watchlist" right={<span className="text-secondary small">{expiringList.length} expiring in ≤{expiryBucket}d</span>}>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {EXPIRY_BUCKETS.map((d) => (
                <button key={d} type="button" className={`btn btn-sm ${expiryBucket === d ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setExpiryBucket(d)}>
                  {d} days
                </button>
              ))}
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>Product / Variant</th><th>Branch</th><th>Qty</th><th>Expiry</th></tr></thead>
                <tbody>
                  {expiringList.map((item) => (
                    <tr key={item.id ?? `${item.productId}-${item.variantId}-${item.branchId}`}>
                      <td><div className="fw-semibold">{item.product?.name ?? "—"}</div><div className="text-secondary" style={{ fontSize: 12 }}>{item.variant?.title ?? item.variant?.sku ?? "—"}</div></td>
                      <td style={{ fontSize: 13 }}>{item.branch?.name ?? `Branch #${item.branchId}`}</td>
                      <td>{item.quantity ?? 0}</td>
                      <td style={{ fontSize: 13 }}>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                  {!expiringList.length && !loading ? <tr><td colSpan={4} className="text-secondary text-center">None expiring in ≤{expiryBucket} days.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters">
            <div className="d-flex flex-column gap-2">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} id="lowStockCheck" />
                <label className="form-check-label" htmlFor="lowStockCheck">Low stock only</label>
              </div>
              <label className="small text-secondary mt-2">Search</label>
              <input type="text" className="form-control form-control-sm" placeholder="Product, SKU, branch..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Inventory items" right={<span className="text-secondary small">{filtered.length} item(s)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Branch</th>
                    <th>Quantity</th>
                    <th>Min Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const isLowStock = (item.quantity ?? 0) <= (item.minStock ?? 0);
                    const isOutOfStock = (item.quantity ?? 0) === 0;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.product?.name ?? "—"}</div>
                          <div className="text-secondary" style={{ fontSize: 12 }}>ID: {item.productId}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{item.variant?.title ?? item.variant?.sku ?? "Standard"}</td>
                        <td style={{ fontSize: 13 }}>{item.branch?.name ?? `Branch #${item.branchId}`}</td>
                        <td>
                          <span className={isOutOfStock ? "text-danger fw-bold" : isLowStock ? "text-warning fw-semibold" : ""}>
                            {item.quantity ?? 0}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{item.minStock ?? 0}</td>
                        <td>
                          {isOutOfStock ? <StatusChip status="OUT_OF_STOCK" /> : isLowStock ? <StatusChip status="LOW_STOCK" /> : <StatusChip status="IN_STOCK" />}
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && !loading ? (
                    <tr><td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>No inventory items found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
