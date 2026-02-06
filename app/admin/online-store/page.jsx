"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import StatCard from '@/src/bpa/admin/components/StatCard';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

export default function Page() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [inv, store] = await Promise.all([
        apiGet('/api/v1/online-store/inventory').catch(() => ({ data: [] })),
        apiGet('/api/v1/online-store/summary').catch(() => ({ data: null })),
      ]);
      setInventory(Array.isArray(inv?.data) ? inv.data : inv?.data?.items || []);
      setSummary(store?.data || null);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((item) => {
      const productName = (item.product?.name || '').toLowerCase();
      const sku = (item.variant?.sku || '').toLowerCase();
      return productName.includes(q) || sku.includes(q);
    });
  }, [inventory, search]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Online Store Management"
        subtitle={`Total: ${filtered.length} products`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <button onClick={load} disabled={loading} className="btn btn-outline-primary d-flex align-items-center gap-2">
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {summary && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Products" 
              value={summary.totalProducts}
              icon={<Icon icon="solar:box-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Visible Products" 
              value={summary.visibleProducts}
              icon={<Icon icon="solar:eye-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Stock" 
              value={summary.totalStock}
              icon={<Icon icon="solar:archive-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      <SectionCard title="Online Store Inventory">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Stock</th>
                <th>Visibility</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="fw-semibold">{item.product?.name || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {item.productId}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{item.variant?.title || item.variant?.sku || 'Standard'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>
                    {item.isVisible ? (
                      <StatusChip status="VISIBLE" />
                    ) : (
                      <StatusChip status="HIDDEN" />
                    )}
                  </td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/online-store/${item.id}`}>
                      Manage
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={5} className="text-secondary text-center" style={{ fontSize: 13 }}>No products found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
