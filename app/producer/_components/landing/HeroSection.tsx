"use client";

import Link from "next/link";

const VIDEO_SRC = "/landing/videos/producer-hero.mp4"; // <-- আপনার ভিডিও path দিন

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

        {/* RIGHT SIDE VISUAL */}
        <div className="pl-hero-visual" aria-hidden>
          {/* Video Card */}
          <div className="pl-hero-video">
            <video
              className="pl-hero-video-el"
              src={VIDEO_SRC}
              autoPlay
              loop
              muted
              controls
              playsInline
              preload="metadata"
            />
          </div>

       
        </div>
      </div>
    </section>
  );
}
