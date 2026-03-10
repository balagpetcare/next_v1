"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ownerClinicBranches,
  ownerClinicDashboardStatsSafe,
  type OwnerClinicDashboardStats,
} from "@/app/owner/_lib/ownerApi";

type BranchSummary = {
  id: number;
  name: string;
  orgId: number;
  org?: { id: number; name: string };
  status?: string;
};

type ClinicConsoleHeaderProps = {
  branchId: string;
};

function badgeClass(status?: string): string {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACTIVE") return "bg-success-subtle text-success-emphasis";
  if (normalized === "INACTIVE") return "bg-danger-subtle text-danger-emphasis";
  if (normalized === "DRAFT") return "bg-warning-subtle text-warning-emphasis";
  return "bg-light text-dark";
}

export default function ClinicConsoleHeader({ branchId }: ClinicConsoleHeaderProps) {
  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [stats, setStats] = useState<OwnerClinicDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!branchId) {
        if (mounted) {
          setBranch(null);
          setStats(null);
          setLoading(false);
        }
        return;
      }
      try {
        setLoading(true);
        const [branchesRes, statsRes] = await Promise.all([
          ownerClinicBranches(),
          ownerClinicDashboardStatsSafe(branchId),
        ]);
        if (!mounted) return;
        const branches = Array.isArray(branchesRes?.data)
          ? (branchesRes?.data as BranchSummary[])
          : [];
        setBranch(branches.find((item) => String(item.id) === String(branchId)) ?? null);
        setStats(statsRes);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [branchId]);

  return (
    <div className="card radius-12 mb-4">
      <div className="card-body p-24">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <div className="text-muted small mb-1">Clinic Management Console</div>
            <h4 className="mb-1">{branch?.name || `Clinic #${branchId}`}</h4>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="text-muted small">
                {branch?.org?.name || `Organization #${branch?.orgId ?? ""}`}
              </span>
              <span className={`badge ${badgeClass(branch?.status)} radius-8`}>
                {branch?.status || "UNKNOWN"}
              </span>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <Link href="/owner/clinic" className="btn btn-sm btn-outline-secondary radius-12">
              <i className="ri-arrow-left-line me-1" />
              All Clinics
            </Link>
            <Link href={`/owner/clinic/${branchId}/settings`} className="btn btn-sm btn-primary radius-12">
              <i className="ri-settings-3-line me-1" />
              Clinic Settings
            </Link>
          </div>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Appointments Today</div>
              <div className="fw-semibold">{loading ? "..." : stats?.todayAppointments ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Patients Today</div>
              <div className="fw-semibold">{loading ? "..." : stats?.todayPatients ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Walk-ins</div>
              <div className="fw-semibold">{loading ? "..." : stats?.walkIns ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Doctors On Duty</div>
              <div className="fw-semibold">{loading ? "..." : stats?.doctorsOnDuty ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Low Stock Alerts</div>
              <div className="fw-semibold">{loading ? "..." : stats?.lowStockAlerts ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <div className="bg-light radius-12 p-3">
              <div className="text-muted small">Revenue Today</div>
              <div className="fw-semibold">
                {loading
                  ? "..."
                  : `৳${Number(stats?.todayRevenue || 0).toLocaleString("en-BD", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

