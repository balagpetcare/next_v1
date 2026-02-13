"use client";

import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const badges = [
  { icon: "solar:shield-check-bold-duotone", line1: "badge1Line1", line2: "badge1Line2" },
  { icon: "solar:lock-password-bold-duotone", line1: "badge2Line1", line2: "badge2Line2" },
  { icon: "solar:headphones-round-sound-bold-duotone", line1: "badge3Line1", line2: "badge3Line2" },
  { icon: "solar:cloud-check-bold-duotone", line1: "badge4Line1", line2: "badge4Line2" },
];

export default function TrustSection() {
  const { t } = useLanguage();

  return (
    <section id="trust" className=" lp-section-soft px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="trust-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="trust-title" className="pb-50 section-title jamina-trust-heading mb-6 sm:mb-8">
          {t("trust.title")}
        </h2>
        <div className="trust-grid gap-4 sm:gap-6 lg:gap-8">
        {badges.map((b) => (
          <div key={b.line1} className="trust-badge trust-badge-stack">
            <div className="trust-badge-icon">
              <Icon icon={b.icon} width={32} height={32} aria-hidden="true" />
            </div>
            <span className="trust-badge-line1">{t(`trust.${b.line1}`)}</span>
            <span className="trust-badge-line2">{t(`trust.${b.line2}`)}</span>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
