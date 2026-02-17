"use client";

const items = [
  { title: "Unique Serial & Batch", icon: "microchip" },
  { title: "QR Label Printing", icon: "printer" },
  { title: "Consumer Verification Page", icon: "phone" },
  { title: "Duplicate Scan Alerts", icon: "alert" },
];

function Icon({ name }: { name: string }) {
  if (name === "microchip")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9h6v6H9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === "printer")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 9V2h12v7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === "phone")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="6" y="2" width="12" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 18h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SolutionRow() {
  return (
    <section className="pl-section pl-solution-row" aria-labelledby="pl-solution-row-title">
      <div className="pl-container">
        <h2 id="pl-solution-row-title" className="pl-solution-row-title">
          Our Solution
        </h2>
        <div className="pl-solution-row-grid" role="list">
          {items.map((it) => (
            <div key={it.title} className="pl-solution-row-card" role="listitem">
              <div className="pl-solution-row-icon" aria-hidden>
                <Icon name={it.icon} />
              </div>
              <div className="pl-solution-row-text">{it.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

