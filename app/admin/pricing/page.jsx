"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';

export default function Page() {
  const [pricing, setPricing] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Note: Adjust endpoint based on actual pricing API structure
      const r = await apiGet('/api/v1/pricing/rules').catch(() => ({ data: [] }));
      setPricing(Array.isArray(r?.data) ? r.data : []);
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
    if (!search) return pricing;
    const q = search.toLowerCase();
    return pricing.filter((p) => {
      const name = (p.name || p.productName || '').toLowerCase();
      return name.includes(q);
    });
  }, [pricing, search]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Pricing Management"
        subtitle={`Total: ${filtered.length} pricing rules`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search pricing rules..."
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

      <SectionCard title="Pricing Rules">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Location</th>
                <th>Price</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.productName || `Product #${p.productId}`}</td>
                  <td style={{ fontSize: 13 }}>{p.locationName || 'All Locations'}</td>
                  <td className="fw-semibold">{p.price ? `৳${p.price}` : '—'}</td>
                  <td><span className="badge bg-success-50 text-success-600">Active</span></td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/pricing/${p.id}`}>
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={5} className="text-secondary text-center" style={{ fontSize: 13 }}>No pricing rules found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
