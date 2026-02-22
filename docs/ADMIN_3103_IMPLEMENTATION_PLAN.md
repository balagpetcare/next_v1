# Admin 3103 Recovery — Implementation Plan & Risk List

## Diff Targets

| File | Action |
|------|--------|
| `src/larkon-admin/helpers/Manu.ts` | Remove admin special-case; use getPanelMenuItems for admin; add safe fallback |
| `src/larkon-admin/menu/panelMenus.ts` | Enable admin in getPanelMenuItems; add route map + filter |
| `src/larkon-admin/menu/adapters/adminRouteMap.ts` | NEW: Route map + implemented set + filter logic |

## Risk List

| Risk | Mitigation |
|------|------------|
| Admin menu empty/crash | Fallback to minimal menu (Dashboard only) when getPanelMenuItems returns null/empty |
| Links 404 | Route map redirects known mismatches; hide unimplemented by default |
| Other panels affected | Changes scoped to admin only; owner/shop/clinic logic unchanged |
| Icon format mismatch | permissionMenu uses solar: icons; Larkon supports same; no change |
| policyFeature filtering | Not implemented in Phase 2; admin items have required:[] so all visible |

## Route Mapping (permissionMenu → actual page)

| permissionMenu href | Mapped to |
|--------------------|-----------|
| /admin/roles | /admin/role/role-list |
| /admin/products | /admin/products/product-list |
| /admin/orders | /admin/orders/orders-list |
| /admin/inventory | /admin/inventory/warehouse |
| /admin/support | /admin/support/help-center |

## Implemented Routes (shown when ADMIN_MENU_SHOW_UNIMPLEMENTED=false)

- /admin/dashboard
- /admin/permissions
- /admin/role/role-list (from /admin/roles)
- /admin/products/product-list (from /admin/products)
- /admin/orders/orders-list (from /admin/orders)
- /admin/inventory/warehouse (from /admin/inventory)
- /admin/support/help-center (from /admin/support)
- /admin/settings
- /admin/support/faqs
- /admin/support/privacy-policy
- /admin/notifications
- + all existing Larkon template routes that overlap (category, seller, customer, etc.)

## Reference

- Phase 1 Analysis: docs/ADMIN_3103_RECOVERY_ANALYSIS_PHASE1.md
