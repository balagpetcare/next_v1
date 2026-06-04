# Staff Portal Implementation Report

**Project:** `D:\BPA_Data\bpa_web`  
**Date:** 2026-06-02  
**Scope:** BPA 2026 Vaccination Campaign — Staff Portal only

---

## Summary

The mobile-first staff vaccination portal is implemented under `/staff/campaign/*`. It reuses existing BPA staff authentication (`/staff/login` → shared login with `app=staff`), the staff layout auth guard, React Bootstrap UI patterns, and campaign APIs at `/api/v1/campaign/staff/*` and `/api/v1/campaign/public/*`. No public landing page, Flutter app, or backend service changes were made.

---

## Required features

| # | Feature | Route / component | Status |
|---|---------|-------------------|--------|
| 1 | Staff login access | `/staff/login` + `app/staff/layout.jsx` auth guard | Done |
| 2 | Campaign staff dashboard | `/staff/campaign` | Done |
| 3 | QR scanner | `/staff/campaign/scan` — `BarcodeDetector` + manual entry | Done |
| 4 | Manual token search | `/staff/campaign/lookup` | Done |
| 5 | Booking details screen | `/staff/campaign/booking/[id]` | Done |
| 6 | Pet vaccination screen | `/staff/campaign/vaccinate/[bookingId]` | Done |
| 7 | Rabies complete action | Quick action on vaccinate screen | Done |
| 8 | Cat Flu complete action | Quick action on vaccinate screen | Done |
| 9 | Vaccination notes | Notes field (500 chars) on vaccinate form | Done |
| 10 | Vaccination history | `/staff/campaign/history` + `VaccinationHistory` on booking | Done |
| 11 | Certificate generate action | Auto on `POST /staff/vaccinations/record` | Done |
| 12 | Certificate preview | `CertificatePreview` modal on certificate page | Done |
| 13 | Certificate download | `campaignCertificatePdfDownload()` (base64 PDF API) | Done |
| 14 | Vaccination status timeline | `VaccinationStatusTimeline` on booking page | Done |

---

## Routes

| Path | Purpose |
|------|---------|
| `/staff/login` | Staff login (redirects to shared login) |
| `/staff/campaign` | Dashboard — stats, quick actions, campaign/location picker |
| `/staff/campaign/setup` | Select location for active campaign |
| `/staff/campaign/scan` | QR scanner + manual token entry |
| `/staff/campaign/lookup` | Manual booking ref / QR token search |
| `/staff/campaign/history` | Queue + recent vaccinations |
| `/staff/campaign/booking/[id]` | Booking details, check-in, timeline |
| `/staff/campaign/vaccinate/[bookingId]` | Pet vaccination + Rabies/Cat Flu quick actions |
| `/staff/campaign/certificate/[bookingId]` | Certificate preview & PDF download |

**Note:** Dynamic segments use **booking reference** (`VAC-…`) for compatibility with staff booking API lookup.

---

## Key files

### Pages

- `app/staff/(larkon)/campaign/**`
- `app/staff/layout.jsx` — auth guard
- `app/staff/login/page.jsx` — staff login entry

### Components

- `src/bpa/campaign/staff/CampaignStaffShell.jsx` — mobile header + bottom nav (max-width 640px)
- `src/bpa/campaign/staff/VaccinationStatusTimeline.jsx`
- `src/bpa/campaign/staff/VaccinationHistory.jsx`
- `src/bpa/campaign/staff/CertificatePreview.jsx`
- `src/bpa/campaign/staff/vaccineHelpers.js` — Rabies / Cat Flu matching
- `src/bpa/campaign/staff/recentBookings.js` — session recent-booking cache

### API client

- `lib/campaignApi.ts` — staff/public campaign helpers, certificate PDF download, queue summary

---

## API mapping

| UI action | HTTP |
|-----------|------|
| Staff auth | `GET /api/v1/auth/me` (cookies) |
| List campaigns (picker) | `GET /campaign/public/campaigns` |
| Campaign + vaccine types | `GET /campaign/public/campaigns/:slug` |
| Validate QR | `POST /campaign/staff/qr/validate` |
| Get booking | `GET /campaign/staff/bookings/:refOrToken` |
| Check-in | `POST /campaign/staff/check-in` |
| Location queue | `GET /campaign/staff/locations/:id/queue` |
| Record vaccination | `POST /campaign/staff/vaccinations/record` |
| Certificate data | `GET /campaign/public/certificates/:token` |
| Certificate PDF | `GET /campaign/public/certificates/:token/pdf` |

Staff context (campaign + location) is stored in `localStorage` key `bpa_campaign_ctx`.

---

## Mobile-first design

- Bottom navigation on primary screens (Home, Scan, Lookup, History)
- Touch-friendly buttons (`btn-lg`, `py-3`)
- Centered content column (`max-width: 640px`) for phones and tablets
- Camera QR scan with viewfinder overlay; fallback manual entry when camera or `BarcodeDetector` unavailable
- Sticky header with back navigation on detail flows

---

## Auth & permissions

- Reuses existing staff cookie session and `/staff/login` flow
- Menu entry: `permissionMenu.ts` → **Vaccination Campaign** → `/staff/campaign`
- Backend enforces `CampaignStaff` RBAC on staff mutations (`canCheckIn`, `canRecordVaccination`, `canManageQueue`)

---

## Reuse checklist

| Capability | Source |
|------------|--------|
| Staff login | `app/staff/login/page.jsx`, shared `/login?app=staff` |
| Auth guard | `app/staff/layout.jsx` |
| API layer | `lib/api.ts` |
| UI | React Bootstrap 5 |
| Icons | Remix Icon (`ri-*`) |
| Notifications | `NotificationContainer` in staff layout |

---

## Known limitations

- QR auto-scan requires browser support for `BarcodeDetector` (common on Android Chrome)
- PDF download depends on backend puppeteer; falls back with user message if PDF unavailable
- History “recent vaccinations” uses client-side recent-booking cache plus staff booking fetches (no dedicated staff list endpoint)
- Staff phone lookup is not exposed by backend; search is by booking ref or QR token only

---

## Test plan

1. Sign in at `/staff/login` → redirect to `/staff/campaign`
2. Select campaign + location on setup
3. Dashboard shows queue waiting / in-progress counts
4. Scan or lookup booking → booking details with timeline
5. Check in confirmed booking → queue number shown
6. Vaccinate pet via Rabies or Cat Flu quick action → certificate token returned
7. Open certificate page → preview modal + download PDF
8. History page shows queue and recent completed pets
9. Verify 401 without staff session; 403 without `CampaignStaff` assignment

---

## Related docs

- `D:\BPA_Data\backend-api\docs\vaccination-campaign-2026\13-staff-portal-design.md`
- `D:\BPA_Data\backend-api\docs\vaccination-campaign-2026\09-vaccination-workflow.md`
- `D:\BPA_Data\backend-api\docs\vaccination-campaign-2026\10-certificate-design.md`
- `docs/vaccination-campaign-2026/WEB-IMPLEMENTATION-REPORT.md` (admin + prior staff notes)
