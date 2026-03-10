"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ownerClinicBranches,
  ownerClinicNetworkStats,
  type OwnerClinicNetworkStats,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicNetworkStats from "@/app/owner/_components/clinic/ClinicNetworkStats";
import ClinicBranchTable, {
  type ClinicBranchRow,
} from "@/app/owner/_components/clinic/ClinicBranchTable";
import ClinicAllDoctors from "@/app/owner/_components/clinic/ClinicAllDoctors";
import ClinicAllServices from "@/app/owner/_components/clinic/ClinicAllServices";
import ClinicAllPackages from "@/app/owner/_components/clinic/ClinicAllPackages";
import ClinicScheduleOverview from "@/app/owner/_components/clinic/ClinicScheduleOverview";
import ClinicReportsOverview from "@/app/owner/_components/clinic/ClinicReportsOverview";
import ClinicSettingsOverview from "@/app/owner/_components/clinic/ClinicSettingsOverview";

type ClinicBranch = ClinicBranchRow & {
  id: number;
  name: string;
  orgId: number;
  org?: { id: number; name: string };
  status?: string;
  servicesCount?: number;
  staffCount?: number;
  appointmentsCount?: number;
};

type ClinicOwnerView =
  | "overview"
  | "doctors"
  | "services"
  | "catalog"
  | "packages"
  | "inventory"
  | "supply-requests"
  | "schedule"
  | "reports"
  | "settings";

type ClinicOwnerNavItem = {
  key: ClinicOwnerView;
  label: string;
  href: string;
};

const OWNER_CLINIC_NAV_ITEMS: ClinicOwnerNavItem[] = [
  { key: "overview", label: "Clinic Network", href: "/owner/clinic" },
  { key: "doctors", label: "Doctors", href: "/owner/clinic?view=doctors" },
  { key: "services", label: "Services", href: "/owner/clinic?view=services" },
  { key: "catalog", label: "Catalog", href: "/owner/clinic?view=catalog" },
  { key: "packages", label: "Packages", href: "/owner/clinic?view=packages" },
  { key: "inventory", label: "Inventory", href: "/owner/clinic?view=inventory" },
  { key: "supply-requests", label: "Supply requests", href: "/owner/clinic/supply-requests" },
  { key: "schedule", label: "Schedule", href: "/owner/clinic?view=schedule" },
  { key: "reports", label: "Reports", href: "/owner/clinic?view=reports" },
  { key: "settings", label: "Settings", href: "/owner/clinic?view=settings" },
];

function resolveOwnerClinicView(value: string | null): ClinicOwnerView {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "doctors" ||
    normalized === "services" ||
    normalized === "catalog" ||
    normalized === "packages" ||
    normalized === "inventory" ||
    normalized === "supply-requests" ||
    normalized === "schedule" ||
    normalized === "reports" ||
    normalized === "settings"
  ) {
    return normalized;
  }
  return "overview";
}

