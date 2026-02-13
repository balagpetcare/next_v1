"use client";

import { Icon } from "@iconify/react";

const STEPS = [
  {
    step: 1,
    title: "Company registration dashboard",
    description: "Register your organization and set up producer account.",
    icon: "solar:user-id-outline",
  },
  {
    step: 2,
    title: "Batch and serial generation",
    description: "Create batches and generate unique serials and QR codes.",
    icon: "solar:qr-code-outline",
  },
  {
    step: 3,
    title: "Printing QR labels",
    description: "Print glowing QR labels on factory line and conveyor.",
    icon: "solar:printer-minimalistic-outline",
  },
  {
    step: 4,
    title: "Verified result",
    description: "Customers scan and see verified product result on mobile.",
    icon: "solar:smartphone-2-outline",
  },
];

export default function ProducerHowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="producer-section producer-how"
      aria-labelledby="producer-how-title"
    >
      <div className="producer-container">
        <h2 id="producer-how-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>3</span>
          How it Works
        </h2>
        <div className="producer-how-flow">
          {STEPS.map(({ step, title, description, icon }, idx) => (
            <div key={step} className="producer-how-step-wrap">
              <article
                className="producer-glass-card producer-how-card"
                aria-labelledby={`producer-step-${step}-title`}
              >
                <div className="producer-step-num" aria-hidden>
                  {step}
                </div>
                <div className="producer-card-icon-wrap">
                  <Icon icon={icon} width={32} height={32} aria-hidden />
                </div>
                <h3 id={`producer-step-${step}-title`} className="producer-card-title">
                  {title}
                </h3>
                <p className="producer-card-desc">{description}</p>
              </article>
              {idx < STEPS.length - 1 && (
                <div className="producer-how-arrow" aria-hidden>
                  <Icon icon="solar:arrow-right-outline" width={28} height={28} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
