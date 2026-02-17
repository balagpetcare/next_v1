"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section id="top" className="pl-hero" aria-labelledby="pl-hero-title">
      <div className="pl-hero-bg" aria-hidden />
      <div className="pl-container pl-hero-inner">
        <div className="pl-hero-content">
          <h1 id="pl-hero-title" className="pl-hero-title">
            <span className="pl-hero-line">Protect Every Product.</span>
            <span className="pl-hero-line">Prove Authenticity</span>
            <span className="pl-hero-line">in Seconds.</span>
          </h1>

          <p className="pl-hero-subtext">
            End-to-end product verification with QR + Serial tracking. Reduce fraud, protect revenue, and build customer trust.
          </p>

          <div className="pl-hero-cta">
            <Link href="/producer/dashboard" className="pl-btn pl-btn-primary pl-btn-lg" aria-label="Get a Demo">
              Get a Demo
            </Link>
            <a href="#how-it-works" className="pl-btn pl-btn-outline pl-btn-lg" aria-label="See How It Works">
              See How It Works
            </a>
          </div>
        </div>

        <div className="pl-hero-visual" aria-hidden>
          <div className="pl-hero-device">
            <div className="pl-hero-device-screen">
              <div className="pl-hero-device-header">
                <div className="pl-hero-device-title">Product Verification</div>
                <div className="pl-hero-device-chip">
                  <span className="pl-hero-device-chip-dot" />
                  Verified
                </div>
              </div>
              <div className="pl-hero-qr" />
              <div className="pl-hero-details">
                <div>
                  <span className="pl-hero-label">Product</span>
                  <span className="pl-hero-value">Premium Watch Model X</span>
                </div>
                <div>
                  <span className="pl-hero-label">Serial</span>
                  <span className="pl-hero-value">DGT 5367</span>
                </div>
                <div>
                  <span className="pl-hero-label">Status</span>
                  <span className="pl-hero-value pl-hero-value--good">Authentic</span>
                </div>
              </div>
              <div className="pl-hero-verified-btn">VERIFIED</div>
            </div>
          </div>

          <div className="pl-hero-shield">
            <svg viewBox="0 0 64 72" fill="none" className="pl-hero-shield-svg">
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
            <div className="pl-hero-shield-text">VERIFIED</div>
          </div>
        </div>
      </div>
    </section>
  );
}
