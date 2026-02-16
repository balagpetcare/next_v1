"use client";

export default function SecurityApi() {
  return (
    <section id="security-api" className="pl-section pl-security" aria-labelledby="pl-security-title">
      <h2 id="pl-security-title" className="pl-security-title">SECURITY & API</h2>
      <div className="pl-container pl-security-inner">
        <div className="pl-security-panel">
          <div className="pl-security-row">
            <button type="button" className="pl-security-icon-btn" aria-label="Token list">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={20} height={20}><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <input type="text" readOnly value="T00012345678" className="pl-security-input" aria-label="Serial / Token" />
            <button type="button" className="pl-security-btn pl-security-btn--primary">
              Generate
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="pl-security-row pl-security-row--bottom">
            <div className="pl-security-status" aria-hidden>
              <span className="pl-security-status-icon" />
              <span className="pl-security-status-bars" />
            </div>
            <div className="pl-security-toggle-wrap">
              <div className="pl-security-toggle pl-security-toggle--on" role="switch" aria-checked="true" aria-label="API enabled" />
            </div>
            <button type="button" className="pl-security-btn pl-security-btn--revoke">Revoke</button>
          </div>
        </div>
        <div className="pl-security-deco pl-security-deco--left" aria-hidden />
        <div className="pl-security-deco pl-security-deco--right" aria-hidden>
          <svg viewBox="0 0 48 56" fill="none" stroke="currentColor" strokeWidth="1.5" className="pl-security-shield">
            <path d="M24 4L8 14v14c0 12 8 22 16 28 8-6 16-16 16-28V14L24 4z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 28l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
