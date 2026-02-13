"use client";

import { Icon } from "@iconify/react";

export default function ProducerSerialApiSection() {
  return (
    <section
      id="serial-api"
      className="producer-section producer-serial-api"
      aria-labelledby="producer-serial-title"
    >
      <div className="producer-container">
        <h2 id="producer-serial-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>4</span>
          Serial Generation and API
        </h2>
        <div className="producer-serial-api-layout">
          <div className="producer-serial-api-copy">
            <p className="producer-serial-api-desc">
              Generate serials and QR codes at scale. Secure API keys and webhooks connect your factory, ERP, and packaging systems with full encryption.
            </p>
          </div>
          <div className="producer-serial-api-visual">
            <div className="producer-serial-api-connector producer-serial-api-connector-1" aria-hidden />
            <div className="producer-serial-api-connector producer-serial-api-connector-2" aria-hidden />
            <div className="producer-serial-api-key-card producer-glass-card">
              <Icon icon="solar:lock-password-outline" width={24} height={24} aria-hidden />
              <span className="producer-serial-api-key-label">API KEY</span>
              <span className="producer-serial-api-key-value">••••••••••••••••</span>
            </div>
            <div className="producer-serial-api-servers" aria-hidden>
              <div className="producer-serial-api-rack" />
              <div className="producer-serial-api-rack" />
              <div className="producer-serial-api-rack" />
            </div>
            <div className="producer-serial-api-cloud" aria-hidden>
              <Icon icon="solar:cloud-outline" width={32} height={32} />
            </div>
            <div className="producer-serial-api-factory" aria-hidden>
              <Icon icon="solar:factory-outline" width={28} height={28} />
              <span>Factory</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
