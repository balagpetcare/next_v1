"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ownerClinicBranches,
  ownerClinicPackagesList,
} from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgName: string;
};

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

type AggregatedPackageRow = {
  rowKey: string;
  branchId: number;
  branchName: string;
  orgName: string;
  packageId: number;
  packageCode: string;
  packageName: string;
  packageType: string;
  serviceName: string;
  baseSellingPrice: number;
  itemsCount: number;
  priceRulesCount: number;
  status: string;
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
      return {
        id,
        name:
          typeof row.name === "string" && row.name.trim()
            ? row.name
            : `Branch #${id}`,
        orgName:
          (org && typeof org.name === "string" && org.name.trim()
            ? org.name
            : undefined) ?? "Unknown org",
      };
    })
    .filter((row): row is ClinicBranch => row != null);
}

function toPackageItems(value: unknown): PackageItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PackageItem => {
    const row = asRecord(item);
    return row != null && toNumber(row.id) != null && typeof row.packageName === "string";
  });
}

function mapRows(branch: ClinicBranch, items: PackageItem[]): AggregatedPackageRow[] {
  return items.map((item) => ({
    rowKey: `${branch.id}-${item.id}`,
    branchId: branch.id,
    branchName: branch.name,
    orgName: branch.orgName,
    packageId: item.id,
    packageCode: item.packageCode || "—",
    packageName: item.packageName,
    packageType: item.packageType || "STANDARD",
    serviceName: item.service?.name || "—",
    baseSellingPrice: toNumber(item.baseSellingPrice) ?? 0,
    itemsCount: toNumber(item._count?.items) ?? 0,
    priceRulesCount: toNumber(item._count?.priceRules) ?? 0,
    status: item.status || "ACTIVE",
  }));
}

export default function ClinicAllPackages() {
  const [rows, setRows] = useState<AggregatedPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
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
            const packagesRes = await ownerClinicPackagesList(branch.id, {
              page: 1,
              limit: 100,
            });
            return {
              branch,
              items: toPackageItems(packagesRes.items),
            };
          })
        );

        if (!mounted) return;

        const nextRows: AggregatedPackageRow[] = [];
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
            `Could not load packages from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }
        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic packages");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) =>
        statusFilter ? row.status.toUpperCase() === statusFilter : true
      )
      .filter((row) => {
        if (!needle) return true;
        return (
          row.packageName.toLowerCase().includes(needle) ||
          row.packageCode.toLowerCase().includes(needle) ||
          row.branchName.toLowerCase().includes(needle) ||
          row.orgName.toLowerCase().includes(needle) ||
          row.serviceName.toLowerCase().includes(needle)
        );
      });
  }, [rows, query, statusFilter]);

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
              <label className="form-label">Search package</label>
              <input
                type="text"
                className="form-control radius-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Package name, code, branch, service"
              />
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
                  <th>Package</th>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Base Price</th>
                  <th>Items</th>
                  <th>Rules</th>
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
                      No packages found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.rowKey}>
                      <td>
                        <div className="fw-semibold">{row.packageName}</div>
                        <div className="small text-muted">
                          <code>{row.packageCode}</code>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">
                          {row.packageType}
                        </span>
                      </td>
                      <td>{row.serviceName}</td>
                      <td>৳{row.baseSellingPrice.toLocaleString("en-BD")}</td>
                      <td>{row.itemsCount}</td>
                      <td>{row.priceRulesCount}</td>
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
                            href={`/owner/clinic/${row.branchId}/packages/${row.packageId}`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            View
                          </Link>
                          <Link
                            href={`/owner/clinic/${row.branchId}/packages`}
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

