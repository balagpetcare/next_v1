"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

export default function AdminStatesPage() {
  const [rows, setRows] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ countryId: "", code: "", name: "", isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statesRes, countriesRes] = await Promise.all([
        apiGet("/api/v1/admin/states"),
        apiGet("/api/v1/admin/countries"),
      ]);
      setRows(statesRes?.data ?? []);
      setCountries(countriesRes?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/v1/admin/states", {
        countryId: Number(form.countryId),
        code: form.code,
        name: form.name,
        isActive: !!form.isActive,
      });
      setForm({ countryId: "", code: "", name: "", isActive: true });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (row) => {
    setLoading(true);
    setError("");
    try {
      await apiPatch(`/api/v1/admin/states/${row.id}`, { isActive: !row.isActive });
      await load();
    } catch (e) {
      setError(e?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <PageHeader
        title="States / Provinces"
        subtitle="Country-level overrides with state policies."
        icon={<Icon icon="solar:map-arrow-square-outline" />}
      />

      <SectionCard title="Create State">
        <form className="row g-3" onSubmit={onCreate}>
          <div className="col-md-4">
            <label className="form-label">Country</label>
            <select
              className="form-select"
              value={form.countryId}
              onChange={(e) => setForm({ ...form, countryId: e.target.value })}
              required
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Code</label>
            <input
              className="form-control"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="DHAKA"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dhaka"
              required
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={loading}>
              Create
            </button>
          </div>
        </form>
        {error ? <div className="text-danger mt-2">{error}</div> : null}
      </SectionCard>

      <SectionCard title="State List" className="mt-4">
        {loading ? <div>Loading...</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Country</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.country?.code || "-"} - {row.country?.name || "-"}</td>
                  <td>{row.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => toggleActive(row)} disabled={loading}>
                      {row.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <a className="btn btn-sm btn-link ms-2" href={`/admin/states/${row.id}/policies`}>
                      Policies
                    </a>
                    <a className="btn btn-sm btn-link" href={`/admin/states/${row.id}/features`}>
                      Features
                    </a>
                    <a className="btn btn-sm btn-link" href={`/admin/states/${row.id}/rules`}>
                      Rules
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No states found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

