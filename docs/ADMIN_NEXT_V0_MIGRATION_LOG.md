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
