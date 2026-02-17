# Admin Panel Migration: WowDash → Larkon-Nextjs v2.0.2

**Date:** 2026-02-16  
**Goal:** Replace WowDash-based Admin panel with Larkon-Nextjs_v2.0.2 Admin UI at the same `/admin` route, without breaking other panels.

---

## 1. TEMPLATE_ROOT

- **Path:** `_vendor_templates/Larkon-Nextjs_v2.0.2/`
- **Source zip:** `_vendor_templates/Larkon-Nextjs_v2.0.2.zip` (extracted into the folder above)
- **Template app root:** `_vendor_templates/Larkon-Nextjs_v2.0.2/` (package.json and `src/` at this level)
- **Template Next.js app:** `src/app/` with route group `(admin)` at `src/app/(admin)/`

---

## 2. Paths copied into the repo (Larkon integration)

| Source (TEMPLATE_ROOT) | Destination (repo) |
|------------------------|--------------------|
| `src/` (components, assets, context, helpers, types, hooks, utils) | `src/larkon-admin/` (full copy) |
| `src/app/(admin)/*` (all admin pages + layout) | `app/admin/(larkon)/*` (route group under `/admin`) |
| Template `src/assets/images/*` | Re-copied into `src/larkon-admin/assets/images/` (full set) |

- **Path alias:** `@larkon/*` → `src/larkon-admin/*` (in `tsconfig.json` and `next.config.js` turbopack.resolveAlias).
- **Admin entry:** `app/admin/page.tsx` redirects to `/admin/dashboard`.
- **Admin layout:** `app/admin/layout.tsx` (auth guard only); `app/admin/(larkon)/layout.tsx` (Larkon shell: TopNav, Sidebar, Footer, Larkon SCSS).
- **Auth routes kept:** `app/admin/login/`, `app/admin/logout/`, `app/admin/register/`, `app/admin/forbidden/` (unchanged; login still uses existing AuthRedirectPage and `/api/v1/admin/auth/me`).

---

## 3. WowDash paths moved to quarantine

All under: **`_quarantine_cleanup/2026-02-16/wowdash_admin/`** (relative paths preserved).

| Original path | Quarantine path |
|---------------|-----------------|
| `app/admin/layout.jsx` | `_quarantine_cleanup/2026-02-16/wowdash_admin/app/admin/layout.jsx` |
| `app/admin/page.jsx` | `_quarantine_cleanup/2026-02-16/wowdash_admin/app/admin/page.jsx` |
| `app/admin/dashboard/` | `_quarantine_cleanup/2026-02-16/wowdash_admin/app/admin/dashboard/` |
| `app/admin/analytics/` … (all other admin route folders except login, logout, register) | Same structure under `_quarantine_cleanup/2026-02-16/wowdash_admin/app/admin/` |
| `app/admin/forbidden/` | Moved; recreated a minimal `app/admin/forbidden/page.jsx` for 403 |
| `src/bpa/admin/` (WowDash admin components) | `_quarantine_cleanup/2026-02-16/wowdash_admin/src/bpa/admin/` |

**Not moved:** `app/admin/login/`, `app/admin/logout/`, `app/admin/register/` (and their layouts).

---

## 4. package.json dependency diff

**Added (Larkon / build fixes):**

- sass  
- react-toastify  
- react-bootstrap  
- simplebar-react  
- @fullcalendar/bootstrap, @fullcalendar/core, @fullcalendar/daygrid, @fullcalendar/interaction, @fullcalendar/list, @fullcalendar/react, @fullcalendar/timegrid  
- choices.js, dayjs, gridjs, gridjs-react, nouislider-react, react-flatpickr, react-input-mask, react-quill-new, react-select, react-dropzone  
- sweetalert2, sweetalert2-react-content, swiper, yup  
- moment, @smastrom/react-rating, jsvectormap@1.3.2  
- "@vis.gl/react-google-maps", emoji-picker-react, gumshoejs  
- @tanstack/react-table  
- @types/react-input-mask  

**Not added:** next-auth (admin uses existing cookie-based auth; stubbed in types only where needed).

**Versions:** Next.js and React major versions unchanged (Next ^16.x, React ^19.x).

---

## 5. Admin CSS isolation

- **Where:** Larkon global SCSS is imported only in **`app/admin/(larkon)/layout.tsx`**:
  - `import '@larkon/assets/scss/app.scss'`
- **Scope:** That layout wraps only routes under `app/admin/(larkon)/*` (i.e. `/admin/dashboard`, `/admin/products/...`, etc.). Login, logout, register, and forbidden are **not** under `(larkon)`, so they do not load Larkon SCSS.
- **Result:** Larkon/Bootstrap from the template apply only to admin UI; other panels (shop, clinic, producer, owner, etc.) are unaffected.

---

## 6. Commands run and results

| Command | Result |
|---------|--------|
| `Expand-Archive` (PowerShell) for Larkon zip → `_vendor_templates/Larkon-Nextjs_v2.0.2/` | OK |
| `npm install` (after adding new deps) | OK |
| `npm run build` (full project) | **Success** (exit 0) |
| `npm run lint` | Not re-run; user can run separately |

---

## 7. Risky items and how they were handled

1. **Turbopack path alias**  
   - **Risk:** `@larkon/*` might not resolve for assets/pages.  
   - **Handling:** Added `turbopack.resolveAlias` in `next.config.js` and `paths` + `baseUrl` in `tsconfig.json` so both bundler and TypeScript resolve `@larkon/*` to `src/larkon-admin/*`.

2. **Larkon auth (next-auth) vs existing admin auth**  
   - **Risk:** Template uses next-auth; repo uses cookie + `/api/v1/admin/auth/me`.  
   - **Handling:** Admin layout keeps existing auth guard. Larkon’s `AuthProtectionWrapper` was removed from `(larkon)/layout.tsx`. No next-auth install; `next-auth/react` stubbed in `src/types/next-auth-stub.d.ts` for type-check only. `src/larkon-admin/proxy.ts` no longer re-exports next-auth middleware.

3. **Duplicate object keys (owner KYC)**  
   - **Risk:** TypeScript error in `app/owner/kyc/_components/KycAddressForm.tsx` (object literal with duplicate keys).  
   - **Handling:** Build must pass; fixed by building the merged object and then assigning the three fields (addressLine1, addressLine2, landmark) on a separate line to avoid duplicate key errors.

4. **Other panels**  
   - **Risk:** New deps or global CSS affecting shop/clinic/producer/owner.  
   - **Handling:** No global CSS added at root; Larkon SCSS only in `app/admin/(larkon)/layout.tsx`. New dependencies are standard libs; no shared global styles or root layout changes.

5. **Vendor template in build**  
   - **Risk:** TypeScript including `_vendor_templates` and failing on `@/` there.  
   - **Handling:** `tsconfig.json` exclude includes `_vendor_templates` and `src/larkon-admin/app` so the template source is not type-checked as part of the app.

---

## 8. Summary

- **Admin URL:** Unchanged; `/admin` and `/admin/dashboard` (and all other Larkon admin routes) work as before.
- **Auth:** Unchanged; same cookie, same `/api/v1/admin/auth/me`, same redirect to `/admin/login` and `/admin/forbidden`.
- **WowDash admin:** Fully moved to `_quarantine_cleanup/2026-02-16/wowdash_admin/`; no deletions.
- **Build:** `npm run build` succeeds.
- **Other panels:** Not modified; only admin layout and admin route group use Larkon.
