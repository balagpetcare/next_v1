"use client";

import type { Locale } from "./LanguageContext";
import { LanguageProvider } from "./LanguageContext";

type I18nWrapperProps = {
  children: React.ReactNode;
  /** Locale read from server (cookies) to avoid hydration mismatch */
  initialLocale?: Locale;
};

export function I18nWrapper({ children, initialLocale }: I18nWrapperProps) {
  return (
    <LanguageProvider initialLocale={initialLocale ?? "en"}>
      {children}
    </LanguageProvider>
  );
}
