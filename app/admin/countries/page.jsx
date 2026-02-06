"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

export default function AdminCountriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    currencyCode: "",
    timezoneDefault: "",
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/v1/admin/countries");
      setRows(res?.data ?? []);
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
      await apiPost("/api/v1/admin/countries", {
        code: form.code,
        name: form.name,
        currencyCode: form.currencyCode || null,
        timezoneDefault: form.timezoneDefault || null,
        isActive: !!form.isActive,
      });
      setForm({ code: "", name: "", currencyCode: "", timezoneDefault: "", isActive: true });
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
      await apiPatch(`/api/v1/admin/countries/${row.id}`, { isActive: !row.isActive });
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
        title="Countries"
        subtitle="Global admin: manage countries and activation status."
        icon={<Icon icon="solar:global-outline" />}
      />

      <SectionCard title="Create Country">
        <form className="row g-3" onSubmit={onCreate}>
          <div className="col-md-2">
            <label className="form-label">Code</label>
            <input
              className="form-control"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="BD"
              maxLength={2}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bangladesh"
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Currency</label>
            <input
              className="form-control"
              value={form.currencyCode}
              onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
              placeholder="BDT"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Timezone</label>
            <input
              className="form-control"
              value={form.timezoneDefault}
              onChange={(e) => setForm({ ...form, timezoneDefault: e.target.value })}
              placeholder="Asia/Dhaka"
            />
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <button className="btn btn-primary w-100" disabled={loading}>
              Create
            </button>
          </div>
        </form>
        {error ? <div className="text-danger mt-2">{error}</div> : null}
      </SectionCard>

      <SectionCard title="Country List" className="mt-4">
        {loading ? <div>Loading...</div> : null}
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Currency</th>
                <th>Timezone</th>
                <th>Active</th>
                <th>Active Policy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.currencyCode || "-"}</td>
                  <td>{row.timezoneDefault || "-"}</td>
                  <td>{row.isActive ? "Yes" : "No"}</td>
                  <td>{row.activePolicy?.name || "-"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toggleActive(row)}
                      disabled={loading}
                    >
                      {row.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <a className="btn btn-sm btn-link ms-2" href={`/admin/countries/${row.id}/policies`}>
                      Policies
                    </a>
                    <a className="btn btn-sm btn-link" href={`/admin/countries/${row.id}/features`}>
                      Features
                    </a>
                    <a className="btn btn-sm btn-link" href={`/admin/countries/${row.id}/users`}>
                      Staff
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted">
                    No countries found.
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

