"use client";

const problems = [
  {
    title: "Counterfeit Products",
    sub: "Damaging brand reputation and losing customer trust.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-problem-icon-svg">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Duplicate QR Codes",
    sub: "Fraudulent copies and compromised supply chains.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-problem-icon-svg">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14h3v3H3zM9 14h3v3H9zM14 14h3v3h-3zM14 14v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Revenue Loss",
    sub: "Financial impact from fake goods and market dilution.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-problem-icon-svg">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function ProblemSection() {
  return (
    <section id="the-problem" className="pl-section pl-problem" aria-labelledby="pl-problem-title">
      <h2 id="pl-problem-title" className="pl-problem-title">The Problem</h2>
      <div className="pl-container pl-problem-inner">
        <div className="pl-problem-grid">
          {problems.map((p, i) => (
            <div key={i} className="pl-problem-card">
              <div className="pl-problem-icon">{p.icon}</div>
              <div className="pl-problem-warn" aria-hidden>!</div>
              <h3 className="pl-problem-card-title">{p.title}</h3>
              <p className="pl-problem-card-sub">{p.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
