# Clinic Visits — focused QA bug hunt (staff module)

**Canonical spec:** [CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md](./CLINIC_VISITS_ENTERPRISE_MODULE_PLAN.md)

## Bugs found and fixed

| # | Symptom | Cause | Fix |
|---|---------|-------|-----|
| 1 | Rows missing on the “to” date; summary vs list off-by-one day | `toDate` from `<input type="date">` was parsed as midnight UTC start-of-day, so `createdAt <= toDate` excluded most of that calendar day | Backend: `visitQueryFromDate` / `visitQueryToDateInclusive` for `YYYY-MM-DD` (UTC day bounds) on list, export, and summary |
| 2 | Drawer showed thinner visit than detail (appointment/cases) | Drawer used list-row payload only | On open, `staffClinicVisitGet` merges full visit; `drawerDetailLoading` shows skeleton |
| 3 | “Wrong counts” / support tickets | Status KPI chips reflect date range only, not doctor/search/unpaid | `VisitSummaryCards` copy (desktop + compact mobile) explains scope |
| 4 | Stale queue/billing after complete on detail | Secondary fetches did not re-run after completion | `secondaryRefreshKey` bumps after successful `staffClinicVisitComplete` |
| 5 | Stale list after completing in another tab/window | No refresh on return | `visibilitychange` listener (4s throttle) refetches list + summary |
| 6 | Queue timeline missing when tickets exist but no events | UI hid entire block | Detail + drawer always show queue section: loading / events / “tickets, no events” / empty |
| 7 | `Pet #null` / `Patient #null` | Fallback used template when id missing | Use `—` when `petId` / `patientId` is null |
| 8 | Doctor filter empty names | API shape `user.profile.displayName` not mapped | `staffClinicDoctors` maps `d.user?.profile?.displayName` |
| 9 | Date/time inconsistent (list vs detail vs drawer) | Mixed `toLocaleString()` variants | Shared `formatVisitDateTime()` (short date + short time) |
| 10 | Drawer overflow on narrow phones | Fixed 440px width | `width: min(440px, calc(100vw - 24px))` |
| 11 | React list keys for payment lines | `serviceId` possibly undefined | Stable key `serviceId` or `pay-${idx}` |
| 12 | CSV vs list date range | Same root cause as #1 | Fixed with inclusive `toDate` on server |

## Files changed

- `backend-api/src/api/v1/modules/clinic/clinic.controller.ts` — inclusive date parsing for visits list, export, summary
- `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/_lib/formatVisitDateTime.js` — new
- `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/page.jsx` — drawer fetch, loading, visibility refresh, shared datetime
- `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/[visitId]/page.jsx` — secondary refresh, queue UX, null-safe names, datetime, payment keys
- `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/_components/VisitDetailDrawer.jsx` — queue states, datetime, width
- `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/visits/_components/VisitSummaryCards.jsx` — scope copy (responsive)
- `bpa_web/lib/api.ts` — doctor displayName fallback
- `bpa_web/docs/CLINIC_VISITS_QA_BUG_HUNT.md` — this note

## Unresolved / edge cases

- **UTC vs branch-local “calendar day”**: Date-only params are interpreted as **UTC** midnight→end. If the product must anchor to branch timezone, add branch TZ and use a shared date-range helper end-to-end.
- **Visibility refresh**: Throttled to 4s; very quick tab flips may not refetch. Navigating away and back still remounts the list in normal App Router flows.
- **Summary vs filtered total**: By design, “In date range” ≠ table row count when extra filters apply; copy explains this but training may still be needed.
- **CSV datetime cells**: ISO strings from the server may still look different from on-screen locale formatting when opened in Excel.
