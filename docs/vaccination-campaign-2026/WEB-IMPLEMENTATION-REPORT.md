# Web Implementation Report — Phases I & J

**Project:** `D:\BPA_Data\bpa_web`  
**Date:** 2026-06-02  
**Scope:** Campaign Administration (Phase I) + Staff Vaccination Portal (Phase J)

---

## Summary

Phase I and Phase J are implemented in `bpa_web` using the existing Larkon admin shell, staff auth layout, `lib/api` fetch layer, React Bootstrap patterns, and shared admin components (`AdminPageShell`, `DataTable`, `AdminFiltersBar`). No new UI framework or auth system was introduced.

Backend integration targets `/api/v1/campaign/*` (registered in `backend-api` Phase 2 audit).

---

## Phase I — Campaign Administration

### Routes (admin)

| Path | Purpose |
|------|---------|
| `/admin/campaigns` | Campaign list + status filter |
| `/admin/campaigns/new` | Create campaign |
| `/admin/campaigns/[id]` | Campaign dashboard (stats, lifecycle) |
| `/admin/campaigns/[id]/edit` | Campaign settings form |
| `/admin/campaigns/[id]/bookings` | Bookings table + pagination |
| `/admin/campaigns/[id]/vaccinations` | Vaccination stats |
| `/admin/campaigns/[id]/certificates` | Certificate lookup (ref/token) |
| `/admin/campaigns/[id]/reports` | Summary / daily / vaccine reports (JSON export) |
| `/admin/campaigns/[id]/locations` | Location list + quick add |

### Key files

- `lib/campaignApi.ts` — Admin + public + staff API client
- `src/bpa/campaign/admin/CampaignForm.tsx`
- `src/bpa/campaign/admin/CampaignNav.tsx`
- `src/bpa/campaign/admin/CampaignStatusBadge.tsx`
- `app/admin/(larkon)/campaigns/**`

### Navigation

- `src/lib/permissionMenu.ts` — **Vaccination Campaign** section under admin
- `src/larkon-admin/menu/adapters/adminRouteMap.ts` — `IMPLEMENTED_ADMIN_HREFS` entries

### Auth / permissions

- Uses existing admin cookie session (`/admin/layout.tsx` → `/api/v1/admin/auth/me`).
- Admin API calls use `/api/v1/campaign/admin/*` (requires `campaign.manage` on backend).
- Menu items use `required: []` so whitelisted admins see links; API still enforces permissions.

---

## Phase J — Staff Vaccination Portal

### Routes (staff, mobile-first)

| Path | Purpose |
|------|---------|
| `/staff/campaign` | Home — select campaign/location, quick actions |
| `/staff/campaign/setup` | Pick location (public campaign API) |
| `/staff/campaign/scan` | QR scan (`BarcodeDetector` + manual token/ref) |
| `/staff/campaign/lookup` | Booking reference / token lookup |
| `/staff/campaign/booking/[id]` | Booking detail, check-in, vaccinate links |
| `/staff/campaign/vaccinate` | Index hint |
| `/staff/campaign/vaccinate/[bookingId]` | Vaccination form + pre-check |
| `/staff/campaign/certificate/[bookingId]` | Certificate links / print |

### Key files

- `src/bpa/campaign/staff/CampaignStaffShell.jsx` — Mobile header + bottom nav
- `app/staff/(larkon)/campaign/**`
- Staff context in `localStorage` key `bpa_campaign_ctx` (campaign + location)

### Navigation

- `permissionMenu.ts` — **Vaccination Campaign** item under staff panel

### Auth

- Reuses `app/staff/layout.jsx` → `/api/v1/auth/me` (cookies).
- Staff mutations use `/api/v1/campaign/staff/*` (JWT + `CampaignStaff` RBAC on backend).
- Campaign/location picker uses **public** APIs (`/campaign/public/campaigns`) so staff without `campaign.manage` can still operate.

---

## API mapping

| UI action | HTTP |
|-----------|------|
| List/create/edit campaigns | `GET/POST/PATCH /campaign/admin/campaigns` |
| Stats / reports | `GET .../stats`, `.../daily-summary`, `.../vaccination-stats` |
| Bookings | `GET .../campaigns/:id/bookings` |
| Locations | `GET .../locations`, `POST /campaign/admin/locations` |
| Staff check-in | `POST /campaign/staff/check-in` |
| Staff booking | `GET /campaign/staff/bookings/:id` |
| QR validate | `POST /campaign/staff/qr/validate` |
| Record vaccination | `POST /campaign/staff/vaccinations/record` |
| Certificate | `GET /campaign/public/certificates/:token` |
| Public campaign picker | `GET /campaign/public/campaigns`, `.../:slug` |

---

## Reuse checklist

| Capability | Reused from |
|------------|-------------|
| Admin layout / sidebar | Larkon `(larkon)/layout.tsx` |
| Tables / filters | `AdminPageShell`, `DataTable`, `AdminFiltersBar` |
| Forms | Bootstrap + `CampaignForm` (same stack as admin tickets/medicine) |
| Notifications | Staff `NotificationContainer` in `app/staff/layout.jsx` |
| Clinic vaccination patterns | Stat cards, pre-check list, syringe nav icon (`ri:syringe-line`) |
| API | `lib/api.ts` (`apiGet`, `apiPost`, `apiPatch`, credentials) |

---

## Prerequisites

1. **Backend** campaign router mounted (`/api/v1/campaign`).
2. **DB migration** applied for campaign tables.
3. **Admin users** granted `campaign.manage` (or whitelisted admin) for admin writes.
4. **Campaign staff** rows in `CampaignStaff` for staff JWT users at each location.
5. **Public campaigns** `ACTIVE` + `PUBLIC` for staff picker and vaccine type list.

---

## Known limitations

- QR scanner uses native `BarcodeDetector` where available; otherwise manual entry only (no extra npm QR library).
- Admin certificate search loads bookings client-side for ref lookup (no dedicated admin search endpoint).
- Staff queue stats depend on `getTodayQueue` response shape from backend.
- Walk-in registration UI not included in J scope (check-in + vaccinate + certificates covered).

---

## Testing suggestions

1. Admin: create campaign → add location → activate → view dashboard stats.
2. Admin: open bookings list with status filters.
3. Staff: select campaign/location → scan or lookup booking → check-in → record vaccination → open certificate URL.
4. Verify 403 without `campaign.manage` on admin APIs and without `CampaignStaff` on staff APIs.

---

## Related docs

Planning specs: `D:\BPA_Data\backend-api\docs\vaccination-campaign-2026\` (especially `12-web-admin-design.md`, `13-staff-portal-design.md`).  
Backend audit: `PHASE-2-AUDIT.md` in the same folder.
