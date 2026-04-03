# Owner Staff Management — Architecture & Status

## Overview

The Owner Panel Staff Management system (`/owner/staffs`) provides a unified interface for managing both **BranchMember** rows (active staff) and **StaffInvite** rows (pending invitations) across all organizations owned by the authenticated user.

## Pages

| Route | File | Purpose |
|---|---|---|
| `/owner/staffs` | `app/owner/(larkon)/staffs/page.jsx` | List page: combined members + invites, filters, stats, actions |
| `/owner/staffs/[id]` | `app/owner/(larkon)/staffs/[id]/page.jsx` | Staff detail (BranchMember by ID) |
| `/owner/staffs/[id]/edit` | `app/owner/(larkon)/staffs/[id]/edit/page.jsx` | Edit role, status, branch, contact info |
| `/owner/staffs/new` | `app/owner/(larkon)/staffs/new/page.jsx` | Invite new staff to a branch |
| `/owner/invitations/[id]` | `app/owner/(larkon)/invitations/[id]/page.jsx` | Invitation detail view |
| `/owner/invitations/[id]/edit` | `app/owner/(larkon)/invitations/[id]/edit/page.jsx` | Edit invitation fields |

## Backend Routes (owner.routes.ts)

### BranchMember CRUD (`/api/v1/owner/staffs`)
- `GET    /staffs` — list all members + pending invites (combined, sorted by createdAt desc)
- `POST   /staffs` — create staff (finds or creates user, then BranchMember)
- `GET    /staffs/:id` — get BranchMember detail + branchAccess
- `PATCH  /staffs/:id` — update role, status, branchId, displayName, email, phone
- `PATCH  /staffs/:id/disable` — set status to DISABLED
- `PATCH  /staffs/:id/enable` — set status to ACTIVE
- `DELETE /staffs/:id` — permanently delete BranchMember

### Invitations (`/api/v1/owner/invitations`)
- `GET    /invitations` — list invites (optionally filter by branchId, status)
- `GET    /invitations/:id` — get invite detail
- `PATCH  /invitations/:id` — update invite fields
- `POST   /invitations/:id/resend` — resend pending invite
- `POST   /invitations/:id/reinvite` — re-issue fresh link (expired/revoked/cancelled)
- `POST   /invitations/:id/cancel` — cancel pending invite

### Staff Control Dashboard (`/api/v1/owner/staff` — userId-based)
- `GET    /staff` — list staff (excludes org owners)
- `GET    /staff/:id` — detail by userId
- `PATCH  /staff/:id/status` — suspend or resume
- `PATCH  /staff/:id/role` — change role
- `PATCH  /staff/:id/permissions` — permission overrides
- `PATCH  /staff/:id/shift-rules` — login window
- `POST   /staff/:id/force-logout` — revoke sessions
- `POST   /staff/:id/transfer-branch` — move between branches
- `GET    /staff/:id/audit-logs` — audit trail
- `GET    /staff/:id/activity-summary` — 30-day activity

## Row Model (List Page)

Backend returns a combined array with two `rowType` values:

| Field | MEMBER | INVITE |
|---|---|---|
| `rowType` | `"MEMBER"` | `"INVITE"` |
| `rowKey` | `"member-{id}"` | `"invite-{id}"` |
| `id` | BranchMember.id | `"invite-{inviteId}"` |
| `inviteId` | — | StaffInvite.id |
| `status` | Normalized (`ACTIVE`/`INACTIVE`) | Mapped (`INVITED`/`EXPIRED`/`REVOKED`) |
| `rawStatus` | Original (`ACTIVE`/`DISABLED`/`SUSPENDED`) | Original (`PENDING`/`EXPIRED`/`REVOKED`) |
| `user` | User object | `null` |
| `invitedEmail` | — | From invite |
| `invitedPhone` | — | From invite |

## Status-to-Action Mapping

### Members
| Status | View | Edit | Manage Access | Toggle Status | Delete |
|---|---|---|---|---|---|
| ACTIVE | ✅ | ✅ | ✅ | → Suspend | ✅ |
| INACTIVE (DISABLED/SUSPENDED) | ✅ | ✅ | ✅ | → Activate | ✅ |

### Invitations
| Status | View | Edit | Resend | Re-invite | Cancel |
|---|---|---|---|---|---|
| PENDING (not expired) | ✅ | ✅ | ✅ | — | ✅ |
| PENDING (expired) | ✅ | ✅ | — | ✅ | ✅ |
| EXPIRED | ✅ | ✅ | — | ✅ | ✅ |
| REVOKED | ✅ | ❌ | — | ✅ | ❌ |
| ACCEPTED | ✅ | ❌ | — | ❌ | ❌ |
| CANCELLED | ✅ | ❌ | — | ✅ | ❌ |

## Key Files

### Frontend
- `app/owner/_lib/ownerApi.ts` — API client functions (types: `OwnerInvitation`, `StaffInviteRow`)
- `app/owner/_lib/entityConfig.js` — Entity config for staff (apiPath, columns, filters, stats)
- `app/owner/_hooks/useEntityList.js` — Generic list data hook
- `app/owner/_hooks/useEntityActions.js` — Generic CRUD actions hook
- `app/owner/_components/shared/ActionDropdown.jsx` — Portal-based action dropdown
- `app/owner/_components/StatusBadge.jsx` — Consistent status badge colors
- `app/owner/_components/staff/StaffDetailView.jsx` — Staff detail view component

### Backend
- `src/api/v1/modules/owner/owner.controller.ts` — listStaffs, getStaff, updateStaff, disable/enable/deleteStaff, createStaff
- `src/api/v1/modules/owner/owner.routes.ts` — Route definitions
- `src/api/v1/modules/owner/ownerStaffControl.controller.ts` — Staff Control Dashboard
- `src/api/v1/services/ownerStaffControl.service.ts` — Staff Control service layer

## Valid Roles
`OWNER`, `ORG_ADMIN`, `BRANCH_MANAGER`, `BRANCH_STAFF`, `SELLER`, `DELIVERY_MANAGER`, `DELIVERY_STAFF`
