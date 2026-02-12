# Phase 3: Panel-Wide Adoption + Nav/Menu/Breadcrumb + Lint Fix — Summary

**Date:** 2025-02-11  
**Scope:** Remove remaining hardcoded strings (Navbar, breadcrumbs, empty states), make sidebar/menu labels translatable, improve empty-state keys with variables, fix `npm run lint`, and document panel adoption pattern. No new i18n library; all new keys in en.json and bn.json.

---

## 1) Phase 3 Summary

- **Navbar:** In-page nav labels (Ecosystem, Steps, Benefits, FAQ) now use `t(header.navEcosystem)` etc.
- **Breadcrumbs:** EntityDetailPage default breadcrumb labels use `t("common.owner")`, `t("common.items")`, `t("common.details")`.
- **Empty states:** Added param-based keys `common.noItemsFoundWithEntity` and `common.noResultsForQuery`; EntityListPage uses them with variable substitution via `t(key, { entity, query })`.
- **t() with variables:** LanguageContext `t(key, vars?)` supports `{placeholder}` substitution (e.g. `No {entity} found`).
- **Sidebar/menu:** permissionMenu items support optional `labelKey`; MasterLayout renders `t(labelKey)` with fallback to raw `label` when key is missing.
- **Lint:** `npm run lint` no longer fails with “Invalid project directory provided.” Script changed from `next lint` to `eslint .` using flat config (`eslint.config.mjs`); lint runs (may exit 1 due to existing violations).
- **Panel adoption:** Not implemented in this phase; pattern is documented below for owner/admin/shop/clinic/staff/producer/mother/country namespaces.
- **Build:** Succeeds after clearing `.next` cache if needed (`Remove-Item -Recurse -Force .next` then `npm run build`).

---

## 2) File-by-File Change List

| File | Change |
|------|--------|
| `app/(public)/_lib/LanguageContext.tsx` | Extended `t(key, vars?)`: get nested value then replace `{placeholder}` with `vars[placeholder]`. |
| `app/(public)/_locales/en.json` | Added: `common.noItemsFoundWithEntity`, `common.noResultsForQuery`, `common.owner`, `common.items`; `header.navEcosystem`, `navSteps`, `navBenefits`, `navFaq`; `menu.owner.*` (dashboard, myBusiness, orgs, branches, …), `menu.admin.dashboard`, `menu.admin.home`. |
| `app/(public)/_locales/bn.json` | Same keys as en with Bengali translations. |
| `src/components/landing/Navbar.tsx` | Nav links use `labelKey` (e.g. `header.navEcosystem`); labels rendered with `t(l.labelKey)`. |
| `app/owner/_components/shared/EntityDetailPage.jsx` | Default breadcrumbs use `t("common.owner")`, `t("common.items")` when config plural not set; `t("common.details")` unchanged. |
| `app/owner/_components/shared/EntityListPage.jsx` | Empty state: with search `t("common.noResultsForQuery", { query })`, else `t("common.noItemsFoundWithEntity", { entity })`. |
| `src/lib/permissionMenu.ts` | Added optional `labelKey?: string` to menu item type. |
| `src/masterLayout/MasterLayout.jsx` | Sidebar: `menuLabel(item)` uses `t(item.labelKey \|\| \`menu.${item.id}\`)`; if result === key (missing), use `item.label`. Applied to home, top-level items, and children. |
| `package.json` | Lint script: `"lint": "cross-env ESLINT_USE_FLAT_CONFIG=true eslint . --max-warnings 0"` (replaces `next lint`). |
| `eslint.config.mjs` | New flat config: `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`; ignores `.next/**`, `node_modules/**`, `*.config.*`. |

---

## 3) New Keys (by namespace)

### common

- `noItemsFoundWithEntity` — "No {entity} found"
- `noResultsForQuery` — "No results for \"{query}\""
- `owner` — "Owner"
- `items` — "Items"

### header

- `navEcosystem` — "Ecosystem"
- `navSteps` — "Steps"
- `navBenefits` — "Benefits"
- `navFaq` — "FAQ"

### menu.owner

- `dashboard`, `myBusiness`, `orgs`, `branches`, `staffs`, `accessStaff`, `requests`, `inventory`, `products`, `finance`, `audit`, `teams`, `notifications`, `workspace`

### menu.admin

- `dashboard`, `home`

(All of the above exist in both `en.json` and `bn.json`.)

---

## 4) What Remains Hardcoded (if any)

- **Panel pages:** Top-level page titles, primary buttons, table headings, form submit/cancel in `/owner`, `/admin`, `/shop`, `/clinic`, `/staff`, `/producer`, `/mother`, `/country` are still hardcoded. Phase 3 established the pattern; panel adoption can follow using namespaces `owner.*`, `admin.*`, etc.
- **Menu items:** Any menu entry without a `labelKey` in permissionMenu still shows the raw `label` (fallback); add `labelKey` per item as needed for full coverage.
- **Other shared layout/menu components:** Only MasterLayout sidebar and Navbar were updated; any other global nav/menu components would need similar wiring.

---

## 5) Build and Lint Confirmation

| Check | Status |
|-------|--------|
| **Build** | ✅ `npm run build` succeeds (clear `.next` first if ENOTEMPTY occurs). |
| **Lint** | ✅ `npm run lint` runs successfully (no “Invalid project directory” error). Lint may still exit with code 1 due to existing violations in the codebase; the command and config are fixed. |

---

## 6) Panel Adoption Pattern (for future work)

For each panel root (`/owner`, `/admin`, `/shop`, `/clinic`, `/staff`, `/producer`, `/mother`, `/country`):

1. Add namespace keys in en.json/bn.json (e.g. `owner.pageTitle`, `owner.submit`, `owner.cancel`).
2. In client components: `const { t } = useLanguage();` and replace UI strings with `t('owner.xyz')` (or the appropriate namespace).
3. Use shared keys from `common.*` where applicable (e.g. `common.save`, `common.cancel`).
4. Do not translate dynamic data (e.g. entity names, user input).

---

## 7) Script Reference

- `scripts/add-phase3-keys.js` — One-time script used to add Phase 3 keys to en.json and bn.json; may be removed or kept for reference.
