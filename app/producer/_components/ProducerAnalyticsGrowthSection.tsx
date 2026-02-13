"use client";

import { Icon } from "@iconify/react";

export default function ProducerAnalyticsGrowthSection() {
  return (
    <section
      id="analytics-growth"
      className="producer-section producer-analytics-growth"
      aria-labelledby="producer-analytics-title"
    >
      <div className="producer-analytics-glow" aria-hidden />
      <div className="producer-container">
        <h2 id="producer-analytics-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>8</span>
          Analytics and Business Growth
        </h2>
        <div className="producer-analytics-layout">
          <div className="producer-analytics-cards">
            <div className="producer-analytics-card producer-glass-card">
              <div className="producer-analytics-chart producer-analytics-line" aria-hidden />
              <span className="producer-analytics-card-label">Verifications</span>
            </div>
            <div className="producer-analytics-card producer-glass-card">
              <div className="producer-analytics-chart producer-analytics-donut" aria-hidden />
              <span className="producer-analytics-card-label">By region</span>
            </div>
            <div className="producer-analytics-card producer-glass-card">
              <div className="producer-analytics-chart producer-analytics-bars" aria-hidden />
              <span className="producer-analytics-card-label">Fraud metrics</span>
            </div>
          </div>
          <div className="producer-analytics-display producer-glass-card" aria-hidden>
            <div className="producer-analytics-curve" />
          </div>
          <div className="producer-analytics-people" aria-hidden>
            <div className="producer-analytics-person" />
            <div className="producer-analytics-person" />
            <div className="producer-analytics-person" />
          </div>
        </div>
      </div>
    </section>
  );
}
