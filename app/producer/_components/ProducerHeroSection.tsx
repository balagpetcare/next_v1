"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";

export default function ProducerHeroSection() {
  return (
    <section
      id="top"
      className="producer-section producer-hero"
      aria-labelledby="producer-hero-title"
    >
      <div className="producer-hero-glow producer-hero-glow-right" aria-hidden />
      <div className="producer-hero-grid">
        <div className="producer-hero-content">
          <h1 id="producer-hero-title" className="producer-hero-title">
            <span className="producer-hero-line">Producer Protection</span>
            <span className="producer-hero-line">System — Anti-Counterfeit</span>
            <span className="producer-hero-line">and Serialization</span>
          </h1>
          <p className="producer-hero-subtitle">
            Secure batches, generate unique serials and QR codes, and track every scan. Reduce counterfeit risk with one platform.
          </p>
          <div className="producer-hero-cta">
            <Link
              href="/producer/dashboard"
              className="producer-btn producer-btn-primary producer-btn-lg"
              aria-label="Enter Producer Console"
            >
              Enter Console
            </Link>
            <a
              href="#how-it-works"
              className="producer-btn producer-btn-secondary producer-btn-lg"
              aria-label="See How It Works"
            >
              See Features
            </a>
          </div>
        </div>
        <div className="producer-hero-visual" aria-hidden>
          <div className="producer-hero-holographic">
            <div className="producer-hero-float-card producer-hero-float-card-1" />
            <div className="producer-hero-float-card producer-hero-float-card-2" />
            <div className="producer-hero-shield-wrap">
              <Icon icon="solar:shield-check-bold" width={48} height={48} aria-hidden />
            </div>
            <div className="producer-hero-qr-block">
              <div className="producer-hero-qr-grid" />
              <span className="producer-hero-serial">SN-XXXX-XXXX</span>
            </div>
            <div className="producer-hero-verified-badge">
              <Icon icon="solar:verified-check-bold" width={20} height={20} aria-hidden />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>
      <div className="producer-hero-floor" aria-hidden />
    </section>
  );
}
