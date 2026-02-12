# i18n Verification Summary

**Date:** 2025-02-11  
**Scope:** Verify and harden existing i18n fix across Next.js App Router multi-panel repo (no new i18n library).

---

## 1. Sanity-Check Architecture

### ✅ Confirmed working

- **Single global provider:** `app/layout.jsx` is the **only** place that wraps the app with `I18nWrapper` → `LanguageProvider`. Grep confirmed no other `LanguageProvider` or `I18nWrapper` usage in `app/` except the root layout and the definition in `app/(public)/_lib/`.
- **`html lang`:** Root layout reads `app_locale` (fallback `landing_locale`) via `cookies()` and sets `html lang={lang}` where `lang` is `"bn"` or `"en"`, matching `initialLocale` passed to `I18nWrapper`. First paint and SSR match.
- **No server components calling client hooks:** All usages of `useLanguage()` / `useLanguageOptional()` are in client components:
  - `app/(public)/_components/*` — all have `"use client"`.
  - `src/components/landing/Navbar.tsx`, `Hero.tsx`, `FinalCTA.tsx`, `Ecosystem.tsx`, `Steps.tsx` — all client where they use `useLanguage()`.
- **No duplicate provider:** `app/(public)/layout.tsx` does **not** wrap with `LanguageProvider`; it only renders the landing shell (font, metadata, main wrapper). Confirmed by reading the file.

### ⚠️ Gaps / notes

- Panels (`/owner`, `/admin`, `/shop`, `/clinic`, `/staff`, `/producer`, `/mother`, `/country`) do **not** yet use `useLanguage()` or `t()`. They are under the root layout so they **have** access to the context; adding translations there is future work. No "provider not present" errors.

---

## 2. Audit: Panels & Route Groups

### Public landing (`/`)

| File | Issue | Fix |
|------|--------|-----|
| `src/components/landing/Hero.tsx` | Hardcoded Bengali/English strings | Wired to `t("hero.*")`; added `"use client"` and `useLanguage()`. |
| `src/components/landing/FinalCTA.tsx` | Hardcoded English strings | Wired to `t("cta.*")`; added `"use client"` and `useLanguage()`. |
| `src/components/landing/Ecosystem.tsx` | Hardcoded title/subtitle | Wired title and subtitle to `t("ecosystem.title")`, `t("ecosystem.subtitle")`. Orbit card labels left as-is (different structure from locale keys). |
| `src/components/landing/Steps.tsx` | Hardcoded step titles/descriptions | Wired to `t("howToStart.title")`, `t("howToStart.step1Title")`, etc.; added `"use client"` and `useLanguage()`. |
| `src/components/landing/Navbar.tsx` | — | Already uses `useLanguage()` and `t("header.*")`. No change. |
| `src/components/landing/Benefits.tsx` | Hardcoded strings | **Gap:** Not wired to `t()`. Keys exist in `benefits.*` (en/bn). |
| `src/components/landing/FAQ.tsx` | Hardcoded Q/A; FAQ set differs from locale | **Gap:** Not wired to `t()`. Locale has `faq.q1–q4`, `faq.a1–a4`; component has 4 different questions. Can be wired with same or expanded keys. |
| `src/components/landing/Growth.tsx`, `CustomerLove.tsx`, `Testimonials.tsx`, `TrustBadges.tsx`, `SalesFlow.tsx` | Hardcoded strings | **Gap:** Not wired to `t()`. Keys exist for testimonials, trust, reports, serviceSales, customerBenefits. |

### Panels (owner, admin, shop, clinic, staff, producer, mother, country)

- **No** `useLanguage` / `LanguageProvider` usage found in panel code. No wrong context imports; no pages failing when provider not present (provider is at root).
- **Gap:** All panel UI is currently English-only. To add i18n later: use `useLanguage()` and `t("common.*")` or add panel-specific namespaces (e.g. `owner.*`, `admin.*`).

### Context import path

- All consumers import from `@/app/(public)/_lib/LanguageContext` or `../_lib/LanguageContext`. No old or broken paths found.

---

## 3. Persistence Correctness

### ✅ Confirmed

- **Cookie write options:** In `LanguageContext.tsx`, `setCookie()` now sets:
  - `path=/` — cookie is sent for all routes.
  - `max-age` (365 days).
  - `SameSite=Lax` — safe for cross-tab and same-site navigation.
  - **Secure in production:** When `window.location.protocol === "https:"`, the cookie string includes `; Secure` so the cookie is only sent over HTTPS. **Change made in this pass.**
