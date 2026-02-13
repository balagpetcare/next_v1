"use client";

export default function ProducerConsolePreviewSection() {
  return (
    <section
      id="console-preview"
      className="producer-section producer-console-preview"
      aria-labelledby="producer-console-title"
    >
      <div className="producer-container">
        <h2 id="producer-console-title" className="producer-section-title">
          Producer Console Preview
        </h2>
        <p className="producer-section-subtitle">
          Dashboard-style overview with charts and stat cards.
        </p>
        <div className="producer-dashboard-panels">
          <div className="producer-dashboard-panel producer-panel-a">
            <div className="producer-panel-stat-cards">
              {["Batch ID", "Serials", "Scans"].map((l) => (
                <div key={l} className="producer-stat-card" aria-hidden>
                  <span className="producer-stat-label">{l}</span>
                  <span className="producer-stat-value">—</span>
                </div>
              ))}
            </div>
            <div className="producer-panel-charts">
              <div className="producer-chart-placeholder producer-donut" aria-hidden />
              <div className="producer-chart-placeholder producer-bar" aria-hidden />
            </div>
          </div>
          <div className="producer-dashboard-panel producer-panel-b">
            <div className="producer-chart-placeholder producer-line" aria-hidden />
            <div className="producer-chart-placeholder producer-bar-wide" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
