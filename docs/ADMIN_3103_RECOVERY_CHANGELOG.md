# Admin 3103 Recovery — Phase 2 Changelog

## Summary of Changes

- **Admin sidebar now uses REGISTRY.admin from permissionMenu.ts** instead of Larkon MENU_ITEMS.
- All panels (admin, owner, shop, clinic, etc.) now use the same permissionMenu-based flow via `getPanelMenuItems`.
- Route mapping and unimplemented filtering added for safe rollout.

## Files Modified

| File | Change |
|------|--------|
| `src/larkon-admin/helpers/Manu.ts` | Removed admin special-case (MENU_ITEMS); uses getPanelMenuItems for all panels; safe fallback to minimal menu |
| `src/larkon-admin/menu/panelMenus.ts` | Enabled admin in getPanelMenuItems; added route map, admin filtering, icon fallback |
| `src/larkon-admin/menu/adapters/adminRouteMap.ts` | **NEW** — Route map, implemented set, show-unimplemented flag |
| `docs/ADMIN_3103_IMPLEMENTATION_PLAN.md` | **NEW** — Implementation plan & risk list |
| `docs/ADMIN_3103_RECOVERY_CHANGELOG.md` | **NEW** — This file |

## Mapped Routes (permissionMenu → actual page)

| permissionMenu href | Mapped to |
|--------------------|-----------|
| /admin/roles | /admin/role/role-list |
| /admin/products | /admin/products/product-list |
| /admin/orders | /admin/orders/orders-list |
| /admin/inventory | /admin/inventory/warehouse |
| /admin/support | /admin/support/help-center |

## Shown Routes (when ADMIN_MENU_SHOW_UNIMPLEMENTED=false)

- /admin/dashboard
- /admin/permissions
- /admin/roles → /admin/role/role-list
- /admin/products → /admin/products/product-list
- /admin/orders → /admin/orders/orders-list
- /admin/inventory → /admin/inventory/warehouse
- /admin/support → /admin/support/help-center
- /admin/settings
- /admin/support/faqs
- /admin/support/privacy-policy
- /admin/notifications
- /admin/profile
- /admin/review
- /admin/category/category-list
- /admin/customer/customer-list
- /admin/seller/seller-list
- + additional Larkon template routes that exist

## Hidden / Unimplemented Routes

These permissionMenu admin items are hidden by default (no page exists):

- Live Monitor, Verifications, Verification Metrics
- Users, Staff, Super Admin Whitelist
- Countries, States
- Organizations, Branches, Branch Types
- Products: Moderation, Master Catalog, Approvals; Vendors, Pricing, Online Store
- Returns, Wallet, Fundraising, POS, Transfers
- Services, Appointments
- Delivery Hub, Jobs, Riders, Hubs, Incidents
- Support: Tickets, Reviews, Reports
- Content Hub, Announcements, Notification Logs, Templates, CMS
- System Hub, Health, Integrations, Sessions, Analytics
- Audit Logs, Onboarding, Publish Requests, Partner Applications
- Planning & Docs
- Product Authenticity (all)

To show all items: set `NEXT_PUBLIC_ADMIN_MENU_SHOW_UNIMPLEMENTED=true` in `.env.local`.

## Validation

- No TypeScript errors in modified files.
- Full Next.js build: fails on pre-existing error in `app/owner/(larkon)/inventory/expiry/page.tsx` (useToast), unrelated to admin.
- Admin layout and components unchanged (TopNavigationBar, VerticalNavigationBar, Footer preserved).
