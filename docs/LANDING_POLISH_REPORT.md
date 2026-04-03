# Landing Page Pixel-Perfect Polish — Change Report

Polish pass completed using DevOverlay (press **O**) and reference PNGs in `public/landing/reference/`. No changes to `/owner/*` routes or auth. DevOverlay unchanged and remains dev-only (`NODE_ENV === 'production'` → not rendered).

---

## 1. Token unification (`src/styles/landing.css`)

**Single source of truth in `:root`:**
- **Container:** `--lp-container: 1120px` (was 1160 at top, 1120 in `.landing`; now one value).
- **Radius:** `--lp-radius`, `--lp-radius-lg`, `--lp-radius-xl`; all cards use `--lp-r-card` / `--lp-radius`.
- **Shadow:** `--lp-shadow`, `--lp-shadow-md`; cards use `--lp-shadow-sm` (alias of `--lp-shadow`).
- **Border:** `--lp-border` → `var(--lp-border-gray)`; **muted text:** `--lp-muted` → `var(--lp-muted-gray)`; **surface:** `--lp-surface` → `var(--lp-surface-white)`; **primary:** `--lp-primary` → `var(--lp-primary-teal)`.
- **Typography:** `--lp-h1`, `--lp-h2`, `--lp-h3`, `--lp-body`, `--lp-small` used consistently; `.lp-h2` uses `var(--lp-h2)` and `font-weight: 700`.

**Removed:** Duplicate variable block inside `.landing` (previously redefined `--lp-container`, `--lp-text`, `--lp-muted`, `--lp-r-card`, etc.). `.landing` now only sets `--lp-bg`, `font-family`, `color`, `background`, and font-smoothing.

---

## 2. Hero (header-2 reference)

- **Padding:** `var(--lp-64)` top, `var(--lp-72)` bottom.
- **Title:** `font-size: clamp(36px, 4.5vw, 52px)`, `font-weight: 800`, `letter-spacing: -0.03em`, `line-height: 1.08`.
- **Subtitle:** `margin-top: var(--lp-24)`.
- **CTAs:** `margin-top: var(--lp-32)`, `gap: var(--lp-16)`; primary/secondary `padding: var(--lp-16) var(--lp-32)`, `border-radius: var(--lp-radius)`.
- **Mock (dashboard):** `border-radius: var(--lp-radius-lg)`, `border: 1px solid rgba(255,255,255,.2)`, `box-shadow: 0 24px 48px rgba(0,0,0,.35)`.

---

## 3. Navbar (header-2)

- **Inner:** `padding: var(--lp-16) var(--lp-24)`, `gap: var(--lp-24)`.
- **Actions:** `gap: var(--lp-16)`.
- **Sign Up button:** `padding: var(--lp-8) var(--lp-24)`, `border-radius: var(--lp-radius)`.

---

## 4. Container & section spacing

- **Container:** `padding: 0 var(--lp-24)` (was `var(--lp-16)`).
- **Sections:** `padding: var(--lp-72) 0` (was `calc(var(--lp-48) + var(--lp-24))`).
- **Section tight:** `padding: var(--lp-48) 0` (was `var(--lp-32)`).

---

## 5. Typography

- **Root:** `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale` on `.landing`.
- **.lp-h2:** `font-size: var(--lp-h2)`, `font-weight: 700`, `line-height: 1.2`, `color: var(--lp-text-dark)`.
- **.lp-subtitle:** `margin: var(--lp-24) auto 0`, `color: var(--lp-muted-gray)`, `font-size: var(--lp-body)`.

---

## 6. Ecosystem (echo-1)

- **Grid:** `gap: var(--lp-24)`, center row `200px` (was 190px).
- **Lines:** `opacity: 0.85`, `filter: drop-shadow(0 0 8px rgba(80,184,167,.25))`.
- **Center:** `border: 2px solid rgba(80,184,167,.4)`, `padding: var(--lp-16) var(--lp-24)`.
- **Cards:** `.lp-eco-card` with explicit `border-radius`, `border`, `background`, `box-shadow`, `padding`; `width: min(220px, 100%)`.

---

## 7. Steps (steps-1)

- **Row:** `gap: 0 var(--lp-32)`, `margin-top: var(--lp-48)`.
- **Step node:** `64px` circle (was 56px) in `.lp-steps-row .lp-step-node`.
- **Cell:** `max-width: 200px`; title and `.lp-card-sub` spacing/line-height tuned.

---

## 8. Business Benefits (business-benifits-1)

