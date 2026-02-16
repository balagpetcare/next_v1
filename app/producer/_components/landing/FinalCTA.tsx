"use client";

import Link from "next/link";

export default function FinalCTA() {
  return (
    <section id="final-cta" className="pl-section pl-final" aria-labelledby="pl-final-title">
      <div className="pl-container pl-final-inner">
        <div className="pl-final-panel">
          <div className="pl-final-shield-wrap">
            <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="pl-final-shield">
              <path d="M32 4L8 16v20c0 14 10 26 24 32 14-6 24-18 24-32V16L32 4z" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M22 36l8 8 16-16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h2 id="pl-final-title" className="pl-final-title">Start Securing Your Products Today</h2>
          <Link href="/producer/dashboard" className="pl-btn pl-btn-primary pl-btn-xl pl-final-cta-btn">Get a Demo</Link>
        </div>
      </div>
    </section>
  );
}
