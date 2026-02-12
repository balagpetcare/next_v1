"use client";

import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const items = [
  { icon: "solar:calendar-add-bold-duotone", titleKey: "item1Title", descKey: "item1Desc" },
  { icon: "solar:bell-bing-bold-duotone", titleKey: "item2Title", descKey: "item2Desc" },
  { icon: "solar:shield-check-bold-duotone", titleKey: "item3Title", descKey: "item3Desc" },
  { icon: "solar:folder-bold-duotone", titleKey: "item4Title", descKey: "item4Desc" },
];

export default function CustomerBenefitsSection() {
  const { t } = useLanguage();

  return (
    <section id="love" className="lp-section-soft px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="customer-benefits-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="customer-benefits-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("customerBenefits.title")}
        </h2>
        <div className="jamina-customer-bars gap-4 sm:gap-6 lg:gap-8">
        {items.map((item, i) => (
          <div key={i} className="jamina-customer-bar">
            <div className="icon-wrap">
              <Icon icon={item.icon} width={40} height={40} aria-hidden="true" />
            </div>
            <div>
              <h3>{t(`customerBenefits.${item.titleKey}`)}</h3>
              <p>{t(`customerBenefits.${item.descKey}`)}</p>
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
