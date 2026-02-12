"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useLanguage } from "../_lib/LanguageContext";

const CENTER_IMAGE = "/landing/ecosystem-center.png";

type Tone = "teal" | "blue" | "purple" | "green" | "orange" | "pink";
type EcosystemItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: Tone;
};

function IconWrap({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <span className={`eco-badge eco-tone-${tone}`} aria-hidden="true">
      {children}
    </span>
  );
}

/* icons (same as your file) */
function IconClinic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5V7.8c0-1.3 1.1-2.3 2.4-2.3h11.2c1.3 0 2.4 1 2.4 2.3v2.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 10.5h11c1.7 0 3 1.3 3 3v4.2c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3V13.5c0-1.7 1.3-3 3-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconVaccine() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M8 7.5 16.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.2 11.7 8.6 15.3c-1.2 1.2-1.2 3.2 0 4.4s3.2 1.2 4.4 0l3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.6 9.4 16.9 7c.6-.6.6-1.6 0-2.2l-.7-.7c-.6-.6-1.6-.6-2.2 0l-2.3 2.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconProducts() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 7.5h10l-1 12.5H8L7 7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 7.5a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconGrooming() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 18V9.5c0-1.4 1.1-2.5 2.5-2.5h5c1.4 0 2.5 1.1 2.5 2.5V18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 6V4.5c0-.8.7-1.5 1.5-1.5h3c.8 0 1.5.7 1.5 1.5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconAdoption() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.2A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 10h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 20h10a2 2 0 0 0 2-2V7.8a2 2 0 0 0-2-2H9.8L7 8.6V20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 8.7h3a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 13h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconAppointment() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 7a3 3 0 0 1 3-3h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 13h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function EcosystemSection() {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string>("profile");

  const items = useMemo<EcosystemItem[]>(
    () => [
      { id: "profile", title: t("ecosystem.items.profile.title"), description: t("ecosystem.items.profile.desc"), icon: <IconProfile />, tone: "teal" },
      { id: "vaccine", title: t("ecosystem.items.vaccine.title"), description: t("ecosystem.items.vaccine.desc"), icon: <IconVaccine />, tone: "blue" },
      { id: "clinic", title: t("ecosystem.items.clinic.title"), description: t("ecosystem.items.clinic.desc"), icon: <IconClinic />, tone: "green" },
      { id: "appointment", title: t("ecosystem.items.appointment.title"), description: t("ecosystem.items.appointment.desc"), icon: <IconAppointment />, tone: "purple" },
      { id: "products", title: t("ecosystem.items.products.title"), description: t("ecosystem.items.products.desc"), icon: <IconProducts />, tone: "orange" },
      { id: "wallet", title: t("ecosystem.items.wallet.title"), description: t("ecosystem.items.wallet.desc"), icon: <IconWallet />, tone: "pink" },
      { id: "grooming", title: t("ecosystem.items.grooming.title"), description: t("ecosystem.items.grooming.desc"), icon: <IconGrooming />, tone: "blue" },
      { id: "adoption", title: t("ecosystem.items.adoption.title"), description: t("ecosystem.items.adoption.desc"), icon: <IconAdoption />, tone: "green" },
    ],
    [t]
  );

  const active = items.find((x) => x.id === activeId) ?? items[0];

  return (
    <section id="ecosystem" className="lp-section eco2-section jamina-ecosystem px-4 sm:px-6 lg:px-8 py-100 sm:py-100 lg:py-20" aria-labelledby="ecosystem-title">
      <div className="lp-container max-w-6xl mx-auto">
        <h2 id="ecosystem-title" className="lp-h2 pb-60 mb-6 sm:mb-8">
          {t("ecosystem.title")}
        </h2>
        <p className="lp-subtitle">{t("ecosystem.subtitle")}</p>

        {/* Orbit (with padding + margin) */}
        <div
          className="eco2-orbit"
          style={
            {
              ["--count" as any]: items.length,
              padding: "12px 15px",
              marginTop: "120px",
            } as React.CSSProperties
          }
        >
          {/* Center hub */}
          <div className="eco2-center" aria-label={t("ecosystem.centerAlt")}>
            <div className="eco2-center-card">
              <div className="eco2-center-avatar">
                <Image src={CENTER_IMAGE} alt={t("ecosystem.centerAlt")} width={192} height={192} sizes="192px" />
              </div>
            
            </div>
          </div>

          {/* Rays */}
          {items.map((item, idx) => {
            const isActive = item.id === activeId;
            return (
              <div key={item.id} className={`eco2-ray ${isActive ? "is-active" : ""}`} style={{ ["--i" as any]: idx } as React.CSSProperties}>
                <span className="eco2-line" aria-hidden="true" />
                <span className="eco2-dot" aria-hidden="true" />

                <button
                  type="button"
                  className={`eco2-card eco2-card-${item.tone} ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveId(item.id)}
                  aria-pressed={isActive}
                >
                  <IconWrap tone={item.tone}>{item.icon}</IconWrap>
                  <div className="eco2-card-title">{item.title}</div>
                  <div className="eco2-card-sub">{item.description}</div>
                </button>
              </div>
            );
          })}
        </div>

    
    
      </div>
    </section>
  );
}