- **Both cookies written on switch:** `setLocale()` writes both `app_locale` and `landing_locale`, so all panels and the landing share the same value.
- **SSR source of truth:** Root layout uses `cookies()` from `next/headers` to read `app_locale` or `landing_locale` and passes `initialLocale` to `I18nWrapper`. Client reads cookie after mount only to sync; no conflict with SSR.
- **Behavior:** Switching locale updates UI without full reload (React state + context). Locale survives (a) refresh, (b) new tab, (c) deep links to panels, (d) navigation between panels, because the cookie is `path=/` and is read on every request by the root layout.

---

## 4. Dictionary Loading & Keys

### ✅ Confirmed

- **Loading:** Dictionaries are imported at build time in `LanguageContext.tsx`: `import enMessages from "../_locales/en.json"` and `bn.json`. No runtime fetch; no missing-file risk for static build.
- **Fallback:** `getNested()` returns `undefined` for missing keys; `t(key)` returns the key string as fallback. No crash on missing keys.
- **Namespacing:** Keys are namespaced: `common.*`, `header.*`, `hero.*`, `ecosystem.*`, `howToStart.*`, `benefits.*`, `reports.*`, `serviceSales.*`, `customerBenefits.*`, `testimonials.*`, `trust.*`, `faq.*`, `cta.*`. No collisions observed.

### Translation gaps (missing usage; keys exist)

- **Benefits:** `src/components/landing/Benefits.tsx` — keys `benefits.title`, `benefits.card1Title` … `card6Title` (and Desc) exist in en/bn; component not yet wired.
- **FAQ:** `src/components/landing/FAQ.tsx` — keys `faq.title`, `faq.q1–q4`, `faq.a1–a4` exist; component uses different copy; can be wired or keys extended.
- **Growth, CustomerLove, Testimonials, TrustBadges, SalesFlow:** Corresponding keys exist in en/bn; components not wired in this pass.

### Keys added in this pass

- **None.** All keys used by the updated components (Hero, FinalCTA, Ecosystem, Steps) already existed in `app/(public)/_locales/en.json` and `bn.json`.

---

## 5. Build & Lint

- **Build:** `npm run build` (after removing `.next` to clear cache) completed successfully. No TypeScript or build errors from i18n changes.
- **Lint:** `npm run lint` reported: "Invalid project directory provided, no such directory: …/lint" — likely a Next.js lint config/directory issue, not caused by i18n. IDE linter reports no errors for the modified files.

---

## 6. Files Changed in This Pass

| File | Change |
|------|--------|
| `app/(public)/_lib/LanguageContext.tsx` | Cookie: add `Secure` when `window.location.protocol === "https:"` so all panels share a secure cookie in production. |
| `src/components/landing/Hero.tsx` | `"use client"`; `useLanguage()`; replace all visible strings with `t("hero.title")`, `t("hero.subtitle")`, `t("hero.ctaPrimary")`, `t("hero.ctaSecondary")`, `t("hero.dashboardPreview")`. |
| `src/components/landing/FinalCTA.tsx` | `"use client"`; `useLanguage()`; replace strings with `t("cta.title")`, `t("cta.subtitle")`, `t("cta.button")`, `t("cta.tagline")`. |
| `src/components/landing/Ecosystem.tsx` | Import `useLanguage`; use `t("ecosystem.title")` and `t("ecosystem.subtitle")` for heading and subtitle. |
| `src/components/landing/Steps.tsx` | `"use client"`; `useLanguage()`; build steps from `t("howToStart.title")`, `t("howToStart.step1Title")`, `step1Desc`, etc. |
| `docs/I18N_VERIFICATION_SUMMARY.md` | This verification summary. |

---

## 7. Translation Gaps (Summary)

- **Missing key usage (keys exist in en/bn):** Benefits, FAQ, Growth, CustomerLove, Testimonials, TrustBadges, SalesFlow in `src/components/landing/` — not wired to `t()` in this pass.
- **Keys added this pass:** None.
- **Keys used by updated components:** `hero.*`, `cta.*`, `ecosystem.title`/`ecosystem.subtitle`, `howToStart.*` — all pre-existing.

---

## 8. Constraints Respected

- No new i18n library added.
- Changes minimal and App Router–safe (client components where hooks are used; root layout remains server and reads cookie).
- Cookie is the source of truth for SSR; client reads cookie after mount only for sync.
- Single provider at root; no duplicate provider in `(public)` layout.
