"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

export default function Page() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const r = await apiGet(`/api/v1/services?${params.toString()}`);
      setServices(Array.isArray(r?.data) ? r.data : r?.data?.items ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Service catalog"
        subtitle="Clinic services (global templates). Filter by category."
        right={
          <div className="d-flex gap-2">
            <a href="/admin/appointments" className="btn btn-outline-primary btn-sm">Appointments</a>
            <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={load} disabled={loading}>
              <Icon icon="solar:refresh-outline" />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters">
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Category</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. CONSULTATION"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title="Services" right={<span className="text-secondary small">{services.length} service(s)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-semibold">{s.name ?? "—"}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>ID: {s.id}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{s.category ?? "—"}</td>
                      <td style={{ fontSize: 13 }}>{s.price != null ? `৳${s.price}` : "—"}</td>
                      <td><StatusChip status={s.status} /></td>
                      <td className="text-end">
                        <a className="btn btn-sm btn-primary" href={`/admin/services/${s.id}`}>View</a>
                      </td>
                    </tr>
                  ))}
                  {!services.length && !loading ? (
                    <tr><td colSpan={5} className="text-secondary text-center" style={{ fontSize: 13 }}>No services found.</td></tr>
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
