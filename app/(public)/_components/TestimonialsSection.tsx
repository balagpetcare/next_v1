"use client";

import Image from "next/image";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const testimonials = [
  { nameKey: "name1", roleKey: "role1", quoteKey: "quote1", avatar: "/landing/testimonials/avatar1.svg" },
  { nameKey: "name2", roleKey: "role2", quoteKey: "quote2", avatar: "/landing/testimonials/avatar2.svg" },
  { nameKey: "name3", roleKey: "role3", quoteKey: "quote3", avatar: "/landing/testimonials/avatar3.svg" },
];

function Stars() {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} icon="solar:star-bold" width={18} height={18} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="lp-section jamina-testimonials-section px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="testimonials-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="testimonials-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("testimonials.title")}
        </h2>
        <div className="lp-container">
          <div className="testimonials-grid gap-4 sm:gap-6 lg:gap-8">
        {testimonials.map((tst, i) => (
          <article key={i} className="testimonial-card">
            <div className="testimonial-avatar-wrap">
              <Image
                src={tst.avatar}
                alt=""
                width={80}
                height={80}
                className="testimonial-avatar-img"
                aria-hidden="true"
              />
            </div>
            <Stars />
            <div className="testimonial-role">{t(`testimonials.${tst.roleKey}`)}</div>
            <blockquote className="testimonial-quote">{t(`testimonials.${tst.quoteKey}`)}</blockquote>
            <div className="testimonial-author">{t(`testimonials.${tst.nameKey}`)}</div>
          </article>
        ))}
          </div>
        </div>
      </div>
    </section>
  );
}
