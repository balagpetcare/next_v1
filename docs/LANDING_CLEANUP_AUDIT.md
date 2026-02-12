# Landing cleanup audit (STEP 1)

## 1) Files importing from `app/(public)/_components`

| File | Imports |
|------|---------|
| `app/(public)/layout.tsx` | `PublicHeader` |
| `app/(public)/page.tsx` | `HeroSection`, `TrustSection`, `EcosystemSection`, `HowToStartDiagramSection`, `ServiceSalesSection`, `HowToStartSection`, `CustomerBenefitsSection`, `BenefitsSection`, `ReportsSection`, `TestimonialsSection`, `FaqSection`, `CtaSection` |

All 13 components in `_components` are used. **No unused components.**

---

## 2) Files importing `landing.css`

| File | Notes |
|------|--------|
| `app/(public)/layout.tsx` | `import "@/src/styles/landing.css";` — **only** importer |

No other file (including any under `/owner/*`) imports landing.css. **Style isolation OK.**

---

## 3) References to `public/landing` images

| Asset | Referenced in |
|-------|----------------|
| `/landing/images/dashboard.svg` | `HeroSection.tsx` (DASHBOARD_IMAGE) |
| `/landing/images/ecosystem.svg` | `EcosystemSection.tsx`, `ReportsSection.tsx` |
| `/landing/images/sparkle.svg` | `CtaSection.tsx` (SPARKLE_IMAGE), `landing.css` (`.jamina-cta-wrap::after`, `.lp-final-sparkle`) |
| `/landing/testimonials/avatar1.svg`, `avatar2.svg`, `avatar3.svg` | `TestimonialsSection.tsx` |

**Unused by code:**  
- `public/landing/assets/eco-center.png` — not referenced.  
- `public/landing/ecosystem-center.png` — not referenced.  

*(Optional to delete; kept as reference assets unless removed in STEP 2.)*

---

## 4) Testimonials / avatars

- **Component:** `TestimonialsSection.tsx` uses `testimonial-avatar-wrap`, `testimonial-avatar-img`, `testimonial-role`, `testimonial-quote`, `testimonial-author`, `stars`, `testimonials-grid`, `testimonial-card`.
- **CSS:** `landing.css` has legacy blocks: `.testimonial-top`, `.avatar` (40px circle), `.testimonial-name` — **not used** by current markup. Duplicate/alias blocks for testimonial exist (e.g. `.testimonial-avatar`, `.testimonial-card .author`) — some are used, some are legacy.

---

## 5) Unused CSS classes (candidates for removal)

- **.testimonial-top** — not used (component uses `testimonial-avatar-wrap` + `testimonial-avatar-img`).
- **.avatar** (standalone in testimonials block) — not used (component uses `testimonial-avatar-img`).
- **.testimonial-name** — not used (component uses `testimonial-author`).

**Not removed (used elsewhere or structural):**  
- `.lp-eco-center`, `.lp-eco-avatar`, `.lp-eco-center-title`, `.lp-eco-center-sub` — used in CSS layout/descendants.  
- `.lp-testimonial*`, `.eco2-center-avatar` — may be used in alternate layouts or kept for consistency; left in place for this pass.

---

## 6) Dead imports

- No dead imports detected in `app/(public)/_components` or `app/(public)/page.tsx`, `layout.tsx`.

---

## 7) Duplicate section components

- None. Single source of truth: `app/(public)/_components`. No duplicates between folders (src/components/landing removed previously).

---

## 8) Route safety (proxy)

- **proxy.ts** matcher: only `"/owner/:path*"`, `"/admin/:path*"`, etc. — **does not match `/` or `/getting-started`**, so those routes are never passed to the proxy; they are served by Next.js and remain public.
- **PUBLIC_PATHS** includes `"/"`, `"/getting-started"` for clarity when proxy is extended; currently proxy is not invoked for these paths. **/owner/* remains protected** when accessed without auth.

---

## Summary

| Item | Status |
|------|--------|
| Unused components | None |
| landing.css import | Only in `app/(public)/layout.tsx` |
| Unused images | `eco-center.png`, `ecosystem-center.png` (optional delete) |
| Unused CSS | `.testimonial-top`, `.avatar`, `.testimonial-name` (safe to remove) |
| Dead imports | None |
| Duplicate components | None |
| Proxy / public routes | "/" and "/getting-started" public; /owner/* protected |
