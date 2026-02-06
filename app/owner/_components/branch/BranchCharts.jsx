"use client";

import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
  primary: "#6366f1",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
  purple: "#a855f7",
};

export function SalesTrendChart({ data = [], loading = false, height = 320 }) {
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
  const series = [
    {
      name: "Sales",
      data: data.map((d) => Number(d.sales ?? d.revenue ?? d.value ?? 0)),
    },
  ];

  const options = {
    chart: { type: "area", zoom: { enabled: false }, toolbar: { show: true } },
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 },
    },
    colors: [CHART_COLORS.success],
    xaxis: { categories },
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
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    title: { text: "Sales Trend", align: "left", style: { fontSize: "16px", fontWeight: 600 } },
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

export function ProductSalesPieChart({ data = [], loading = false, height = 320 }) {
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

  const series = data.map((d) => Number(d.revenue ?? d.value ?? 0));
  const labels = data.map((d) => d.productName || d.name || "Unknown");

  const options = {
    chart: { type: "donut" },
    labels,
    colors: [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.purple],
    legend: { position: "bottom" },
    tooltip: {
      y: {
        formatter: (v) =>
          `৳${Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(1)}%`,
    },
    title: { text: "Top Products by Revenue", align: "left", style: { fontSize: "16px", fontWeight: 600 } },
  };

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        {typeof window !== "undefined" && (
          <ReactApexChart type="donut" series={series} options={options} height={height} />
        )}
        {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
      </div>
    </div>
  );
}

export function OrdersBarChart({ data = [], loading = false, height = 320 }) {
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
  const series = [
    {
      name: "Orders",
      data: data.map((d) => Number(d.orders ?? d.count ?? 0)),
    },
  ];

  const options = {
    chart: { type: "bar", toolbar: { show: true } },
    colors: [CHART_COLORS.primary],
    xaxis: { categories },
    yaxis: {
      labels: {
        formatter: (v) => Math.round(v),
      },
    },
    tooltip: {
      y: {
        formatter: (v) => `${Math.round(v)} orders`,
      },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    title: { text: "Orders Over Time", align: "left", style: { fontSize: "16px", fontWeight: 600 } },
  };

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        {typeof window !== "undefined" && (
          <ReactApexChart type="bar" series={series} options={options} height={height} />
        )}
        {typeof window === "undefined" && <div className="text-center text-secondary py-4">Loading chart...</div>}
      </div>
    </div>
  );
}

export function RevenueAreaChart({ data = [], loading = false, height = 320 }) {
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
  const series = [
    {
      name: "Revenue",
      data: data.map((d) => Number(d.revenue ?? d.value ?? 0)),
    },
  ];

  const options = {
    chart: { type: "area", zoom: { enabled: false }, toolbar: { show: true } },
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 },
    },
    colors: [CHART_COLORS.info],
    xaxis: { categories },
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
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    title: { text: "Revenue Trend", align: "left", style: { fontSize: "16px", fontWeight: 600 } },
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
