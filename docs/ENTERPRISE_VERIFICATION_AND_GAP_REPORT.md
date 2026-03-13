# Enterprise Verification + Advanced Polish — Report

## 1. Verification Report (Previously Completed Items)

### 1.1 Manager-reports disambiguation and internal links
- **Status: CONFIRMED**
- Sidebar: "Manager Reports" → `/staff/branch/[branchId]/manager-reports` (perm: `manager.reports.daily_revenue`); "Reports" → `/staff/branch/[branchId]/reports` (perm: `reports.view`).
- Manager-reports page correctly links to "Reports" and "Clinic Analytics" in footer copy. No broken internal links found.

### 1.2 Audit pages and raw JSON
- **Status: FIXED THIS PHASE**
- **Doctor audit logs**: Uses `formatAuditDetails`, `humanizeEnum`, `humanizeFieldLabel`; no raw JSON. ✓
- **Manager-reports, Reports, Clinic Analytics**: Now use `ReportDataDisplay` (human-readable key-value). ✓
- **Clinic Billing**: Billing summary uses `ReportDataDisplay`. ✓
- **Case detail**: Variance summary uses `ReportDataDisplay`. ✓
- **Visit detail**: Clinical notes `contentJson` uses `formatMetadataForDisplay`. ✓

### 1.3 Empty states and permission-aware CTAs
- **Status: PARTIALLY COMPLETE**
- Reusable `EmptyState` exists in `src/components/dashboard/EmptyState.tsx` (title, description, action).
- Doctor audit-logs page uses EmptyState with clear CTAs (e.g. "Clear selection"). Catalog AuditHistoryTab uses EmptyState. Some list pages may still use ad-hoc empty messaging without consistent CTA or permission checks.

### 1.4 Cross-module links (Appointment → Visit → Case → Billing)
- **Status: CONFIRMED**
- **Appointment:** `AppointmentDetailDrawer` shows "Open visit" and "Billing" when `a.visitId` exists; links to `/clinic/visits/{visitId}` and `/clinic/billing?visitId={visitId}`. ✓
- **Visit:** Visit detail page links to Case (`/clinic/cases/{visit.clinicalCase.id}`) and Billing (`/clinic/billing?visitId={visitId}`). ✓
- **Case:** Case detail page links to Visit and Billing when `caseData.visitId` exists. ✓
- **Billing:** Links to "Open visit" and recent visit list with visit links. ✓

---

## 2. Enterprise Maturity Gap Report

Findings classified by category.

### 2.1 Correctness issues
- Report and analytics pages display API payloads as raw JSON; users see technical structure instead of readable summaries.
- Visit clinical notes: `contentJson` rendered with `JSON.stringify` when object; should be human-readable.

### 2.2 Permission inconsistencies
- Sidebar uses `requiredPerm` + optional `anyPerms`; some pages use different permission arrays (e.g. `BILLING_PERMS`, `DOCTORS_PERMS`). Generally aligned but not centrally documented; risk of drift.
- Owner fallback menu uses `required: []` for core items; staff branch sidebar has no fallback (correct for least-privilege).

### 2.3 Workflow gaps
- Appointment table has no direct "Visit" or "Case" column/link; flow is via drawer (Visit/Billing links when visit exists). Acceptable; optional enhancement: add Visit link in table row when `visitId` present.
- No visible alert pattern for "settlement review needed" or "pending vial returns" on staff branch home/clinic dashboard (data may exist in API).

### 2.4 UX inconsistencies
- Status badges: inline logic (e.g. `visitBadge`, `payBadge`, `statusBadgeClass`) repeated across appointments, visits, cases; no single shared StatusBadge component with a standard mapping.
- Empty states: mix of `EmptyState` component vs plain `<p className="text-muted">`; not all empty states have a CTA or permission-gated action.
- Page headers: mix of `BranchHeader` + custom h5 vs `PageWorkspace` + `PageHeader`; filter bars and summary cards vary by page.

### 2.5 Duplicate patterns to standardize
- Report data display: manager-reports, reports, clinic/analytics all use `<pre>{JSON.stringify(...)}</pre>`; should use shared human-readable display (e.g. displayFormatters or a ReportDataDisplay component).
- Loading states: mix of `LoadingState` component vs "Loading…" text and spinner.

### 2.6 Reporting / export gaps
- Manager Reports, Reports, and Clinic Analytics do not offer export (CSV/Excel); structure is present for future export.
- Role of each reporting page not clearly stated in headings/descriptions (Manager = operational daily; Reports = broader; Clinic Analytics = clinic-specific).

### 2.7 Notifications / operational awareness
- Sidebar supports badge counts: `approvals`, `lowStock`, `clinicQueue`. No visible alerts for: pending approvals (beyond badge), low stock, expiring credentials, schedule conflicts, settlement review needed, pending vial returns. Data may exist in APIs; UI alert patterns could be added where endpoints exist.

### 2.8 Audit / timeline standardization
- Doctor audit uses `formatAuditDetails`; catalog and staff audit may use similar patterns. Owner staff drawer "audit" tab and other audit surfaces should use same human-readable formatting for consistency.

---

## 3. Implementation Priority (This Phase)

1. **Replace raw JSON** on manager-reports, reports, clinic/analytics, billing, case variance, visit notes using `displayFormatters` and a small reusable report/object display component.
2. **Reusable ReportDataDisplay** (or use `formatValueForDisplay` consistently) for all report-style payloads.
3. **Visit notes and case variance** use `formatValueForDisplay` / `formatMetadataForDisplay` for `contentJson` and variance summary.
4. **Document** permission/sidebar alignment and standardize status/empty patterns where touched; avoid breaking existing behavior.
5. **Defer** for backlog: full StatusBadge component rollout, export UI, alert widgets for settlement/vial/credentials (implement when backend contracts are confirmed).

---

## 4. Permission and sidebar audit (summary)

- **Sidebar** (`branchSidebarConfig.ts`): Each item has `requiredPerm` and optional `anyPerms`; filtering is done in `getFilteredBranchSidebar(branchId, branch, permissions, counts)`. Manager Console items use `manager.reports.daily_revenue`, `manager.staff.duty_roster`, `approvals.manage`; Analytics group uses `reports.view`.
- **Page-level guards**: Staff clinic pages typically check a local constant (e.g. `BILLING_PERMS`, `VISITS_PERMS`) and render `AccessDenied` when user lacks permission. These align with sidebar `requiredPerm`/`anyPerms` for the same route; no central registry exists, so when adding routes ensure page guard permissions match sidebar config.
- **Backward compatibility**: Owner core menu uses `required: []` for auth-only fallback; do not remove without product decision. Staff branch has no fallback (correct).

---

## 5. Assumptions

- Backend report APIs (profitability, settlement, discount, inventory variance, doctor contribution) return object structures; we render them read-only with human-readable labels and do not change API contracts.
- Branch scope and permission checks remain as-is; we only tighten display and reuse, not permission logic.
- "Enterprise Verification" refers to the BPA clinic branch/staff implementation; owner and admin flows are out of scope for this phase except where they share display formatters.
