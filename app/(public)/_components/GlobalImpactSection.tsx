"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../_lib/LanguageContext";

type Stat = {
  key: string;
  value: number;
  suffix?: string; // "+" etc
  labelKey: string; // i18n key e.g. globalImpact.statCustomers
  icon: React.ReactNode;
  featured?: boolean;
  formatter?: (n: number) => string;
};

function formatWithComma(n: number) {
  return n.toLocaleString("en-US");
}

function useCountUp(target: number, startWhenVisible: boolean, durationMs = 1200) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!startWhenVisible) return;

    let raf = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      setVal(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, startWhenVisible, durationMs]);

  return val;
}

function useInViewOnce<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Icons (inline SVG) */
function IconPaw() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14.5c-2.4 0-4.7 1.5-5.4 3.7-.4 1.2.5 2.3 1.7 2.3h7.4c1.2 0 2.1-1.1 1.7-2.3-.7-2.2-3-3.7-5.4-3.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12.8c-1 0-1.8-.9-1.8-2 0-1.1.8-2 1.8-2s1.8.9 1.8 2c0 1.1-.8 2-1.8 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16.5 12.8c-1 0-1.8-.9-1.8-2 0-1.1.8-2 1.8-2s1.8.9 1.8 2c0 1.1-.8 2-1.8 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M10 10.8c-.9 0-1.6-.9-1.6-2s.7-2 1.6-2 1.6.9 1.6 2-.7 2-1.6 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M14 10.8c-.9 0-1.6-.9-1.6-2s.7-2 1.6-2 1.6.9 1.6 2-.7 2-1.6 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconStore() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5l1.3-5.2A2 2 0 0 1 7.2 4h9.6a2 2 0 0 1 1.9 1.3L20 10.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M5 10.5c0 1.4 1 2.5 2.4 2.5 1.2 0 2.2-.8 2.5-1.9.3 1.1 1.3 1.9 2.6 1.9s2.3-.8 2.6-1.9c.3 1.1 1.3 1.9 2.5 1.9 1.4 0 2.4-1.1 2.4-2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 20V13.8M17.5 13.8V20M6.5 20h11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 20v-4.6c0-.9.7-1.6 1.6-1.6h.8c.9 0 1.6.7 1.6 1.6V20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.8 3.8 7.1 12 11.4l8.2-4.3L12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 7.1V16.9L12 21.2v-9.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M20.2 7.1V16.9L12 21.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.4 8.2 9.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.2 12a7.2 7.2 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6H9.4L9 6.1c-.6.3-1.2.6-1.7 1l-2.4-1-2 3.4 2 1.5a7.2 7.2 0 0 0 0 2L.9 14l2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h5.2l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.4 12h17.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 3c2.7 2.5 4.3 5.7 4.3 9s-1.6 6.5-4.3 9c-2.7-2.5-4.3-5.7-4.3-9S9.3 5.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GlobalImpactSection() {
  const { t } = useLanguage();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.25);

  const stats: Stat[] = useMemo(
    () => [
      { key: "customers", value: 50000, suffix: "+", labelKey: "globalImpact.statCustomers", icon: <IconPaw />, formatter: formatWithComma },
      { key: "shops", value: 3200, suffix: "+", labelKey: "globalImpact.statShops", icon: <IconStore />, formatter: formatWithComma },
      { key: "products", value: 120000, suffix: "+", labelKey: "globalImpact.statProducts", icon: <IconBox />, featured: true, formatter: formatWithComma },
      { key: "services", value: 85, suffix: "+", labelKey: "globalImpact.statServices", icon: <IconGear /> },
      { key: "countries", value: 25, suffix: "+", labelKey: "globalImpact.statCountries", icon: <IconGlobe /> },
    ],
    []
  );

  return (
    <section ref={ref} className="impact px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-label={t("globalImpact.title")}>
      <div className="impact__bg" aria-hidden="true" />
      <div className="impact__container max-w-6xl mx-auto">
        <header className="impact__header mb-6 sm:mb-8">
          <h2 className="impact__title">{t("globalImpact.title")}</h2>
          <p className="impact__subtitle">{t("globalImpact.subtitle")}</p>
        </header>

        <div className="impact__grid gap-4 sm:gap-6 lg:gap-8">
          {stats.map((s) => (
            <StatCard key={s.key} stat={s} start={inView} t={t} />
          ))}
        </div>

        <div className="impact__ctaWrap">
          <a className="impact__cta" href="/getting-started#requirements-owner">
            {t("globalImpact.ctaText")}
          </a>
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, start, t }: { stat: Stat; start: boolean; t: (key: string) => string }) {
  const val = useCountUp(stat.value, start, stat.featured ? 1400 : 1200);
  const shown = stat.formatter ? stat.formatter(val) : String(val);
  const label = t(stat.labelKey);

  return (
    <div className={`impact__card ${stat.featured ? "is-featured" : ""}`}>
      <div className="impact__icon">
        <span className="impact__iconRing" aria-hidden="true" />
        <span className="impact__iconInner" aria-hidden="true">
          {stat.icon}
        </span>
      </div>

      <div className="impact__value" aria-label={`${stat.value}${stat.suffix ?? ""} ${label}`}>
        {shown}
        {stat.suffix ?? ""}
      </div>

      <div className="impact__label">{label}</div>
    </div>
  );
}
