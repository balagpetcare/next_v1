# Admin Sidebar Visibility — Trace Report & Fix

**Date:** 2026-02-22  
**Branch:** work/admin-3103-merge-v100-0108  
**Bug:** Admin sidebar not showing Health, Wallet, Verifications, Verification Metrics, Fundraising despite pages existing and IMPLEMENTED_ADMIN_HREFS extended.

---

## STEP 1 — TRACE REPORT

### 1.1 Code Path (Admin Sidebar Build)

```
app/admin/(larkon)/layout.tsx
  └─ LarkonPanelProvider basePath="/admin"
  └─ VerticalNavigationBar

src/larkon-admin/components/layout/VerticalNavigationBar/page.tsx
  └─ useLarkonPanelBasePath() → "/admin"
  └─ useStaffBranchMenuItems("/admin") → null (staff-only)
  └─ getMenuItems("/admin") from Manu.ts
      └─ panelItems = getPanelMenuItems("/admin")

src/larkon-admin/helpers/Manu.ts
  └─ getPanelMenuItems(path) from panelMenus.ts
  └─ Fallback: getMinimalPanelMenu(path) if null/empty

src/larkon-admin/menu/panelMenus.ts
  └─ appKeyFromBasePath("/admin") → "admin"
  └─ raw = getFullMenu("admin") from permissionMenu.ts → REGISTRY.admin
  └─ For each item: convertItem(item, ..., { filterUnimplementedAdmin: true })
      └─ mapAdminHref(href) for display URL
      └─ isImplementedAdminHref(item.href) → filter unimplemented

src/larkon-admin/menu/adapters/adminRouteMap.ts
  └─ isImplementedAdminHref(href)
      └─ showUnimplementedAdminRoutes() → bypass if env=true
      └─ IMPLEMENTED_ADMIN_HREFS.has(href)
```

### 1.2 Menu Source

- **Used:** `getFullMenu("admin")` from `src/lib/permissionMenu.ts` → `REGISTRY.admin`
- **Not used:** Larkon `MENU_ITEMS` (`src/larkon-admin/assets/data/menu-items.ts`) — Manu.ts does not import it for admin

### 1.3 Filtering

- **Where:** `panelMenus.ts` → `convertItem()` → `isImplementedAdminHref(item.href)`
- **Order:** 1) Map href for display (mapAdminHref), 2) Normalize (normalizeHref), 3) Filter by isImplementedAdminHref(original item.href)
- **Bypass:** `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true` → show all REGISTRY.admin items

### 1.4 Potential Root Causes

1. **Href mismatch:** IMPLEMENTED_ADMIN_HREFS uses exact string match. Trailing slash or whitespace could break lookup.
2. **Build cache:** `.next` may serve stale adminRouteMap (old IMPLEMENTED_ADMIN_HREFS).
3. **Env variable:** `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED` evaluated at build time; mismatch between build and runtime.

---

## STEP 2 — FIX (Applied)

### Changes

1. **adminRouteMap.ts**
   - Added `normalizeHrefForLookup(href)` — trim, strip trailing slash for Set lookup
   - `isImplementedAdminHref()` now normalizes href before `IMPLEMENTED_ADMIN_HREFS.has()` check
   - Ensures "/admin/health" and "/admin/health/" both match

2. **Manu.ts / panelMenus.ts**
   - No change — already uses `getFullMenu("admin")` from permissionMenu REGISTRY.admin (no MENU_ITEMS fallback)
   - Filter order: mapAdminHref for display URL, then isImplementedAdminHref(original href) for visibility

### Files Changed

- `src/larkon-admin/menu/adapters/adminRouteMap.ts`

---

## STEP 3 — VALIDATE

1. **Visual check:** Admin sidebar shows Health, Wallet, Verifications, Verification Metrics, Fundraising under respective sections.
2. **Hard reset cache (if items still missing):**
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force .next
   npm run dev:admin
   ```
3. **Env override (optional):** Set `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true` in `.env.local` to show all REGISTRY.admin items (bypasses IMPLEMENTED_ADMIN_HREFS).
