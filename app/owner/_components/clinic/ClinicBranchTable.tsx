"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ClinicBranchRow = {
  id: number;
  name: string;
  orgId: number;
  org?: { id: number; name: string };
  status?: string;
  servicesCount?: number;
  staffCount?: number;
  appointmentsCount?: number;
  doctorsCount?: number;
  todayPatients?: number;
  todayRevenue?: number;
};

type ClinicBranchTableProps = {
  rows: ClinicBranchRow[];
  loading?: boolean;
};

function statusClass(status?: string): string {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACTIVE") return "bg-success-subtle text-success-emphasis";
  if (normalized === "INACTIVE") return "bg-danger-subtle text-danger-emphasis";
  if (normalized === "DRAFT") return "bg-warning-subtle text-warning-emphasis";
  return "bg-light text-dark";
}

export default function ClinicBranchTable({ rows, loading = false }: ClinicBranchTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchStatus = status ? String(row.status || "").toUpperCase() === status : true;
      if (!matchStatus) return false;
      if (!q) return true;
      const haystack = `${row.name} ${row.org?.name || ""} ${row.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, status]);

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <label className="form-label">Search clinic</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by clinic name or organization"
              className="form-control radius-12"
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="form-label">Status</label>
            <select
              className="form-select radius-12"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Branch</th>
                <th>Doctors</th>
                <th>Today Patients</th>
                <th>Services</th>
                <th>Revenue Today</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No clinic branch found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="fw-semibold">{row.name || `Clinic #${row.id}`}</div>
                      <div className="small text-muted">{row.org?.name || `Org #${row.orgId}`}</div>
                    </td>
                    <td>{row.id}</td>
                    <td>{row.doctorsCount ?? 0}</td>
                    <td>{row.todayPatients ?? 0}</td>
                    <td>{row.servicesCount ?? 0}</td>
                    <td>
                      ৳
                      {Number(row.todayRevenue || 0).toLocaleString("en-BD", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td>
                      <span className={`badge ${statusClass(row.status)} radius-8`}>
                        {row.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end flex-wrap gap-2">
                        <Link href={`/owner/clinic/${row.id}/catalog`} className="btn btn-sm btn-outline-primary radius-12">
                          Catalog
                        </Link>
                        <Link href={`/owner/clinic/${row.id}/inventory`} className="btn btn-sm btn-outline-primary radius-12">
                          Inventory
                        </Link>
                        <Link href={`/owner/clinic/${row.id}/catalog/vaccine-mappings`} className="btn btn-sm btn-outline-secondary radius-12">
                          Vaccine Mapping
                        </Link>
                        <Link href={`/owner/clinic/${row.id}`} className="btn btn-sm btn-primary radius-12">
                          <i className="ri-arrow-right-line me-1" />
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

