# Public Landing Page — Changelog

## Summary

Pixel-perfect public landing for the Owner panel (SITE_MODE=owner) with all sections from the reference images, EN + BN i18n, and isolated landing styles. No changes to authenticated `/owner/*` routes or API/auth.

---

## Pixel-perfect redesign aligned to references (latest)

- **Scope:** UI/layout/CSS only; same content, same i18n keys, same section order. Reference images: `public/landing/reference/*`.
- **Sections:** A Header+Hero (header-2) → B Trust (security) → C Ecosystem (echo-1) → D How-to-start diagram (how to start your business) → E Sales flow (platform-increase-sells) → F Steps (steps-1) → G Customer love (booking) → H Business benefits (business-benifits-1) → I Growth (growth-1) → J Testimonials (comments-1) → K FAQ (faq-1) → L Footer CTA (footer).
- **STEP 1 — Content freeze:** All visible text uses `t()` from `_locales/en.json` and `bn.json`. Section → key mapping: Hero `hero.*`, Trust `trust.*`, Ecosystem `ecosystem.*`, HowToStartDiagram `howToStartDiagram.*`, ServiceSales `serviceSales.*`, HowToStart `howToStart.*`, CustomerBenefits `customerBenefits.*`, Benefits `benefits.*`, Reports/Growth `reports.*`, Testimonials `testimonials.*`, FAQ `faq.*`, CTA `cta.*`. No content or key changes in this pass.
- **STEP 2 — Design tokens:** `landing.css` uses `--lp-container` (1120px), `--lp-*` spacing (8px grid), `--lp-h1/h2/h3`, `--lp-radius` (12px), `--lp-radius-lg` (16px), `--lp-shadow` / `--lp-shadow-md`, icon sizes `--lp-icon-section` (32px), `--lp-icon-card` (24px), `--lp-icon-step` (64px).
- **STEP 3–5:** Layout, spacing, typography, card radius/shadow, and responsive behavior updated per reference; CLS avoided via aspect-ratio/object-fit; build and public access verified.

**Implementation summary (pixel-perfect pass):**
- **A Header+Hero:** Unchanged structure; dark gradient and hero mockup already match header-2.
- **B Trust:** `.jamina-trust-section` background `#f8f8f8`; trust badges lighter card (white, subtle shadow); icon 32px, bold two-line text.
- **C Ecosystem:** `lp-h2` / `lp-subtitle`; `lp-container` for hub; ecosystem image unchanged.
- **D How-to-start diagram:** Section given dark blue gradient background (`--lp-gradient-hero`); title/subtitle white; center circle teal; node cards white with teal icon; content wrapped in `lp-container`.
- **E Sales flow:** Section `lp-section-soft`; title `lp-h2`; content in `lp-container`; flow stages unchanged.
- **F Steps:** Rebuilt to use `lp-steps-wrap` + `lp-steps-row` (ul/li) with `lp-step-cell`, `lp-step-node`, `lp-step-title`, `lp-card-sub`; two `lp-step-arrow-float` divs on the connecting line; section `lp-section-soft`; CTA below with `.lp-cta-wrap-steps`.
- **G Customer love:** Section `lp-section-soft`; `lp-h2`; `lp-container`; `jamina-customer-bars` unchanged.
- **H Business benefits:** Section `lp-section`; `lp-h2`; `lp-container`; `feature-grid` unchanged.
- **I Growth/Reports:** Section `lp-section`; `lp-h2` / `lp-subtitle`; `lp-container`; bullets + dashboard layout unchanged.
- **J Testimonials:** Section `lp-section`; `lp-h2`; `lp-container`; card order avatar → stars → role → quote → author unchanged.
- **K FAQ:** Section `lp-section`; `lp-h2`; `lp-container`; `faq-list` margin-top 32px, gap 16px.
- **L Footer CTA:** Existing `jamina-cta-wrap` and `jamina-cta-btn`; no structural change.

---

## Files Changed / Created

