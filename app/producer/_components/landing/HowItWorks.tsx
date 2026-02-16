"use client";

const steps = [
  { title: "Company Setup", sub: "Create account, define products, and roles.", icon: "building" },
  { title: "Generate Serials", sub: "Produce unique identifiers in bulk.", icon: "database" },
  { title: "Print QR Labels", sub: "Securely print and apply to products.", icon: "printer" },
  { title: "Scan & Verify", sub: "Consumers and partners scan for authenticity.", icon: "scan" },
];

function StepIcon({ name }: { name: string }) {
  const cls = "pl-how-icon-svg";
  if (name === "building") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
        <path d="M3 21h18M5 21V10l7-4 7 4v11M9 9v12M15 9v12M9 5h6v4H9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "database") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
        <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "printer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5V3a2 2 0 012-2h6a2 2 0 012 2v2M9 13h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="pl-section pl-how" aria-labelledby="pl-how-title">
      <h2 id="pl-how-title" className="pl-how-title">HOW IT WORKS (4 STEPS)</h2>
      <div className="pl-container pl-how-inner">
        <div className="pl-how-flow">
          {steps.map((s, i) => (
            <div key={i} className="pl-how-step-wrap">
              <div className="pl-how-step">
                <div className="pl-how-step-label">
                  <span className="pl-how-dot" />
                  <span>STEP {i + 1}</span>
                </div>
                <div className="pl-how-icon"><StepIcon name={s.icon} /></div>
                <h3 className="pl-how-step-title">{s.title}</h3>
                <p className="pl-how-step-sub">{s.sub}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="pl-how-arrow" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
