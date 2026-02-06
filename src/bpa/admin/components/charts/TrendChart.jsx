"use client";

import dynamic from "next/dynamic";
import SectionCard from "../SectionCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

/**
 * Line chart for Orders + GMV trend.
 * data: { date, orders, gmv }[]
 */
export default function TrendChart({ data = [], period = 7, loading = false, height = 280 }) {
  if (loading) {
    return (
      <SectionCard title={`Orders & GMV Trend (${period} days)`}>
        <div className="placeholder-glow">
          <span className="placeholder col-12 mb-2" />
          <span className="placeholder col-12 mb-2" />
          <span className="placeholder col-12 mb-2" />
          <span className="placeholder col-12" />
        </div>
      </SectionCard>
    );
  }

  const series = data.length
    ? [
        { name: "Orders", data: data.map((d) => d.orders ?? 0) },
        { name: "GMV (৳)", data: data.map((d) => Math.round(d.gmv ?? 0)) },
      ]
    : [{ name: "Orders", data: [] }, { name: "GMV (৳)", data: [] }];
  const categories = data.map((d) => d.date ?? "");

  const options = {
    chart: { type: "line", zoom: { enabled: false }, toolbar: { show: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: [CHART_COLORS.primary, CHART_COLORS.success],
    xaxis: { categories },
    yaxis: [
      { title: { text: "Orders" }, labels: { formatter: (v) => String(Math.round(v)) } },
      {
        opposite: true,
        title: { text: "GMV" },
        labels: { formatter: (v) => (v >= 1000 ? `৳${(v / 1000).toFixed(1)}k` : `৳${v}`) },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        { formatter: (v) => String(v) },
        { formatter: (v) => `৳${Number(v).toLocaleString("en-BD", { minimumFractionDigits: 0 })}` },
      ],
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right" },
  };

  return (
    <SectionCard title={`Orders & GMV Trend (${period} days)`}>
      {!data.length ? (
        <p className="text-secondary mb-0 small">No data yet. Adjust date range or wait for activity.</p>
      ) : (
        <>
          {typeof window !== "undefined" && (
            <ReactApexChart type="line" series={series} options={options} height={height} />
          )}
          {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
        </>
      )}
    </SectionCard>
  );
}
