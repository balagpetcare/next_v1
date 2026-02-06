"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

export default function OwnerStaffAccessListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet("/api/v1/owner/staff-access/staff");
      setRows(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Failed to load staff access");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Staff Access Overview"
        subtitle="Shows each staff member and their branch permissions."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Access & Staff", href: "/owner/access/control" },
          { label: "Staff", href: "/owner/staff" },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ri-user-search-line fs-1 d-block mb-2" />
              <p className="mb-0">No staff access entries found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Access count</th>
                    <th>Pending</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const accessList = Array.isArray(row.access) ? row.access : [];
                    const approved = accessList.filter((a) => a.status === "APPROVED").length;
                    const pending = accessList.filter((a) => a.status === "PENDING").length;
                    return (
                      <tr key={row.user?.id || Math.random()}>
                        <td>
                          <strong>{row.user?.name || "—"}</strong>
                        </td>
                        <td className="text-secondary-light small">
                          {row.user?.email || row.user?.phone || "—"}
                        </td>
                        <td>{approved}</td>
                        <td>{pending}</td>
                        <td className="text-end">
                          <Link
                            className="btn btn-outline-primary btn-sm"
                            href={row.user?.id ? `/owner/staff-access/staff/${row.user.id}` : "/owner/staff"}
                          >
                            Manage
                          </Link>
                        </td>
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
