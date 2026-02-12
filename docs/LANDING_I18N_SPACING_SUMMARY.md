# Landing Page i18n & Spacing Summary

**Date:** 2026-02-12  
**Scope:** Public landing at `http://localhost:3104/` — full bilingual (bn/en) and consistent spacing.

---

## A) Files Changed

| File | Changes |
|------|--------|
| `app/(public)/_locales/en.json` | Added missing keys: header (ariaLangEn, ariaLangBn, navAriaLabel), ecosystem (centerAlt, items.*), howToStartDiagram.centerImageAlt, reports (chip1–3, kpiTitle, kpiChip, kpi1–4Label, kpiFootnote, aria*), globalImpact (full section) |
| `app/(public)/_locales/bn.json` | Same keys with Bangla translations |
| `app/(public)/_components/PublicHeader.tsx` | Nav and language buttons use `t("header.navAriaLabel")`, `t("header.ariaLangEn")`, `t("header.ariaLangBn")` |
| `app/(public)/_components/HeroSection.tsx` | Section spacing: `px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20`, container `max-w-6xl mx-auto` |
| `app/(public)/_components/TrustSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, grid `gap-4 sm:gap-6 lg:gap-8` |
| `app/(public)/_components/EcosystemSection.tsx` | Section spacing, container `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8` (ecosystem.items.* and centerAlt already in locales) |
| `app/(public)/_components/HowToStartDiagramSection.tsx` | Section spacing, container `max-w-6xl mx-auto`, head `mb-6 sm:mb-8`, Image `alt={t("howToStartDiagram.centerImageAlt")}` |
| `app/(public)/_components/HowToStartSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, steps wrap gap, CTA wrap padding |
| `app/(public)/_components/ServiceSalesSection.tsx` | Section spacing, container `max-w-6xl mx-auto`, head `mb-6 sm:mb-8` |
| `app/(public)/_components/CustomerBenefitsSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, bars gap |
| `app/(public)/_components/BenefitsSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, feature-grid gap |
| `app/(public)/_components/ReportsSection.tsx` | Section spacing, container `max-w-6xl mx-auto`, head `mb-6 sm:mb-8`, twoUp gap; chart/KPI `aria-label={t("reports.aria*")}`; removed broken/unused imports (HeroLaptopAnalytics, Image) |
| `app/(public)/_components/GlobalImpactSection.tsx` | **Full i18n:** title, subtitle, stat labels (via labelKey), CTA text; `useLanguage()` and `t("globalImpact.*")`; section/container spacing and grid gap |
| `app/(public)/_components/TestimonialsSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, grid gap |
| `app/(public)/_components/FaqSection.tsx` | Section spacing, wrapper `max-w-6xl mx-auto`, heading `mb-6 sm:mb-8`, list gap |
| `app/(public)/_components/CtaSection.tsx` | Section spacing, CTA wrap `max-w-6xl mx-auto` |

---

## B) New Translation Keys Added

**Header**  
- `header.ariaLangEn`, `header.ariaLangBn`, `header.navAriaLabel`

**Ecosystem**  
- `ecosystem.centerAlt`  
- `ecosystem.items.profile|vaccine|clinic|appointment|products|wallet|grooming|adoption` (each: `title`, `desc`)

**How to start diagram**  
- `howToStartDiagram.centerImageAlt`

**Reports**  
- `reports.chip1`, `reports.chip2`, `reports.chip3`  
- `reports.kpiTitle`, `reports.kpiChip`, `reports.kpi1Label`–`kpi4Label`, `reports.kpiFootnote`  
- `reports.loadingChart`, `reports.ariaRevenueChart`, `reports.ariaCategoriesChart`, `reports.ariaServicesChart`, `reports.ariaKpiSummary`

**Global impact (new section)**  
- `globalImpact.title`, `globalImpact.subtitle`  
- `globalImpact.statCustomers`, `statShops`, `statProducts`, `statServices`, `statCountries`  
- `globalImpact.ctaText`

---

## C) Spacing Conventions Applied

- **Section outer:** `px-4 sm:px-6 lg:px-8` and `py-12 sm:py-16 lg:py-20`
- **Section headings:** `mb-6 sm:mb-8`
- **Containers:** `max-w-6xl mx-auto` (with existing `lp-container` where used)
- **Cards/grids:** `gap-4 sm:gap-6 lg:gap-8` on grid/list wrappers

No visual redesign; only spacing and alignment for a cleaner layout.

---

## D) Reused Keys & Notes

- **Reused:** CTA primary text uses `hero.ctaPrimary` and `cta.button` (same copy); header “Sign up” uses `header.signUp`.  
- **Ecosystem:** Section uses `ecosystem.items.*` for the orbit cards; `ecosystem.centerAlt` used for center image/aria (same meaning as `centerLabel` in copy).  
- **Reports:** Chart loading skeleton still uses a literal `"Loading chart"` (no hook in dynamic loading callback); all other report strings use `t()`.  
- **Build:** Removed unused/broken imports in `ReportsSection.tsx` (HeroLaptopAnalytics, Image) so the project builds successfully.

---

## Verification

- `npm run build` completes successfully.  
- All user-visible text on the landing page uses `t(...)` from `useLanguage()` except the chart loading placeholder.  
- Switching locale (EN/বাংলা) in the header updates all landing strings.  
- Spacing is consistent across sections as above.
