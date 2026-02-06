"use client";

import dynamic from "next/dynamic";
import SectionCard from "../SectionCard";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = { primary: "#6366f1", success: "#22c55e", info: "#0ea5e9" };

/**
 * Bar chart for new users / new owners trend.
 * data: { date, users, owners }[]
 */
export default function UsersOwnersBarChart({ data = [], period = 7, loading = false, height = 260 }) {
  if (loading) {
    return (
      <SectionCard title={`New Users & Owners (${period} days)`}>
        <div className="placeholder-glow">
          <span className="placeholder col-12 mb-2" />
          <span className="placeholder col-12 mb-2" />
          <span className="placeholder col-12" />
        </div>
      </SectionCard>
    );
  }

  const categories = data.map((d) => d.date ?? "");
  const series = [
    { name: "Users", data: data.map((d) => d.users ?? 0) },
    { name: "Owners", data: data.map((d) => d.owners ?? 0) },
  ];

  const options = {
    chart: { type: "bar", toolbar: { show: true } },
    colors: [CHART_COLORS.primary, CHART_COLORS.success],
    plotOptions: { bar: { horizontal: false, columnWidth: "60%", borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories },
    yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right" },
    tooltip: { shared: true, intersect: false },
  };

  return (
    <SectionCard title={`New Users & Owners (${period} days)`}>
      {!data.length ? (
        <p className="text-secondary mb-0 small">No data yet.</p>
      ) : (
        <>
          {typeof window !== "undefined" && (
            <ReactApexChart type="bar" series={series} options={options} height={height} />
          )}
          {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
        </>
      )}
    </SectionCard>
  );
}
