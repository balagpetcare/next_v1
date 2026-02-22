# Admin Merge V100.0.01.08 — Diff Report & Mapping

**Date:** 2026-02-22  
**Branch:** work/admin-3103-merge-v100-0108  
**Source:** web_app/big-update/V100.0.01.08 (app/admin)  
**Target:** app/admin/(larkon) — Larkon layout, permissionMenu, IMPLEMENTED_ADMIN_HREFS

---

## 1. Directory Structure Comparison

### 1.1 Old Admin (V100.0.01.08) — app/admin (flat)

| Route | File | Notes |
|-------|------|-------|
| /admin/analytics | analytics/page.jsx | Stats/analytics |
| /admin/appointments | appointments/page.jsx | Clinic appointments |
| /admin/audit | audit/page.jsx | Audit logs |
| /admin/authenticity/* | authenticity/{alerts,batches,dashboard,factories,products,serials}/page.tsx | Product Authenticity MVP |
| /admin/branch-types | branch-types/page.jsx | Master data |
| /admin/branches | branches/page.jsx | List |
| /admin/branches/[id] | branches/[id]/page.jsx | Detail |
| /admin/branches/manager | branches/manager/page.jsx | Manager view |
| /admin/content | content/page.jsx | Content hub |
| /admin/content/announcements | content/announcements/page.jsx | |
| /admin/content/cms | content/cms/page.jsx | |
| /admin/content/notifications | content/notifications/page.jsx | |
| /admin/content/templates | content/templates/page.jsx | |
| /admin/countries | countries/page.jsx | Country governance |
| /admin/countries/[id]/* | countries/[id]/{features,policies,users}/page.jsx | Country detail |
| /admin/dashboard | dashboard/page.jsx | |
| /admin/debug | debug/page.jsx | Debug |
| /admin/delivery | delivery/page.jsx | Delivery hub |
| /admin/delivery/{hubs,incidents,jobs,riders} | delivery/*/page.jsx | |
| /admin/docs | docs/page.jsx | Planning & docs |
| /admin/docs/[slug] | docs/[slug]/page.jsx | |
| /admin/fundraising | fundraising/page.jsx | |
| /admin/health | health/page.jsx | System health |
| /admin/inventory | inventory/page.jsx | |
| /admin/live-monitor | live-monitor/page.jsx | |
| /admin/onboarding | onboarding/page.jsx | |
| /admin/onboarding/partner-applications | onboarding/partner-applications/page.jsx | |
| /admin/onboarding/publish-requests | onboarding/publish-requests/page.jsx | |
| /admin/online-store | online-store/page.jsx | |
| /admin/orders | orders/page.jsx | |
| /admin/orders/[id] | orders/[id]/page.jsx | |
| /admin/organizations | organizations/page.jsx | |
| /admin/organizations/[id] | organizations/[id]/page.jsx | |
| /admin/permissions | permissions/page.jsx | |
| /admin/policy/* | policy/{commission,refund,verification}/page.jsx | |
| /admin/pos/transactions | pos/transactions/page.jsx | |
| /admin/pricing | pricing/page.jsx | |
| /admin/products | products/page.jsx | |
| /admin/products/[id] | products/[id]/page.jsx | |
| /admin/products/approvals | products/approvals/page.tsx | |
| /admin/products/master-catalog | products/master-catalog/page.jsx | |
| /admin/products/master-catalog/[id] | products/master-catalog/[id]/page.jsx | |
| /admin/products/master-catalog/import | products/master-catalog/import/page.jsx | |
| /admin/products/moderation | products/moderation/page.jsx | |
| /admin/returns | returns/page.jsx | |
| /admin/roles | roles/page.jsx | |
| /admin/services | services/page.jsx | |
| /admin/settings | settings/page.jsx | |
| /admin/staff | staff/page.jsx | |
| /admin/staff/[id] | staff/[id]/page.jsx | |
| /admin/states | states/page.jsx | |
| /admin/states/[id]/* | states/[id]/{features,policies,rules}/page.jsx | |
| /admin/super-admin-whitelist | super-admin-whitelist/page.jsx | |
| /admin/support | support/page.jsx | |
| /admin/support/{reports,reviews,tickets} | support/*/page.jsx | |
| /admin/system | system/page.jsx | |
| /admin/system/integrations | system/integrations/page.jsx | |
| /admin/system/sessions | system/sessions/page.jsx | |
| /admin/transfers | transfers/page.jsx | |
| /admin/users | users/page.jsx | |
| /admin/users/[id] | users/[id]/page.jsx | |
| /admin/vendors | vendors/page.jsx | |
| /admin/verification-metrics | verification-metrics/page.jsx | |
| /admin/verifications | verifications/page.jsx | Unified verification inbox |
| /admin/verifications/{owners,organizations,branches,staff,producer-orgs} | verifications/*/page.jsx | Sub-queues |
| /admin/verifications/*/[id] | verifications/*/[id]/page.jsx | Detail drawers |
| /admin/wallet | wallet/page.jsx | Withdrawal requests |

### 1.2 Current Larkon Admin — app/admin/(larkon)

| Route | File | Notes |
|-------|------|-------|
| /admin/dashboard | dashboard/page.tsx | ✓ |
| /admin/users | users/page.tsx | Stub |
| /admin/staff | staff/page.tsx | Restored |
| /admin/branches | branches/page.tsx | Restored |
| /admin/organizations | organizations/page.tsx | Stub |
| /admin/roles | role/role-list (mapped) | ✓ |
| /admin/permissions | permissions/page.tsx | ✓ |
| /admin/products | products/product-list (mapped) | ✓ |
| /admin/orders | orders/orders-list (mapped) | ✓ |
| /admin/inventory | inventory/warehouse (mapped) | ✓ |
| /admin/support | support/help-center (mapped) | ✓ |
| /admin/settings | settings/page.tsx | ✓ |
| /admin/countries | countries/page.tsx | ✓ |
| /admin/states | states/page.tsx | ✓ |
| /admin/branch-types | branch-types/page.tsx | ✓ |
| /admin/super-admin-whitelist | super-admin-whitelist/page.tsx | ✓ |
| /admin/notifications | notifications/page.tsx | ✓ |
| /admin/authenticity/* | authenticity/* (6 pages) | ✓ Larkon template |

### 1.3 Files in Old Admin Missing in Larkon

| Old Route | Action |
|-----------|--------|
| /admin/health | **Integrate** — Simple health check page |
| /admin/wallet | **Integrate** — Withdrawal management |
| /admin/verifications | **Integrate** — Unified verification inbox |
| /admin/verification-metrics | **Integrate** — Metrics |
| /admin/fundraising | **Integrate** or stub |
| /admin/analytics | Stub or integrate |
| /admin/audit | Stub or integrate |
| /admin/live-monitor | Stub or integrate |
| /admin/content | Stub |
| /admin/content/* | Stub |
| /admin/delivery | Stub |
| /admin/delivery/* | Stub |
| /admin/docs | Stub |
| /admin/docs/[slug] | Stub |
| /admin/onboarding | Stub |
| /admin/onboarding/* | Stub |
| /admin/system | Stub |
| /admin/system/* | Stub |
| /admin/returns | Stub |
| /admin/transfers | Stub |
| /admin/vendors | Stub |
| /admin/pricing | Stub |
| /admin/online-store | Stub |
| /admin/pos/transactions | Stub |
| /admin/appointments | Stub |
| /admin/services | Stub |
| /admin/products/moderation | Stub or integrate |
| /admin/products/master-catalog | Stub or integrate |
| /admin/products/approvals | Larkon has products page |
| /admin/support/tickets | Stub |
| /admin/support/reviews | Stub |
| /admin/support/reports | Stub |

---

## 2. API / Components

### 2.1 Old Admin API Usage

- `apiGet`, `apiPatch`, `apiPost` from `@/lib/api` — same as current
- `@/src/bpa/components/PageHeader` — current has `src/bpa/components/PageHeader.jsx` (re-exports ui)
- `@/src/bpa/admin/components/SectionCard` — **MISSING** in current
- `@/src/bpa/admin/components/FilterPanel` — **MISSING**
- `@/src/bpa/admin/components/StatusChip` — **MISSING**
- `@/src/bpa/admin/components/DetailDrawer` — **MISSING**
- `@/src/bpa/admin/components/DecisionPanel` — **MISSING**
- `@/src/bpa/admin/components/DocGrid` — **MISSING**
- `@/src/bpa/admin/components/TimelineView` — **MISSING**
- `@/src/bpa/admin/components/StatCard` — **MISSING**

### 2.2 Migration Plan

1. **Copy** `src/bpa/admin/components/*` from V100.0.01.08 into current bpa_web
2. **Adapt** PageHeader: use `@/src/bpa/components/PageHeader` (title, subtitle, right) or `@/app/owner/_components/shared/PageHeader` (breadcrumbs, actions)
3. **Replace** old API paths with current — `/api/v1/...` unchanged

---

## 3. Route Map Updates

| permissionMenu href | Target in Larkon | Status |
|---------------------|------------------|--------|
| /admin/health | /admin/health | **NEW** |
| /admin/wallet | /admin/wallet | **NEW** |
| /admin/verifications | /admin/verifications | **NEW** |
| /admin/verification-metrics | /admin/verification-metrics | **NEW** |
| /admin/fundraising | /admin/fundraising | **NEW** (stub or integrate) |
| /admin/returns | /admin/returns | Stub |
| /admin/transfers | /admin/transfers | Stub |
| /admin/analytics | /admin/analytics | Stub |
| /admin/audit | /admin/audit | Stub |
| /admin/live-monitor | /admin/live-monitor | Stub |

---

## 4. IMPLEMENTED_ADMIN_HREFS Additions

Add to `adminRouteMap.ts`:

- /admin/health
- /admin/wallet
- /admin/verifications
- /admin/verification-metrics
- /admin/fundraising
- (others as pages are integrated)

---

## 5. Implementation Summary (Completed 2026-02-22)

### 5.1 New Pages Integrated

| Route | File | Description |
|-------|------|-------------|
| /admin/health | app/admin/(larkon)/health/page.tsx | System health check (API, DB, routing) |
| /admin/wallet | app/admin/(larkon)/wallet/page.tsx | Withdrawal management, StatCards, StatusChip |
| /admin/verifications | app/admin/(larkon)/verifications/page.tsx | Unified verification inbox (owners, orgs, branches, staff, producer-orgs) |
| /admin/verification-metrics | app/admin/(larkon)/verification-metrics/page.tsx | Verification monitoring, timeseries, top entities |
| /admin/fundraising | app/admin/(larkon)/fundraising/page.tsx | Coming Soon stub (policy-gated DONATION) |

### 5.2 Components Restored

- `src/bpa/admin/components/` — 12 components from V100.0.01.08:
  - SectionCard, FilterPanel, StatusChip, DetailDrawer, DecisionPanel, DocGrid, TimelineView, StatCard, CommentThread
  - BulkActions, ConfirmationAlert, DecisionModal

### 5.3 IMPLEMENTED_ADMIN_HREFS Additions

- /admin/health
- /admin/wallet
- /admin/verifications
- /admin/verification-metrics
- /admin/fundraising

### 5.4 API Usage

- All pages use `@/lib/api` — `apiGet`, `apiPatch`, `apiPost`
- No legacy API helpers; shared API layer only

### 5.5 Type Declarations Added

- `src/types/jsx-modules.d.ts` — declarations for BPA admin components, useToast, apiErrorToMessage, NotificationBell, useBranchContext

---

## 6. Conflicts / Naming

- **Larkon** uses `role/role-list` for `/admin/roles`; old uses `roles/page.jsx` — keep Larkon mapping
- **Larkon** uses `products/product-list` for `/admin/products`; old has products/page.jsx — keep Larkon
- **authenticity** — both have; Larkon path `authenticity/*` matches — no conflict
