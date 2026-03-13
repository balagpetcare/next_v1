# Staff Branch Clinic Catalog — Implementation Notes

## 1. What was already present

- Route `/staff/branch/[branchId]/clinic/catalog` and single `page.tsx` (~840 lines) with inline tab components.
- Backend: catalog list/get, add-from-master, packages CRUD, discount policies CRUD, approval requests list/create/decide, audit history (PackageAuditLog + ApprovalActionLog), doctor service/package matrix GET.
- Permissions: `clinic.catalog.view`, `clinic.catalog.search`, `clinic.catalog.branch_add`, `clinic.packages.read/write`, `approvals.view`, `clinic.appointments.manage`, `clinic.discount.approve`.
- Reusable dashboard components: PageWorkspace, PageHeader, StatCard, FilterBar, DataTableWrapper, EmptyState, ErrorState, LoadingState, DetailDrawer.
- `displayFormatters.ts`: humanizeFieldLabel, humanizeEnum, formatAuditDetails, formatAuditChangeLines, formatPayloadForDisplay.

## 2. What was broken

- Query params `?action=add-master`, `?action=create-package`, `?packageId=` were not read; "View" package and "Add from Master" links did not switch tab or open flows.
- Duplicate breadcrumb/header (manual Link breadcrumb + PageHeader).
- Catalog summary returned hardcoded zeros for activeServices, draftPackages, discountCampaignsRunning, mappedDoctors.
- Audit history did not include DiscountAuditLog or DoctorAuditLog; no entityType filter.
- No branch-scoped service create/update/status APIs for staff.
- No catalog item activate/deactivate API for staff.
- Services, Products, Promotions, Doctor Mapping tabs were placeholders.
- Approval requests had no decide actions; audit/approval UI showed raw enums and no human-readable payload.

## 3. What was completed

- **Backend:** Real counts in catalog summary; audit history merged Package + Approval + Discount + Doctor audit; `POST/PUT/PATCH` for branch services; `PATCH .../catalog/items/:itemId/status` for catalog item active/inactive.
- **Frontend:** Modularized into `_components/` (types, API, formatters, CatalogStatusBadge, one component per tab, AddFromMasterDrawer, PackageDetailDrawer, ServiceFormDrawer, DiscountFormDrawer). Slim page with `useSearchParams` for `tab`, `action`, `packageId`.
- **Overview:** 7 StatCards (catalog items, services, packages, pending approvals, drafts, promotions, mapped doctors), recent activity (last 5 audit entries, human-readable), quick action links.
- **Catalog Items / Clinical / Products:** List with search, domain/status filters, activate/deactivate, Add from Master drawer; domain and status shown as labels (no raw JSON).
- **Services:** List with status filter, create/edit via ServiceFormDrawer, status reflected from API.
- **Packages:** List with status/type badges, View opens PackageDetailDrawer (package + items); URL `?tab=packages&packageId=` opens drawer.
- **Promotions:** List discount policies, create/edit via DiscountFormDrawer, human-readable type/scope/summary.
- **Doctor Mapping:** Service matrix and package matrix tabs with doctor/service or doctor/package/role/status (read-only; edit remains per-doctor in Doctors area).
- **Approval Requests:** Humanized type and status; Details column uses formatPayloadForDisplay (no raw JSON); Approve/Reject for users with `approvals.manage`.
- **Audit History:** Merged feed with entityType filter; "What changed" uses formatAuditChangeLines/formatAuditDetails (no raw JSON).
- **Display formatters:** Extended `displayFormatters.ts` with catalog-related FIELD_LABELS and ENUM_LABELS; `catalogFormatters.ts` for domain type, package type, discount type/scope/calc, approval request type, doctor package role, service category, discount summary, price.

## 4. Actions supported per tab

| Tab                | View | Create | Edit | Activate/Deactivate | Delete | Other                    |
|--------------------|------|--------|------|----------------------|--------|---------------------------|
| Overview           | —    | —      | —    | —                    | —      | Navigate to other tabs    |
| Catalog Items      | List | Add from Master | — | Toggle status         | No     | —                         |
| Services           | List | Yes    | Yes  | Via status in edit   | No (use Inactive) | —              |
| Products           | List | Add from Master | — | Toggle status         | No     | —                         |
| Clinical Items     | List | Add from Master | — | Toggle status         | No     | —                         |
| Packages           | List + Detail drawer | Via owner/approval | Via owner/approval | Status in lifecycle | Via backend only | View opens drawer |
| Promotions         | List | Yes    | Yes  | Via status in edit   | No (use Inactive) | —              |
| Doctor Mapping     | Matrix (read-only) | — | Per-doctor in Doctors area | — | — | —                |
| Approval Requests  | List + Details col | — | —    | —                    | —      | Approve/Reject (if perm)  |
| Audit History      | List | —      | —    | —                    | —      | Entity type filter        |

## 5. Architectural limitations kept intentionally

- Catalog items and clinical items are org-level; staff can only add from master and toggle branch-visible active/inactive. No staff-only create/edit of catalog item metadata (owner/org-level).
- Package create/edit/delete remain in owner/enterprise flow; staff view packages and open detail drawer. Package approval flow unchanged.
- Doctor–service and doctor–package mapping edits stay in the per-doctor Doctors area; catalog Doctor Mapping tab is read-only matrix.
- Discount policy create/update uses existing clinic discount APIs (branch-scoped); no separate "promotion" entity.
- Delete is not exposed in UI for catalog items, services, or discount policies; deactivate/inactive is used instead.

## 6. Approval / delete safety decisions

- **Approval:** Only users with `approvals.manage` see Approve/Reject; reject sends `rejectReason` to backend.
- **Catalog item:** No delete; activate/deactivate only via `PATCH .../catalog/items/:itemId/status`.
- **Service:** No hard delete; status set to INACTIVE via update/status.
- **Package:** Delete exists in backend; not wired in this staff catalog UI (owner flow).
- **Discount policy:** No delete in UI; status set to INACTIVE via edit.
