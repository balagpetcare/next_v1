"use client";

import { Icon } from "@iconify/react";

const KPIS = [
  { label: "Total Batches", value: "—", icon: "solar:archive-outline" },
  { label: "Active Serials", value: "—", icon: "solar:qr-code-outline" },
  { label: "Scans Today", value: "—", icon: "solar:scan-barcode-outline" },
  { label: "Alerts", value: "—", icon: "solar:bell-outline" },
];

export default function ProducerAnalyticsSection() {
  return (
    <section
      id="analytics"
      className="producer-section producer-analytics"
      aria-labelledby="producer-analytics-title"
    >
      <div className="producer-container">
        <h2 id="producer-analytics-title" className="producer-section-title">
          Analytics &amp; Batch Traceability
        </h2>
        <p className="producer-section-subtitle">
          One view for verified status and key metrics.
        </p>
        <div className="producer-verified-block">
          <div className="producer-verified-shield" aria-hidden>
            <Icon icon="solar:shield-check-bold" width={80} height={80} />
          </div>
          <p className="producer-verified-label">Verified</p>
        </div>
        <div className="producer-kpi-grid">
          {KPIS.map(({ label, value, icon }) => (
            <div key={label} className="producer-kpi-card" aria-label={`${label}: ${value}`}>
              <Icon icon={icon} width={24} height={24} className="producer-kpi-icon" aria-hidden />
              <span className="producer-kpi-value">{value}</span>
              <span className="producer-kpi-label">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
