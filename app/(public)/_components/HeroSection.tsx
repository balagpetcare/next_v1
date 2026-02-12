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
              muted
              playsInline
              preload="metadata"
            />

            {/* Bottom Volume Controls */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              {/* Volume slider (shows when button clicked) */}
              {showVolume && (
                <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(volume * 100)}
                    onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                    className="w-28"
                    aria-label="Volume"
                  />
                  <span className="text-xs text-white/90 w-8 text-right">
                    {Math.round(volume * 100)}
                  </span>
                </div>
              )}

              {/* Round button: click to show/hide slider; icon click can mute/unmute */}
              <button
                type="button"
                onClick={toggleVolumePanel}
                className="h-10 w-10 rounded-full  text-white flex items-center justify-center "
                aria-label="Volume controls"
              >
                {/* Clicking icon toggles mute quickly */}
                <span onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="cursor-pointer">
                  {muted || volume === 0 ? (
                    // Muted icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="1" x2="1" y2="23" stroke="white" strokeWidth="2" />
                    </svg>
                  ) : (
                    // Volume icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a3 3 0 010 6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 5a7 7 0 010 14" />
                    </svg>
                  )}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
