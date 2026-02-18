# Staff Routes Regression Fix (2026-02-18)

## Root Cause Analysis

### Symptom 1: Only ~2 sidebar options on /staff/branch/:id

**Cause:** The staff layout uses `LarkonDashboardShell` with `basePath="/staff"`, which renders `VerticalNavigationBar`. The sidebar calls `getMenuItems("/staff")` → `getPanelMenuItems("/staff")` → `getFullMenu("staff")` → `REGISTRY.staff`, which contains only 2 items (Branches, Workspace).

**Evidence:**
- `src/larkon-admin/components/layout/LarkonDashboardShell.tsx` – always renders VerticalNavigationBar
- `src/larkon-admin/helpers/Manu.ts:22-24` – `getMenuItems(basePath)` → `getPanelMenuItems(path)` → `getFullMenu(app)`
- `src/lib/permissionMenu.ts:767-769` – `REGISTRY.staff` has 2 items

**Missing:** `StaffBranchSidebar` and `branchSidebarConfig.ts` implement a permission-based branch-scoped menu (Overview, Inventory, POS, Reports, etc.) but were never wired into the layout. Staff branch routes always showed the generic 2-item panel menu.

### Symptom 2: /staff/branch redirects away immediately

**Cause:** `app/staff/(larkon)/branch/page.jsx` had a `useEffect` that, whenever the user had at least one APPROVED branch, immediately redirected to `/staff/branch/${targetId}` (using `lastActiveBranchId` or `approved[0]`). Users with approved access could never stay on the branch selector.

**Evidence:**
- `app/staff/(larkon)/branch/page.jsx:56-67` (before fix) – `if (approved.length >= 1) { ... router.replace(...) }`

**Expected:** User should see the branch list, choose a branch, then navigate. Auto-redirect only when restoring a previous session (`lastActiveBranchId` valid).

### Additional findings

- **staff routes use correct registry:** `appKeyFromBasePath("/staff")` → `"staff"`; no incorrect use of owner/CORE_OWNER_FALLBACK.
- **Permission keys:** Backend returns `branch.view`, `dashboard.view`, `inventory.read`, `pos.view`, etc. `branchSidebarConfig.ts` uses the same keys.
- **Wrong hrefs:** REGISTRY.staff and ProfileDropdown pointed to `/staff/branches`, which redirects; should use `/staff/branch`.

---

## Fixes Applied

### 1. Staff branch sidebar (permission-based menu)

- **New:** `src/lib/useStaffBranchMenuItems.ts` – hook that, when `basePath === "/staff"` and pathname matches `/staff/branch/:branchId`, uses `useBranchContext` and `getFilteredBranchSidebar` to build the branch-scoped menu.
- **Updated:** `src/larkon-admin/components/layout/VerticalNavigationBar/page.tsx` – uses `useStaffBranchMenuItems(basePath)` and prefers its result over `getMenuItems(basePath)` when in staff branch context.

**Result:** On `/staff/branch/:id`, staff/manager see Overview, Inventory, POS, Reports, etc., filtered by their branch permissions.

### 2. Redirect loop on /staff/branch

- **Updated:** `app/staff/(larkon)/branch/page.jsx` – redirects only when `lastActiveBranchId` exists and is in the approved list. If there are approved branches but no valid `lastActiveBranchId`, the page shows the branch selector instead of redirecting.

**Result:** Users can remain on `/staff/branch`, see their branches, and select one. Returning users with `lastActiveBranchId` are auto-redirected.

### 3. Staff menu and Profile links

- **Updated:** `src/lib/permissionMenu.ts` – `REGISTRY.staff` Branches href `/staff/branches` → `/staff/branch`
- **Updated:** `src/larkon-admin/components/layout/TopNavigationBar/components/ProfileDropdown.tsx` – profile/settings for staff `/staff/branches` → `/staff/branch`
- **Updated:** `app/staff/(larkon)/branch/page.jsx` – "Request Access" button href `/staff/branches` → `/staff/branch`

---

## Route Table

| Route | Before | After |
|-------|--------|-------|
| `/staff` | Redirects to `/staff/branch` | Unchanged |
| `/staff/branch` | Immediate redirect to `/staff/branch/:id` when user had any approved branch | Stable page: shows branch list. Auto-redirect only when valid `lastActiveBranchId`. |
| `/staff/branch/:id` | Sidebar: 2 items (Branches, Workspace) | Sidebar: permission-based branch menu (Overview, Inventory, POS, Reports, etc.) |
| `/staff/branches` | Redirects to `/staff/branch` | Unchanged (canonical branch selector is `/staff/branch`) |

---

## Files Touched

| File | Change |
|------|--------|
| `src/lib/useStaffBranchMenuItems.ts` | **New.** Hook for permission-based staff branch menu. |
| `src/larkon-admin/components/layout/VerticalNavigationBar/page.tsx` | Use staff branch menu when in branch context. |
| `app/staff/(larkon)/branch/page.jsx` | Redirect only when `lastActiveBranchId` is valid; poll only when no approved branches. |
| `src/lib/permissionMenu.ts` | Staff Branches href → `/staff/branch`. |
| `src/larkon-admin/components/layout/TopNavigationBar/components/ProfileDropdown.tsx` | Staff profile/settings → `/staff/branch`. |

---

## Constraints Respected

- Branch isolation preserved; only branch-scoped items in the menu.
- Owner menu structure unchanged; no modifications to owner routes or CORE_OWNER_FALLBACK.
- No changes to other panels (3100–3105).
