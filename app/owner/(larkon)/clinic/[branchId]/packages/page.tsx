"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicPackagesList,
  ownerClinicPackageDelete,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type PackageItem = {
  id: number;
  packageCode: string;
  packageName: string;
  packageType?: string;
  baseSellingPrice?: number | string;
  status?: string;
  service?: { id: number; name: string; category?: string };
  _count?: { items: number; priceRules: number };
};

function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const PACKAGE_TYPES = ["STANDARD", "PREMIUM", "WELFARE", "EMERGENCY", "PROMOTIONAL", "DOCTOR_SPECIFIC", "BRANCH_SPECIFIC"] as const;
const PACKAGE_TYPE_BADGE: Record<string, string> = {
  STANDARD: "bg-primary-subtle text-primary-emphasis",
  PREMIUM: "bg-success-subtle text-success-emphasis",
  WELFARE: "bg-info-subtle text-info-emphasis",
  EMERGENCY: "bg-warning-subtle text-warning-emphasis",
  PROMOTIONAL: "bg-secondary-subtle text-secondary-emphasis",
  DOCTOR_SPECIFIC: "bg-primary-subtle text-primary-emphasis",
  BRANCH_SPECIFIC: "bg-info-subtle text-info-emphasis",
};

export default function ClinicPackagesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [data, setData] = useState<{ items: PackageItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>({
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicPackagesList(branchId, { page: 1, limit: 50 });
      setData({
        items: (res.items ?? []) as PackageItem[],
        pagination: res.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const filteredItems = useMemo(() => {
    let list = data.items;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.packageName || "").toLowerCase().includes(q) ||
          (p.packageCode || "").toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter((p) => (p.packageType ?? "STANDARD") === filterType);
    if (filterStatus) list = list.filter((p) => (p.status ?? "ACTIVE") === filterStatus);
    return list;
  }, [data.items, search, filterType, filterStatus]);

  const stats = useMemo(() => {
    const items = data.items;
    return {
      total: items.length,
      active: items.filter((p) => (p.status ?? "ACTIVE") === "ACTIVE").length,
      inactive: items.filter((p) => (p.status ?? "ACTIVE") !== "ACTIVE").length,
    };
  }, [data.items]);

  const handleDelete = async (pkg: PackageItem) => {
    if (!branchId || !confirm(`Deactivate package "${pkg.packageName}"? This sets status to INACTIVE.`)) return;
    try {
      await ownerClinicPackageDelete(branchId, pkg.id);
      setData((prev) => ({ ...prev, items: prev.items.filter((x) => x.id !== pkg.id) }));
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete");
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Surgery packages"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
        ]}
        actions={[
          <Link key="templates" href={`/owner/clinic/${branchId}/packages/templates`} className="btn btn-outline-primary radius-12">
            <i className="ri-file-list-3-line me-1" />
            Templates
          </Link>,
          <Link key="new" href={`/owner/clinic/${branchId}/packages/new`} className="btn btn-primary radius-12">
            <i className="ri-add-line me-1" />
            New package
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading packages…</p>
          </div>
        </div>
      ) : data.items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-box-3-line fs-1 text-muted d-block mb-3" />
            <h5 className="mb-2">No packages yet</h5>
            <p className="text-muted small mb-4">Create a package to group services and consumables for surgery or procedures.</p>
            <Link href={`/owner/clinic/${branchId}/packages/new`} className="btn btn-primary radius-12">
              <i className="ri-add-line me-1" />
              Create your first package
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4">
              <div className="card radius-12 p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{stats.total}</div>
                    <small className="text-muted">Total packages</small>
                  </div>
                  <i className="ri-database-line fs-4 text-primary" />
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card radius-12 p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{stats.active}</div>
                    <small className="text-muted">Active</small>
                  </div>
                  <i className="ri-checkbox-circle-line fs-4 text-success" />
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card radius-12 p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{stats.inactive}</div>
                    <small className="text-muted">Inactive</small>
                  </div>
                  <i className="ri-close-circle-line fs-4 text-secondary" />
                </div>
              </div>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-body p-24">
              <div className="d-flex flex-wrap gap-3 mb-3">
                <input
                  type="text"
                  className="form-control form-control-sm radius-12"
                  style={{ maxWidth: 240 }}
                  placeholder="Search by name or code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="form-select form-select-sm radius-12 w-auto"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All types</option>
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm radius-12 w-auto"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Service</th>
                      <th>Type</th>
                      <th>Base price</th>
                      <th>Items</th>
                      <th>Price rules</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          No packages match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((pkg) => (
                        <tr key={pkg.id}>
                          <td><code className="small">{pkg.packageCode}</code></td>
                          <td className="fw-semibold">{pkg.packageName}</td>
                          <td>{pkg.service?.name ?? "—"}</td>
                          <td>
                            <span className={`badge radius-8 ${PACKAGE_TYPE_BADGE[pkg.packageType ?? "STANDARD"] ?? "bg-secondary"}`}>
                              {pkg.packageType ?? "STANDARD"}
                            </span>
                          </td>
                          <td>{formatMoney(pkg.baseSellingPrice)}</td>
                          <td>{pkg._count?.items ?? 0}</td>
                          <td>{pkg._count?.priceRules ?? 0}</td>
                          <td>
                            <span className={`badge radius-8 ${pkg.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                              {pkg.status ?? "ACTIVE"}
                            </span>
                          </td>
                          <td className="text-end">
                            <Link
                              href={`/owner/clinic/${branchId}/packages/${pkg.id}`}
                              className="btn btn-sm btn-outline-primary radius-8 me-1"
                            >
                              View
                            </Link>
                            <Link
                              href={`/owner/clinic/${branchId}/packages/${pkg.id}/edit`}
                              className="btn btn-sm btn-outline-secondary radius-8 me-1"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-8"
                              onClick={() => handleDelete(pkg)}
                            >
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {data.pagination.totalPages > 1 && (
                <p className="text-muted small mb-0 mt-3">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
