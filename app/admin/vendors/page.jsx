"use client";

import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

export default function Page() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet('/api/v1/vendors');
      setVendors(Array.isArray(r?.data) ? r.data : r?.data?.items || []);
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
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const contact = (v.contactPerson || v.email || v.phone || '').toLowerCase();
      return name.includes(q) || contact.includes(q);
    });
  }, [vendors, search]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Vendors Management"
        subtitle={`Total: ${filtered.length} vendors`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search vendors..."
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

      <SectionCard title="Vendors">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Contact</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="fw-semibold">{v.name || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {v.id}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{v.contactPerson || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{v.email || v.phone || '—'}</div>
                  </td>
                  <td><StatusChip status={v.status} /></td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/vendors/${v.id}`}>
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={4} className="text-secondary text-center" style={{ fontSize: 13 }}>No vendors found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
