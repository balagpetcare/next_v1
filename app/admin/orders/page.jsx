"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatCard from "@/src/bpa/admin/components/StatCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const STATUS = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function Page() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet("/api/v1/orders");
      setRows(Array.isArray(r?.data) ? r.data : r?.data?.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => String(r.status) === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((r) => {
        const orderId = String(r.id ?? "");
        const customerName = (r.customer?.name ?? "").toLowerCase();
        const branchName = (r.branch?.name ?? "").toLowerCase();
        return orderId.includes(q) || customerName.includes(q) || branchName.includes(q);
      });
    }
    return out;
  }, [rows, status, search]);

  const funnel = useMemo(() => {
    const placed = rows.filter((r) => ["PENDING", "CONFIRMED"].includes(String(r.status))).length;
    const processing = rows.filter((r) => String(r.status) === "PROCESSING").length;
    const shipped = rows.filter((r) => String(r.status) === "SHIPPED").length;
    const delivered = rows.filter((r) => String(r.status) === "DELIVERED").length;
    const cancelled = rows.filter((r) => ["CANCELLED", "REFUNDED"].includes(String(r.status))).length;
    return { placed, processing, shipped, delivered, cancelled };
  }, [rows]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Orders & Finance"
        subtitle="Funnel view, payments, and returns"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <a href="/admin/returns" className="btn btn-outline-secondary btn-sm">Returns</a>
            <a href="/admin/wallet" className="btn btn-outline-primary btn-sm">Wallet / Payouts</a>
            <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-outline" />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md">
          <StatCard title="Placed" value={funnel.placed} icon={<Icon icon="solar:cart-large-2-bold" />} tone="primary" />
        </div>
        <div className="col-6 col-md">
          <StatCard title="Processing" value={funnel.processing} icon={<Icon icon="solar:refresh-circle-bold" />} tone="info" />
        </div>
        <div className="col-6 col-md">
          <StatCard title="Shipped" value={funnel.shipped} icon={<Icon icon="solar:box-bold" />} tone="warning" />
        </div>
        <div className="col-6 col-md">
          <StatCard title="Delivered" value={funnel.delivered} icon={<Icon icon="solar:check-circle-bold" />} tone="success" />
        </div>
        <div className="col-6 col-md">
          <StatCard title="Cancelled / Refunded" value={funnel.cancelled} icon={<Icon icon="solar:close-circle-bold" />} tone="danger" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters">
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS.map((s) => (
                  <option key={s || "all"} value={s}>{s || "All"}</option>
                ))}
              </select>
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Order ID, customer, branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Orders" right={<span className="text-secondary small">{filtered.length} order(s)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Branch</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">#{r.id}</td>
                      <td style={{ fontSize: 13 }}>
                        <div>{r.customer?.name ?? "Guest"}</div>
                        {r.customer?.phone ? <div className="text-secondary" style={{ fontSize: 12 }}>{r.customer.phone}</div> : null}
                      </td>
                      <td style={{ fontSize: 13 }}>{r.branch?.name ?? "—"}</td>
                      <td style={{ fontSize: 13 }}>{r.items?.length ?? 0} items</td>
                      <td className="fw-semibold">{formatCurrency(r.totalAmount)}</td>
                      <td><StatusChip status={r.status} /></td>
                      <td>
                        <StatusChip status={r.paymentStatus} />
                        {r.paymentMethod ? <div className="text-secondary" style={{ fontSize: 11 }}>{r.paymentMethod}</div> : null}
                      </td>
                      <td style={{ fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="text-end">
                        <a className="btn btn-sm btn-primary" href={`/admin/orders/${r.id}`}>View</a>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && !loading ? (
                    <tr><td colSpan={9} className="text-secondary text-center" style={{ fontSize: 13 }}>No orders found.</td></tr>
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
