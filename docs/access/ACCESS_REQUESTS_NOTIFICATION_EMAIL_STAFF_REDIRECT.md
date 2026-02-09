# Access Requests, Notifications, Email, and Staff Redirect

## Overview

This document describes the implementation of:
- Owner notifications when staff requests branch access
- Email to Owner on access request
- Staff/manager post-login redirect to `/staff`
- Access requests page time formatting (English + relative)
- Staff Home page UX

---

## URLs

| Page | URL |
|------|-----|
| Owner access requests | http://localhost:3104/owner/access/requests |
| Staff Home (source of truth) | http://localhost:3100/staff |

---

## Backend Changes

### A1) Branch Access Request Event Hook

When a staff member requests branch access (`POST /api/v1/branch-access/request`):

- **Notification creation** for the organization Owner:
  - `type`: `STAFF_BRANCH_ACCESS_REQUEST`
  - `actionUrl`: `/owner/access/requests`
  - `dedupeKey`: `access_request_owner:${branchId}:${staffUserId}`
  - `metadata`: branchName, requesterEmail, role, permissionId

- **Notification count endpoint**: `GET /api/v1/notifications/unread-count`

**File**: `backend-api/src/api/v1/modules/branch_access/branch_access.controller.ts` (calls `notifyOwnerOfAccessRequest`)

### A2) Email to Owner

When an access request is created, an email is sent to the Owner’s email address:

- **Template**: `branchAccessRequest.html`
- **Content**: requester name, branch name, role, "Review Request" button
- **Link**: `http://localhost:3104/owner/access/requests` (or `OWNER_WEB_URL`)

**Env vars**:

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address (e.g. `BPA <noreply@example.com>`) |
| `OWNER_WEB_URL` | Owner app base URL (default `http://localhost:3104`) |

If SMTP is not configured, a warning is logged and the notification is still created.

---

## Frontend Changes

### B1) Owner Notification Bell

- **Location**: Top bar (MasterLayout)
- **API**: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`
- **Behavior**: Shows unread count; dropdown lists notifications including `STAFF_BRANCH_ACCESS_REQUEST`
- **Click**: Mark read → navigate to `actionUrl`
- **Deduplication**: Handled by backend `dedupeKey`

### B2) Access Requests Page Time Formatting

- **Page**: `/owner/access/requests`
- **Format**: English date + relative time (e.g. `Feb 6, 2026, 11:38 PM • 5 minutes ago`)
- **Library**: `date-fns` with `enUS` locale

---

## Auth and Routing

### C1) Post-Login Redirect

- **Staff/manager**: Redirect to `http://localhost:3100/staff`
- **Owner**: Redirect to owner dashboard (3104)
- **Sources**:
  - `lib/authRedirect.ts` – `getFallbackUrlForPanels` uses `/staff` for staff
  - `app/staff/login/page.tsx` – `defaultLandingPath="/staff"`
  - Backend `auth.controller.ts` – staff login `redirectPath = "/staff"`

### C2) Enter Branch from Staff Home

- **Approved**: Navigate to `/staff/branch/:branchId`
- **Pending**: Navigate to `/staff/branch/:branchId/waiting`
- **Rejected/Suspended/Expired**: Navigate to waiting page with status

---

## Staff Home Page (`/staff`)

- **Header**: "Select Branch" with status filter chips
- **Status chips**: All, Approved, Pending, Rejected, Suspended
- **Branch cards**: branchName, orgType, role, status badge
- **Actions**:
  - APPROVED → "Enter branch"
  - PENDING → "View request" (poll every 10s)
  - REJECTED/SUSPENDED → Show reason/hint
- **Continue shortcut**: If `lastActiveBranchId` exists and is approved, show "Continue"
- **Quick links**: Staff Home, My profile

`/staff/branches` redirects to `/staff`.

---

## Test Steps

### 1. Staff/manager login redirect

1. Log in as staff or branch manager.
2. Confirm redirect to `http://localhost:3100/staff`.

### 2. Access request notification and email

1. As staff, request access to a branch.
2. As Owner, confirm:
   - Bell shows unread count.
   - Bell dropdown lists the access request.
   - Email is received (if SMTP configured) with "Review Request" link.

### 3. Access requests page formatting

1. Go to `/owner/access/requests`.
2. Confirm timestamps in English with relative time (e.g. "Feb 6, 2026, 11:38 PM • 5 minutes ago").

### 4. Staff Home flow

1. Log in as staff.
2. Confirm Staff Home shows branch cards with status.
3. Select APPROVED branch → enter branch.
4. Select PENDING branch → view request / waiting page.
5. If you have `lastActiveBranchId`, confirm "Continue" shortcut appears.

---

## Files Touched

### Backend

- `src/api/v1/services/branchAccessNotification.service.ts` – Owner email, review link
- `src/api/v1/modules/auth/auth.controller.ts` – Staff `redirectPath = "/staff"`
- `src/utils/emailTemplates/branchAccessRequest.html` – `{{reviewUrl}}` variable

### Frontend

- `app/owner/branches/access-requests/page.jsx` – English date + relative time
- `app/staff/page.jsx` – Staff Home (new)
- `app/staff/branches/page.jsx` – Redirects to `/staff`
- `app/staff/login/page.tsx` – `defaultLandingPath="/staff"`
- `lib/authRedirect.ts` – Staff fallback path `/staff`
- `src/masterLayout/MasterLayout.jsx` – Notification bell for staff
- `src/components/NotificationBell.jsx` – Path-aware "View all" link
