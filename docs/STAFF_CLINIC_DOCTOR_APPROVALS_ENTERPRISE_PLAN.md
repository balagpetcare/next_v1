# Staff clinic doctor approvals — enterprise upgrade

Planning and audit for `/staff/branch/[branchId]/clinic/doctors/approvals`.  
**Workflow engine:** see sibling repo `../backend-api/docs/CLINIC_APPROVAL_WORKFLOW.md`.

## 1. Route map (public URL vs filesystem)

| User-facing URL | Physical route |
|-----------------|----------------|
| `/staff/branch/[branchId]/clinic/doctors/approvals` | `app/staff/(larkon)/branch/[branchId]/clinic/doctors-approvals/page.tsx` |
| `/staff/branch/[branchId]/clinic/doctors/approvals/[approvalId]` | `app/.../clinic/doctors/approvals/[approvalId]/page.tsx` |

Next.js `beforeFiles` rewrites: list `.../doctors/approvals` → `.../doctors-approvals`. Detail is a **real** route `.../doctors/approvals/[approvalId]` (shared `_components/DoctorApprovalRequestDetailPage.tsx`). Redirects: `.../doctor-approvals-detail/:id` and `.../doctors/profile/approvals/:id` → canonical detail URL.

**Route helpers:** `src/lib/doctorOperationsRoutes.ts` — `approvals(branchId)` (queue), `approvalsRequest(branchId, requestId)` (detail).

## 2. Current-state audit

| Item | Detail |
|------|--------|
| **Queue URL** | `/staff/branch/[branchId]/clinic/doctors/approvals` |
| **Detail URL** | `/staff/branch/[branchId]/clinic/doctors/approvals/[requestId]` |
| **Queue page** | `app/staff/(larkon)/branch/[branchId]/clinic/doctors-approvals/page.tsx` |
| **Detail page** | `app/staff/(larkon)/branch/[branchId]/clinic/doctors/approvals/[approvalId]/page.tsx` |
| **Shared UI** | `doctors-approvals/_components/ApprovalRequestDetailSections.tsx` |

### APIs (staff)

- `GET /api/v1/clinic/branches/:branchId/approval-requests` — list (supports `doctorQueue=1`, pagination, filters).
- `GET /api/v1/clinic/branches/:branchId/approval-requests/summary` — KPI counts (doctor queue).
- `GET /api/v1/clinic/branches/:branchId/approval-requests/:requestId` — detail + approval action logs.
- `PUT /api/v1/clinic/branches/:branchId/approval-requests/:requestId/decide` — approve/reject (`approvals.manage`).
- `GET /api/v1/clinic/branches/:branchId/doctors/:memberId/fees` — optional; detail page uses for **DOCTOR_FEE_CHANGE** current vs proposed (live DB read).

Legacy `POST .../doctors/approvals/:id/action` should require `approvals.manage` only (aligned with decide).

### Permissions

| Capability | Permission |
|------------|------------|
| View queue / detail | `clinic.doctors.view` or `approvals.view` |
| Approve / reject | `approvals.manage` |

Read routes use `approvals.view` or `clinic.packages.read` on the API; staff UI aligns with doctor-ops gate above.

### Related surfaces

- **Branch hub:** `/staff/branch/[branchId]/approvals` — all clinic approval types.
- **Per-doctor profile:** `ApprovalsTab` — same `decide` API.

### Doctor queue type guard

Types in the doctor approvals queue match backend `DOCTOR_APPROVAL_QUEUE_TYPES` (`src/lib/clinicApprovalLabels.ts` — keep in sync with `backend-api/.../clinicApprovalTypes.ts`). If a user opens a detail URL for a non–doctor-queue request type, the detail page shows a warning and link back to the queue (read API still allows the row).

## 3. UX — queue

