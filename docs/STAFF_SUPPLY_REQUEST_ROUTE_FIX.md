# Staff clinic supply request route fix

## Root cause

- The path `/staff/branch/[branchId]/clinic/supply-requests/new` was returning **404** (Next.js 16 nested dynamic route / Turbopack issue; see *"Workaround for Next 16.1+ Turbopack 404 on nested dynamic routes"* in **`next.config.js`** — formerly duplicated in removed `next.config.mjs`).
- The path `/staff/branch/[branchId]/clinic/supply-requests/create` resolves correctly when a physical page exists there.

## Fix (current)

- **Canonical create route** is `/staff/branch/[branchId]/clinic/supply-request-create`. The full form lives in `app/staff/(larkon)/branch/[branchId]/clinic/supply-request-create/page.tsx` (sibling to `supply-requests`, same depth as the list route to avoid Next.js 404 on nested segments).
- **proxy.ts** redirects `.../supply-requests/new` and `.../supply-requests/create` → `.../supply-request-create` (307) before the request hits Next.js.
- **`next.config.js`** redirects: `/new` and `/create` → `/supply-request-create`.
- **Redirect pages** at `.../supply-requests/new/page.tsx` and `.../create/page.tsx` redirect to `/supply-request-create` if those routes are ever resolved.
- All in-app links use `/supply-request-create`.

## Files changed

| File | Change |
|------|--------|
| `app/staff/(larkon)/branch/[branchId]/clinic/supply-requests/create/page.tsx` | **Full form** – new supply request UI (multi-select catalog, etc.) |
| `app/staff/(larkon)/branch/[branchId]/clinic/supply-requests/new/page.tsx` | **Redirect only** – client redirect to `/create` |
| `next.config.js` | Redirect `/new` → `/create` |
| `supply-requests/page.tsx` | Links use `/create` |

## Final canonical routes (staff clinic supply requests)

| Purpose | Canonical route |
|---------|-----------------|
| List | `/staff/branch/[branchId]/clinic/supply-requests` |
| Create (new request) | `/staff/branch/[branchId]/clinic/supply-request-create` |
| Detail | `/staff/branch/[branchId]/clinic/supply-requests/[requestId]` |
| Edit | `/staff/branch/[branchId]/clinic/supply-requests/[requestId]/edit` |
| Backward compatibility | `/staff/branch/[branchId]/clinic/supply-requests/new` and `.../create` → redirect to `.../supply-request-create` |

## Route audit summary

- **List page** (`supply-requests/page.tsx`): "New request" and "View low-stock suggestions" link to `.../supply-request-create` and `.../supply-request-create?tab=low-stock`. ✓
- **Form page** (`supply-request-create/page.tsx`): Full form; Cancel/back links to list. ✓
- **New page** (`supply-requests/new/page.tsx`): Redirect only → `/supply-request-create`. ✓
- **Create page** (`supply-requests/create/page.tsx`): Redirect only → `/supply-request-create`. ✓
- **Detail page** (`supply-requests/[requestId]/page.tsx`): Back to list, Edit → `.../edit`. ✓
- **Edit page** (`supply-requests/[requestId]/edit/page.tsx`): Back/cancel to detail. ✓
- **Sidebar** (`branchSidebarConfig.ts`): "Supply requests" → list only (`/clinic/supply-requests`). ✓
- **Other references**: Manager dashboard and transfers page link to list; no `/create` references in app code.

## Verification

- Open `http://localhost:3104/staff/branch/5/clinic/supply-request-create` → create form loads. ✓
- Open `http://localhost:3104/staff/branch/5/clinic/supply-requests/create` or `.../new` → proxy redirects to `.../supply-request-create` (or client redirect).
- From list page, "New request" → navigates to `/supply-request-create`. ✓
