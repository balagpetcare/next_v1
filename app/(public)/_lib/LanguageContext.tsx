"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import enMessages from "../_locales/en.json";
import bnMessages from "../_locales/bn.json";

/** Single cookie used app-wide for locale (owner, landing, etc.) */
export const APP_LOCALE_COOKIE = "app_locale";
/** Legacy cookie name for backward compatibility when reading */
const LEGACY_COOKIE_NAME = "landing_locale";
const STORAGE_KEY = "app_locale";

const messagesMap: Record<string, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  bn: bnMessages as Record<string, unknown>,
};

export type Locale = "en" | "bn";

type Messages = Record<string, unknown>;

function getNested(obj: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function getCookieClient(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export type LanguageContextValue = {
  locale: Locale;
  /** Translate key; optional second arg replaces {placeholder} in the string. */
  t: (key: string, vars?: Record<string, string>) => string;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider (wrap app with I18nWrapper in root layout)");
  return ctx;
}

/** Optional hook that returns null when outside provider (for gradual adoption) */
export function useLanguageOptional(): LanguageContextValue | null {
  return useContext(LanguageContext);
}

type LanguageProviderProps = {
  children: React.ReactNode;
  /** Server-passed initial locale to avoid hydration mismatch */
  initialLocale?: Locale;
};

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored =
      getCookieClient(APP_LOCALE_COOKIE) ||
      getCookieClient(LEGACY_COOKIE_NAME) ||
      (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
    const next: Locale = stored === "bn" ? "bn" : "en";
    setLocaleState(next);
  }, [mounted]);

  const messages = messagesMap[locale] ?? messagesMap.en;

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setCookie(APP_LOCALE_COOKIE, next);
    setCookie(LEGACY_COOKIE_NAME, next);
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next);
    if (typeof document !== "undefined") document.documentElement.lang = next === "bn" ? "bn" : "en";
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      const value = getNested(messages, key);
      let out = (value ?? key) as string;
      if (vars && typeof out === "string") {
        out = out.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
      }
      return out;
    },
    [messages]
  );

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
