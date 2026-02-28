# Producer Governance UI (Phase 2 + Phase 3)

**Spec:** backend-api/docs/admin/PRODUCER_GOVERNANCE_MASTER_PLAN.md  
**Admin port:** 3103 (see package.json `dev:admin`)

## Implemented routes

| Route | Description |
|-------|-------------|
| `/admin/producer-governance` | Producer list: search, filters (status, KYC), pagination |
| `/admin/producer-governance/[orgId]` | Producer detail with tabs: Overview, Staff, Approvals, Limits & Policies, Audit Timeline, Print jobs (Phase 3) |
| `/admin/approvals` | Pending approvals queue; optional `?producerOrgId=` filter |

## Sidebar navigation

- **Producer Governance** (new section under Admin menu)
  - **Producers** → `/admin/producer-governance`
  - **Approvals queue** → `/admin/approvals`

Source: `src/lib/permissionMenu.ts` (section `admin.section.producerGovernance`). Implemented hrefs are listed in `src/larkon-admin/menu/adapters/adminRouteMap.ts` (`IMPLEMENTED_ADMIN_HREFS`).

## API mapping (UI → backend)

All endpoints use base `/api/v1`. Responses follow Appendix A envelope: `success`, `code`, `message`, `traceId`, `data`.

| UI action / screen | Method | Endpoint | Notes |
|--------------------|--------|----------|--------|
| Producer list (load) | GET | `/admin/producers?search=&status=&kycStatus=&page=&pageSize=` | `data`: `{ items, page, pageSize, total }` |
| Producer detail (load) | GET | `/admin/producers/:orgId` | `data`: detail + metrics, flags, quotas |
| Producer staff | GET | `/admin/producers/:orgId/staff` | `data`: array of staff |
| Producer flags | GET | `/admin/producers/:orgId/flags` | `data`: `{ key, enabled }[]` |
| Producer flags (save) | PUT | `/admin/producers/:orgId/flags` | body: `{ flags: [{ key, enabled }], reason? }` |
| Producer quotas | GET | `/admin/producers/:orgId/quotas` | `data`: `{ key, limit, used, resetPeriod }[]` |
| Producer quotas (save) | PUT | `/admin/producers/:orgId/quotas` | body: `{ quotas: [{ key, limit, resetPeriod? }], reason? }` |
| Producer audit | GET | `/admin/producers/:orgId/audit?limit=&offset=&entityType=&actionKey=&fromDate=&toDate=` | `data`: `{ items }` (Phase 3: date range) |
| Producer metrics (Phase 3) | GET | `/admin/producers/:orgId/metrics` | `data`: counts, usage, lastActivityAt |
| Producer print jobs (Phase 3) | GET | `/admin/producers/:orgId/print-jobs?limit=&offset=&fromDate=&toDate=` | `data`: `{ items, total }` |
| Suspend | POST | `/admin/producers/:orgId/suspend` | body: `{ reason? }` |
| Unsuspend | POST | `/admin/producers/:orgId/unsuspend` | body: `{ reason? }` |
| Approvals list | GET | `/admin/approvals?producerOrgId=&page=&limit=` | `data`: array of pending approvals |
| Approve | POST | `/admin/approvals/:id/approve` | body: `{ note? }` |
| Reject | POST | `/admin/approvals/:id/reject` | body: `{ note? }` |

## UI components (shared)

- **DataTable** — `src/bpa/admin/components/DataTable.tsx`: columns, rows, loading, emptyState.
- **EmptyState** — `src/bpa/admin/components/EmptyState.tsx`: title, description, optional action.
- **ErrorState** — `src/bpa/admin/components/ErrorState.tsx`: message, optional code, retry button.
- **LoadingSkeleton** — `src/bpa/admin/components/LoadingSkeleton.tsx`: placeholder rows for tables.

Existing: AdminPageShell, SectionCard, StatusChip, StatCard, TimelineView (used in detail/audit tab).

## Error handling

- All API calls use `governanceApi.ts` helpers (`getGovernance`, `postGovernance`, `putGovernance`).
- Failed responses throw with `message` from envelope or `messageForCode()` for known codes (e.g. `ORG_SUSPENDED`, `QUOTA_EXCEEDED`).
- List/detail/approvals pages show **ErrorState** with retry when load fails.

## Phase 3 UI (Hardening & dashboards)

- **Overview — Metrics section:** Fetches GET `/admin/producers/:orgId/metrics` when on Overview. Shows staff count, audit events (24h), last activity; usage vs limits as simple progress bars (no heavy chart lib).
- **Audit tab — Filters:** From date, To date (date inputs), Action (text), Entity type (text); Apply button sends query params to audit API. **Export CSV** builds CSV from current filtered audit and triggers download.
- **Print Jobs tab:** Shown only when backend supports it; controlled by `NEXT_PUBLIC_PRODUCER_GOVERNANCE_PRINT_JOBS_TAB` (set to `false` to hide). Table from GET print-jobs; **Export CSV** for current list.
- **Export:** Audit and Print Jobs tabs offer client-side CSV export (current page data). **CSV safety:** exported values are escaped to prevent formula injection: any cell whose value starts with `=`, `+`, `-`, or `@` is prefixed with an apostrophe (`'`) so that spreadsheets do not interpret it as a formula.

## Screenshots (placeholders)

- _Producer list:_ filters + table + pagination; empty state when no results.
- _Producer detail:_ tabs Overview / Staff / Approvals / Limits & Policies / Audit Timeline / Print jobs; suspend/unsuspend in header; Overview shows Metrics section; Audit shows filter row + Export CSV.
- _Approvals queue:_ table with Approve/Reject per row; empty state when no pending.

## Manual QA checklist

- [ ] **Navigation:** Admin sidebar shows "Producer Governance" with "Producers" and "Approvals queue". Click each and confirm correct page.
- [ ] **Port:** Admin panel runs on 3103; open `/admin/producer-governance` and `/admin/approvals`.
- [ ] **Producer list:** Load page; see loading skeleton then table or empty state. Apply search/filters (status, KYC), click Apply; pagination works (Previous/Next).
- [ ] **Producer list error:** Simulate API failure (e.g. backend stopped); see ErrorState and Retry.
- [ ] **Producer detail:** From list click "View" on a row; detail page loads. Overview tab shows status, owner, metrics (Phase 3: Metrics section with staff count, audit 24h, usage bars). Staff tab shows staff table or empty. Approvals tab links to queue. Limits & Policies: toggle a flag, change a quota limit, Save; confirm no error. Audit tab shows filter UI (from/to date, action, entity type), Apply, timeline or "No audit events", Export CSV. Print Jobs tab (if enabled) shows table and Export CSV.
- [ ] **Suspend/Unsuspend:** On detail page click Suspend; confirm; detail reloads with status SUSPENDED. Click Unsuspend; confirm; status reverts.
- [ ] **Approvals queue:** Open `/admin/approvals`; see pending items or empty state. With `?producerOrgId=X` only that org’s pending shown. Click Approve or Reject; row disappears after success.
- [ ] **No business rules in UI:** All enforcements (suspension, quota, flags) are backend-only; UI only displays and sends actions.
