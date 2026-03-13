# Enterprise UX Standardization + Operational Awareness — Audit Report

**Phase:** Enterprise UX Standardization + Operational Awareness  
**Date:** 2025-03-11  
**Scope:** bpa_web frontend; no backend API changes.

## 1. Existing implementation (human-readable display)

### 1.1 ReportDataDisplay
- **Location:** `src/components/dashboard/ReportDataDisplay.tsx`
- **Usage:** Renders report/API payload as key-value list or array of blocks; uses `displayFormatters` (humanizeFieldLabel, formatValueForDisplay, humanizeEnum). No raw JSON.
- **Used in:**
  - `app/staff/.../reports/page.jsx` — profitability, settlementSummary, discountAnalysis, inventoryVariance, doctorContribution
  - `app/staff/.../manager-reports/page.jsx` — settlementSummary, doctorContribution
  - `app/staff/.../clinic/analytics/page.tsx` — all five report sections
  - `app/staff/.../clinic/billing/page.tsx` — billing summary
  - `app/staff/.../clinic/cases/[caseId]/page.jsx` — variance summary

### 1.2 displayFormatters
- **Location:** `src/lib/displayFormatters.ts`
- **Used for:** Field labels, enum labels, audit change lines, payload/notes formatting.
- **Surfaces using it:**
  - Doctor audit logs: `formatAuditDetails`, `humanizeFieldLabel`, `humanizeEnum` (`clinic/doctors/audit-logs/page.tsx`)
  - Catalog AuditHistoryTab: `formatAuditDetails`, `formatAuditChangeLines`, `humanizeEnum`
  - Catalog ApprovalRequestsTab: `formatPayloadForDisplay`
  - Visit notes: `formatMetadataForDisplay(n.contentJson)` in `clinic/visits/[visitId]/page.jsx`
  - Doctor appointments table: `formatVisitType`, `formatAppointmentType`
  - ReportDataDisplay (internal): `formatValueForDisplay`, `humanizeFieldLabel`, `humanizeEnum`

### 1.3 Doctor audit logs
- **Location:** `app/staff/.../clinic/doctors/audit-logs/page.tsx`
- **Status:** Uses `formatAuditDetails` for details column; human-readable change lines. No raw JSON.

### 1.4 Manager-reports, reports, clinic analytics, clinic billing, case variance, visit notes
- **Status:** All use ReportDataDisplay or displayFormatters. No raw JSON in these surfaces. Visit notes use `formatMetadataForDisplay(contentJson)`.

**Conclusion:** ReportDataDisplay, displayFormatters, doctor audit logs, manager-reports, reports, clinic analytics, clinic billing, case variance, and visit notes are already using human-readable display and avoid raw JSON.

---

## 2. Gaps and improvement areas

| Area | Current state | Target |
|------|----------------|--------|
| Status badges | Per-page `statusBadgeClass` (appointments, visits, supply-requests, approvals, settlement); inconsistent mapping and raw enum labels | Reusable StatusBadge with standard color mapping and humanized labels |
| Empty states | EmptyState exists; used on approvals, visits, settlement, audit-logs; appointments/cases/inventory/supply-requests/customers/tasks use ad-hoc text | Standardize with EmptyState + icon + CTA where missing |
| Report export | No export | Optional CSV export and copy-to-clipboard for report tables/summaries (client-side) |
| Operational alerts | Sidebar badge counts (approvals, lowStock, clinicQueue) exist in branchSidebarConfig | Lightweight alert widgets on Overview, Manager Dashboard, Clinic Dashboard reusing same data |
| Audit formatting | Doctor audit and catalog audit use formatters | Extend same pattern to any other audit surfaces; ensure no raw JSON |
| UI patterns | Mixed page headers, filter bars, table actions | Prefer PageHeader, FilterBar, consistent status display, detail links |

---

## 3. Touch points (no removals)

- **New components:** StatusBadge, optional ReportDataDisplay export/copy, EmptyState (already exists; ensure consistent usage), AlertWidget/OverviewAlerts.
- **Pages to update (additive):** visits, appointments, approvals, settlement, supply-requests (list + detail), clinic billing (status if any), doctor status (DoctorStatusBadgeGroup can use shared mapping), inventory (empty + alerts). List pages: appointments, visits, cases, inventory, supply-requests, customers, tasks, approvals — ensure EmptyState where missing.
- **Config:** branchSidebarConfig already has badgeKey; dashboard/overview pages need to consume counts for alert widgets.

---

## 4. Out of scope (per instructions)

- No redo of Enterprise Verification phase.
- No rebuild of working modules.
- No backend API changes.
- No route structure changes; no removal of working pages.
