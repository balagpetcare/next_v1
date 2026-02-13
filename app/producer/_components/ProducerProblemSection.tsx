"use client";

import { Icon } from "@iconify/react";

export default function ProducerProblemSection() {
  return (
    <section
      id="problem"
      className="producer-section producer-problem"
      aria-labelledby="producer-problem-title"
    >
      <div className="producer-container">
        <h2 id="producer-problem-title" className="producer-section-title">
          The Problem
        </h2>
        <p className="producer-section-subtitle">
          Counterfeit risk, tracking gaps, and batch mismatch hurt your brand and compliance.
        </p>
        <div className="producer-problem-visual">
          <div className="producer-warehouse-mock">
            <div className="producer-box-row">
              {[1, 2, 3].map((i) => (
                <div key={i} className="producer-box producer-box-ok" aria-hidden />
              ))}
            </div>
            <div className="producer-box-row">
              {[1, 2].map((i) => (
                <div key={i} className="producer-box producer-box-warn" aria-hidden>
                  <Icon icon="solar:danger-triangle-outline" width={20} height={20} aria-hidden />
                </div>
              ))}
              <div className="producer-box producer-box-ok" aria-hidden />
            </div>
            <div className="producer-box-row">
              {[1, 2, 3].map((i) => (
                <div key={i} className="producer-box producer-box-warn" aria-hidden>
                  <Icon icon="solar:danger-triangle-outline" width={20} height={20} aria-hidden />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