- **Grid:** `gap: var(--lp-24)`, `margin-top: var(--lp-48)`.
- **Cards:** `.lp-grid-3 .lp-card` — `padding: var(--lp-32)`, `min-height: 200px`, flex column; `.lp-card-title` `margin-top: var(--lp-16)`, `font-weight: 700`, `font-size: var(--lp-h3)`; `.lp-card-sub` `margin-top: var(--lp-8)`.

---

## 9. Sales flow (platform-increase-sells)

- **Arrows:** `gap: 0 var(--lp-24)`, `margin-top: var(--lp-48)`; arrow column `width: 32px`, icon `20px`.
- **Items:** `min-width: 180px`, `max-width: 240px`, `padding: var(--lp-24) var(--lp-16)`.
- **Title:** `font-size: var(--lp-small)`, `line-height: 1.4`.

---

## 10. Growth (growth-1)

- **Wrap:** `gap: var(--lp-56)`, `margin-top: var(--lp-48)`.
- **Visual:** `max-width: 560px`, `justify-self: end`.

---

## 11. Customer love (booking)

- **Card:** `padding: var(--lp-24)`, `gap: var(--lp-24)`; title `font-weight: 700`, `font-size: var(--lp-h3)`; sub `font-size: var(--lp-small)`, `line-height: 1.55`.

---

## 12. Testimonials (comments-1)

- **Card:** `.lp-testimonial` — `padding: var(--lp-32)`, `border-radius`, `border`, `background`, `box-shadow` from tokens.
- **Stars:** `gap: 4px`, `svg` `16px`.
- **Role:** `font-size: var(--lp-body)`.
- **Name:** `font-size: var(--lp-body)`.

---

## 13. Trust badges (security)

- **Section:** no card style; badges are icon + two-line text only.
- **Grid:** `gap: var(--lp-24)`, `margin-top: var(--lp-48)`.
- **Badge:** transparent, no border/shadow; icon `32px`; stack layout with `.lp-trust-line1` / `.lp-trust-line2`.

---

## 14. FAQ (faq-1)

- **List:** `gap: var(--lp-16)`, `margin-top: var(--lp-48)`.
- **Item:** `border-radius: var(--lp-radius)`, `border: 1px solid var(--lp-border-gray)`, `background: var(--lp-surface-white)`, `box-shadow: var(--lp-shadow)`.
- **Question:** `padding: var(--lp-24)`, `font-weight: 700`, `font-size: var(--lp-body)`.
- **Answer:** `padding` and `border-top` when open; text `color: var(--lp-muted-gray)`, `font-size: var(--lp-small)`.
- First item remains open by default (unchanged in `FAQ.tsx`).

---

## 15. Final CTA (footer)

- **Section:** `padding: var(--lp-72) 0`.
- **Card:** `border-radius: var(--lp-radius-lg)`, `background: linear-gradient(180deg, var(--lp-primary-teal-dark), #0a4a58)`, `padding: var(--lp-64) var(--lp-24)`.
- **Title:** `font-size: var(--lp-h2)`, `font-weight: 700`, `line-height: 1.2`.
- **Sub:** `margin-top: var(--lp-24)`.
- **Actions:** `margin-top: var(--lp-32)`; button `padding: var(--lp-16) var(--lp-40)`, `border-radius: var(--lp-radius)`.

---

## 16. Anchor scroll

- **Ids:** `#sales` added to `scroll-margin-top: 72px` list with `#top`, `#ecosystem`, `#steps`, `#benefits`, `#growth`, `#love`, `#testimonials`, `#trust`, `#faq`, `#cta`.

---

## Files changed

| File | Changes |
|------|--------|
| `src/styles/landing.css` | Token unification in `:root`; single `.landing` block; Hero/Navbar dark overrides; container/section padding; `.lp-h2`/`.lp-subtitle`; Ecosystem, Steps, Benefits, SalesFlow, Growth, CustomerLove, Testimonials, Trust, FAQ, Final CTA layout/spacing/radius/shadow/typography; scroll-margin for `#sales`. |
| (No component file changes) | Layout and visuals driven by CSS only; no markup or route changes. |

---

## Regression

- **Build:** `npm run build` passes (after clearing `.next` once for an unrelated cache error).
- **DevOverlay:** Still returns `null` when `process.env.NODE_ENV === 'production'`; no production code path change.

---

## How to verify

1. Run `npm run dev:owner`, open http://localhost:3104/
2. Press **O** to show overlay; use opacity slider and section buttons (Hero, Ecosystem, Steps, …).
3. Compare each section to its reference PNG; adjust overlay opacity as needed.
4. Confirm desktop layout, type scale, card radius/shadow, and spacing match references.
