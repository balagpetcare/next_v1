"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { demoData } from "../_data/demoData";
import {
  getSalesTrendOptions,
  getCategoryPieOptions,
  getServiceBarOptions,
} from "../_lib/chartConfigs";
import { useLanguage } from "../_lib/LanguageContext";

function ChartLoadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="chart-skeleton" role="status" aria-label={label}>
      …
    </div>
  );
}

export default function ReportsSection() {
  const { t } = useLanguage();
  const loadingLabel = t("reports.loadingChart");
  const Chart = useMemo(
    () =>
      dynamic(() => import("react-apexcharts"), {
        ssr: false,
        loading: () => <ChartLoadingPlaceholder label={loadingLabel} />,
      }),
    [loadingLabel]
  );

  const daily = demoData.salesSummary.daily;
  const categories = demoData.productCategoryBreakdown;
  const services = demoData.servicePopularity;

  const salesTrendOptions = getSalesTrendOptions(daily.map((d) => d.day));
  const salesTrendSeries = [{ name: "Sales (BDT)", data: daily.map((d) => d.sales) }];

  const pieOptions = getCategoryPieOptions(categories.map((c) => c.category));
  const pieSeries = categories.map((c) => c.percentage);

  const barOptions = getServiceBarOptions(services.map((s) => s.service));
  const barSeries = [{ name: "Bookings", data: services.map((s) => s.count) }];

  // KPI (demo)
  const totalRevenue30 = daily.reduce((sum, d) => sum + (d.sales ?? 0), 0);
  const totalBookings = services.reduce((sum, s) => sum + (s.count ?? 0), 0);

  return (
    <section id="growth" className="lp-section jamina-reports px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="reports-title">
      <div className="lp-container max-w-6xl mx-auto">
        <div className="jamina-reports-head mb-6 sm:mb-8">
          <h2 id="reports-title" className="lp-h2 pb-60 jamina-reports-title">
            {t("reports.title")}
          </h2>
          <p className="lp-subtitle jamina-reports-subtitle">
            {t("reports.subtitle")}
          </p>
        </div>

       

        {/* TWO-UP LAYOUT */}
        <div className="jamina-reports-twoUp gap-4 sm:gap-6 lg:gap-8" role="region" aria-label={t("reports.title")}>
          {/* Row 1 - Left: Info */}
     
          {/* Row 2 - Left: Line */}
          <div className="chart-card jamina-chart-card">
            <div className="jamina-chart-head">
              <h3>{t("reports.chart1Title")}</h3>
              <span className="jamina-chip">{t("reports.chip1")}</span>
            </div>
            <Chart options={salesTrendOptions} series={salesTrendSeries} type="line" height={260} aria-label={t("reports.ariaRevenueChart")} />
          </div>

          {/* Row 2 - Right: Pie */}
          <div className="chart-card jamina-chart-card">
            <div className="jamina-chart-head">
              <h3>{t("reports.chart2Title")}</h3>
              <span className="jamina-chip">{t("reports.chip2")}</span>
            </div>
            <Chart options={pieOptions} series={pieSeries} type="pie" height={240} aria-label={t("reports.ariaCategoriesChart")} />
          </div>

          {/* Row 3 - Left: Bar */}
          <div className="chart-card jamina-chart-card">
            <div className="jamina-chart-head">
              <h3>{t("reports.chart3Title")}</h3>
              <span className="jamina-chip">{t("reports.chip3")}</span>
            </div>
            <Chart options={barOptions} series={barSeries} type="bar" height={240} aria-label={t("reports.ariaServicesChart")} />
          </div>

          {/* Row 3 - Right: KPI Summary */}
          <div className="jamina-kpi-card" aria-label={t("reports.ariaKpiSummary")}>
            <div className="jamina-kpi-head">
              <h3 className="jamina-kpi-title">{t("reports.kpiTitle")}</h3>
              <span className="jamina-chip">{t("reports.kpiChip")}</span>
            </div>

            <div className="jamina-kpi-grid">
              <div className="jamina-kpi">
                <span className="kpi-label">{t("reports.kpi1Label")}</span>
                <span className="kpi-value">৳ {Math.round(totalRevenue30).toLocaleString()}</span>
              </div>

              <div className="jamina-kpi">
                <span className="kpi-label">{t("reports.kpi2Label")}</span>
                <span className="kpi-value">{totalBookings.toLocaleString()}</span>
              </div>

              <div className="jamina-kpi">
                <span className="kpi-label">{t("reports.kpi3Label")}</span>
                <span className="kpi-value">{categories.length}</span>
              </div>

              <div className="jamina-kpi">
                <span className="kpi-label">{t("reports.kpi4Label")}</span>
                <span className="kpi-value">4.8★</span>
              </div>
            </div>

            <div className="jamina-kpi-foot">
              <Icon icon="solar:info-circle-bold-duotone" width={18} height={18} aria-hidden="true" />
              <span>{t("reports.kpiFootnote")}</span>
            </div>
          </div>
        </div>

        {/* SR-only for SEO */}
        <ul className="sr-only">
          <li>{t("reports.bullet1")}</li>
          <li>{t("reports.bullet2")}</li>
          <li>{t("reports.bullet3")}</li>
        </ul>
      </div>
    </section>
  );
}
