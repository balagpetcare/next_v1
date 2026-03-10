"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ownerClinicBranches, ownerClinicServices } from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgName: string;
};

type ServiceItem = {
  id: number;
  name: string;
  category: string;
  price: number | string;
  duration?: number | null;
  status?: string;
  department?: string;
  serviceCode?: string | null;
  pricingVariants?: Array<{ id: number; species: string; price: number }>;
};

type AggregatedServiceRow = {
  rowKey: string;
  branchId: number;
  branchName: string;
  orgName: string;
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  category: string;
  department: string;
  status: string;
  price: number;
  duration: number | null;
  variantsCount: number;
};

const DEPARTMENT_LABELS: Record<string, string> = {
  DOCTOR_DESK: "Doctor",
  LAB: "Lab",
  PHARMACY: "Pharmacy",
  PROCEDURE_ROOM: "Procedure",
  GROOMING_UNIT: "Grooming",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickBranches(res: { data?: unknown[] } | null): ClinicBranch[] {
  if (!Array.isArray(res?.data)) return [];
  return res.data
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const id = toNumber(row.id);
      if (id == null) return null;
      const org = asRecord(row.org);
      const orgName =
        org && typeof org.name === "string" && org.name.trim()
          ? org.name
          : "Unknown org";
      return {
        id,
        name:
          typeof row.name === "string" && row.name.trim()
            ? row.name
            : `Branch #${id}`,
        orgName,
      };
    })
    .filter((row): row is ClinicBranch => row != null);
}

function toServiceItems(value: unknown): ServiceItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ServiceItem => {
    const row = asRecord(item);
    return row != null && toNumber(row.id) != null && typeof row.name === "string";
  });
}

function mapRows(branch: ClinicBranch, items: ServiceItem[]): AggregatedServiceRow[] {
  return items.map((item) => {
    const numericPrice = toNumber(item.price) ?? 0;
    const category = item.category || "OTHER";
    const department = item.department || "DOCTOR_DESK";
    return {
      rowKey: `${branch.id}-${item.id}`,
      branchId: branch.id,
      branchName: branch.name,
      orgName: branch.orgName,
      serviceId: item.id,
      serviceName: item.name,
      serviceCode: item.serviceCode || "—",
      category,
      department,
      status: item.status || "ACTIVE",
      price: numericPrice,
      duration: item.duration ?? null,
      variantsCount: Array.isArray(item.pricingVariants) ? item.pricingVariants.length : 0,
    };
  });
}

export default function ClinicAllServices() {
  const [rows, setRows] = useState<AggregatedServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const branchesRes = await ownerClinicBranches();
        const branches = pickBranches(branchesRes as { data?: unknown[] } | null);
        if (branches.length === 0) {
          if (mounted) setRows([]);
          return;
        }

        const results = await Promise.allSettled(
          branches.map(async (branch) => {
            const servicesRes = await ownerClinicServices(branch.id);
            const items = toServiceItems((servicesRes as { items?: unknown[] })?.items);
            return { branch, items };
          })
        );

        if (!mounted) return;

        const nextRows: AggregatedServiceRow[] = [];
        let failedCount = 0;
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            nextRows.push(...mapRows(result.value.branch, result.value.items));
          } else {
            failedCount += 1;
          }
        });

        if (failedCount > 0) {
          setError(
            `Could not load services from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }
        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic services");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.category)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => (categoryFilter ? row.category === categoryFilter : true))
      .filter((row) =>
        statusFilter ? row.status.toUpperCase() === statusFilter : true
      )
      .filter((row) => {
        if (!needle) return true;
        return (
          row.serviceName.toLowerCase().includes(needle) ||
          row.serviceCode.toLowerCase().includes(needle) ||
          row.branchName.toLowerCase().includes(needle) ||
          row.orgName.toLowerCase().includes(needle)
        );
      });
  }, [rows, query, categoryFilter, statusFilter]);

  return (
    <>
      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div className="flex-grow-1" style={{ minWidth: 240 }}>
              <label className="form-label">Search service</label>
              <input
                type="text"
                className="form-control radius-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Service name, code, branch, organization"
              />
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label">Category</label>
              <select
                className="form-select radius-12"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label">Status</label>
              <select
                className="form-select radius-12"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      No services found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.rowKey}>
                      <td>
                        <div className="fw-semibold">{row.serviceName}</div>
                        <div className="small text-muted">
                          <code>{row.serviceCode}</code>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>{row.category}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary-emphasis radius-8">
                          {DEPARTMENT_LABELS[row.department] || row.department}
                        </span>
                      </td>
                      <td>৳{row.price.toLocaleString("en-BD")}</td>
                      <td>{row.duration != null ? `${row.duration} min` : "—"}</td>
                      <td>{row.variantsCount}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            row.status === "ACTIVE"
                              ? "bg-success-subtle text-success-emphasis"
                              : "bg-secondary-subtle text-secondary-emphasis"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Link
                            href={`/owner/clinic/${row.branchId}/services/${row.serviceId}/edit`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/owner/clinic/${row.branchId}/services`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            Branch list
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
    </>
  );
}

