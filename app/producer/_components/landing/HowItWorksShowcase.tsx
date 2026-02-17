"use client";

const steps = [
  { label: "STEP 1", title: "Company Setup", sub: "Create account, define products, and roles." },
  { label: "STEP 2", title: "Generate Serials", sub: "Produce unique identifiers in bulk." },
  { label: "STEP 3", title: "Print QR Labels", sub: "Securely print and apply to products." },
  { label: "STEP 4", title: "Scan & Verify", sub: "Consumers and partners scan for authenticity." },
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 64 72" fill="none">
      <path
        d="M32 4L8 16v20c0 14 10 26 24 32 14-6 24-18 24-32V16L32 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 36l8 8 16-16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HowItWorksShowcase() {
  return (
    <section className="pl-section pl-how2" aria-labelledby="pl-how2-title">
      <div className="pl-container">
        <h2 id="pl-how2-title" className="pl-how2-title">
          HOW IT WORKS
        </h2>

        <div className="pl-how2-steps" aria-hidden>
          {steps.map((s) => (
            <div key={s.label} className="pl-how2-step-pill">
              {s.label}
            </div>
          ))}
        </div>

        <div className="pl-how2-stage">
          <div className="pl-how2-left">
            <div className="pl-how2-flow">
              {steps.map((s, idx) => (
                <div key={s.label} className="pl-how2-flow-item">
                  <div className="pl-how2-flow-card">
                    <div className="pl-how2-flow-kicker">{s.label}</div>
                    <div className="pl-how2-flow-title">{s.title}</div>
                    <div className="pl-how2-flow-sub">{s.sub}</div>
                  </div>
                  {idx < steps.length - 1 && <div className="pl-how2-flow-connector" aria-hidden />}
                </div>
              ))}
            </div>
          </div>

          <div className="pl-how2-right" aria-hidden>
            <div className="pl-how2-phone">
              <div className="pl-how2-phone-top">
                <div className="pl-how2-phone-chip pl-how2-phone-chip--good">
                  <span className="pl-how2-chip-dot" />
                  VERIFIED
                </div>
                <div className="pl-how2-phone-chip pl-how2-phone-chip--warn">
                  <span className="pl-how2-chip-dot" />
                  DUPLICATE
                </div>
              </div>
              <div className="pl-how2-phone-body">
                <div className="pl-how2-phone-shield">
                  <ShieldIcon />
                </div>
                <div className="pl-how2-phone-lines">
                  <div className="pl-how2-line" />
                  <div className="pl-how2-line" />
                  <div className="pl-how2-line pl-how2-line--short" />
                </div>
                <div className="pl-how2-phone-map" />
              </div>
            </div>
            <div className="pl-how2-glow" />
          </div>
        </div>
      </div>
    </section>
  );
}

