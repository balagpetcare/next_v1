"use client";

export default function ProducerProblemVsSolutionSection() {
  return (
    <section
      id="problem"
      className="producer-section producer-pvs"
      aria-labelledby="producer-pvs-title"
    >
      <div className="producer-container">
        <h2 id="producer-pvs-title" className="producer-pvs-title">
          Problem vs Solution
        </h2>
        <div className="producer-pvs-card">
          <div className="producer-pvs-side producer-pvs-side--problem" aria-label="The problem">
            <div className="producer-pvs-ill" aria-hidden>
              <svg width="180" height="100" viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="pvs-problem-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff4d5a" floodOpacity="0.4" />
                  </filter>
                </defs>
                {/* Bottle silhouette */}
                <rect x="24" y="18" width="28" height="48" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,77,90,0.5)" strokeWidth="1" filter="url(#pvs-problem-glow)" />
                <path d="M32 18 L32 14 L48 14 L48 18" stroke="rgba(255,77,90,0.5)" strokeWidth="1" fill="none" />
                <polygon points="36,8 44,8 44,14 36,14" fill="rgba(255,77,90,0.3)" stroke="rgba(255,77,90,0.5)" strokeWidth="1" />
                <polygon points="38,52 42,52 42,66 40,70 38,66" fill="#ff4d5a" fillOpacity="0.9" filter="url(#pvs-problem-glow)" />
                {/* Box with crack */}
                <rect x="72" y="32" width="40" height="40" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,77,90,0.5)" strokeWidth="1" strokeDasharray="4 2" filter="url(#pvs-problem-glow)" />
                <line x1="82" y1="42" x2="102" y2="62" stroke="rgba(255,77,90,0.6)" strokeWidth="1" strokeDasharray="2 2" />
                <polygon points="88,28 96,28 96,36 88,36" fill="#ff4d5a" fillOpacity="0.9" filter="url(#pvs-problem-glow)" />
                {/* Phone/device */}
                <rect x="132" y="20" width="32" height="56" rx="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,77,90,0.5)" strokeWidth="1" filter="url(#pvs-problem-glow)" />
                <circle cx="148" cy="32" r="3" fill="rgba(255,255,255,0.2)" />
                <polygon points="146,72 150,72 148,76" fill="#ff4d5a" fillOpacity="0.9" filter="url(#pvs-problem-glow)" />
              </svg>
            </div>
            <p className="producer-pvs-caption">Fake products, broken seals, alerts</p>
          </div>
          <div className="producer-pvs-divider" aria-hidden>
            <span className="producer-pvs-divider-label">VS</span>
          </div>
          <div className="producer-pvs-side producer-pvs-side--solution" aria-label="The solution">
            <div className="producer-pvs-ill" aria-hidden>
              <svg width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="pvs-solution-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e8d4" floodOpacity="0.35" />
                  </filter>
                </defs>
                {/* Verified tile 1 */}
                <rect x="20" y="24" width="52" height="52" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(0,232,212,0.4)" strokeWidth="1" filter="url(#pvs-solution-glow)" />
                <rect x="32" y="36" width="28" height="28" rx="4" fill="rgba(0,232,212,0.12)" stroke="rgba(0,232,212,0.3)" strokeWidth="1" />
                <path d="M38 48 L42 52 L50 42" stroke="#00e8d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#pvs-solution-glow)" />
                <circle cx="64" cy="44" r="10" fill="rgba(0,232,212,0.2)" stroke="#00e8d4" strokeWidth="1" filter="url(#pvs-solution-glow)" />
                <path d="M60 44 L62.5 46.5 L68 41" stroke="#00e8d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Verified tile 2 */}
                <rect x="68" y="32" width="52" height="52" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(0,232,212,0.4)" strokeWidth="1" filter="url(#pvs-solution-glow)" />
                <rect x="80" y="44" width="28" height="28" rx="4" fill="rgba(0,232,212,0.12)" stroke="rgba(0,232,212,0.3)" strokeWidth="1" />
                <path d="M86 56 L90 60 L98 50" stroke="#00e8d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#pvs-solution-glow)" />
                <circle cx="112" cy="52" r="10" fill="rgba(0,232,212,0.2)" stroke="#00e8d4" strokeWidth="1" filter="url(#pvs-solution-glow)" />
                <path d="M108 52 L110.5 54.5 L116 49" stroke="#00e8d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <p className="producer-pvs-caption">Secure shelf, verified products</p>
          </div>
        </div>
      </div>
    </section>
  );
}
