"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';

const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function AdminAuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${base}/api/v1/admin/audit/logs`);
      if (q) url.searchParams.set("q", q);
      if (entityType) url.searchParams.set("entityType", entityType);
      if (action) url.searchParams.set("action", action);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);
      url.searchParams.set("limit", "100");

      const res = await fetch(url.toString(), { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || `Failed (${res.status})`);
      setRows(j?.data || []);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function openDiff(id) {
    try {
      const res = await fetch(`${base}/api/v1/admin/audit/diff/${id}`, { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || `Failed (${res.status})`);
      setSelected(j?.data || null);
    } catch (e) {
      setError(e.message || "Failed");
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Action', 'Entity Type', 'Entity ID', 'Actor Role', 'Actor ID', 'Time'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.id,
        r.action,
        r.entityType,
        r.entityId,
        r.actorRole,
        r.actorId,
        r.createdAt ? new Date(r.createdAt).toISOString() : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entityTypes = useMemo(() => {
    const types = new Set(rows.map(r => r.entityType).filter(Boolean));
    return Array.from(types).sort();
  }, [rows]);

  const actions = useMemo(() => {
    const acts = new Set(rows.map(r => r.action).filter(Boolean));
    return Array.from(acts).sort();
  }, [rows]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Audit Logs"
        subtitle="System activity logs and change tracking"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button 
              onClick={exportToCSV} 
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              disabled={!rows.length}
            >
              <Icon icon="solar:download-bold" />
              Export CSV
            </button>
            <button 
              onClick={load} 
              disabled={loading} 
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:refresh-outline" />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Filters" className="mb-3">
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label">Search</label>
            <input 
              className="form-control" 
              placeholder="Search action/entityId/entityType" 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Entity Type</label>
            <select 
              className="form-select" 
              value={entityType} 
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All Types</option>
              {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Action</label>
            <select 
              className="form-select" 
              value={action} 
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Start Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">End Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-1 d-flex align-items-end">
            <button 
              className="btn btn-primary w-100" 
              onClick={load} 
              disabled={loading}
            >
              Apply
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Audit Logs (${rows.length})`}>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Time</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <span className="badge bg-primary-50 text-primary-600">{r.action}</span>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{r.entityType}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {r.entityId}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{r.actorRole}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>ID: {r.actorId}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                  <td className="text-end">
                    <button 
                      className="btn btn-sm btn-outline-primary" 
                      onClick={() => openDiff(r.id)}
                    >
                      View Diff
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={6} className="text-secondary text-center" style={{ fontSize: 13 }}>
                    No logs found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {selected ? (
        <SectionCard title={`Diff #${selected.row?.id}`} className="mt-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="fw-semibold mb-2">Before</div>
              <pre 
                className="p-3 bg-light radius-8" 
                style={{ 
                  fontSize: 12, 
                  whiteSpace: "pre-wrap",
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                {JSON.stringify(selected.row?.before, null, 2)}
              </pre>
            </div>
            <div className="col-12 col-md-6">
              <div className="fw-semibold mb-2">After</div>
              <pre 
                className="p-3 bg-light radius-8" 
                style={{ 
                  fontSize: 12, 
                  whiteSpace: "pre-wrap",
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                {JSON.stringify(selected.row?.after, null, 2)}
              </pre>
            </div>
            <div className="col-12">
              <div className="fw-semibold mb-2">Changed Fields</div>
              <pre 
                className="p-3 bg-light radius-8" 
                style={{ 
                  fontSize: 12, 
                  whiteSpace: "pre-wrap",
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                {JSON.stringify(selected.changes || [], null, 2)}
              </pre>
            </div>
            <div className="col-12">
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
