"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { apiGet } from "../../../../lib/api";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const STATUS = ["", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

export default function Page() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await apiGet(`/api/v1/admin/verifications/producer-orgs${q}`);
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const ownerId = String(r.owner?.id || r.ownerUserId || "");
      const email = (r.owner?.auth?.email || "").toLowerCase();
      const phone = (r.owner?.auth?.phone || "").toLowerCase();
      return [name, ownerId, email, phone].some((s) => s.includes(q));
    });
  }, [rows, search]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Producer Org Verification Queue"
        subtitle={`Total: ${filtered.length} ${status ? `(${status})` : ""}`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control"
              placeholder="Search name, owner, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 220 }}>
              {STATUS.map((s) => (
                <option key={s} value={s}>{s || "All Status"}</option>
              ))}
            </select>
            <button onClick={load} disabled={loading} className="btn btn-outline-primary d-flex align-items-center gap-2">
              <Icon icon="solar:refresh-outline" />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Queue">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Producer Org</th>
                <th>Owner</th>
                <th>Created</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.name || "—"}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>Org #{r.id}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>Owner #{r.owner?.id || r.ownerUserId || "—"}</div>
                    <div className="text-secondary" style={{ fontSize: 12 }}>{r.owner?.auth?.email || r.owner?.auth?.phone || "—"}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </td>
                  <td><StatusChip status={r.status} /></td>
                  <td className="text-end">
                    <a className="btn btn-sm btn-primary" href={`/admin/verifications/producer-orgs/${r.id}`}>Review</a>
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr><td colSpan={5} className="text-secondary text-center" style={{ fontSize: 13 }}>No items found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
