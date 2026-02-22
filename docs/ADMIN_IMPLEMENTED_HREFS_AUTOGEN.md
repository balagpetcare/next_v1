# Admin IMPLEMENTED_ADMIN_HREFS — Auto-Generation

**Date:** 2026-02-22  
**Branch:** work/admin-3103-recovery

---

## Overview

`IMPLEMENTED_ADMIN_HREFS` controls which admin sidebar items are visible when `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=false` (default). Only hrefs in this set are shown to avoid 404s.

This document describes the auto-generation script that scans `app/admin/(larkon)` for real pages and regenerates `IMPLEMENTED_ADMIN_HREFS` from that scan.

---

## Flow

1. **Menu source:** `src/lib/permissionMenu.ts` → `REGISTRY.admin`
2. **Visibility gate:** `src/larkon-admin/menu/adapters/adminRouteMap.ts` → `IMPLEMENTED_ADMIN_HREFS`
3. **Env override:** `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true` → show all BPA registry items (unchanged)

---

## Script

| Path | Purpose |
|------|---------|
| `scripts/admin/generateImplementedAdminHrefs.mjs` | Scans admin pages, outputs implemented hrefs |

### Usage

```bash
# Output JSON array (dry run)
node scripts/admin/generateImplementedAdminHrefs.mjs

# Update adminRouteMap.ts
node scripts/admin/generateImplementedAdminHrefs.mjs --write
```

### Logic

1. **Scan** `app/admin/(larkon)/**/page.tsx` → build set of actual routes (e.g. `/admin/dashboard`, `/admin/role/role-list`)
2. **Extract** all admin hrefs from `src/lib/permissionMenu.ts` via regex `href: "/admin/..."`
3. **Map** each permissionMenu href via `ADMIN_ROUTE_MAP` if present (e.g. `/admin/roles` → `/admin/role/role-list`)
4. **Include** href if its target route exists in the scanned set
5. **Output** stable sorted array; with `--write`, replace `IMPLEMENTED_ADMIN_HREFS` in `adminRouteMap.ts`

---

## ADMIN_ROUTE_MAP

When permissionMenu href does not match the actual page path, map it:

| permissionMenu href | Actual route |
|---------------------|--------------|
| `/admin/roles` | `/admin/role/role-list` |
| `/admin/products` | `/admin/products/product-list` |
| `/admin/orders` | `/admin/orders/orders-list` |
| `/admin/inventory` | `/admin/inventory/warehouse` |
| `/admin/support` | `/admin/support/help-center` |

---

## Regenerating

After adding or removing admin pages under `app/admin/(larkon)/`:

```bash
node scripts/admin/generateImplementedAdminHrefs.mjs --write
```

Then commit the updated `adminRouteMap.ts`.

---

## Notes

- Only **permissionMenu** hrefs are considered. Routes that exist in the Larkon template but are not in `REGISTRY.admin` will not appear in the sidebar.
- The script outputs a stable sorted array to avoid noisy diffs.
- `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true` bypasses `IMPLEMENTED_ADMIN_HREFS` and shows all BPA registry items.
