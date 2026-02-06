"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function pickArray(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export default function AccessMatrixPage() {
  const [staffRows, setStaffRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, branchesRes] = await Promise.all([
        ownerGet("/api/v1/owner/staff-access/staff"),
        ownerGet("/api/v1/owner/branches"),
      ]);
      setStaffRows(pickArray(staffRes));
      setBranches(pickArray(branchesRes));
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const branchesToShow = useMemo(() => {
    if (!branchFilter) return branches;
    return branches.filter((b) => String(b.id) === String(branchFilter));
  }, [branches, branchFilter]);

  const getAccessFor = (row, branchId) => {
    const access = Array.isArray(row.access) ? row.access : [];
    return access.find((a) => String(a.branchId) === String(branchId));
  };

  const exportCsv = () => {
    const headers = ["Staff", "Contact", ...branchesToShow.map((b) => b.name || `Branch ${b.id}`)];
    const lines = [headers.join(",")];
    staffRows.forEach((row) => {
      const name = row.user?.name || row.user?.profile?.displayName || row.user?.auth?.email || "—";
      const contact = row.user?.email || row.user?.phone || "—";
      const cells = [
        `"${String(name).replace(/"/g, '""')}"`,
        `"${String(contact).replace(/"/g, '""')}"`,
        ...branchesToShow.map((b) => {
          const a = getAccessFor(row, b.id);
          return a ? `"${a.status}"` : "—";
        }),
      ];
      lines.push(cells.join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Access Map"
        subtitle="Staff × branches matrix. Filter by branch and export to CSV."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Access & Staff", href: "/owner/access/control" },
          { label: "Access Map", href: "/owner/access/matrix" },
        ]}
        actions={[
          <button
            key="export"
            type="button"
            className="btn btn-outline-primary btn-sm radius-12"
            onClick={exportCsv}
            disabled={loading || staffRows.length === 0}
          >
            <i className="ri-download-line me-1" />
            Export CSV
          </button>,
          <Link key="requests" href="/owner/access/requests" className="btn btn-primary btn-sm radius-12">
            <i className="ri-shield-user-line me-1" />
            Access Requests
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}

      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <label className="form-label mb-0">Branch filter:</label>
            <select
              className="form-select form-select-sm radius-12"
              style={{ width: "auto", minWidth: 200 }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || `Branch #${b.id}`}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : staffRows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ri-table-line fs-1 d-block mb-2" />
              <p className="mb-0">No staff access data. Assign access from Staff or Access Control.</p>
              <Link href="/owner/access/control" className="btn btn-outline-primary btn-sm mt-3">
                Access Control
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 140 }}>Staff</th>
                    <th style={{ minWidth: 120 }}>Contact</th>
                    {branchesToShow.map((b) => (
                      <th key={b.id} style={{ minWidth: 100 }} className="text-center">
                        <Link href={`/owner/branches/${b.id}`} className="text-decoration-none">
                          {b.name || `#${b.id}`}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row) => {
                    const name =
                      row.user?.name ||
                      row.user?.profile?.displayName ||
                      row.user?.auth?.email ||
                      row.user?.auth?.phone ||
                      "—";
                    const contact = [row.user?.auth?.email, row.user?.auth?.phone].filter(Boolean).join(" / ") || "—";
                    return (
                      <tr key={row.user?.id ?? Math.random()}>
                        <td>
                          <Link
                            href={`/owner/staff-access/staff/${row.user?.id}`}
                            className="fw-semibold text-decoration-none"
                          >
                            {name}
                          </Link>
                        </td>
                        <td className="text-secondary-light small">{contact}</td>
                        {branchesToShow.map((b) => {
                          const a = getAccessFor(row, b.id);
                          return (
                            <td key={b.id} className="text-center">
                              {a ? (
                                <StatusBadge status={a.status} />
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
