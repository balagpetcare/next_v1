"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useLanguage } from "../_lib/LanguageContext";
import LanguageSelect from "@/src/shared/selects/LanguageSelect";

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
          <div className="jamina-lang-switcher d-flex align-items-center">
            <LanguageSelect
              value={locale}
              onChange={(locale: string) => setLocale(locale as "en" | "bn")}
              compact
              options={[
                { locale: "en", label: t("header.langEn"), countryCode: "US" },
                { locale: "bn", label: t("header.langBn"), countryCode: "BD" },
              ]}
            />
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
