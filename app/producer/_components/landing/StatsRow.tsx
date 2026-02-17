"use client";

const stats = [
  {
    main: "10K+",
    sub: "Products Verified",
    glow: "cyan",
    icon: "shield",
  },
  {
    main: "Real-time",
    sub: "Fraud Alerts",
    glow: "cyan",
    icon: "alert",
  },
  {
    main: "Factory",
    sub: "Traceability",
    glow: "teal",
    icon: "factory",
  },
  {
    main: "Role-Based",
    sub: "Access",
    glow: "teal",
    icon: "key",
  },
];

function StatsIcon({ name }: { name: string }) {
  if (name === "shield")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-stats-icon">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === "alert")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-stats-icon">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === "factory")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-stats-icon">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v12M15 9v12M9 5h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-stats-icon">
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatsRow() {
  return (
    <section className="pl-stats" aria-label="Key stats">
      <div className="pl-container pl-stats-inner">
        <div className="pl-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className={`pl-stats-chip pl-stats-chip--${s.glow}`}>
              <div className={`pl-stats-icon-wrap pl-stats-icon-wrap--${s.glow}`}>
                <StatsIcon name={s.icon} />
              </div>
              <div className="pl-stats-chip-text">
                <div className="pl-stats-main">{s.main}</div>
                <div className="pl-stats-sub">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
