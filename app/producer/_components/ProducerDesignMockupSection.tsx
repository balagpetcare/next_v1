"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

const MOCKUP_IMAGE_PATH = "/landing/producer-protection-system-landing-mockup.png";

export type LandingMode = "mockup" | "sections" | "auto";

function getLandingMode(): LandingMode {
  const v = process.env.NEXT_PUBLIC_PRODUCER_LANDING_MODE?.toLowerCase();
  if (v === "mockup" || v === "sections" || v === "auto") return v;
  return "sections";
}

type Props = {
  onLoaded?: () => void;
  onError?: () => void;
  mode?: LandingMode;
};

export default function ProducerDesignMockupSection({ onLoaded, onError, mode: modeProp }: Props) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const mode = modeProp ?? getLandingMode();

  const handleLoad = useCallback(() => {
    setImgLoaded(true);
    setImgError(false);
    onLoaded?.();
  }, [onLoaded]);

  const handleError = useCallback(() => {
    setImgError(true);
    setImgLoaded(false);
    onError?.();
  }, [onError]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      handleLoad();
    } else if (img.complete && img.naturalWidth === 0) {
      handleError();
    }
  }, [handleLoad, handleError]);

  const handleSeeHowItWorks = useCallback(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;
    window.scrollBy({ top: vh * 0.9, behavior: "smooth" });
  }, []);

  if (mode === "sections") return null;

  if (imgError && mode === "auto") return null;

  if (imgError && mode === "mockup") {
    return (
      <section
        className="producer-mockup-wrap producer-mockup-fallback"
        aria-label="Producer Protection System — design preview"
      >
        <div className="producer-mockup-message">
          <p>Design preview image is not available.</p>
          <p className="producer-mockup-message-hint">
            Add <code>producer-protection-system-landing-mockup.png</code> to{" "}
            <code>public/landing/</code> or switch to section-based landing.
          </p>
          <Link
            href="/producer/dashboard"
            className="producer-btn producer-btn-primary producer-mockup-cta-btn"
            aria-label="Enter Producer Console"
          >
            Enter Console
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="producer-mockup-wrap"
      aria-label="Producer Protection System — full design mockup"
    >
      <div className="producer-mockup-overlay-cta">
        <Link
          href="/producer/dashboard"
          className="producer-btn producer-btn-primary producer-mockup-cta-btn"
          aria-label="Enter Producer Console"
        >
          Enter Console
        </Link>
        <button
          type="button"
          className="producer-btn producer-btn-secondary producer-mockup-cta-btn"
          aria-label="See How It Works — scroll down"
          onClick={handleSeeHowItWorks}
        >
          See How It Works
        </button>
      </div>
      <div className="producer-mockup-img-wrap">
        <img
          ref={imgRef}
          src={MOCKUP_IMAGE_PATH}
          alt="Producer Protection System — anti-counterfeit and serialization platform landing design"
          className="producer-mockup-img"
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 480px"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    </section>
  );
}
