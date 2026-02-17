# Dashboard Larkon Rollout — 2026-02-16

## Summary

Larkon dashboard UI is now used for all dashboard panels: **MOTHER (3100), SHOP (3101), CLINIC (3102), OWNER (3104), PRODUCER (3105), COUNTRY (3106), and STAFF**. WowDash dashboard UI (MasterLayout, owner-panel.css) has been quarantined; landing/public pages are unchanged.

---

## Panel-by-panel mapping: old routes → new routes

| Panel   | Old dashboard layout        | New dashboard layout                    | Entry redirect              |
|---------|-----------------------------|-----------------------------------------|-----------------------------|
| **Admin**  | Already on Larkon           | `app/admin/(larkon)/*`                  | —                           |
| **Mother** | MasterLayout (all routes)   | `app/mother/(larkon)/layout.tsx` + SCSS | `/mother` → `/mother/dashboard` (after auth) |
| **Shop**   | MasterLayout                | `app/shop/(larkon)/layout.tsx`          | `/shop` → `/shop/dashboard` |
| **Clinic** | MasterLayout                | `app/clinic/(larkon)/layout.tsx`        | `/clinic` → `/clinic/dashboard` |
| **Owner**  | MasterLayout + NotificationContainer | `app/owner/(larkon)/layout.tsx` | `/owner` → `/owner/dashboard` |
| **Producer** | MasterLayout (non-landing) | `app/producer/(larkon)/layout.tsx`      | `/producer` stays landing; `/producer/dashboard` under (larkon) |
| **Country** | MasterLayout                | `app/country/(larkon)/layout.tsx`       | `/country` → `/country/dashboard` (existing) |
| **Staff**  | MasterLayout                | `app/staff/(larkon)/layout.tsx`         | `/staff` → `/staff/branches` |

- **Dashboard routes** (sidebar/topbar app UI) live under `app/<panel>/(larkon)/*`. Route groups `(larkon)` do not change URLs (e.g. `/owner/dashboard` unchanged).
- **Auth/landing** stay outside `(larkon)`: `login`, `register`, `logout`, `kyc` (owner/producer), `onboarding` (owner), `invite` (country). **Producer** `/producer` remains the public landing page.

---

## Files moved to quarantine

All under: **`_quarantine_cleanup/2026-02-16/wowdash_all_dashboards/`**

- **`app/shop/page.jsx`** — old shop home (replaced by redirect to `/shop/dashboard`)
- **`app/clinic/page.jsx`** — old clinic home (replaced by redirect)
- **`app/owner/page.jsx`** — old owner home (WowDash Card/PageHeader; replaced by redirect)
- **`app/owner/dashboard/page.jsx`** — duplicate; real dashboard is in `app/owner/(larkon)/dashboard/page.jsx`
- **`app/country/dashboard/page.jsx`** — duplicate; real dashboard in `app/country/(larkon)/dashboard/page.jsx`
- **`app/producer/dashboard/page.jsx`** — duplicate; real dashboard in `app/producer/(larkon)/dashboard/page.jsx`
- **`app/staff/page.jsx`** — old staff branch-select home (replaced by redirect to `/staff/branches`)
- **`src/masterLayout/`** — entire folder (MasterLayout.jsx and any siblings) — **removed from active tree**
- **`public/assets/css/owner-panel.css`** — WowDash owner panel styles — **removed from active tree**

Root layout no longer links to `owner-panel.css` (comment left in `app/layout.jsx`).

---

## New files added per panel

- **Mother:** `app/mother/(larkon)/layout.tsx`, `app/mother/(larkon)/dashboard/page.tsx`; mother debug/health moved under `(larkon)`.
- **Shop:** `app/shop/(larkon)/layout.tsx`, `app/shop/(larkon)/dashboard/page.tsx`; redirect `app/shop/page.tsx`. All other shop dashboard routes moved under `app/shop/(larkon)/*`.
- **Clinic:** `app/clinic/(larkon)/layout.tsx`, `app/clinic/(larkon)/dashboard/page.tsx`; redirect `app/clinic/page.tsx`. All other clinic dashboard routes under `app/clinic/(larkon)/*`.
- **Owner:** `app/owner/(larkon)/layout.tsx`, `app/owner/(larkon)/dashboard/page.jsx` (full dashboard content); redirect `app/owner/page.tsx`. All dashboard route folders (branches, orders, products, inventory, …) moved under `app/owner/(larkon)/*`. Auth routes (login, register, kyc, onboarding) and `_components`, `_lib`, `_hooks` remain under `app/owner/`.
- **Producer:** `app/producer/(larkon)/layout.tsx`, `app/producer/(larkon)/dashboard/page.jsx`; dashboard route folders (batches, products, staff) moved under `app/producer/(larkon)/*`. Landing at `/producer` and `_components` unchanged.
- **Country:** `app/country/(larkon)/layout.tsx`, `app/country/(larkon)/dashboard/page.jsx`; all dashboard route folders moved under `app/country/(larkon)/*`. Country `_components` and auth (login, register, invite) remain under `app/country/`.
- **Staff:** `app/staff/(larkon)/layout.tsx`; redirect `app/staff/page.tsx`; branches, branch, workspace moved under `app/staff/(larkon)/*`.

