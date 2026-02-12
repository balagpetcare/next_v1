# Landing guardrails

Lightweight safeguards to keep the consolidated landing state from regressing. No UI/content/i18n or `/owner/*` auth changes — checks and docs only.

---

## 1. Tooling (reference)

- **ESLint:** `eslint.config.mjs` (flat config); `npm run lint` runs ESLint.
- **TypeScript:** Path alias `@/*` → repo root (`tsconfig.json`).
- **Landing checks:** `npm run check:landing` runs `scripts/check-landing-isolation.mjs`.

---

## 2. Landing CSS isolation

**Rule:** `src/styles/landing.css` must be imported **only** in `app/(public)/layout.tsx`.

**Check:** `node scripts/check-landing-isolation.mjs` (or `npm run check:landing`). It scans app, src, components, lib (and root) for any `.tsx`/`.ts`/`.jsx`/`.js` file that imports `landing.css`; if any file other than `app/(public)/layout.tsx` does, the script exits with code 1.

**Why:** Prevents landing styles from leaking into `/owner/*` or other routes.

---

## 3. No landing components under `src/components/landing`

**Rule:** The folder `src/components/landing` must not exist. All landing UI lives in `app/(public)/_components`.

**Check:** The same script fails if `src/components/landing` exists.

**Why:** Single source of truth for landing sections and header; avoids duplicate/confusing copies.

---

## 4. Public route safety

- **`/`** and **`/getting-started`** must remain **public** (no auth required). Guests must be able to open the landing and the getting-started page.
- If **`proxy.ts`** (or middleware) is used:
  - The **public allowlist** must include `"/"`, `"/getting-started"`, and auth entry points (e.g. `/owner/login`, `/owner/register`, `/owner/logout`).
  - The proxy **matcher** may omit `"/"` and `"/getting-started"` (so they are never gated); in that case they are public by default.
- **`/owner/*`** (and other app areas) must remain **protected**: unauthenticated access must redirect to the appropriate login (e.g. `/owner/login`), not serve dashboard content.

When changing routing or proxy logic, re-verify:
- Landing and getting-started load without cookies.
- Owner routes redirect to login when not authenticated.

---

## 5. Asset hygiene (`public/landing`)

- **Used in code:** See **`docs/LANDING_REPLACE_IMAGES.md`** for the full table. In short:
  - `public/landing/images/`: `dashboard.svg`, `ecosystem.svg`, `sparkle.svg` (Hero, Ecosystem, Reports, CTA).
  - `public/landing/testimonials/`: `avatar1.svg`, `avatar2.svg`, `avatar3.svg`.
- **Where to add new assets:** Under `public/landing/images/` or a new subfolder; reference them in `app/(public)/_components` (or in `landing.css` for background images) with paths like `/landing/images/…`.
- **Reference-only:** Files in `public/landing/reference/` are not loaded by the app; they are for design reference. Other unused images (e.g. legacy assets) can be removed or moved to `reference/` and documented so they are not mistaken for live assets.

---

## 6. Running the checks

```bash
npm run check:landing
```

Runs `scripts/check-landing-isolation.mjs`. Use in CI or before commits to avoid:

- Importing `landing.css` outside `app/(public)/layout.tsx`
- Reintroducing `src/components/landing`

**Success:** exit code 0, no output. **Failure:** exit code 1, message on stderr.

In CI, add `npm run check:landing` to the pipeline (e.g. before or after `npm run lint`) to block merges that break landing isolation or reintroduce `src/components/landing`.
