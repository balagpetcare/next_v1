# Phase 4: Panel Adoption — Summary

**Date:** 2025-02-11  
**Scope:** Convert high-impact UI strings across all eight panels (owner, admin, shop, clinic, staff, producer, mother, country) to translations; add common + panel namespace keys; wire shared components (EntityFilters). No new i18n library; hooks only in client components.

---

## 1) Modified Files (by panel)

### Owner
- `app/owner/dashboard/page.jsx` — useLanguage; title, subtitle, refresh/refreshing, New Organization, error, metric labels (todaySales, monthSales, ordersPending, lowStock, returns, activeBranches, pendingRequests, walletBalance), toReview, branchAccess, salesTrend, period7d/30d/6m/1y.
- `app/owner/branches/page.jsx` — useLanguage; title, subtitle, breadcrumbs labels (via t), error message.
- `app/owner/orders/page.tsx` — useLanguage; page title (Orders), error and alert messages (failedToLoadOrders, failedToUpdateOrder).
- `app/owner/_components/shared/EntityFilters.jsx` — useLanguage; Search label, search placeholder, Status, Verification, All (advanced filter option).

### Admin
- `app/admin/dashboard/page.jsx` — useLanguage; dashboard title, failedToLoadDashboard, refresh/refreshing.

### Shop
- `app/shop/page.jsx` — converted to client component; useLanguage; homeTitle, homeSubtitle.

### Clinic
- `app/clinic/page.jsx` — converted to client component; useLanguage; homeTitle, homeSubtitle.

### Staff
- `app/staff/page.jsx` — useLanguage; status chips (All, Approved, Pending, Rejected, Suspended), noBranchesAssigned, contactAdmin, backToLogin, loadingBranches, selectBranch, chooseBranch, continueWhereLeftOff, continue, enterBranch, viewRequest, accessExpired, accessRevoked, ownerAccess, myProfile, staffHome; badge and button labels.

### Producer
- `app/producer/dashboard/page.jsx` — useLanguage; dashboardTitle, getGateMeta messages (kycNotSubmitted, kycPending, kycRejected, kycSuspended), error (common.failedToLoad).

### Mother
- `app/mother/page.jsx` — useLanguage; loading, homeTitle, homeSubtitle.

### Country
- `app/country/dashboard/page.jsx` — converted to client component; useLanguage; dashboardTitle, metric labels (totalOrgs, clinics, petshops, shelters, donations7d, fundraisingActive, adoptionsPending, rescueOpen), activityTimeline, latestActionsHere, quickQueues, queue items, featureStatus, featureStatusPlaceholder, complianceAlerts, noAlerts, staffOnline, lastActivitySummary.

### Locales
- `app/(public)/_locales/en.json` — already contained Phase 4 common.* and panel keys (see Phase 3 + prior work).
- `app/(public)/_locales/bn.json` — restored full common (save…items) and appended owner, admin, shop, clinic, staff, producer, mother, country namespaces with Bengali translations; removed duplicate common block.

---

## 2) New Translation Keys (by namespace)

### common (Phase 4 additions; many already present from Phase 3)
- name, status, created, updated, actions, email, phone, address, notes
- apply, reset, searchPlaceholder, refreshing, all, verification, toReview, branchAccess
- failedToLoad, invalidRequestId
- noBranchesAssigned, contactAdmin, backToLogin, loadingBranches
- continue, approved, pending, rejected, suspended, expired, ownerAccess, myProfile

### owner
- dashboardTitle, dashboardSubtitle, newOrganization
- todaySales, monthSales, ordersPending, lowStock, returns, activeBranches, pendingRequests, walletBalance
- branches, manageBranchesSubtitle, orders, organizations, products
- failedToLoadBranches, failedToLoadDashboard, failedToLoadOrders, failedToUpdateOrder
- editBranch, invalidTeam, teamNotFound, branchAccessRequest, inviteStaff, workspace
- salesTrend, period7d, period30d, period6m, period1y

### admin
- dashboardTitle, failedToLoadDashboard

### shop
- homeTitle, homeSubtitle

### clinic
- homeTitle, homeSubtitle

### staff
- selectBranch, chooseBranch, continueWhereLeftOff, enterBranch, viewRequest, accessExpired, accessRevoked, staffHome

### producer
- dashboardTitle, kycNotSubmitted, kycPending, kycRejected, kycSuspended

### mother
- homeTitle, homeSubtitle

### country
- dashboardTitle, totalOrgs, clinics, petshops, shelters, donations7d, fundraisingActive, adoptionsPending, rescueOpen
- activityTimeline, latestActionsHere, quickQueues
- adoptionApprovalsPending, orgVerificationPending, fundraisingApprovalsPending, reportsPending
- featureStatus, featureStatusPlaceholder, complianceAlerts, noAlerts, staffOnline, lastActivitySummary

All of the above exist in both `en.json` and `bn.json`.

---

## 3) Still Hardcoded (with reason)

- **PageHeader / breadcrumbs** — Many owner pages pass title/subtitle/breadcrumb labels from callers; only dashboard, branches, orders were updated in this phase. Other list/detail pages (e.g. staffs, organizations) still pass hardcoded strings; can be wired in a follow-up using config or titleKey.
- **entityConfig.js** — Column labels (Name, Status, Verification, etc.) and quickFilter labels are still hardcoded; translating them would require passing `t` into config or resolving labelKey at render time (EntityTable/EntityListPage).
- **Owner branches page** — "Access Requests", "New Branch" button labels left hardcoded (low priority).
- **Owner orders page** — Subtitle "Manage all orders...", filter option "All Status", "Pending", etc., "No orders found." left hardcoded (low priority).
- **Admin dashboard** — Subtitle "System overview...", section headings (Verification Queue, etc.), StatCard titles, "Export", and all other dashboard copy left hardcoded (minimal viable scope).
- **Shop / clinic / mother** — "Health check page", "Debug info", "Next steps" and list items left hardcoded (skeleton content).
- **Producer dashboard** — "KYC Status:", "Update KYC", "Code Search", and remaining UI left hardcoded.
- **Server components** — Any panel page that remains a server component and was not converted to client for this phase still shows hardcoded strings (e.g. only country dashboard was converted).

---

## 4) Build and Lint

| Check | Status |
|-------|--------|
| **Build** | ✅ `npm run build` succeeds (clear `.next` first if ENOTEMPTY). |
| **Lint** | ✅ `npm run lint` runs successfully. May exit with code 1 due to pre-existing violations elsewhere; no new lint rules added. |

---

## 5) Verification Notes

- Language switch: All wired panels read from `useLanguage()` and `t()`; switching locale (e.g. via existing landing/cookie mechanism) updates these strings. Refresh persistence is unchanged (cookie-based).
- Shared components: EntityFilters and owner dashboard/metric labels are shared or high-traffic; EntityListPage/EntityDetailPage/EntityTable were already wired in Phase 2/3.
