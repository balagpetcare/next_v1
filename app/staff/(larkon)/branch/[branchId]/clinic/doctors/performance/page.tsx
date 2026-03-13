"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { profile, profileTab, performance as performanceRoute, doctors } from "@/src/lib/doctorOperationsRoutes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorsPerformanceSummary, staffDoctorPerformance } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  StatCard,
  SectionCard,
  FilterBar,
  EmptyState,
} from "@/src/components/dashboard";
import { DoctorSelector, Doctor360Drawer } from "@/src/components/clinic/doctors";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.assign"];

type RangeKey = "today" | "week" | "month" | "custom";

function formatCurrency(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `৳${Number(n).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

function getRange(rangeKey: RangeKey, customFrom?: string, customTo?: string): { from: string; to: string } {
  const to = new Date();
  let from = new Date();
  if (rangeKey === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (rangeKey === "week") {
    from.setDate(from.getDate() - 7);
  } else if (rangeKey === "month") {
    from.setMonth(from.getMonth() - 1);
  } else if (rangeKey === "custom" && customFrom && customTo) {
    from = new Date(customFrom);
    return { from: customFrom, to: customTo };
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function StaffClinicDoctorsPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return undefined;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? undefined : n;
  }, [searchParams]);

  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);
  const [performance, setPerformance] = useState<{
    doctors: Array<{
      branchMemberId: number;
      displayName: string;
      appointmentsCompleted: number;
      appointmentsTotal: number;
      revenueContribution: number | null;
      topServices: Array<{ serviceId: number; serviceName: string | null; count: number }>;
    }>;
    totals: { appointmentsCompleted: number; revenueContribution: number | null };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const { from, to } = useMemo(
    () => getRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo]
  );

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    try {
      if (memberIdFromUrl != null) {
        const data = await staffDoctorPerformance(branchId, memberIdFromUrl, { from, to });
        const single = data as any;
        setPerformance(
          single
            ? {
                doctors: [
                  {
                    branchMemberId: memberIdFromUrl,
                    displayName: single.displayName ?? `Doctor #${memberIdFromUrl}`,
                    appointmentsCompleted: single.appointmentsCompleted ?? 0,
                    appointmentsTotal: single.appointmentsTotal ?? 0,
                    revenueContribution: single.revenueContribution ?? null,
                    topServices: Array.isArray(single.topServices) ? single.topServices : [],
                  },
                ],
                totals: {
                  appointmentsCompleted: single.appointmentsCompleted ?? 0,
                  revenueContribution: single.revenueContribution ?? null,
                },
              }
            : null
        );
      } else {
        const data = await staffDoctorsPerformanceSummary(branchId, { from, to, limit: 50, offset: 0 });
        setPerformance(data ?? null);
      }
    } catch {
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess, from, to, memberIdFromUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const setMemberIdInUrl = useCallback(
    (memberId: number | undefined) => {
      const path = performanceRoute(branchId);
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (memberId != null) next.set("memberId", String(memberId));
      else next.delete("memberId");
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [branchId, router, searchParams]
  );

  const totals = performance?.totals ?? { appointmentsCompleted: 0, revenueContribution: null };
  const doctors = (performance?.doctors ?? []).sort(
    (a, b) => (b.revenueContribution ?? 0) - (a.revenueContribution ?? 0)
  );

  if (ctxLoading || !branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} />
        <AccessDenied requiredPerm="clinic.doctors.view" />
      </PageWorkspace>
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} />
      <PageHeader
        title="Performance & Earnings"
        subtitle={memberIdFromUrl != null ? "Earnings for selected doctor" : "Doctor revenue and appointment summary"}
      />

      <FilterBar className="mb-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 small fw-medium">Doctor</label>
            <DoctorSelector
              branchId={branchId}
              value={memberIdFromUrl}
              onChange={setMemberIdInUrl}
              placeholder="All doctors"
              enabled={hasAccess}
            />
          </div>
          <span className="text-muted small">Period:</span>
          {(["today", "week", "month", "custom"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${rangeKey === key ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setRangeKey(key)}
            >
              {key === "today" ? "Today" : key === "week" ? "This Week" : key === "month" ? "This Month" : "Custom"}
            </button>
          ))}
          {rangeKey === "custom" && (
            <>
              <input
                type="date"
                className="form-control form-control-sm"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                placeholder="From"
              />
              <input
                type="date"
                className="form-control form-control-sm"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="To"
              />
            </>
          )}
        </div>
      </FilterBar>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard
            label={memberIdFromUrl != null ? "Appointments" : "Total Appointments"}
            value={loading ? "—" : totals.appointmentsCompleted}
            icon="ri:calendar-check-line"
            variant="info"
            loading={loading}
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label={memberIdFromUrl != null ? "Doctor Share" : "Total Doctor Share"}
            value={loading ? "—" : formatCurrency(totals.revenueContribution)}
            icon="ri:bank-card-line"
            variant="success"
            loading={loading}
          />
        </div>
      </div>

      <SectionCard title={memberIdFromUrl != null ? "Earnings" : "Doctor Earnings"} subtitle={`${from} to ${to}`}>
        {loading ? (
          <LoadingState message="Loading…" />
        ) : doctors.length === 0 ? (
          <EmptyState
            title="No performance data available"
            description="No appointments or earnings recorded for this branch in the selected period."
            icon="ri:bank-card-line"
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th className="text-end">Appointments</th>
                  <th className="text-end">Doctor Share</th>
                  <th>Top Services</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.branchMemberId}>
                    <td>
                      <Link
                        href={profile(branchId, d.branchMemberId)}
                        className="fw-medium"
                      >
                        {d.displayName}
                      </Link>
                    </td>
                    <td className="text-end">{d.appointmentsCompleted}</td>
                    <td className="text-end">{formatCurrency(d.revenueContribution)}</td>
                    <td>
                      <span className="text-muted small">
                        {(d.topServices ?? [])
                          .slice(0, 3)
                          .map((s) => `${s.serviceName ?? "—"} (${s.count})`)
                          .join(", ") || "—"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={profileTab(branchId, d.branchMemberId, "fees")}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />
    </PageWorkspace>
  );
}
