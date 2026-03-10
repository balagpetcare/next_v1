"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ownerClinicBranches,
  ownerClinicNetworkStats,
  ownerClinicReportProfitability,
  type OwnerClinicNetworkStats,
} from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgName: string;
};

type ProfitabilitySnapshot = {
  revenue: number;
  directCost: number;
  distributableMargin: number;
  orderCount: number;
};

type BranchReportRow = {
  branchId: number;
  branchName: string;
  orgName: string;
  todayAppointments: number;
  todayRevenue: number;
  profitabilityRevenue: number;
  directCost: number;
  margin: number;
  orderCount: number;
  reportLoaded: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pickBranches(res: { data?: unknown[] } | null): ClinicBranch[] {
  if (!Array.isArray(res?.data)) return [];
  return res.data
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const id = toNumber(row.id);
      if (!id) return null;
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

function parseProfitability(payload: unknown): ProfitabilitySnapshot {
  const row = asRecord(payload);
  if (!row) {
    return { revenue: 0, directCost: 0, distributableMargin: 0, orderCount: 0 };
  }
  return {
    revenue: toNumber(row.revenue),
    directCost: toNumber(row.directCost),
    distributableMargin: toNumber(row.distributableMargin),
    orderCount: toNumber(row.orderCount),
  };
}

function defaultDateRange() {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 29);
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

export default function ClinicReportsOverview() {
  const initialRange = defaultDateRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [networkStats, setNetworkStats] = useState<OwnerClinicNetworkStats | null>(null);
  const [rows, setRows] = useState<BranchReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [branchesRes, statsRes] = await Promise.all([
          ownerClinicBranches(),
          ownerClinicNetworkStats(),
        ]);
        const branches = pickBranches(branchesRes as { data?: unknown[] } | null);
        const branchStatsMap = new Map(
          (statsRes?.branchStats || []).map((item) => [item.branchId, item])
        );

        if (mounted) {
          setNetworkStats(statsRes);
        }

        if (branches.length === 0) {
          if (mounted) setRows([]);
          return;
        }

        const profitabilityResults = await Promise.allSettled(
          branches.map(async (branch) => {
            const report = await ownerClinicReportProfitability(branch.id, from, to);
            const parsed = parseProfitability(report);
            const branchStats = branchStatsMap.get(branch.id);
            return {
              branchId: branch.id,
              branchName: branch.name,
              orgName: branch.orgName,
              todayAppointments: toNumber(branchStats?.todayAppointments),
              todayRevenue: toNumber(branchStats?.todayRevenue),
              profitabilityRevenue: parsed.revenue,
              directCost: parsed.directCost,
              margin: parsed.distributableMargin,
              orderCount: parsed.orderCount,
              reportLoaded: true,
            } satisfies BranchReportRow;
          })
        );

        if (!mounted) return;

        const nextRows: BranchReportRow[] = [];
        let failedCount = 0;
        profitabilityResults.forEach((result, idx) => {
          if (result.status === "fulfilled") {
            nextRows.push(result.value);
          } else {
            const fallbackBranch = branches[idx];
            if (!fallbackBranch) return;
            failedCount += 1;
            const stats = branchStatsMap.get(fallbackBranch.id);
            nextRows.push({
              branchId: fallbackBranch.id,
              branchName: fallbackBranch.name,
              orgName: fallbackBranch.orgName,
              todayAppointments: toNumber(stats?.todayAppointments),
              todayRevenue: toNumber(stats?.todayRevenue),
              profitabilityRevenue: 0,
              directCost: 0,
              margin: 0,
              orderCount: 0,
              reportLoaded: false,
            });
          }
        });

        if (failedCount > 0) {
          setError(
            `Could not load profitability report from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }

        nextRows.sort((a, b) => b.profitabilityRevenue - a.profitabilityRevenue);
        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic reports overview");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [from, to]);

  const totals = useMemo(() => {
    return {
      reportRevenue: rows.reduce((sum, row) => sum + row.profitabilityRevenue, 0),
      reportMargin: rows.reduce((sum, row) => sum + row.margin, 0),
      reportOrders: rows.reduce((sum, row) => sum + row.orderCount, 0),
    };
  }, [rows]);

  return (
    <>
      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="row g-3 align-items-end">
            <div className="col-auto">
              <label className="form-label">From</label>
              <input
                type="date"
                className="form-control radius-12"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label">To</label>
              <input
                type="date"
                className="form-control radius-12"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <div className="small text-secondary-light mb-1">Network today revenue</div>
              <div className="fw-semibold">৳{toNumber(networkStats?.todayRevenue).toLocaleString("en-BD")}</div>
            </div>
            <div className="col-auto">
              <div className="small text-secondary-light mb-1">Range revenue</div>
              <div className="fw-semibold">৳{totals.reportRevenue.toLocaleString("en-BD")}</div>
            </div>
            <div className="col-auto">
              <div className="small text-secondary-light mb-1">Range margin</div>
              <div className="fw-semibold">৳{totals.reportMargin.toLocaleString("en-BD")}</div>
            </div>
            <div className="col-auto">
              <div className="small text-secondary-light mb-1">Range orders</div>
              <div className="fw-semibold">{totals.reportOrders}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Today appointments</th>
                  <th>Today revenue</th>
                  <th>Report revenue</th>
                  <th>Direct cost</th>
                  <th>Margin</th>
                  <th>Orders</th>
                  <th>Report status</th>
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
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      No clinic branches found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.branchId}>
                      <td>
                        <div className="fw-semibold">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>{row.todayAppointments}</td>
                      <td>৳{row.todayRevenue.toLocaleString("en-BD")}</td>
                      <td>৳{row.profitabilityRevenue.toLocaleString("en-BD")}</td>
                      <td>৳{row.directCost.toLocaleString("en-BD")}</td>
                      <td>৳{row.margin.toLocaleString("en-BD")}</td>
                      <td>{row.orderCount}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            row.reportLoaded
                              ? "bg-success-subtle text-success-emphasis"
                              : "bg-warning-subtle text-warning-emphasis"
                          }`}
                        >
                          {row.reportLoaded ? "Loaded" : "Partial"}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link
                          href={`/owner/clinic/${row.branchId}/reports`}
                          className="btn btn-sm btn-outline-primary radius-12"
                        >
                          Open reports
                        </Link>
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

