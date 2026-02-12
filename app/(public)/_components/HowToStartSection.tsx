"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const steps = [
  { num: 1, icon: "solar:user-check-bold-duotone", titleKey: "step1Title", descKey: "step1Desc" },
  { num: 2, icon: "solar:buildings-2-bold-duotone", titleKey: "step2Title", descKey: "step2Desc" },
  { num: 3, icon: "solar:rocket-2-bold-duotone", titleKey: "step3Title", descKey: "step3Desc" },
];

export default function HowToStartSection() {
  const { t } = useLanguage();

  return (
    <section id="steps" className="lp-section-soft px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="how-to-start-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="how-to-start-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("howToStart.title")}
        </h2>
        <div className="lp-container">
          <div className="lp-steps-wrap gap-4 sm:gap-6 lg:gap-8">
          <div className="lp-step-arrow-float lp-step-arrow-1" aria-hidden="true">
            <Icon icon="solar:alt-arrow-right-linear" width={18} height={18} aria-hidden="true" />
          </div>
          <div className="lp-step-arrow-float lp-step-arrow-2" aria-hidden="true">
            <Icon icon="solar:alt-arrow-right-linear" width={18} height={18} aria-hidden="true" />
          </div>
          <ul className="lp-steps-row">
            {steps.map((step) => (
              <li key={step.num} className="lp-step">
                <div className="lp-step-cell">
                  <div className="lp-step-node">
                    <Icon icon={step.icon} width={28} height={28} aria-hidden="true" />
                  </div>
                  <h3 className="lp-step-title">
                    {step.num}. {t(`howToStart.${step.titleKey}`)}
                  </h3>
                  <p className="lp-card-sub">{t(`howToStart.${step.descKey}`)}</p>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </div>
      </div>
      <p className="lp-cta-wrap-steps max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/owner/register" className="jamina-btn jamina-btn-primary" aria-label={t("howToStart.cta")}>
          {t("howToStart.cta")}
        </Link>
      </p>
    </section>
  );
}
