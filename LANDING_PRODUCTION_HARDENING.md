# Landing Page — Production Hardening Report

Final hardening pass for the landing at `/` (owner mode). No changes to `/owner/*` routing or auth. Visual design unchanged (pixel-perfect). DevOverlay remains dev-only (gated by `NODE_ENV === 'production'`).

---

## 1. Accessibility (no visual changes)

- **Headings:** Single H1 in Hero (`id="hero-title"`). All sections use H2 with unique ids (`eco-title`, `steps-title`, `benefits-title`, `sales-title`, `growth-title`, `love-title`, `testimonials-title`, `faq-title`, `final-title`). Card/step titles use H3.
- **Links/buttons:**
  - Hero: Primary CTA `aria-label="Start business free"`, secondary `aria-label="See how it works"`.
  - Navbar: Brand `aria-label="Aantima home"`, nav links `aria-label="Go to [Section] section"`, Login `aria-label="Log in"`, Sign Up `aria-label="Sign up"`.
  - Final CTA: `aria-label="Start business free"`.
- **FAQ accordion:**
  - Toggles are `<button type="button">` with `aria-expanded`, `aria-controls`, `aria-label` (Expand/Collapse + question).
  - Answer region has `role="region"` and `aria-labelledby={buttonId}`.
- **Focus:** `.landing a:focus-visible`, `button:focus-visible`, `input:focus-visible`, `[tabindex="0"]:focus-visible` use `outline: 2px solid var(--lp-primary-teal)` and `outline-offset: 2px` (no layout change).

---

## 2. Image hygiene & performance

- **Hero:** `next/image` with `priority`, `sizes="(max-width: 980px) 100vw, 560px"`, `alt="Dashboard preview showing pet business management interface"`.
- **Ecosystem:** Center image `width={96} height={96}`, `sizes="96px"`, `alt="Pet owner and pets at center of ecosystem"` (no priority; below fold).
- **Growth:** Dashboard image `width={560} height={340}`, `sizes="(max-width: 980px) 100vw, 560px"`, `alt="Analytics dashboard showing revenue and growth metrics"` (lazy by default).
- **Testimonials:** Avatar images `alt={\`${t.name}, ${t.role}\`}`.
- **DevOverlay:** Uses static paths `/landing/reference/*.png` only; not imported in runtime. Image `alt={\`Reference: ${ref.label} section\`}`, `sizes="100vw"`, `unoptimized`. Component returns `null` in production.
- **URLs:** All image `src` values are under `/landing/` (public); no external URLs.

---

## 3. Content consistency & routes

- **Primary CTA:** "Start Business Free" in Hero and Final CTA (Hero was "Start Business", now updated).
- **Secondary CTA:** "See How It Works" in Hero (unchanged), links to `#ecosystem`.
- **Navbar:** Login → `/owner/login`, Sign Up → `/owner/register` (existing auth routes; no new pages).

---

## 4. CSS

- **Focus:** `:focus-visible` styles added for `.landing` (see above).
- **Tokens:** Final CTA gradient end color moved to `--lp-final-cta-end: #0a4a58`; both `.lp-final-dark` and `.lp-final-card` use `var(--lp-final-cta-end)`.
- **Unused CSS:** No selectors removed. Legacy `jamina-*` and related classes are used by `app/(public)/_components`; `lp-*` classes are used by `src/components/landing/*`. Only truly unused rules would be removed after a full audit of both code paths; skipped to avoid regressions.

---

## 5. QA

- **Build:** `npm run build` succeeds.
- **DevOverlay:** Not rendered when `process.env.NODE_ENV === "production"` (unchanged).

---

## Files changed

| File | Changes |
|------|--------|
| `src/components/landing/Hero.tsx` | Primary CTA text "Start Business Free"; aria-labels on CTAs; hero image `alt` and `sizes`; `priority` kept. |
| `src/components/landing/Navbar.tsx` | Brand `aria-label="Aantima home"`; nav `aria-label="Primary navigation"`; section links and Login/Sign Up aria-labels. Routes unchanged: `/owner/login`, `/owner/register`. |
| `src/components/landing/FAQ.tsx` | `aria-label` on toggle buttons (Expand/Collapse + question text). |
| `src/components/landing/FinalCTA.tsx` | `aria-label="Start business free"` on CTA link. |
| `src/components/landing/Growth.tsx` | Image `alt` and `sizes`. |
| `src/components/landing/Testimonials.tsx` | Avatar `alt={\`${t.name}, ${t.role}\`}`. |
| `src/components/landing/Ecosystem.tsx` | Center image `alt` and `sizes="96px"`. |
| `src/components/landing/DevOverlay.tsx` | Overlay image `alt={\`Reference: ${ref.label} section\`}`, `sizes="100vw"`. |
| `src/styles/landing.css` | `:focus-visible` block for `.landing`; `--lp-final-cta-end` token; final CTA gradient uses token. |

No changes to `app/(public)/layout.tsx`, `app/(public)/page.tsx`, or any `/owner/*` routes.
