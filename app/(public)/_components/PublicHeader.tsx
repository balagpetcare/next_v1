"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";

const SCROLL_THRESHOLD = 8;

export default function PublicHeader() {
  const { locale, t, setLocale } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(typeof window !== "undefined" ? window.scrollY > SCROLL_THRESHOLD : false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={"jamina-header jamina-header-dark" + (scrolled ? " scrolled" : "")}
      role="banner"
    >
      <div className="jamina-header-inner">
        <a href="/#top" className="jamina-logo" aria-label={t("header.logo")}>
          <Icon icon="solar:leaf-bold" width={24} height={24} className="jamina-logo-icon" aria-hidden="true" />
          <span>{t("header.logo")}</span>
        </a>
        <nav className="jamina-header-nav" aria-label={t("header.navAriaLabel")}>
          <a href="#ecosystem" className="jamina-header-link">
            {t("header.navEcosystem")}
          </a>
          <a href="#steps" className="jamina-header-link">
            {t("header.navSteps")}
          </a>
          <a href="#benefits" className="jamina-header-link">
            {t("header.navBenefits")}
          </a>
          <a href="#faq" className="jamina-header-link">
            {t("header.navFaq")}
          </a>
          <div className="jamina-lang-switcher">
            <button
              type="button"
              className={"jamina-lang-btn" + (locale === "en" ? " is-active" : "")}
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              aria-label={t("header.ariaLangEn")}
            >
              {t("header.langEn")}
            </button>
            <span className="jamina-lang-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className={"jamina-lang-btn" + (locale === "bn" ? " is-active" : "")}
              onClick={() => setLocale("bn")}
              aria-pressed={locale === "bn"}
              aria-label={t("header.ariaLangBn")}
            >
              {t("header.langBn")}
            </button>
          </div>
          <Link href="/owner/login" className="jamina-header-link">
            {t("header.login")}
          </Link>
          <Link href="/owner/register" className="jamina-btn jamina-btn-primary">
            {t("header.signUp")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
