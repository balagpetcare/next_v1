"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const stages = [
  { icon: "solar:hand-shake-bold-duotone", key: "stage1" },
  { icon: "solar:shield-check-bold-duotone", key: "stage2" },
  { icon: "solar:card-bold-duotone", key: "stage3" },
  { icon: "solar:users-group-rounded-bold-duotone", key: "stage4" },
];

export default function ServiceSalesSection() {
  const { t } = useLanguage();

  return (
    <section id="sales" className="jamina-sales px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="service-sales-title">
      <div className="lp-container max-w-6xl mx-auto">
        <div className="jamina-sales-head mb-6 sm:mb-8">
          <h2 id="service-sales-title" className="lp-h2 pb-60 pb-50 jamina-sales-title">
            {t("serviceSales.title")}
          </h2>
        </div>

        {/* 2x2 grid like your screenshot */}
        <div className="jamina-sales-grid" role="list" aria-label={t("serviceSales.title")}>
          {/* Row 1 */}
          <div className="jamina-sales-card" role="listitem">
            <span className="jamina-sales-icon" aria-hidden="true">
              <Icon icon={stages[0].icon} width={34} height={34} />
            </span>
            <h3 className="jamina-sales-text">{t("serviceSales." + stages[0].key)}</h3>
          </div>

       

          <div className="jamina-sales-card" role="listitem">
            <span className="jamina-sales-icon" aria-hidden="true">
              <Icon icon={stages[1].icon} width={34} height={34} />
            </span>
            <h3 className="jamina-sales-text">{t("serviceSales." + stages[1].key)}</h3>
          </div>

          {/* Row 2 */}
          <div className="jamina-sales-card" role="listitem">
            <span className="jamina-sales-icon" aria-hidden="true">
              <Icon icon={stages[2].icon} width={34} height={34} />
            </span>
            <h3 className="jamina-sales-text">{t("serviceSales." + stages[2].key)}</h3>
          </div>
          <div className="jamina-sales-card" role="listitem">
            <span className="jamina-sales-icon" aria-hidden="true">
              <Icon icon={stages[3].icon} width={34} height={34} />
            </span>
            <h3 className="jamina-sales-text">{t("serviceSales." + stages[3].key)}</h3>
          </div>
        </div>

        <div className="jamina-sales-callout" aria-live="polite">
          <span className="jamina-sales-callout-text">★ {t("serviceSales.statCallout")}</span>
        </div>
      </div>
    </section>
  );
}
