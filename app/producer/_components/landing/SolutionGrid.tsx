"use client";

const solutions = [
  { title: "Unique Serial & Batch", sub: "Generate individual product identifiers.", icon: "microchip" },
  { title: "QR Label Printing", sub: "Secure, high-quality label integration.", icon: "printer" },
  { title: "Consumer Verification Page", sub: "Branded public scan results.", icon: "phone" },
  { title: "Duplicate Scan Alerts", sub: "Instant notifications for suspicious activity.", icon: "megaphone" },
  { title: "Factory Tracking", sub: "Monitor production and delivery.", icon: "factory" },
  { title: "Analytics Dashboard", sub: "Actionable insights and reporting.", icon: "chart" },
];

const iconMap: Record<string, React.ReactNode> = {
  microchip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  printer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 18h.01" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11l18-5v12L3 14v-3z" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 14v4a2 2 0 004 0v-4M11 14l-8 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  factory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v12M15 9v12M9 5h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};

export default function SolutionGrid() {
  return (
    <section id="solution" className="pl-section pl-solution" aria-labelledby="pl-solution-title">
      <h2 id="pl-solution-title" className="pl-solution-title">Our Solution</h2>
      <div className="pl-container pl-solution-inner">
        <div className="pl-solution-grid">
          {solutions.map((s, i) => (
            <div key={i} className="pl-solution-card">
              <div className="pl-solution-icon">{iconMap[s.icon]}</div>
              <h3 className="pl-solution-card-title">{s.title}</h3>
              <p className="pl-solution-card-sub">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