### Created
- **`app/(public)/_components/HowToStartDiagramSection.tsx`** — New section D: “How to Start Your Platform” with center “Pet Owner Demand” and 4 nodes (Register Account, Add Your Business, Some details setup, Receive orders & bookings). Responsive: grid on desktop, stacked cards on mobile.
- **`public/landing/testimonials/avatar1.svg`**, **`avatar2.svg`**, **`avatar3.svg`** — Placeholder testimonial avatars (replaceable).
- **`docs/LANDING_CHANGELOG.md`** — This file.
- **`docs/LANDING_REPLACE_IMAGES.md`** — How to replace landing images.

### Modified

- **`app/(public)/page.tsx`** — Section order updated to: Hero → Trust → Ecosystem → How to Start Diagram → Sales Flow → 3 Steps → Customer Benefits → Business Benefits → Growth → Testimonials → FAQ → CTA. Import for `HowToStartDiagramSection` added.
- **`app/(public)/_components/PublicHeader.tsx`** — Added `jamina-header-dark`; nav links use `t("header.navEcosystem")`, `t("header.navSteps")`, `t("header.navBenefits")` for i18n.
- **`app/(public)/_components/HeroSection.tsx`** — Added `jamina-hero-dark` for dark gradient hero (reference header-2).
- **`app/(public)/_components/TrustSection.tsx`** — Two-line trust badges using `badgeNLine1` / `badgeNLine2`; icon above text; new classes `trust-badge-stack`, `trust-badge-icon`, `trust-badge-line1/2`.
- **`app/(public)/_components/EcosystemSection.tsx`** — Visible title/subtitle from `ecosystem.title` / `ecosystem.subtitle`; image path set to `/landing/images/ecosystem.svg` (was `/landing/assets/ecosystem-diagram.png`); `jamina-ecosystem` and `jamina-ecosystem-hub` classes for layout.
- **`app/(public)/_components/ServiceSalesSection.tsx`** — Added `id="sales"` for anchor linking.
- **`app/(public)/_components/BenefitsSection.tsx`** — Section heading uses `t("benefits.sectionTitle")` (“Business Benefits”) instead of `t("benefits.title")`.
- **`app/(public)/_components/TestimonialsSection.tsx`** — Uses avatar images from `/landing/testimonials/avatar1.svg`, `avatar2.svg`, `avatar3.svg`; layout order: avatar → stars → role → quote → author.
- **`app/(public)/_components/FaqSection.tsx`** — `summary` has `aria-controls`; answer div has `role="region"` and `aria-labelledby` for accessibility.
- **`app/(public)/_locales/en.json`** — Added `ecosystem.diagramAlt`, `howToStartDiagram` (title, subtitle, centerLabel, node1Title–node4Title).
- **`app/(public)/_locales/bn.json`** — Same keys as en.json with Bengali translations.
- **`src/styles/landing.css`** — Header/hero dark theme (`.jamina-header-dark`, `.jamina-hero-dark`); Trust strip (`.jamina-trust-section`, `.trust-badge-stack`, icon + two-line text); How to Start Diagram (`.jamina-diagram-section`, grid + mobile stack); testimonial avatar styles; scroll-margin for `#how-to-start-diagram`; existing scroll-margin list includes `#sales`.

---

## Verification and pixel-perfect fixes (latest)

- **STEP A verified:** `page.tsx` section order, `layout.tsx` (LanguageProvider wraps header + main), `PublicHeader` i18n nav links, `LanguageContext` cookie/localStorage persistence, locale keys `ecosystem.diagramAlt` and `howToStartDiagram.*` in both `en.json` and `bn.json`, assets at `public/landing/images/` (dashboard, ecosystem, sparkle) and `public/landing/testimonials/` (avatar1–3.svg).
- **Header/hero visibility:** `.jamina-header-dark` and `.jamina-hero-dark` use `isolation: isolate` so the gradient is not clipped by parent; `.landing main` has explicit `background-color: var(--lp-bg-light)` so section content does not inherit global body background.
- **Section titles:** `.section-title` font-size set to `clamp(1.5rem, 2vw, 1.75rem)` (24–28px) to match reference H2 scale; added `font-weight` and `line-height`.
- **Hero image / CLS:** `.jamina-hero-mockup` has `aspect-ratio: 560/340`, `min-height: 200px`, `overflow: hidden`; hero img and `.hero-dashboard-img` use `object-fit: contain` and `height: 100%` to prevent layout shift when images load.
- **Trust strip:** `.trust-badge-stack` has explicit `border`, `background: var(--card)`, `box-shadow: var(--shadow2)` for consistency with reference (security.png).

