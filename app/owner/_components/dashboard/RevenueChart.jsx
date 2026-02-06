"use client";

import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

export default function RevenueChart({ data = [], period = "30d", loading = false, height = 320 }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="placeholder-glow">
            <span className="placeholder col-4 mb-3 d-block" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12" />
          </div>
        </div>
      </div>
    );
  }

  const categories = data.map((d) => d.date || d.label || "");
  const series = [{ name: "Revenue", data: data.map((d) => Number(d.revenue ?? d.value ?? 0)) }];

  const periodLabels = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "6m": "Last 6 Months",
    "1y": "Last Year",
  };

  const options = {
    chart: { type: "area", zoom: { enabled: false }, toolbar: { show: true } },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: [CHART_COLORS.success],
    xaxis: { categories },
    yaxis: {
      labels: {
        formatter: (v) => (v >= 1000 ? `৳${(v / 1000).toFixed(1)}k` : `৳${v}`),
      },
    },
    tooltip: {
      y: { formatter: (v) => `৳${Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    title: { text: `Revenue Trend - ${periodLabels[period] || period}`, align: "left", style: { fontSize: "16px", fontWeight: 600 } },
  };

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        {typeof window !== "undefined" && (
          <ReactApexChart type="area" series={series} options={options} height={height} />
        )}
        {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
      </div>
    </div>
  );
}
