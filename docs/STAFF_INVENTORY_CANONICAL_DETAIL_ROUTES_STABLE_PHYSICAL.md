# Staff inventory canonical detail routes — stable physical pages

## Symptoms

Canonical URLs returned **404** at runtime:

- `/staff/branch/:branchId/inventory/stock-request-detail/:requestId`
- `/staff/branch/:branchId/inventory/receive-dispatch/:dispatchId`

## Root cause

Both features used a **`beforeFiles` rewrite** in `next.config.js` to map the **browser URL** to a **different filesystem segment** (`stock-request-detail-page`, `receive-dispatch-page`). In practice (Next 16 + Turbopack / dev + `SITE_MODE` `distDir`), that **internal rewrite did not reliably resolve** to a routable page, so the **canonical URL itself** 404’d even though the `-page` tree existed on disk.

Redirects and `proxy.ts` were correct for **legacy** shapes; the failure was **canonical → physical via rewrite**, not only stale links.

## Final stable design

**Rule:** The canonical URL path **is** the App Router filesystem path — **no rewrite** for these two routes.

| Canonical URL (renders directly) | Page module |
|-----------------------------------|-------------|
| `.../inventory/stock-request-detail/[requestId]` | `inventory/stock-request-detail/[requestId]/page.tsx` |
| `.../inventory/receive-dispatch/[dispatchId]` | `inventory/receive-dispatch/[dispatchId]/page.jsx` |

**Legacy compatibility (redirect only, no rewrite for canonical):**

| Legacy path | Destination |
|-------------|-------------|
| `.../inventory/stock-requests/:requestId` (numeric) | `.../inventory/stock-request-detail/:requestId` |
| `.../inventory/stock-request-detail-page/:requestId` | `.../inventory/stock-request-detail/:requestId` |
| `.../inventory/receive/dispatch/:dispatchId` | `.../inventory/receive-dispatch/:dispatchId` |
| `.../inventory/receive-dispatch-page/:dispatchId` | `.../inventory/receive-dispatch/:dispatchId` |

Implemented in **`next.config.js` `redirects()`** and **`proxy.ts`** (307, query preserved).

**Path helpers:** `lib/staffInventoryRoutes.js` — `staffStockRequestDetailPath`, `staffDispatchReceiveWorkspacePath` return **only** the canonical URLs above.

## Files changed (this fix)

- **Added:** `app/staff/(larkon)/branch/[branchId]/inventory/stock-request-detail/[requestId]/page.tsx`
- **Added:** `app/staff/(larkon)/branch/[branchId]/inventory/receive-dispatch/[dispatchId]/page.jsx`
- **Removed:** `.../stock-request-detail-page/[requestId]/page.tsx` and `.../receive-dispatch-page/[dispatchId]/page.jsx` (and empty parent dirs)
- **`next.config.js`:** Removed `beforeFiles` rewrites for stock-request-detail and receive-dispatch; kept legacy redirects
- **`lib/staffInventoryRoutes.js`:** Comments updated (no rewrite)
- **`app/.../inventory/stock-requests/[id]/page.tsx`:** Comment updated
- **`docs/STAFF_RECEIVE_DISPATCH_CANONICAL_ROUTE_FIX.md`:** Superseded by this document (historical rewrite-based notes there may be outdated)

## Verification

- [ ] `GET` / navigate to `.../inventory/stock-request-detail/11` (valid id, logged in) — detail UI loads.
- [ ] `.../inventory/receive-dispatch/5` — receive workspace loads.
- [ ] `.../inventory/stock-request-detail-page/11` → redirects to `stock-request-detail/11`.
- [ ] `.../inventory/receive-dispatch-page/5` → redirects to `receive-dispatch/5`.
- [ ] `.../inventory/receive/dispatch/5` → redirects to `receive-dispatch/5`.
- [ ] `.../inventory/stock-requests/11` → redirects to `stock-request-detail/11`.
- [ ] RBAC unchanged (`inventory.read` / `inventory.receive` etc. as before).

## Remaining risks

- **Vendor GRN detail** still uses `vendor-receipt-grn-detail-page` + rewrite; if similar 404s appear, apply the same “physical = canonical” pattern there.
- After changing routes, clear `.next` (or per-`SITE_MODE` dist) if a dev server caches stale route manifests.