---

## Final pixel-perfect pass

**Navigation**
- **PublicHeader:** Added FAQ link: `<a href="#faq">` using `t("header.navFaq")`. All section anchors (`#top`, `#ecosystem`, `#how-to-start-diagram`, `#sales`, `#steps`, `#benefits`, `#love`, `#testimonials`, `#trust`, `#faq`, `#cta`) have `scroll-margin-top: 72px` in `landing.css`.

**Locale (remove EN flash)**
- **app/(public)/layout.tsx:** Layout is now `async`; reads `app_locale` and `landing_locale` cookies via `cookies()` from `next/headers` and passes `initialLocale` to `<LanguageProvider initialLocale={initialLocale}>` so first paint matches saved language.

**Typography and buttons**
- **Buttons:** `.jamina-btn` min-height 44px, padding 12px 20px, border-radius 12px, font-size from `--lp-body`. Header Sign up and hero CTAs use 44–48px height, 12px radius, consistent hover (translateY + shadow).
- **Hero mockup:** Stronger shadow (`0 20px 50px rgba(0,0,0,.35)`), 16px radius, subtle border for header-2 look.
- **Section titles:** Already normalized (clamp 1.5–1.75rem); card titles use 1rem–1.0625rem, font-weight 700, line-height 1.3.

**Section-by-section alignment**
- **Trust (security.png):** Icon size 32px in component; badge stack padding and two-line text unchanged.
- **Steps (steps-1.png):** Step node 56px circle, teal fill (`--lp-primary-teal-dark`), white icon; card padding 22px 18px, radius 16px.
- **Sales flow (platform-increase-sells.png):** Flow stage padding 20px 16px, radius 16px, white card; stage title supports `white-space: pre-line` for multi-line labels.
- **Customer benefits (booking.png):** 2×2 cards padding 20px 18px, radius 16px, border #e5e7eb.
- **Business benefits (business-benifits-1.png):** Benefit card padding 20px 18px, radius 16px, consistent title/description line-height.
- **Testimonials (comments-1.png):** Card padding 24px 20px, avatar 80px circle, stars gap 4px, quote and role font-size/line-height tuned.
- **FAQ (faq-1.png):** Accordion border 16px radius, #e5e7eb; summary padding 18px 20px; CSS chevron `::after` (rotate 45deg / -135deg when open); answer padding 20px.
- **Final CTA (footer.png):** `.jamina-cta-wrap` uses `--lp-gradient-cta`, min-height 280px, flex center; primary button white bg, dark text, 48px height, 12px radius, shadow; tagline color rgba(255,255,255,.85).

---

## Section Order (Final)

| # | Section ID | Component |
|---|------------|-----------|
| A | `#top` | HeroSection |
| B | `#trust` | TrustSection |
| C | `#ecosystem` | EcosystemSection |
| D | `#how-to-start-diagram` | HowToStartDiagramSection |
| E | `#sales` | ServiceSalesSection |
| F | `#steps` | HowToStartSection |
| G | `#love` | CustomerBenefitsSection |
| H | `#benefits` | BenefitsSection |
| I | `#growth` | ReportsSection |
| J | `#testimonials` | TestimonialsSection |
| K | `#faq` | FaqSection |
| L | `#cta` | CtaSection |

---

## CTA / Routing Preserved

- “See How It Works” → `#ecosystem`.
- Nav links (Ecosystem, Steps, Benefits) → in-page anchors; no routing away.
- Login → `/owner/login`; Sign up → `/owner/register`.
- Primary CTAs (“Start Business Free”, “Get Started Now”) → `/owner/register`.
- Getting-started flows (View Requirements, Start Setup → `/owner/onboarding?intro=1`) unchanged; not on the landing page.

---

## i18n

- All visible landing strings use `t(...)` from `LanguageContext` (EN/BN).
- New keys: `ecosystem.diagramAlt`, `howToStartDiagram.*`.
- Header nav and Trust badges use existing or updated keys; language switcher works on landing.
