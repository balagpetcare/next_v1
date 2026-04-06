# Owner Inventory Receipts — endless loading fix

## Issue summary

On `/owner/inventory/receipts?purchaseOrderId=<id>`, the page could remain on “Loading receipts…” indefinitely with no data, empty state, or error.

## Likely failure points (audit)

1. **Org resolution**: Page used only `GET /api/v1/owner/me` → `organizations[]`. Other owner pages document that `owner/me` often **does not** include organizations; they fall back to `GET /api/v1/owner/organizations`.
2. **Early return without clearing loading**: `loadList` returned when `!orgId` without `setLoading(false)`, while initial state is `loading: true`.
3. **Bootstrap effect**: On exception before `setOrgLoaded(true)`, `orgLoaded` stayed `false`, so the list effect never ran — loading never cleared via list path either.
4. **403 / null JSON**: `ownerGet` returns `null` on 403; list treated that like success with empty data (no explicit error) — secondary UX issue.
5. **Stale async**: Rapid filter changes could apply out-of-order responses (addressed with a monotonic request id).

## Confirmed root cause

**Primary:** `orgId` was often `null` because `owner/me` did not include `organizations`, and there was no fallback to `/api/v1/owner/organizations`. **`loadList` then exited early without `setLoading(false)`,** so the UI stayed in the initial loading state forever.

**Secondary:** Bootstrap did not always set `orgLoaded` in a `finally` block, so thrown errors could leave `orgLoaded === false` and block the list effect entirely.

## Fix strategy

1. Resolve org id like `lib/auth.ts` / warehouse list: `owner/me` first, then `owner/organizations` via `pickArray`.
2. Always `setOrgLoaded(true)` in `finally` after bootstrap attempts.
3. On `loadList`, if `!orgId` after org is known, call `setLoading(false)` and show an explicit “no organization” empty/error path.
4. Normalize list response (`data` array, optional `items`, missing `pagination`).
5. Optional: request-sequence guard to ignore stale responses when filters change quickly.
6. Validate `purchaseOrderId` query: non-numeric values → warning + omit filter from API (avoid odd backend behavior).

## Regression risks

- **Low:** Other flows (bulk receive, PO links) unchanged; only receipts list bootstrap and `loadList` behavior.
- **Verify:** Unfiltered receipts list, PO-filtered list, refresh, clear PO filter, org-less account (should error/empty, not spin).

## Backend

No contract change required: `GET /api/v1/grn` already supports `purchaseOrderId` and returns `{ success, data, pagination }`.

## Additional fixes applied

- URL sync: `warehouseId` / `purchaseOrderId` query params now clear local filter state when removed from the URL (avoids stale PO banner after navigation).
