"use client";

import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const cards = [
  { icon: "solar:graph-up-bold-duotone", titleKey: "card1Title", descKey: "card1Desc" },
  { icon: "solar:box-minimalistic-bold-duotone", titleKey: "card2Title", descKey: "card2Desc" },
  { icon: "solar:users-group-rounded-bold-duotone", titleKey: "card3Title", descKey: "card3Desc" },
  { icon: "solar:calculator-bold-duotone", titleKey: "card4Title", descKey: "card4Desc" },
  { icon: "solar:calendar-mark-bold-duotone", titleKey: "card5Title", descKey: "card5Desc" },
  { icon: "solar:delivery-bold-duotone", titleKey: "card6Title", descKey: "card6Desc" },
];

export default function BenefitsSection() {
  const { t } = useLanguage();

  return (
    <section id="benefits" className="lp-section jamina-benefits-section px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="benefits-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="benefits-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("benefits.sectionTitle")}
        </h2>
        <div className="lp-container">
          <div className="feature-grid gap-4 sm:gap-6 lg:gap-8">
        {cards.map((card, i) => (
          <div key={i} className="feature-card benefit-card">
            <div className="icon-wrap">
              <Icon icon={card.icon} width={40} height={40} aria-hidden="true" />
            </div>
            <div>
              <h3>{t(`benefits.${card.titleKey}`)}</h3>
              <p>{t(`benefits.${card.descKey}`)}</p>
            </div>
          </div>
        ))}
          </div>
        </div>
      </div>
    </section>
  );
}