function ClinicOwnerSubNav({ activeView }: { activeView: ClinicOwnerView }) {
  return (
    <div className="card radius-12 mb-4 owner-clinic-subnav-card">
      <div className="card-body p-16">
        <ul className="nav sub-navbar-nav owner-clinic-subnav">
          {OWNER_CLINIC_NAV_ITEMS.map((item) => {
            const active = item.key === activeView;
            return (
              <li className="sub-nav-item owner-clinic-subnav-item" key={item.key}>
                <Link
                  href={item.href}
                  className={`sub-nav-link owner-clinic-subnav-link ${active ? "active" : ""}`.trim()}
                >
                  <span className="nav-text">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function pickData(res: { success?: boolean; data?: unknown[] } | null): ClinicBranch[] {
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data as ClinicBranch[];
}

export default function ClinicOverviewPage() {
  const searchParams = useSearchParams();
  const activeView = resolveOwnerClinicView(searchParams.get("view"));
  const [branches, setBranches] = useState<ClinicBranchRow[]>([]);
  const [networkStats, setNetworkStats] = useState<OwnerClinicNetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeView !== "overview" && activeView !== "catalog" && activeView !== "inventory") return;
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [branchesRes, statsRes] = await Promise.all([
          ownerClinicBranches(),
          ownerClinicNetworkStats(),
        ]);
        const branchRows = pickData(branchesRes as { success?: boolean; data?: unknown[] });
        if (!mounted) return;

        const branchStatsMap = new Map(
          (statsRes?.branchStats || []).map((row) => [row.branchId, row])
        );
        const mergedRows: ClinicBranchRow[] = branchRows.map((branch) => ({
          ...branch,
          doctorsCount: branchStatsMap.get(branch.id)?.doctorsCount ?? branch.doctorsCount ?? 0,
          todayPatients: branchStatsMap.get(branch.id)?.todayPatients ?? 0,
          todayRevenue: branchStatsMap.get(branch.id)?.todayRevenue ?? 0,
        }));

        setBranches(mergedRows);
        setNetworkStats(statsRes);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic network data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [activeView]);

  const patientFlowTrend = useMemo(
    () => [...(networkStats?.patientFlowTrend || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [networkStats]
  );

  const maxFlow = useMemo(() => {
    const max = Math.max(...patientFlowTrend.map((row) => row.appointments), 0);
    return max > 0 ? max : 1;
  }, [patientFlowTrend]);

  const revenueByClinic = useMemo(
    () => [...(networkStats?.revenueByClinic || [])].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    [networkStats]
  );

  const maxRevenue = useMemo(() => {
    const max = Math.max(...revenueByClinic.map((row) => Number(row.revenue || 0)), 0);
    return max > 0 ? max : 1;
  }, [revenueByClinic]);

  if (activeView === "doctors") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Doctors"
          subtitle="Cross-branch doctor roster and profile access"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Doctors", href: "/owner/clinic?view=doctors" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicAllDoctors />
      </div>
    );
  }

  if (activeView === "services") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Services"
          subtitle="Cross-branch service catalog with direct management links"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Services", href: "/owner/clinic?view=services" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicAllServices />
      </div>
    );
  }

  if (activeView === "catalog") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Catalog"
          subtitle="Clinical item catalog and categories per branch"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Catalog", href: "/owner/clinic?view=catalog" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        {loading ? (
          <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div></div>
        ) : branches.length === 0 ? (
          <div className="card radius-12"><div className="card-body text-center py-5 text-muted">No clinic branches. Add a branch with type Clinic to manage catalog.</div></div>
        ) : (
          <ClinicBranchTable rows={branches} loading={loading} />
        )}
      </div>
    );
  }

  if (activeView === "inventory") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Inventory"
          subtitle="Branch stock and clinical item inventory"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Inventory", href: "/owner/clinic?view=inventory" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        {loading ? (
          <div className="card radius-12"><div className="card-body text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading…</p></div></div>
        ) : branches.length === 0 ? (
          <div className="card radius-12"><div className="card-body text-center py-5 text-muted">No clinic branches. Add a branch with type Clinic to manage inventory.</div></div>
        ) : (
          <ClinicBranchTable rows={branches} loading={loading} />
        )}
      </div>
    );
  }

  if (activeView === "packages") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Packages"
          subtitle="Cross-branch surgery package visibility"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Packages", href: "/owner/clinic?view=packages" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicAllPackages />
      </div>
    );
  }

  if (activeView === "schedule") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Schedule"
          subtitle="Branch-wise schedule templates and holiday overview"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Schedule", href: "/owner/clinic?view=schedule" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicScheduleOverview />
      </div>
    );
  }

  if (activeView === "reports") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Reports"
          subtitle="Network summary and branch report availability"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Reports", href: "/owner/clinic?view=reports" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicReportsOverview />
      </div>
    );
  }

  if (activeView === "settings") {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Clinic Settings"
          subtitle="Clinic module and appointment setting status per branch"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Clinic", href: "/owner/clinic" },
            { label: "Settings", href: "/owner/clinic?view=settings" },
          ]}
        />
        <ClinicOwnerSubNav activeView={activeView} />
        <ClinicSettingsOverview />
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Clinic Network Dashboard"
        subtitle="Owner-level control for all clinic branches"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
        ]}
      />

      <ClinicOwnerSubNav activeView={activeView} />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <ClinicNetworkStats stats={networkStats} loading={loading} />

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-hospital-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No clinic branches</h5>
            <p className="text-muted mb-4">
              Add a branch with type &quot;Clinic&quot; from Branches to see it here.
            </p>
            <Link href="/owner/branches" className="btn btn-primary radius-12">
              <i className="ri-store-line me-1" />
              Go to Branches
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-xl-6">
              <div className="card radius-12 h-100">
                <div className="card-body p-24">
                  <h6 className="mb-3 fw-semibold">
                    <i className="ri-line-chart-line me-2 text-primary" />
                    Patient Flow Trend
                  </h6>
                  {patientFlowTrend.length === 0 ? (
                    <p className="text-muted mb-0">No patient flow trend available.</p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {patientFlowTrend.map((row) => {
                        const pct = Math.min(
                          100,
                          Math.round((row.appointments / maxFlow) * 100)
                        );
                        return (
                          <div key={row.date}>
                            <div className="d-flex justify-content-between small mb-1">
                              <span>{row.date}</span>
                              <span>
                                {row.appointments} appointments / {row.visits} visits
                              </span>
                            </div>
                            <div className="progress">
                              <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-6">
              <div className="card radius-12 h-100">
                <div className="card-body p-24">
                  <h6 className="mb-3 fw-semibold">
                    <i className="ri-money-dollar-circle-line me-2 text-success" />
                    Revenue by Clinic (Today)
                  </h6>
                  {revenueByClinic.length === 0 ? (
                    <p className="text-muted mb-0">No clinic revenue data available.</p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {revenueByClinic.map((row) => {
                        const revenue = Number(row.revenue || 0);
                        const pct = Math.min(100, Math.round((revenue / maxRevenue) * 100));
                        return (
                          <div key={row.branchId}>
                            <div className="d-flex justify-content-between small mb-1">
                              <span>{row.branchName}</span>
                              <span>৳{revenue.toLocaleString("en-BD")}</span>
                            </div>
                            <div className="progress">
                              <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ClinicBranchTable rows={branches} loading={loading} />
        </>
      )}
    </div>
  );
}
