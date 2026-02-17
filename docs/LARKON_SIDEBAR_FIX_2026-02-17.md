# Larkon Sidebar Styling Fix (2026-02-17)

## Problem

- Owner (and other non-admin) panels showed broken sidebar: submenu items (e.g. My Business > Organizations, Branches, Staffs) looked like **boxed dropdown buttons** instead of the template’s nav style.
- Admin panel sidebar was correct and used as reference.

## Root cause

- **AppMenu** used a `<button>` for the parent menu trigger. Bootstrap (and global) button styles made it look like a form control/dropdown.
- Submenu visibility used conditional render (`{open ? <div><ul>...</ul></div> : null}`) instead of react-bootstrap **Collapse**, so Larkon’s condensed-sidebar CSS (which targets `.collapse` / `.collapsing`) did not apply.

## Changes (minimal; no business logic)

### 1. `src/larkon-admin/components/layout/VerticalNavigationBar/components/AppMenu.tsx`

- **Trigger element:** Replaced `<button type="button" ...>` with a **`<div role="button" tabIndex={0} ...>`** so the same Larkon `.nav-link` styles apply and no button styling is applied. Added `onKeyDown` for Enter/Space (accessibility).
- **Submenu:** Wrapped the submenu block in **`<Collapse in={open}>`** from `react-bootstrap` so expand/collapse matches the template and condensed-mode CSS works.
- **Nested parents:** For nested `MenuItemWithChildren`, set `linkClassName` to include `nav-link menu-arrow` so nested expandable items use the same class contract as the template.

### 2. `src/larkon-admin/assets/scss/bpa/_layout.scss`

- **Override:** Added a BPA-only rule so sidebar menu triggers (`.main-nav .navbar-nav .nav-item .nav-link[role="button"]`) never get button/select/form-control look: `border: 0`, `background: transparent`, `width: 100%`, `text-align: left`, `cursor: pointer`, `appearance: none`.

## Verification

- **Layouts:** All `app/**/(larkon)/layout.tsx` files import `@larkon/assets/scss/app.scss`. No layout imports `public/assets/css/style.css`.
- **Theme:** `LarkonThemeSync` and `useLayoutContext` already set `data-bs-theme` on `html`/`body`; light/dark continue to work.
- **Build:** `npm run build` succeeds after clearing `.next` cache.

## How to test

1. Run dev for owner (or admin): e.g. `npm run dev:owner` or `npm run dev:admin`.
2. Check sidebar: parent items (e.g. My Business) should look like nav links with arrow, not boxed buttons.
3. Click parent: submenu should expand/collapse smoothly (Collapse component).
4. Toggle theme (if available): confirm sidebar looks correct in both light and dark.

## Files touched

| File | Change |
|------|--------|
| `src/larkon-admin/components/layout/VerticalNavigationBar/components/AppMenu.tsx` | Trigger: button → div + Collapse for submenu; nested linkClassName; a11y keyDown. |
| `src/larkon-admin/assets/scss/bpa/_layout.scss` | Sidebar trigger override so role="button" div never gets button/form styling. |
