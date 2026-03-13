# Doctor Operations – Routing & Navigation Repair Report

## 1. Actual existing routes (Next.js app router)

Under `app/staff/(larkon)/branch/[branchId]/clinic/doctors/`:

| Path segment | File | Status |
|--------------|------|--------|
| (index) | `page.tsx` | ✅ Exists |
| `overview` | `overview/page.tsx` | ✅ Exists |
| `schedule-board` | `schedule-board/page.tsx` | ✅ Exists |
| `availability` | `availability/page.tsx` | ✅ Exists |
| `service-assignment` | `service-assignment/page.tsx` | ✅ Exists |
| `package-assignment` | `package-assignment/page.tsx` | ✅ Exists |
| `approvals` | `approvals/page.tsx` | ✅ Exists |
| `credentials` | `credentials/page.tsx` | ✅ Exists |
| `certifications` | `certifications/page.tsx` | ✅ Exists |
| `licenses` | `licenses/page.tsx` | ✅ Exists |
| `performance` | `performance/page.tsx` | ✅ Exists |
| `audit-logs` | `audit-logs/page.tsx` | ✅ Exists |
| `invite` | `invite/page.tsx` | ✅ Exists |
| `assign-existing` | `assign-existing/page.tsx` | ✅ Exists |
| `profile/[doctorId]` | `profile/[doctorId]/page.tsx` + `layout.tsx` | ✅ Exists |

All intended Doctor Operations routes exist. There are **no missing page files** for the listed segments.

---

## 2. Missing / dead routes (before fix)

- **Legacy “tab-style” URLs** such as:
  - `/staff/branch/5/clinic/doctors/profile/schedule-board`
  - `/staff/branch/5/clinic/doctors/profile/service-assignment`
  - `/staff/branch/5/clinic/doctors/profile/availability`
  - etc.

  These were interpreted as `profile/[doctorId]` with `doctorId = "schedule-board"` (etc.), so the profile page showed “Doctor not found” (invalid ID). They were **not** 404s from the router but broken UX.

- **No route files were missing.** The only “dead” behaviour was wrong links or bookmarks pointing at `.../profile/<segment>` instead of `.../<segment>`.

---

## 3. Files changed

| File | Change |
|------|--------|
| `proxy.ts` | Added redirect: `.../doctors/profile/<segment>` → `.../doctors/<segment>` for segment in `schedule-board`, `service-assignment`, `availability`, `performance`, `credentials`, `audit-logs`, `approvals`, `certifications`, `licenses`, `overview`, `package-assignment`. |
| `src/lib/doctorOperationsRoutes.ts` | Updated JSDoc to list actual routes and legacy redirect behaviour. |
| `app/staff/.../doctors/overview/page.tsx` | Replaced all hardcoded `/staff/branch/.../clinic/doctors/...` with `doctorOperationsRoutes` helpers. |
| `app/staff/.../doctors/page.tsx` | Replaced basePath and action links with `doctors()`, `invite()`, `assignExisting()`, `scheduleBoard()`. |
| `app/staff/.../doctors/availability/page.tsx` | Replaced hardcoded paths with `doctors()`, `scheduleBoard()`, `approvals()`, `availabilityRoute()`. |
| `app/staff/.../doctors/approvals/page.tsx` | Replaced hardcoded “Doctors” links with `doctors()`. |
| `app/staff/.../doctors/credentials/page.tsx` | Replaced hardcoded paths with `doctors()`, `approvals()`, `credentialsRoute()`. |
| `app/staff/.../doctors/service-assignment/page.tsx` | Replaced hardcoded “Doctors” links with `doctors()`. |
| `app/staff/.../doctors/schedule-board/page.tsx` | Replaced hardcoded “Doctors” links with `doctors()`. |
| `app/staff/.../doctors/performance/page.tsx` | Replaced path construction with `performanceRoute()`, added `doctors` import. |
| `app/staff/.../doctors/audit-logs/page.tsx` | Replaced path and “Doctors” links with `doctors()`, `auditLogsRoute()`. |
| `app/staff/.../doctors/certifications/page.tsx` | Replaced `basePath` with `doctors(branchId)`. |
| `app/staff/.../doctors/licenses/page.tsx` | Replaced credentials link with `credentials(branchId)`. |
| `src/components/clinic/doctors/Doctor360Drawer.tsx` | Added “Schedule board” quick link using `scheduleBoard(branchId)`; all quick actions use route helpers. |

---

## 4. Actions removed or replaced

- **None removed.** All dropdown and quick actions already pointed at valid routes or were corrected by the route helper usage.
- **DoctorActionMenu** (View profile, Manage schedule, Assign services, Assign packages): all use `profile()`, `availability()`, `serviceAssignment()`, `packageAssignment()`; no changes to meaning, only centralisation.
- **DoctorSummaryCard** “View profile”: still links to `profile(branchId, doctor.memberId)` (profile page exists).
- **Doctor360Drawer**: “Full profile” → profile; added “Schedule board” → schedule-board; “Assign services”, “Edit schedule”, “Review credentials”, “Performance & earnings”, “Audit log” unchanged and all use helpers.

---

## 5. Centralized route helper

- **File:** `src/lib/doctorOperationsRoutes.ts`
- **Usage:** All Doctor Operations hrefs should use this module. Sidebar (`branchSidebarConfig.ts`) already uses it. All updated pages and Doctor360Drawer/DoctorActionMenu/DoctorSummaryCard now use it; no remaining hardcoded doctor-operation paths in the touched files.

---

## 6. Safe redirects (legacy URLs)

- In **proxy.ts**: any request to  
  `/staff/branch/:branchId/clinic/doctors/profile/:segment`  
  with `segment` in:  
  `schedule-board`, `service-assignment`, `availability`, `performance`, `credentials`, `audit-logs`, `approvals`, `certifications`, `licenses`, `overview`, `package-assignment`  
  is **307-redirected** to  
  `/staff/branch/:branchId/clinic/doctors/:segment`.  
  So old bookmarks or links to “profile/schedule-board” etc. land on the correct branch-wide page.

---

## 7. Remaining compile / runtime blockers

- **None identified.** All links use existing routes or redirects. Profile page exists at `profile/[doctorId]` and expects numeric `doctorId` (memberId); “View profile” and “Full profile” pass member id correctly.
- **Package assignment:** Page exists; “Assign packages” remains in the dropdown and points at `packageAssignment(branchId)`. Not in the sidebar by design; no change.

---

## 8. Quick verification (branchId = 5)

- Sidebar: Overview, Doctors, Schedule Board, Availability, Service Assignment, Pending Approvals, Credential Review, Certifications, Licenses, Performance & Earnings, Audit Logs → all use `doctorOperationsRoutes` and resolve to the routes above.
- Table row actions (Doctors list): View profile, Manage schedule, Assign services, Assign packages → all use helpers; profile and package-assignment pages exist.
- Doctor360Drawer: Full profile, Schedule board, Assign services, Edit schedule, Review credentials, Performance & earnings, Audit log → all use helpers.
- Legacy URLs: e.g. `/staff/branch/5/clinic/doctors/profile/schedule-board` → redirects to `/staff/branch/5/clinic/doctors/schedule-board`.

No 404s or dead menu items should remain for Doctor Operations when using the sidebar, dropdowns, drawer, and overview links.
