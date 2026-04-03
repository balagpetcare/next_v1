# Staff stock request detail route — fix plan

## Assumptions

- Canonical **browser URL** must remain:  
  `/staff/branch/[branchId]/inventory/stock-request-detail/[requestId]` (numeric `requestId`).
- Next.js App Router (16.x) in this monorepo uses `SITE_MODE`-scoped `distDir` (e.g. `.next/owner`); routes are not split by panel—all `app/` routes ship in each mode.
- Staff inventory list/create already use “flat” segments (`stock-requests`, `stock-request-create`) where needed; detail must deep-link reliably for bookmarks and notifications.
- Enterprise pattern already documented in-repo: **public URL** + **`beforeFiles` rewrite** to a **physical** segment with a distinct folder name when nested dynamic routes fail to resolve (see `medicine-control/injection-tokens` → `medicine-control-injection-tokens` in `next.config.js`).

## Broken route (reported)

- `http://localhost:3104/staff/branch/1/inventory/stock-request-detail/3` → **404 Not Found** (Next.js “This page could not be found”).

## Audit summary

### Filesystem (before fix)

- List: `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx`
- Create: `app/staff/(larkon)/branch/[branchId]/inventory/stock-request-create/page.jsx`
- Detail (attempted): `app/staff/(larkon)/branch/[branchId]/inventory/stock-request-detail/[id]/page.jsx`
- Legacy redirects: `next.config.js` redirects `.../stock-requests/:requestId` → `.../stock-request-detail/:requestId`; `proxy.ts` mirrors for edge navigations.

### Config

- `redirects()`: legacy nested `stock-requests/:id` → public `stock-request-detail/:id` (**keep**; still the right UX for old links).
- `rewrites().beforeFiles`: stock-request detail uses **direct** filesystem route (no rewrite).

### Sidebar / menus

- `src/lib/branchSidebarConfig.ts` links to inventory summary, not per–stock-request detail (no change required).

### Links / path builders

- In-app links pointed at `/inventory/stock-request-detail/${id}` but the route did not resolve in dev/prod in all cases.

## Root cause

The UI lived under `inventory/stock-request-detail/[id]/`, which matches the **intended** public URL segment-for-segment. In practice, this repo has repeatedly hit **Next.js 16 + nested dynamic segments under long `branch/[branchId]/.../inventory/...` paths** not registering a routable page (404), while a **physically distinct** folder name under the same parent **does** register. The fix is **not** “rewrite-only smoke”: it is the same **filesystem-backed + `beforeFiles` rewrite** pattern already used for `clinic/medicine-control/injection-tokens` → `clinic/medicine-control-injection-tokens`.

**Secondary issue:** dynamic folder was named `[id]` while product language and redirects use `requestId`; align on `[requestId]` for clarity and `useParams()` consistency on the internal route.

## Intended public canonical route (unchanged)

- `/staff/branch/[branchId]/inventory/stock-request-detail/[requestId]`

Browser address bar and all `href`s continue to use this path.

## Intended filesystem route (current)

- `app/staff/(larkon)/branch/[branchId]/inventory/stock-request-detail/[requestId]/page.tsx`

Public URL and filesystem path align; **no** `beforeFiles` rewrite for this segment (owner dev uses `--webpack`; if Turbopack-only dev ever 404s here, reintroduce the `stock-request-detail-page` + rewrite pattern).

## Rewrites: remove / keep / replace

| Mechanism | Action |
|-----------|--------|
| `redirects`: `stock-requests/:requestId` → `stock-request-detail/:requestId` | **Keep** (legacy bookmarks). |
| `rewrites.beforeFiles` for stock-request detail | **None** (public URL = filesystem `stock-request-detail/[requestId]`). |

## UI behavior (unchanged expectations)

- Branch context via `useBranchContext(branchId)`.
- Permission: `inventory.read` to view; submit/cancel per existing rules.
- Breadcrumbs: Staff → Branches → Branch → Inventory → Stock Requests → `#id`.
- Back links to stock request list.
- Same API calls: `staffStockRequestGet` / submit / cancel from `@/lib/api`.

## Affected files (implementation)

- `docs/stock-request-detail-route-fix-plan.md` — this document.
- `lib/staffInventoryRoutes.js` — canonical path helpers (public URLs).
- `app/staff/(larkon)/branch/[branchId]/inventory/_components/StaffStockRequestDetailClient.jsx` — extracted client UI.
- `app/staff/(larkon)/branch/[branchId]/inventory/stock-request-detail/[requestId]/page.tsx` — server entry re-exporting client.
- `app/.../stock-requests/page.jsx`, `stock-request-create/page.jsx` — import path helpers.

## Risks / regressions

- **Params name:** Dynamic segment `[requestId]`; client reads `requestId` (and `id` fallback) from `useParams()`.
- **Turbopack-only dev:** If this segment 404s without `--webpack`, restore `stock-request-detail-page` + `beforeFiles` rewrite.

## Verification checklist

- [x] Direct load: `/staff/branch/1/inventory/stock-request-detail/3` resolves to `stock-request-detail/[requestId]/page.tsx` (no `beforeFiles` rewrite).
- [x] Legacy: `/staff/branch/1/inventory/stock-requests/3` redirects to `stock-request-detail/3` (`redirects()`).
- [x] List “View” and create-after-submit use `staffStockRequestDetailPath` from `lib/staffInventoryRoutes.js`.

## Implementation summary (2026-04-01)

- Added `inventory/_components/StaffStockRequestDetailClient.jsx` and `inventory/stock-request-detail/[requestId]/page.tsx`.
- Added `lib/staffInventoryRoutes.js`; list/create/detail pages import canonical path helpers.

## Follow-up (optional)

- If team standardizes all staff inventory deep links, add unit tests or a small lint script for allowed `inventory/*` segments.
