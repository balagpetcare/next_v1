# Admin next_v0 Migration Log

## Batch 1 - A routes (direct portable)

Date: 2026-02-22

Migrated from stub to API-backed admin pages:

- `/admin/live-monitor`
- `/admin/products/moderation`
- `/admin/products/master-catalog`
- `/admin/vendors`
- `/admin/returns`
- `/admin/transfers`
- `/admin/services`
- `/admin/analytics`
- `/admin/docs`
- `/admin/docs/[slug]` (support route for docs viewer)

Route map updates:

- Removed A-routes from `STUB_ADMIN_HREFS` in `src/larkon-admin/menu/adapters/adminRouteMap.ts`.
- Kept `IMPLEMENTED_ADMIN_HREFS` unchanged (already complete by design).

Still stub (next phases):

- All planned B routes and all C routes remain in stub state after this batch.

## Batch 2 - B routes (priority stream started)

Date: 2026-02-22

Migrated:

- `/admin/products/master-catalog/import`
- `/admin/products/approvals`

Notes:

- `master-catalog/import` uses credentialed `fetch` for multipart upload because `apiGet/apiPost/apiPatch` are JSON-focused helpers.

Remaining B routes:

- `/admin/pricing`
- `/admin/online-store`
- `/admin/pos/transactions`
- `/admin/delivery`
- `/admin/content`
- `/admin/system`
- `/admin/audit`
- `/admin/onboarding`
- `/admin/onboarding/publish-requests`
- `/admin/onboarding/partner-applications`
- `/admin/authenticity/dashboard`
- `/admin/authenticity/factories`
- `/admin/authenticity/products`
- `/admin/authenticity/batches`
- `/admin/authenticity/serials`
- `/admin/authenticity/alerts`
