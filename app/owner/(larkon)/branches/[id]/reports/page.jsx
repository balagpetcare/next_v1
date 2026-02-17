"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";
import { RevenueAreaChart } from "@/app/owner/_components/branch/BranchCharts";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { useEffect, useState } from "react";

const reportLinks = () => [
  { label: "Sales Report", href: "/owner/reports", icon: "ri-line-chart-line" },
  { label: "Stock Report", href: "/owner/reports", icon: "ri-stack-line" },
  { label: "Revenue Analytics", href: "/owner/reports", icon: "ri-money-dollar-circle-line" },
];

export default function BranchReportsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        const id = parseInt(branchId, 10);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const res = await ownerGet(
          `/api/v1/reports/sales?branchId=${id}&startDate=${sixMonthsAgo.toISOString().split("T")[0]}&groupBy=month`
        ).catch(() => ({ data: { grouped: [] } }));
        const grouped = res?.data?.grouped ?? [];
        setRevenueData(grouped.map((d) => ({ date: d.date, revenue: d.sales ?? 0 })));
      } catch (e) {
        console.error("Reports load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const base = `/owner/branches/${branchId}`;
  const links = reportLinks();

  return (
    <BranchPageShell
      title="Reports"
      subtitle="Sales and analytics for this branch"
      breadcrumbLabel="Reports"
      loading={false}
      actions={[
        <Link key="reports" href="/owner/reports" className="btn btn-primary radius-12">
          <i className="ri-file-chart-line me-1" />
          Full Reports
        </Link>,
      ]}
    >
      <div className="row g-4 mb-4">
        {links.map((r) => (
          <div key={r.label} className="col-md-4">
            <Link href={r.href} className="card radius-12 text-decoration-none text-dark h-100 hover-lift">
              <div className="card-body p-24 d-flex align-items-center gap-3">
                <div className="rounded-circle bg-primary-focus text-primary d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                  <i className={`${r.icon} fs-5`} />
                </div>
                <div>
                  <h6 className="mb-1 fw-semibold">{r.label}</h6>
                  <span className="text-secondary-light small">View in main Reports</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Revenue trend (last 6 months)</h6>
          <RevenueAreaChart data={revenueData} loading={loading} />
        </div>
      </div>
    </BranchPageShell>
  );
}
