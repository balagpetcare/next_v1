# Phase 2: Full Translation Adoption — Summary

**Date:** 2025-02-11  
**Scope:** Replace hardcoded UI strings with `t()` in landing and panels; add all new keys to en.json and bn.json. No i18n architecture changes.

---

## 1) Modified Files

### A) Landing (src/components/landing/)

| File | Change |
|------|--------|
| `Benefits.tsx` | Added `"use client"`, `useLanguage()`, `t("benefits.sectionTitle")`, `t("benefits.card1Title")` … `card6Desc` for heading and cards. |
| `FAQ.tsx` | Already client; added `useLanguage()`, `t("faq.title")`, `t("faq.q1")`–`q4`, `t("faq.a1")`–`a4` for title and Q/A pairs. |
| `Growth.tsx` | Added `"use client"`, `useLanguage()`, `t("growth.title")`, `t("growth.bullet1")`–`bullet3`, `t("growth.imageAlt")`. |
| `CustomerLove.tsx` | Added `"use client"`, `useLanguage()`, `t("customerBenefits.title")`, `t("customerBenefits.item1Title")`–`item4Desc`. |
| `Testimonials.tsx` | Added `"use client"`, `useLanguage()`, `t("testimonials.title")`, `t("testimonials.name1")`–`quote3`. |
| `TrustBadges.tsx` | Added `"use client"`, `useLanguage()`, `t("trust.badge1Line1")`–`trust.badge4Line2` for two-line badges. |
| `SalesFlow.tsx` | Added `"use client"`, `useLanguage()`, `t("salesFlow.title")`, `t("salesFlow.stage1")`–`stage4` (with `\n` → newline for display). |

### B) Panel adoption (shared + MasterLayout)

| File | Change |
|------|--------|
| `app/owner/_components/shared/EntityDetailPage.jsx` | `useLanguage()`; `t("common.details")`, `t("common.refresh")`, `t("common.edit")`, `t("common.delete")`, `t("common.back")`, `t("common.loading")`. |
| `app/owner/_components/shared/EntityTable.jsx` | `useLanguage()`; `t("common.noColumnsConfigured")`, `t("common.view")`, `t("common.edit")` in default actions. |
| `app/owner/_components/shared/EntityListPage.jsx` | `useLanguage()`; `t("common.createNew")` (default for onCreateLabel), `t("common.refresh")`, `t("common.loading")`, `t("common.noResults")`, `t("common.noItemsFound")`. |
| `src/masterLayout/MasterLayout.jsx` | `useLanguage()`; home item labels use `t("common.dashboard")` and `t("common.home")` for fallback menu. |

### C) Locale files

| File | Change |
|------|--------|
| `app/(public)/_locales/en.json` | New keys: `common.*` (edit, delete, dashboard, settings, refresh, details, noResults, noItemsFound, createNew, noColumnsConfigured, home); `benefits.sectionTitle` + card descriptions; `faq.q1`–`a4` (aligned to FAQ copy); `trust.badge1Line1`–`badge4Line2`; `testimonials` (quote1–3, name2/3, role2/3); `growth.*`; `salesFlow.*`. |
| `app/(public)/_locales/bn.json` | Same structure as en; all new keys translated to Bengali. |

### D) Script (removed after use)

| File | Change |
|------|--------|
| `scripts/update-bn-locale.js` | Created to patch bn.json; deleted after run. |

---

## 2) New Translation Keys Added

### common.* (shared UI)

- `common.edit`, `common.delete`, `common.dashboard`, `common.settings`, `common.back`, `common.search`, `common.filter`, `common.add`, `common.create`, `common.view`, `common.submit`, `common.close`, `common.yes`, `common.no`, `common.error`, `common.success`
- `common.refresh`, `common.details`, `common.noResults`, `common.noItemsFound`, `common.createNew`, `common.noColumnsConfigured`, `common.home`

### benefits.*

- `benefits.sectionTitle`  
- Card copy aligned with component: `benefits.card1Desc`–`card6Desc` (text updated; titles unchanged).

### faq.*

- `faq.q1`–`faq.a4` — values updated to match FAQ component copy (setup, coupons, reports, support).

### trust.*

- `trust.badge1Line1`, `trust.badge1Line2` … `trust.badge4Line1`, `trust.badge4Line2` (two-line badge text).

### testimonials.*

- `testimonials.quote1`–`quote3`, `testimonials.name2`, `testimonials.name3`, `testimonials.role2`, `testimonials.role3` — updated to match Testimonials component (Rahim A., Karim H., Fatima S.).

### growth.* (new namespace)

- `growth.title`, `growth.bullet1`, `growth.bullet2`, `growth.bullet3`, `growth.imageAlt`

### salesFlow.* (new namespace)

- `salesFlow.title`, `salesFlow.stage1`, `salesFlow.stage2`, `salesFlow.stage3`, `salesFlow.stage4` (values use `\n` for line breaks)

---

## 3) Components That Still Contain Hardcoded Strings

- **`src/components/landing/DevOverlay.tsx`** — Reference image labels ("Hero", "Ecosystem", "Steps", "Benefits", "Sales", "Growth", "Customer", "Testimonials", "Trust", "FAQ", "Footer") and overlay UI. Dev-only; can stay hardcoded or be moved to a dev namespace later.
- **`src/components/landing/Navbar.tsx`** — Nav links use literal "Ecosystem", "Steps", "Benefits", "FAQ" for anchor labels; could be moved to e.g. `header.navEcosystem`, `header.navSteps`, etc., if desired.
- **Panel-specific pages** — Most owner/admin/shop/clinic/staff/producer/mother/country pages still have page titles, table headers, form labels, and messages in English. Adoption was done in **shared** components (EntityDetailPage, EntityListPage, EntityTable) and **MasterLayout** (home/dashboard labels). Individual panel pages and `permissionMenu` (menu labels) can be wired in a later pass with panel namespaces (`owner.*`, `admin.*`, etc.).
- **`app/owner/_components/shared/EntityDetailPage.jsx`** — Breadcrumb "Owner" and "Items" remain hardcoded; they come from `config?.breadcrumbs` or defaults. Optional: add keys for default breadcrumb labels.
- **`app/owner/_components/shared/EntityListPage.jsx`** — Empty state uses generic `t("common.noItemsFound")`; the original "No {plural} found" could be restored with a key that accepts entity type if needed.

---

## 4) Build Note

- `npm run build` was run after removing `.next` (to avoid `ENOTEMPTY` cache errors). If you see the same error, run: `Remove-Item -Recurse -Force .next` (or `rm -rf .next`) then `npm run build` again.

---

## 5) Key Organization (as applied)

- **common.*** — Shared UI (Save, Cancel, Edit, Delete, Dashboard, Settings, Loading, Refresh, Back, View, Create New, etc.).
- **Landing namespaces** — `benefits.*`, `faq.*`, `growth.*`, `testimonials.*`, `trust.*`, `salesFlow.*`, plus existing `hero.*`, `ecosystem.*`, `howToStart.*`, `customerBenefits.*`, `cta.*`.
- **Panel-specific** — Not added in this phase; `owner.*`, `admin.*`, etc. can be introduced when wiring individual panel pages and menu labels.

All new keys were added to both **en.json** and **bn.json** with matching structure.