**Shared Larkon:**

- **`src/larkon-admin/context/LarkonPanelContext.tsx`** — `LarkonPanelProvider`, `useLarkonPanelBasePath()` (default `"/admin"`).
- **`src/larkon-admin/components/layout/LarkonDashboardShell.tsx`** — shared shell (TopNav, Sidebar, Footer) used by all panel (larkon) layouts; accepts `basePath`.
- **`src/larkon-admin/helpers/Manu.ts`** — `getMenuItems(basePath?)`: for `basePath === '/admin'` returns full admin menu; otherwise minimal panel menu (Dashboard, Settings, Profile) with URLs prefixed by `basePath`.
- **ProfileDropdown, LogoBox, VerticalNavigationBar** — use `useLarkonPanelBasePath()` for links (profile, settings, logout, logo).
- **Admin (larkon) layout** — wrapped with `LarkonPanelProvider basePath="/admin"`.

---

## Dependency changes

- **None.** No new npm packages; no Next/React major upgrade. Existing Larkon deps unchanged.

---

## CSS import and isolation

- **Larkon SCSS** is imported **only** in each panel’s `(larkon)` layout:
  - `app/admin/(larkon)/layout.tsx` — `import '@larkon/assets/scss/app.scss'`
  - `app/mother/(larkon)/layout.tsx` — same
  - `app/shop/(larkon)/layout.tsx` — same
  - `app/clinic/(larkon)/layout.tsx` — same
  - `app/owner/(larkon)/layout.tsx` — same
  - `app/producer/(larkon)/layout.tsx` — same
  - `app/country/(larkon)/layout.tsx` — same
  - `app/staff/(larkon)/layout.tsx` — same

- **Root layout** (`app/layout.jsx`): no Larkon SCSS; link to `owner-panel.css` removed (quarantined).
- **Landing/public** (e.g. `/`, `/producer` landing, `(public)`): no Larkon styles; only global styles and their own CSS.

---

## Commands run and results

- **`npm run build`** — Success (after fixing imports and cleaning `.next`).
- Panel dev scripts (e.g. `npm run dev:mother`, `dev:shop`, …) are unchanged; each panel’s dev script should still serve that panel with Larkon on dashboard routes.

---

## Import fixes applied (post-move)

- **Owner (larkon):**  
  - `inventory/transfers/*` — imports updated from `@/app/owner/transfers/...` to `@/app/owner/(larkon)/transfers/...`.  
  - `organizations/*` — OrganizationWizardForm from `@/app/owner/(larkon)/organizations/_components/...`.  
  - `integrations/product-import` and `[batchId]` — `_lib/ownerApi` via `@/app/owner/_lib/ownerApi`.  
  - `products/[id]/*` — Notification / ImageUploadField via `@/app/owner/_components/...` where needed.
- **Country (larkon):**  
  - All pages using `CountryPageShell`: relative import updated from `../_components/CountryPageShell` or `../../_components/...` to `../../_components/CountryPageShell` or `../../../_components/CountryPageShell` so they resolve to `app/country/_components/CountryPageShell`.

---

## Known risks and rollback

1. **Risk:** Any remaining relative or absolute imports under `(larkon)` that still point to pre-move paths may break at runtime or build.  
   **Mitigation:** Build passes; key owner/country imports were fixed. If new 404s or module-not-found appear, adjust imports to use `@/app/owner/...` or `@/app/country/...` (or correct relative path from `(larkon)`).

2. **Risk:** Staff panel was also switched to Larkon; if staff-specific UX is missed, restore staff layout to use quarantined MasterLayout (see rollback).

3. **Rollback (restore WowDash dashboard UI):**
   - Copy back from quarantine:
     - `_quarantine_cleanup/2026-02-16/wowdash_all_dashboards/src/masterLayout/` → `src/masterLayout/`
     - `_quarantine_cleanup/2026-02-16/wowdash_all_dashboards/public/assets/css/owner-panel.css` → `public/assets/css/owner-panel.css`
   - In `app/layout.jsx`, restore: `<link rel="stylesheet" href="/assets/css/owner-panel.css" />`
   - In each panel layout (owner, mother, shop, clinic, producer, country, staff), restore `import MasterLayout from "@/src/masterLayout/MasterLayout"` and wrap children with `<MasterLayout>{children}</MasterLayout>`.
   - Optionally restore old panel root/dashboard pages from quarantine and remove or redirect the `(larkon)` route groups if reverting to WowDash-only dashboards.

---

## Auth and API

- **No change** to auth or API usage:
  - Owner: same auth/KYC/onboarding logic in `app/owner/layout.jsx`; only MasterLayout wrapper removed.
  - Producer: same `apiGet("/api/v1/producer/me")` and landing vs dashboard split in `app/producer/layout.jsx`.
  - Country: same `apiGet("/api/v1/auth/me")` and access check in `app/country/layout.jsx`.
  - Mother, shop, clinic, staff: same layout logic, only MasterLayout removed; auth where present unchanged.

---

*Generated as part of the Larkon dashboard rollout; all dashboard panels now use the Larkon UI shell under their dashboard routes.*
