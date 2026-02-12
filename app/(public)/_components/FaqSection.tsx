"use client";

import { useLanguage } from "../_lib/LanguageContext";

const faqs = [
  { qKey: "q1", aKey: "a1" },
  { qKey: "q2", aKey: "a2" },
  { qKey: "q3", aKey: "a3" },
  { qKey: "q4", aKey: "a4" },
];

export default function FaqSection() {
  const { t } = useLanguage();

  return (
    <section id="faq" className="lp-section jamina-faq-section px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="faq-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="faq-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("faq.title")}
        </h2>
        <div className="lp-container">
          <div className="faq-list gap-4 sm:gap-6 lg:gap-8">
        {faqs.map((faq, i) => (
          <details key={faq.qKey} className="faq-item" open={i === 0}>
            <summary id={`faq-q-${i}`} aria-controls={`faq-a-${i}`}>
              {t(`faq.${faq.qKey}`)}
            </summary>
            <div id={`faq-a-${i}`} className="faq-answer" role="region" aria-labelledby={`faq-q-${i}`}>
              {t(`faq.${faq.aKey}`)}
            </div>
          </details>
        ))}
          </div>
        </div>
      </div>
    </section>
  );
}
