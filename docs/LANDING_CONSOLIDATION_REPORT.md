# Landing components consolidation report

## STEP 1 — Audit + dependency map

### 1) Component files in both folders

| Location | File |
|----------|------|
| **app/(public)/_components** | BenefitsSection.tsx, CtaSection.tsx, CustomerBenefitsSection.tsx, EcosystemSection.tsx, FaqSection.tsx, HeroSection.tsx, HowToStartDiagramSection.tsx, HowToStartSection.tsx, PublicHeader.tsx, ReportsSection.tsx, ServiceSalesSection.tsx, TestimonialsSection.tsx, TrustSection.tsx |
| **src/components/landing** | CustomerLove.tsx, DevOverlay.tsx, Ecosystem.tsx, Growth.tsx, Steps.tsx |

### 2) Imports referencing each folder

- **app/(public)/_components**: Imported only by:
  - `app/(public)/layout.tsx` → PublicHeader
  - `app/(public)/page.tsx` → HeroSection, TrustSection, EcosystemSection, HowToStartDiagramSection, ServiceSalesSection, HowToStartSection, CustomerBenefitsSection, BenefitsSection, ReportsSection, TestimonialsSection, FaqSection, CtaSection
- **src/components/landing**: **No imports found** in any `.tsx`/`.ts`/`.jsx`/`.js` file. Only mentioned in docs (I18N_*.md, RECOVERY_SUMMARY.md, LANDING_*.md).

### 3) Dependency map

**app/(public)/_components (all used):**

| Component | Imported by | Imports |
|-----------|-------------|---------|
| PublicHeader | layout.tsx | LanguageContext, Link, Iconify |
| HeroSection | page.tsx | LanguageContext, Link, Image |
| TrustSection | page.tsx | LanguageContext, Iconify |
| EcosystemSection | page.tsx | LanguageContext, Image |
| HowToStartDiagramSection | page.tsx | LanguageContext, Iconify |
| ServiceSalesSection | page.tsx | LanguageContext, Iconify |
| HowToStartSection | page.tsx | LanguageContext, Link, Iconify |
| CustomerBenefitsSection | page.tsx | LanguageContext, Iconify |
| BenefitsSection | page.tsx | LanguageContext, Iconify |
| ReportsSection | page.tsx | LanguageContext, demoData, chartConfigs, Iconify, Image, dynamic |
| TestimonialsSection | page.tsx | LanguageContext, Image, Iconify |
| FaqSection | page.tsx | LanguageContext |
| CtaSection | page.tsx | LanguageContext, Link, Image |

**src/components/landing (none used by app):**

| Component | Imported by | Imports |
|-----------|-------------|---------|
| CustomerLove | (none) | @/app/(public)/_lib/LanguageContext |
| DevOverlay | (none) | react, next/image |
| Ecosystem | (none) | react, next/image |
| Growth | (none) | @/app/(public)/_lib/LanguageContext, next/image |
| Steps | (none) | @/app/(public)/_lib/LanguageContext |

### 4) Summary

- **Dead files:** All 5 files in `src/components/landing` are unused (no imports from app or pages).
- **Duplicates (by role):** Ecosystem vs EcosystemSection, Steps vs HowToStartSection, CustomerLove vs CustomerBenefitsSection, Growth vs ReportsSection. The **active** implementations are in `app/(public)/_components`; the `src/components/landing` versions are legacy/alternate.
- **Route-coupled:** PublicHeader and all *Section components are landing-only and correctly live under `app/(public)/_components`.

---

## STEP 2 — Target structure (unchanged)

- **Single source of truth:** `app/(public)/_components` for all landing sections and PublicHeader.
- **No reusable primitives** in `src/components/landing` are used elsewhere; the folder is removed.

---

## STEP 3 — Consolidation (no moves; deletions only)

- No component was moved from `src/components/landing` into `app/(public)/_components` (would duplicate active sections).
- **Deleted files:** Entire folder `src/components/landing/`:
  - CustomerLove.tsx
  - DevOverlay.tsx
  - Ecosystem.tsx
  - Growth.tsx
  - Steps.tsx
- **Updated imports:** None (no code imported from `src/components/landing`).
- **Circular imports:** None introduced.

---

## STEP 4 — Verify

- **TypeScript/build:** `npm run build` run after removing `.next` (cache conflict). **Build succeeded** (Next.js 16.1.6, 228 static pages).
- **Manual:** Confirm in browser: `http://localhost:3104/` and `http://localhost:3104/getting-started` render as before; language switch works; no style leakage to `/owner/*`.

---

## Deliverables summary

| Category | Details |
|----------|---------|
| **Moved files** | None (consolidation was deletion-only; active components already in `app/(public)/_components`). |
| **Deleted files** | `src/components/landing/CustomerLove.tsx`, `DevOverlay.tsx`, `Ecosystem.tsx`, `Growth.tsx`, `Steps.tsx`; folder `src/components/landing` removed. |
| **Updated imports** | None (no code imported from `src/components/landing`). |
| **Build** | ✅ Succeeded. |
