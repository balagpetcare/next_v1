# Producer Panel — Staff Management UI

**Route:** `/producer/staff` (Producer Panel, port 3105)

## Routes and files

| Purpose        | Path / file |
|----------------|-------------|
| Staff page     | `app/producer/(larkon)/staff/page.jsx` |
| Invite modal   | `app/producer/(larkon)/staff/components/InviteStaffModal.jsx` |
| Role confirm   | `app/producer/(larkon)/staff/components/ConfirmRoleModal.jsx` |
| Status confirm | `app/producer/(larkon)/staff/components/ConfirmStatusModal.jsx` |
| Remove confirm | `app/producer/(larkon)/staff/components/ConfirmRemoveModal.jsx` |
| Permissions    | `app/producer/(larkon)/staff/components/PermissionsModal.jsx` |
| API helper     | `app/producer/_lib/producerApi.js` |
| Permissions map| `app/producer/_lib/producerPermissions.js` (producer-only) |

## Backend endpoints used

All under base `/api/v1/producer` (no backend changes; existing API only).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET    | `/staff` | List staff (returns array of staff with user, role, inviter, status) |
| POST   | `/staff` | Invite staff (body: `email?`, `phone?`, `roleKey`) |
| PATCH  | `/staff/:staffId/role` | Update role (body: `roleKey`) |
| PATCH  | `/staff/:staffId/status` | Suspend/activate (body: `status`: `ACTIVE` \| `SUSPENDED`) |
| DELETE | `/staff/:staffId` | Remove staff |

Auth: cookie-based; producer scope enforced on backend. Only ACTIVE staff can use producer APIs; invite/role/status/remove are owner-only.

## Sidebar

Staff is registered in `src/lib/permissionMenu.ts` under `REGISTRY.producer` as:

- id: `producer.staff`
- label: Staff
- href: `/producer/staff`
- icon: `solar:users-group-two-rounded-bold-duotone`
- required: `["producer.org.read"]`

Producer layout uses Larkon dashboard shell; menu items come from `getFullMenu("producer")` in `src/larkon-admin/menu/panelMenus.ts`.

## Features

- Summary cards: Total, Active, Suspended, Invited
- Search by name / email / phone
- Filters: Status, Role
- Sort: Newest first / Oldest first
- Table: Staff (initials + name), Email/Phone, Role (dropdown → confirm), Status badge, Joined date, Actions (View permissions, Suspend/Activate, Remove)
- Invite modal: Email, Phone (one required), Role
- Role change: Select new role → confirmation modal → PATCH role
- Status: Suspend / Activate with confirmation
- Remove: Confirmation; cannot remove self
- Permissions modal: Role and permissions (from API or `producerPermissions.js`)
- Activity tab: Placeholder (“Activity log is not available yet”)
- 401: Redirect to `/producer/login`
- Loading skeleton, empty state, error state with Retry

## Access

Only users with producer context (owner or staff with `producer.org.read`) can open the staff page. Owner-only actions (invite, role, status, remove) are enforced by the backend; the UI does not change backend rules.
