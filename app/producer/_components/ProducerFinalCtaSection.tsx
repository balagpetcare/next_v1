"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";

const FEATURES = [
  "Batch / Lot Management",
  "Serial / QR Generation",
  "Factory / Line / Packaging",
  "Inventory / Stock",
  "Quality / Verification",
  "Traceability Analytics",
  "API / Integrations",
];

export default function ProducerFinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="producer-section producer-final-cta"
      aria-labelledby="producer-final-cta-title"
    >
      <div className="producer-container">
        <h2 id="producer-final-cta-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>9</span>
          Final CTA
        </h2>
        <div className="producer-final-cta-panel producer-glass-card">
          <div className="producer-final-cta-shield" aria-hidden>
            <Icon icon="solar:shield-check-bold" width={64} height={64} />
          </div>
          <h3 className="producer-final-cta-headline">Producer Protection System</h3>
          <p className="producer-final-cta-sub">
            Secure batches, serials, and verification in one platform.
          </p>
          <Link
            href="/producer/dashboard"
            className="producer-btn producer-btn-primary producer-btn-xl"
            aria-label="Enter Producer Dashboard"
          >
            Enter Producer Dashboard
          </Link>
        </div>
        <div className="producer-final-cta-footer" role="navigation" aria-label="Features">
          <ul className="producer-final-cta-grid">
            {FEATURES.map((f) => (
              <li key={f}>
                <Icon icon="solar:check-circle-outline" width={18} height={18} aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
