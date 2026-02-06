# Owner Panel IA — Gap Map (PROMPT 0)

## Active Next.js app directory: **`app/`** (root)

- **Confirmed**: Next.js uses the root `app/` when both `app/` and `src/app/` exist. All Owner panel routes used in production (layout, staff-access, branches/access-requests, staffs, dashboard, kyc, etc.) live under **`bpa_web/app/owner/`**.
- **`src/app/owner/`** contains a smaller/alternate set of pages (e.g. staff, dashboard, organizations); do **not** add new Owner routes there. All new alias routes must go under **`app/owner/`**.

---

## Canonical IA route → existing route/file mapping

| IA route (canonical) | Existing route / file | Action |
|----------------------|------------------------|--------|
| `/owner` | `app/owner/page.jsx` | Keep; home |
| `/owner/dashboard` | `app/owner/dashboard/page.jsx` | Keep |
| `/owner/access/requests` | `app/owner/branches/access-requests/page.jsx` | **Alias** (re-export) |
| `/owner/access/requests/[requestId]` | `app/owner/staff-access/requests/[id]/page.jsx` | **Alias** (re-export) |
| `/owner/access/control` | `app/owner/staff-access/page.jsx` | **Alias** (re-export) |
| `/owner/staff` | `app/owner/staffs/page.jsx` | **Alias** (re-export) |
| `/owner/staff/[staffId]` | `app/owner/staffs/[id]/page.jsx` (or staff-access/staff/[userId]) | **Alias** (profile) |
| `/owner/branches` | `app/owner/branches/page.jsx` | Keep |
| `/owner/branches/new` | `app/owner/branches/new/page.jsx` | Keep |
| `/owner/branches/[branchId]` | `app/owner/branches/[id]/page.jsx` | Keep |
| `/owner/branches/[branchId]/staff` | `app/owner/branches/[id]/staff/page.jsx` | Keep |
| `/owner/branches/[branchId]/inventory` | `app/owner/branches/[id]/inventory/page.jsx` | Keep |
| `/owner/branches/[branchId]/reports` | `app/owner/branches/[id]/reports/page.jsx` | Keep |
| `/owner/staff-access` (legacy) | `app/owner/staff-access/page.jsx` | Keep (do not delete) |
| `/owner/staff-access/requests` | `app/owner/branches/access-requests/page.jsx` (re-export) | Keep |
| `/owner/staff-access/requests/[id]` | `app/owner/staff-access/requests/[id]/page.jsx` | Keep |
| `/owner/staffs` (legacy) | `app/owner/staffs/page.jsx` | Keep |
| `/owner/kyc` | `app/owner/kyc/page.jsx` | Keep |
| `/owner/organization/profile` | `app/owner/profile/page.jsx` or org profile | Alias or link |
| `/owner/settings` | `app/owner/settings/page.jsx` | Keep |
| `/owner/products`, `/owner/orders`, `/owner/transfers`, `/owner/returns`, `/owner/wallet`, `/owner/reports/*` | Existing under `app/owner/` | Keep; add IA aliases only if needed |

---

## Access Requests (list + detail)

- **List**: `app/owner/branches/access-requests/page.jsx` — full implementation; uses `GET /api/v1/owner/branch-access?status=...`, approve/reject in table.
- **Detail**: `app/owner/staff-access/requests/[id]/page.jsx` — full implementation; uses `GET /api/v1/owner/branch-access/:id`, approve/reject/suspend/remove.
- **Canonical aliases to add**: `app/owner/access/requests/page.jsx`, `app/owner/access/requests/[requestId]/page.jsx` (re-export from above).

---

## Staff directory + Access control

- **Staff directory**: `app/owner/staffs/page.jsx` — full list with filters (branch, role, status).
- **Access control hub**: `app/owner/staff-access/page.jsx` — cards to Staff directory, Pending requests, Access matrix.
- **Staff access by user**: `app/owner/staff-access/staff/page.jsx` (list), `app/owner/staff-access/staff/[userId]/page.jsx` (assign branch/role, approve, etc.).
- **Canonical aliases to add**: `app/owner/staff/page.jsx` → staffs list; `app/owner/access/control/page.jsx` → staff-access hub.

---

## High-risk gates

1. **KYC gate** (`app/owner/layout.jsx`): Redirects to `/owner/kyc` when verification status is not SUBMITTED/VERIFIED. Exceptions: auth routes, `/owner/kyc`, and (currently) branch team/dashboard routes. **New routes under `/owner/access/*` or `/owner/staff` must be allowed** if they should be reachable before KYC (or keep gate as-is so access requests are post-KYC).
2. **Owner panel gate**: Only users with `panels.owner === true` from `GET /api/v1/auth/me` may use `/owner/*`. No change needed for aliases.
3. **Layout guards**: No route renames; alias pages do not add new guards.

---

## Backend endpoints (no change required for aliases)

- Access: `GET/POST /api/v1/owner/branch-access`, `GET /api/v1/owner/branch-access/:id`, `POST .../approve|reject|suspend|remove`.
- Notifications: `GET /api/v1/owner/notifications?type=STAFF_BRANCH_ACCESS_REQUEST&unread=1`, `POST .../notifications/:id/read`.
- Dashboard: `GET /api/v1/owner/dashboard/metrics|alerts|recent-activity` (pending requests count can be added to metrics or alerts).

---

## Summary

- **Active app dir**: `app/` (root). All new Owner routes go in `app/owner/`.
- **Aliases to implement**: `/owner/access/requests`, `/owner/access/requests/[requestId]`, `/owner/access/control`, `/owner/staff` (and optionally `/owner/staff/[staffId]`).
- **Existing routes**: Left unchanged; aliases re-export or redirect.
