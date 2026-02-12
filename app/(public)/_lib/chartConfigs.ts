/**
 * ApexCharts options for landing page demo charts.
 * Jamina palette: primary #0F766E, accent #06B6D4.
 */

import type { ApexOptions } from "apexcharts";

const primaryColor = "#0F766E";
const accentColor = "#06B6D4";
const borderColor = "#E2E8F0";
const mutedColor = "#475569";

export function getSalesTrendOptions(categories: string[]): ApexOptions {
  return {
    chart: {
      type: "line",
      toolbar: { show: false },
      background: "transparent",
      fontFamily: "inherit",
    },
    theme: { mode: "light" },
    stroke: { curve: "smooth", width: 3 },
    colors: [primaryColor],
    xaxis: { categories },
    yaxis: {
      labels: { style: { colors: mutedColor } },
    },
    grid: {
      borderColor,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (val: number) => `${val?.toLocaleString()} BDT` },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 250 },
          xaxis: { labels: { style: { fontSize: "11px" } } },
        },
      },
    ],
  };
}

export function getCategoryPieOptions(labels: string[]): ApexOptions {
  return {
    chart: { type: "pie", background: "transparent" },
    labels,
    colors: [primaryColor, accentColor, "#f59e0b", "#64748b"],
    legend: {
      position: "bottom",
      labels: { colors: mutedColor },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 280 },
          legend: { position: "bottom" },
        },
      },
    ],
  };
}

export function getServiceBarOptions(categories: string[]): ApexOptions {
  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
    },
    theme: { mode: "light" },
    colors: [primaryColor],
    xaxis: { categories },
    yaxis: {
      labels: { style: { colors: mutedColor } },
    },
    grid: {
      borderColor,
      xaxis: { lines: { show: false } },
    },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "60%" },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 250 },
          xaxis: { labels: { style: { fontSize: "10px" }, rotate: -15 } },
        },
      },
    ],
  };
}
