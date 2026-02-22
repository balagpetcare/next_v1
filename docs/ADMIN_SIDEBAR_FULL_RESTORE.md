# Admin Sidebar Full Restore

This document describes the restore of the full admin sidebar structure from `REGISTRY.admin` (permissionMenu.ts) so that all menu items are visible and no links result in 404.

## Summary

- **Source:** `src/lib/permissionMenu.ts` → `REGISTRY.admin`
- **Visibility:** `src/larkon-admin/menu/adapters/adminRouteMap.ts` → `IMPLEMENTED_ADMIN_HREFS`
- **Stub pattern:** Larkon-style "Coming Soon" pages with PageTItle + Card + short description

## Implemented Pages (Existing)

These routes had working pages before the restore:

| Section | Href | Status |
|---------|------|--------|
| Dashboard | `/admin/dashboard` | Implemented |
| Verification Center | `/admin/verifications`, `/admin/verification-metrics` | Implemented |
| Users & Access | `/admin/users`, `/admin/staff`, `/admin/roles`, `/admin/permissions`, `/admin/super-admin-whitelist` | Implemented |
| Country Governance | `/admin/countries`, `/admin/states` | Implemented |
| Organizations & Branches | `/admin/organizations`, `/admin/branches`, `/admin/branch-types` | Implemented |
| Commerce & Catalog | `/admin/products` (→ product-list) | Implemented |
| Orders & Finance | `/admin/orders`, `/admin/wallet`, `/admin/fundraising` | Implemented |
| Inventory Intelligence | `/admin/inventory` (→ warehouse) | Implemented |
| Support & Moderation | `/admin/support` (→ help-center) | Implemented |
| System & Settings | `/admin/health`, `/admin/settings` | Implemented |

## Stub Pages Added (New)

These routes had no page; Larkon "Coming Soon" stubs were created:

