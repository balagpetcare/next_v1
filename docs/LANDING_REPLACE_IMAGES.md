# How to Replace Landing Images

Landing images live under **`public/landing/`**. Replace files in place (same path and filename) so the app keeps working without code changes.

---

## Hero

| Path | Usage | Replace with |
|------|--------|----------------|
| `public/landing/images/dashboard.svg` or `dashboard.png` | Hero right-side dashboard mock | Your dashboard screenshot or mock (recommended size ~560×340px). |

**Code:** `app/(public)/_components/HeroSection.tsx` — `DASHBOARD_IMAGE` (currently `/landing/images/dashboard.svg`). If you switch to PNG, change the constant and the file on disk.

---

## Ecosystem

| Path | Usage | Replace with |
|------|--------|----------------|
| `public/landing/images/ecosystem.svg` or `ecosystem.png` | Ecosystem diagram (center + nodes) | Your ecosystem diagram asset. |

**Code:** `app/(public)/_components/EcosystemSection.tsx` — `src="/landing/images/ecosystem.svg"`. Change `src` if you use a different filename (e.g. `ecosystem.png`).

---

## Growth (Reports)

| Path | Usage | Replace with |
|------|--------|----------------|
| `public/landing/images/ecosystem.svg` | Growth section “analytics” image above charts | Any analytics/dashboard image (same as ecosystem or a dedicated growth asset). |

**Code:** `app/(public)/_components/ReportsSection.tsx` — Image `src="/landing/images/ecosystem.svg"`. You can point this to a dedicated file (e.g. `growth.png`) and add that file under `public/landing/images/`.

---

## Final CTA sparkle

| Path | Usage | Replace with |
|------|--------|----------------|
| `public/landing/images/sparkle.svg` or `sparkle.png` | Decorative sparkle beside final CTA | Your sparkle/decoration graphic. |

**Code:** `app/(public)/_components/CtaSection.tsx` uses `/landing/images/sparkle.svg` for the two decorative `<Image>` elements. **CSS:** `src/styles/landing.css` — `.jamina-cta-wrap::after` uses `background: url('/landing/images/sparkle.svg')` (or `.png` if you change it). Update both the component `SPARKLE_IMAGE` constant and the CSS `url(...)` if you switch format.

---

## Testimonials

| Path | Usage | Replace with |
|------|--------|----------------|
| `public/landing/testimonials/avatar1.svg` | Testimonial 1 (Rahim A.) | Photo or graphic, same or similar aspect ratio. |
| `public/landing/testimonials/avatar2.svg` | Testimonial 2 (Karim H.) | Same. |
| `public/landing/testimonials/avatar3.svg` | Testimonial 3 (Fatima S.) | Same. |

**Code:** `app/(public)/_components/TestimonialsSection.tsx` — `avatar: "/landing/testimonials/avatarN.svg"`. To use PNG/JPG, replace the files (e.g. `avatar1.png`) and change the `avatar` values in the `testimonials` array to the new paths (e.g. `/landing/testimonials/avatar1.png`).

---

## Reference screenshots (optional)

These are for design reference only; the app does not load them:

- `public/landing/reference/design-light.png`
- `public/landing/reference/design-dark.png`

You can add or replace other files under `public/landing/reference/` without affecting the build.

---

## All asset paths used in code

| Asset | Path in code/CSS |
|-------|-------------------|
| Hero dashboard | `HeroSection.tsx`: `/landing/images/dashboard.svg` |
| Ecosystem diagram | `EcosystemSection.tsx`: `/landing/images/ecosystem.svg` |
| Growth/Reports image | `ReportsSection.tsx`: `/landing/images/ecosystem.svg` |
| CTA sparkle (component) | `CtaSection.tsx`: `/landing/images/sparkle.svg` |
| CTA sparkle (CSS) | `landing.css` `.jamina-cta-wrap::after`: `url('/landing/images/sparkle.svg')` |
| Testimonial avatars | `TestimonialsSection.tsx`: `/landing/testimonials/avatar1.svg`, `avatar2.svg`, `avatar3.svg` |

---

## Checklist

1. Keep **filenames** the same when replacing, **or** update the component (and any CSS `url()`) that references them.
2. Prefer **SVG** for icons and diagrams; use **PNG/JPG** for photos and complex visuals.
3. After replacing, run `npm run build` and test the landing page and image loading.
