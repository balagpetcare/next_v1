"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "../_lib/LanguageContext";

const SPARKLE_IMAGE = "/landing/images/sparkle.svg";

export default function CtaSection() {
  const { t } = useLanguage();

  return (
    <section id="cta" className="landing-section-cta jamina-cta-section px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="cta-final-title">
      <Image src={SPARKLE_IMAGE} alt="" width={120} height={120} className="cta-sparkle cta-sparkle-left" aria-hidden="true" />
      <Image src={SPARKLE_IMAGE} alt="" width={100} height={100} className="cta-sparkle cta-sparkle-right" aria-hidden="true" />
      <div className="jamina-cta-wrap max-w-6xl mx-auto">
        <h2 id="cta-final-title" className="pb-50 section-title">
          {t("cta.title")}
        </h2>
        <p className="section-subtitle">
          {t("cta.subtitle")}
        </p>
        <Link
          href="/owner/register"
          className="jamina-cta-btn"
          aria-label={t("cta.button")}
        >
          {t("cta.button")}
        </Link>
        <p className="jamina-cta-tagline">
          {t("cta.tagline")}
        </p>
      </div>
    </section>
  );
}