- Header with breadcrumbs, subtitle, inline stats.
- Summary KPI cards: pending, high priority, SLA breached, approved/rejected today (doctor queue).
- Filters: type, status, priority band, requester, doctor (member id), date range, SLA state, search.
- Enterprise table; **View / row opens dedicated detail route** (not a drawer).
- Optional quick Approve/Reject on the queue for throughput; primary review path is the detail page.

## 4. UX — detail page

- `PageWorkspace`, `BranchHeader`, `PageHeader`, breadcrumbs: Doctors → Pending approvals → Request `#id`.
- **Summary:** status, requester, dates, priority, reject/decision metadata.
- **Requester / doctor:** display names, **Quick view** (Doctor360 drawer), **Open profile** link.
- **Current vs proposed (best-effort):** for `DOCTOR_FEE_CHANGE`, compares payload (`feeType`, `proposedValue`, `effectiveFrom`) to **live** fees from `GET .../doctors/:memberId/fees` (`current.consultation` / `followUp` / `emergency`). Not a snapshot at request creation unless stored in payload.
- **Full payload:** formatted JSON; other request types rely on payload / logs for before/after.
- **Audit timeline:** `actionLogs` for `CLINIC_APPROVAL_REQUEST`.
- **Action panel:** Approve (confirm), Reject (modal, required reason) when `PENDING` and `approvals.manage`.
- **Editing:** No API to edit pending request payloads; deep links to doctor profile / fee flows if needed later.

## 5. Data contract

- List: `{ items, total }` with optional `doctorMemberId`, `doctorDisplayName`, `priorityLabel`, SLA fields.
- Summary: `{ totalPending, highPriority, slaBreached, approvedToday, rejectedToday }`.
- Detail: request row + `actionLogs[]` from `approval_action_logs` for `CLINIC_APPROVAL_REQUEST`.

## 6. Implementation checklist

- [x] `next.config.js` rewrites for detail path.
- [x] `approvalsRequest` in `doctorOperationsRoutes.ts`.
- [x] `DOCTOR_APPROVAL_QUEUE_TYPES` + guard on detail page.
- [x] `ApprovalRequestDetailSections` + fee compare + audit + payload.
- [x] `doctors/approvals/[approvalId]/page.tsx` + `_components/DoctorApprovalRequestDetailPage.tsx` with permissions and actions.
- [x] Queue navigates to detail; remove drawer-primary.

## 7. QA checklist

- User with `approvals.view` but not `approvals.manage` sees detail but cannot approve/reject (buttons hidden; API 403 if forced).
- Deep link `/doctors/approvals/:id` loads under rewrite; refresh works.
- Non–doctor-queue `requestId` shows warning; no spurious errors.
- Reject requires non-empty reason; decided request shows correct audit entries after navigate back.
- Branch mismatch / unknown id: API 403/404 surfaced as error UI.
- Doctor 360 + profile link work from detail page.
- Doctor queue lists only doctor-related `requestType`s when `doctorQueue=1`.
- Approve/reject refreshes state and shows toast; queue list unchanged until user returns.
- Sidebar: Doctor Operations → Pending Approvals.

## 8. Known gaps

- No server-side **edit payload** for pending requests.
- **Current** fee values on detail are **live** DB reads, not time-travel at request creation.
- No approve **note** in API body unless extended.
- Other request types have no automatic before/after unless the payload encodes it.

## 9. Implementation touch points

- `bpa_web/app/staff/.../clinic/doctors-approvals/page.tsx`, `doctors/approvals/[approvalId]/page.tsx`, `doctors-approvals/_components/*`
- `bpa_web/next.config.js`, `bpa_web/src/lib/doctorOperationsRoutes.ts`, `bpa_web/src/lib/clinicApprovalLabels.ts`
- `bpa_web/lib/api.ts`
- `backend-api/src/api/v1/services/clinicApprovalRequest.service.ts`
- `backend-api/src/api/v1/modules/clinic/clinic.routes.ts`
- `backend-api/src/api/v1/modules/clinic/clinic.controller.ts`
