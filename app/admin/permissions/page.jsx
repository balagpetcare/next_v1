"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function PermissionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/v1/admin/permissions");
      setItems(res?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Permissions"
        subtitle="Read-only catalog. Assign via Roles."
        right={
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard title="Permission list">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Key</th>
                <th>Label</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id ?? p.key}>
                  <td className="font-monospace">{p.key}</td>
                  <td>{p.label ?? "—"}</td>
                  <td className="text-secondary">{p.description ?? "—"}</td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={3} className="text-secondary text-center">
                    No permissions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {loading ? <div className="text-center text-secondary py-2">Loading...</div> : null}
      </SectionCard>
    </div>
  );
}
