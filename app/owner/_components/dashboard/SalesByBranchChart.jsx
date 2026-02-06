"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
  purple: "#a855f7",
};

const COLOR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.danger,
];

export default function SalesByBranchChart({ data = [], loading = false, height = 320 }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Sales by Branch</h6>
          <div className="placeholder-glow">
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Sales by Branch</h6>
          <p className="text-muted mb-0 small">No sales data available for branches.</p>
        </div>
      </div>
    );
  }

  const branches = Array.isArray(data) ? data : [];
  const categories = branches.map((b) => b.name || b.branchName || `Branch #${b.branchId || b.id || ""}`);
  const salesData = branches.map((b) => Number(b.sales || b.totalSales || b.revenue || 0));

  const options = {
    chart: {
      type: "bar",
      toolbar: { show: true },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const branch = branches[config.dataPointIndex];
          if (branch?.branchId || branch?.id) {
            const id = branch.branchId || branch.id;
            window.location.href = `/owner/branches/${id}`;
          }
        },
      },
    },
    colors: COLOR_PALETTE,
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `৳${(val / 1000).toFixed(1)}k`,
      style: {
        fontSize: "11px",
        fontWeight: 600,
      },
    },
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: "11px",
        },
        rotate: -45,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        formatter: (v) => (v >= 1000 ? `৳${(v / 1000).toFixed(1)}k` : `৳${v}`),
      },
    },
    tooltip: {
      y: {
        formatter: (v) =>
          `৳${Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    legend: {
      show: false,
    },
  };

  const series = [
    {
      name: "Sales",
      data: salesData,
    },
  ];

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0 fw-semibold">Sales by Branch</h6>
          <Link href="/owner/branches" className="btn btn-sm btn-ghost-primary radius-8">
            View all
          </Link>
        </div>
        {typeof window !== "undefined" && (
          <ReactApexChart type="bar" series={series} options={options} height={height} />
        )}
        {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
        {branches.length > 0 && (
          <div className="mt-3">
            <div className="d-flex flex-wrap gap-2">
              {branches.slice(0, 5).map((b, idx) => {
                const id = b.branchId || b.id;
                const name = b.name || b.branchName || `Branch #${id || ""}`;
                const sales = Number(b.sales || b.totalSales || b.revenue || 0);
                return (
                  <Link
                    key={idx}
                    href={id ? `/owner/branches/${id}` : "#"}
                    className="badge bg-primary-focus text-primary radius-8 text-decoration-none"
                    style={{ fontSize: "11px" }}
                  >
                    {name}: ৳{sales.toLocaleString("en-BD")}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
