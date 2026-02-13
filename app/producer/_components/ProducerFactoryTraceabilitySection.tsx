"use client";

export default function ProducerFactoryTraceabilitySection() {
  return (
    <section
      id="factory-traceability"
      className="producer-section producer-factory"
      aria-labelledby="producer-factory-title"
    >
      <div className="producer-factory-map" aria-hidden />
      <div className="producer-container producer-factory-inner">
        <h2 id="producer-factory-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>5</span>
          Factory &amp; Batch Traceability
        </h2>
        <div className="producer-factory-layout">
          <div className="producer-factory-conveyor" aria-hidden>
            <div className="producer-factory-box producer-factory-box-1">
              <div className="producer-factory-box-qr" />
            </div>
            <div className="producer-factory-box producer-factory-box-2">
              <div className="producer-factory-box-qr" />
            </div>
            <div className="producer-factory-box producer-factory-box-3">
              <div className="producer-factory-box-qr" />
            </div>
          </div>
          <div className="producer-factory-dashboard producer-glass-card">
            <div className="producer-factory-kpis">
              <div className="producer-factory-kpi">
                <span className="producer-factory-kpi-value">—</span>
                <span className="producer-factory-kpi-label">Batches</span>
              </div>
              <div className="producer-factory-kpi">
                <span className="producer-factory-kpi-value">—</span>
                <span className="producer-factory-kpi-label">Scans</span>
              </div>
              <div className="producer-factory-kpi">
                <span className="producer-factory-kpi-value">—</span>
                <span className="producer-factory-kpi-label">Alerts</span>
              </div>
            </div>
            <div className="producer-factory-chart-placeholder" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
