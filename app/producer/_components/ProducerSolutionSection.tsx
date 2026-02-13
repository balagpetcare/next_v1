"use client";

import { Icon } from "@iconify/react";

const BENEFITS = ["Security", "Audit trail", "Scale"];

export default function ProducerSolutionSection() {
  return (
    <section
      id="solution"
      className="producer-section producer-solution"
      aria-labelledby="producer-solution-title"
    >
      <div className="producer-container">
        <h2 id="producer-solution-title" className="producer-section-title">
          The Solution
        </h2>
        <p className="producer-section-subtitle">
          Secure, auditable, and built to scale with your production.
        </p>
        <div className="producer-solution-layout">
          <div className="producer-solution-visual" aria-hidden>
            <div className="producer-server-racks">
              {[1, 2, 3].map((i) => (
                <div key={i} className="producer-rack" />
              ))}
            </div>
            <div className="producer-solution-cloud">
              <Icon icon="solar:lock-password-unlocked-outline" width={48} height={48} />
            </div>
          </div>
          <ul className="producer-benefits-list" aria-label="Benefits">
            {BENEFITS.map((b) => (
              <li key={b} className="producer-benefit-item">
                <Icon icon="solar:check-circle-outline" width={24} height={24} aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
