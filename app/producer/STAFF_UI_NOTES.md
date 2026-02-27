# Producer Panel — Staff & Access Control UI

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
| Permission labels | `app/producer/_lib/permissionLabels.js` (human-readable titles/descriptions) |
| API helper     | `app/producer/_lib/producerApi.js` |
| Permissions map| `app/producer/_lib/producerPermissions.js` (producer-only) |

**Permissions view:** The "View permissions" modal shows human-readable titles and descriptions (from `permissionLabels.js`), grouped by category (Organization, KYC, Staff, Products, Batch, Codes, Verification, Analytics). Raw permission keys are not shown as primary text; they are stored in `data-permission-key` for tests and optionally in a dev-only tooltip.

## Permission keys (RBAC)

The page uses **cached** `producerMe()` (single call, no infinite /me). Permissions are derived from `me.permissions` and `me.isProducerOwner` (returned by `GET /api/v1/producer/me`).

| Key | Where checked | Behavior |
|-----|----------------|----------|
| `producer.staff.read` | Page access | If user cannot read staff: full-page “Access Restricted” (no table). Fallback: `producer.org.read` also grants read. |
| `producer.staff.invite` | Invite CTA, Revoke invite | Invite button hidden if no permission. Revoke (invites tab) disabled with tooltip if no permission. |
| `producer.staff.invite.resend` | Invites tab Resend | Resend disabled with tooltip if no permission. |
| `producer.staff.update_role` | Members table Role dropdown, Drawer role | Role is read-only text if no permission. |
| `producer.staff.update_status` | Suspend/Enable/Disable, Drawer actions | Buttons disabled with tooltip if no permission. |

Owner (`me.isProducerOwner === true`) is treated as having all staff permissions.

## RBAC policy (enterprise)

Single policy applied across Members, Invites, and Drawer:

| Element | When not permitted | Behavior |
|--------|----------------------|----------|
| **Primary CTA** (Invite Staff) | `!canInvite` | **Hidden** (no button). |
| **Row / drawer actions** (Resend, Revoke, Role, Status, Remove) | Missing permission | **Disabled** with tooltip: "You don't have permission…". Layout stays stable. |
| **Tabs** | — | **Always visible.** Invites tab shows a read-only banner when user lacks invite permission: "You have read-only access to invitations." |
| **Bulk actions** | Missing permission | Bulk bar actions (Disable / Enable / Remove) **disabled** with same tooltip. |

No mixed patterns: primary CTA = hide; row/bulk = disable + tooltip; tabs = visible + optional banner.

## Backend

- `GET /api/v1/producer/me` returns `{ user, org, permissions, isProducerOwner }` (see backend docs).
- Staff endpoints unchanged; invite/role/status/remove remain owner-only on the server.
- When staff accepts an invite, the owner receives an in-app notification (type STAFF_INVITE, title “Staff accepted your invitation”) with `actionUrl: "/producer/staff"`. Owner can see it in any UI that lists `GET /api/v1/notifications` and follow the link to the Staff page.

## 403 handling

- **PRODUCER_PERMISSION_DENIED:** Inline alert + toast: “You don’t have permission to perform this action. Ask the owner to grant Staff permissions.” UI state unchanged (no crash).
- **PRODUCER_ORG_ACCESS:** Toast with org access message.

## Features

- **Layout:** ProducerPageShell, title “Staff & Access Control”, primary CTA “Invite Staff” (gated).
- **KPI cards:** Total, Active, Pending Invites, Disabled.
- **Tabs:** Members | Invites. Invites tab shows read-only banner when user lacks invite permission.
- **Filters (collapsible):** Search, Status, Role, Sort, Include removed (Members). Invite status filter (Invites).
- **Members table:** Checkbox column and bulk action bar (Disable / Enable / Remove, gated). Row click opens drawer. Role dropdown (gated), Status actions (gated), Remove (gated). Owner cannot disable/remove self (tooltip). DISABLED rows show only Enable.
- **Drawer:** Role capabilities (Preview), Quick actions (self excluded for Suspend/Disable/Remove), Recent activity with "Only staff events" filter, actor/timestamp/action and old→new when entityId is enriched.
- **Invites table:** Resend (including for expired), Copy link + "Expires in X days" after resend, Revoke with confirm. Expired badge and Resend allowed for expired invites.
- **Invite modal:** Email/phone format validation; after success: Copy link CTA and "Expires in X days" when API returns expiresAt.
- **Bulk actions:** Confirm modal for Disable/Enable/Remove; result modal with per-row failure summary on partial failures.
- **States:** Loading skeleton (cards + table), empty states, filtered empty, error banner with Retry, Access Restricted when !canRead.
