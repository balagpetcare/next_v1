"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "../_lib/LanguageContext";

export default function HeroSection() {
  const { t } = useLanguage();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start muted
  const [muted, setMuted] = useState(true);

  // Volume 0.0 - 1.0 (start low)
  const [volume, setVolume] = useState(0.3);

  // Toggle slider visibility
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.volume = volume;
  }, [volume]);

  const toggleVolumePanel = () => setShowVolume((s) => !s);

  const onVolumeChange = (val: number) => {
    const v = videoRef.current;
    if (!v) return;

    const next = Math.max(0, Math.min(1, val));
    v.volume = next;

    // If user increases volume, unmute automatically
    if (next > 0 && muted) {
      v.muted = false;
      setMuted(false);
    }

    // If user sets volume to 0, mute automatically
    if (next === 0 && !muted) {
      v.muted = true;
      setMuted(true);
    }

    setVolume(next);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;

    const nextMuted = !muted;
    v.muted = nextMuted;
    setMuted(nextMuted);

    // If unmuting from 0 volume, set a sensible default volume
    if (!nextMuted && v.volume === 0) {
      v.volume = 0.3;
      setVolume(0.3);
    }
  };

  return (
    <section
      id="top"
      className="jamina-hero jamina-hero-dark px-4 sm:px-6 lg:px-8 py-[60px] sm:py-[70px] lg:py-[80px]"
      aria-labelledby="hero-title"
    >
      <div className="jamina-hero-wrap max-w-6xl mx-auto">
        <div>
          <h1 id="hero-title" className="jamina-hero-title">
            {t("hero.title")}
          </h1>
          <p className="jamina-hero-subtitle">{t("hero.subtitle")}</p>

          <div className="jamina-hero-cta">
            <Link
              href="/owner/register"
              className="jamina-btn jamina-btn-primary"
              aria-label={t("hero.ctaPrimary")}
            >
              {t("hero.ctaPrimary")}
            </Link>
            <a href="#ecosystem" className="jamina-btn" aria-label={t("hero.ctaSecondary")}>
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>

        {/* Video Section */}
        <div className="jamina-hero-visual relative overflow-hidden rounded-2xl">
          <div className="jamina-hero-mockup relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-2xl"
              src="/landing/hero-video.mp4"
              autoPlay
              loop
              controls
              muted
              playsInline
              preload="metadata"
            />

        
          </div>
        </div>
      </div>
    </section>
  );
}