| Section | Href | File Path |
|---------|------|-----------|
| Dashboard | `/admin/live-monitor` | `app/admin/(larkon)/live-monitor/page.tsx` |
| Commerce & Catalog | `/admin/products/moderation` | `app/admin/(larkon)/products/moderation/page.tsx` |
| Commerce & Catalog | `/admin/products/master-catalog` | `app/admin/(larkon)/products/master-catalog/page.tsx` |
| Commerce & Catalog | `/admin/products/master-catalog/import` | `app/admin/(larkon)/products/master-catalog/import/page.tsx` |
| Commerce & Catalog | `/admin/products/approvals` | `app/admin/(larkon)/products/approvals/page.tsx` |
| Commerce & Catalog | `/admin/vendors` | `app/admin/(larkon)/vendors/page.tsx` |
| Commerce & Catalog | `/admin/pricing` | `app/admin/(larkon)/pricing/page.tsx` |
| Commerce & Catalog | `/admin/online-store` | `app/admin/(larkon)/online-store/page.tsx` |
| Orders & Finance | `/admin/returns` | `app/admin/(larkon)/returns/page.tsx` |
| Orders & Finance | `/admin/pos/transactions` | `app/admin/(larkon)/pos/transactions/page.tsx` |
| Orders & Finance | `/admin/transfers` | `app/admin/(larkon)/transfers/page.tsx` |
| Clinic Operations | `/admin/services` | `app/admin/(larkon)/services/page.tsx` |
| Clinic Operations | `/admin/appointments` | `app/admin/(larkon)/appointments/page.tsx` |
| Delivery & Logistics | `/admin/delivery` | `app/admin/(larkon)/delivery/page.tsx` |
| Delivery & Logistics | `/admin/delivery/jobs` | `app/admin/(larkon)/delivery/jobs/page.tsx` |
| Delivery & Logistics | `/admin/delivery/riders` | `app/admin/(larkon)/delivery/riders/page.tsx` |
| Delivery & Logistics | `/admin/delivery/hubs` | `app/admin/(larkon)/delivery/hubs/page.tsx` |
| Delivery & Logistics | `/admin/delivery/incidents` | `app/admin/(larkon)/delivery/incidents/page.tsx` |
| Support & Moderation | `/admin/support/tickets` | `app/admin/(larkon)/support/tickets/page.tsx` |
| Support & Moderation | `/admin/support/reviews` | `app/admin/(larkon)/support/reviews/page.tsx` |
| Support & Moderation | `/admin/support/reports` | `app/admin/(larkon)/support/reports/page.tsx` |
| Content & Notifications | `/admin/content` | `app/admin/(larkon)/content/page.tsx` |
| Content & Notifications | `/admin/content/announcements` | `app/admin/(larkon)/content/announcements/page.tsx` |
| Content & Notifications | `/admin/content/notifications` | `app/admin/(larkon)/content/notifications/page.tsx` |
| Content & Notifications | `/admin/content/templates` | `app/admin/(larkon)/content/templates/page.tsx` |
| Content & Notifications | `/admin/content/cms` | `app/admin/(larkon)/content/cms/page.tsx` |
| System & Settings | `/admin/system` | `app/admin/(larkon)/system/page.tsx` |
| System & Settings | `/admin/system/integrations` | `app/admin/(larkon)/system/integrations/page.tsx` |
| System & Settings | `/admin/system/sessions` | `app/admin/(larkon)/system/sessions/page.tsx` |
| System & Settings | `/admin/analytics` | `app/admin/(larkon)/analytics/page.tsx` |
| Audit & Security | `/admin/audit` | `app/admin/(larkon)/audit/page.tsx` |
| Audit & Security | `/admin/onboarding` | `app/admin/(larkon)/onboarding/page.tsx` |
| Audit & Security | `/admin/onboarding/publish-requests` | `app/admin/(larkon)/onboarding/publish-requests/page.tsx` |
| Audit & Security | `/admin/onboarding/partner-applications` | `app/admin/(larkon)/onboarding/partner-applications/page.tsx` |
| Planning & Docs | `/admin/docs` | `app/admin/(larkon)/docs/page.tsx` |
| Product Authenticity | `/admin/authenticity/dashboard` | `app/admin/(larkon)/authenticity/dashboard/page.tsx` |
| Product Authenticity | `/admin/authenticity/factories` | `app/admin/(larkon)/authenticity/factories/page.tsx` |
| Product Authenticity | `/admin/authenticity/products` | `app/admin/(larkon)/authenticity/products/page.tsx` |
| Product Authenticity | `/admin/authenticity/batches` | `app/admin/(larkon)/authenticity/batches/page.tsx` |
| Product Authenticity | `/admin/authenticity/serials` | `app/admin/(larkon)/authenticity/serials/page.tsx` |
| Product Authenticity | `/admin/authenticity/alerts` | `app/admin/(larkon)/authenticity/alerts/page.tsx` |

**Total stubs added:** 41

## Route Mapping (ADMIN_ROUTE_MAP)

These permissionMenu hrefs map to different page paths:

| Menu Href | Actual Route |
|-----------|--------------|
| `/admin/roles` | `/admin/role/role-list` |
| `/admin/products` | `/admin/products/product-list` |
| `/admin/orders` | `/admin/orders/orders-list` |
| `/admin/inventory` | `/admin/inventory/warehouse` |
| `/admin/support` | `/admin/support/help-center` |

## Stub detection and SOON badge

- **STUB_ADMIN_HREFS** (in `src/larkon-admin/menu/adapters/adminRouteMap.ts`): Set of permissionMenu hrefs that point to Coming Soon stub pages. Same list as the “Stub Pages Added” table above.
- **SOON badge:** Sidebar menu items whose href is in STUB_ADMIN_HREFS render a small “SOON” badge (secondary variant) next to the label. Implemented items are unchanged. See `isStubAdminHref()` and `panelMenus.ts` → `convertItem()`.

## Behavior

- **NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED:** Unchanged. When `true`, shows all REGISTRY.admin items regardless of IMPLEMENTED_ADMIN_HREFS.
- **IMPLEMENTED_ADMIN_HREFS:** Now contains all 62 admin menu hrefs (implemented + stubs), so the full sidebar is shown by default.
- **No 404s:** Every menu link resolves to a page (either implemented or stub).
