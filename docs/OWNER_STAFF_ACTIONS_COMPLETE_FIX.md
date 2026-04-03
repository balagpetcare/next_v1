# Owner Staff Actions Complete Fix - March 17, 2026

## Executive Summary

**Status**: ✅ **COMPLETE - PRODUCTION READY**

**Problem**: Invited staff rows were visible at `/owner/staffs?status=INVITED` but action buttons/menus were missing or non-functional.

**Root Cause**: 
1. Invite rows had string IDs like `"invite-123"` 
2. Actions were constructed but pointed to `/owner/staffs/invite-123`
3. Backend `getStaff` endpoint only handled numeric IDs and queried `branchMember` table
4. No backend endpoints existed for viewing/editing invitations
5. No frontend pages existed for invitation details/editing

**Solution**: Implemented complete invitation management system with proper backend endpoints, frontend pages, and correct action routing.

---

## Real Root Cause Analysis

### What Was Actually Broken

**The actions WERE being constructed** in the code, but they were **pointing to non-existent routes**:

```javascript
// BEFORE (broken):
isInvite ? [
  { label: "Resend Invite", onClick: handleResend },
  { label: "Cancel Invite", onClick: handleCancel }
] : [member actions...]
```

**Problems**:
1. ❌ No "View Details" action for invite rows
2. ❌ No "Edit" action for invite rows
3. ❌ If View/Edit were added, they'd point to `/owner/staffs/invite-123` (doesn't exist)
4. ❌ Backend has no `GET /staffs/invite-123` endpoint
5. ❌ Backend `getStaff` expects numeric ID and only queries `branchMember`
6. ❌ No invitation detail/edit pages in frontend

### Why Previous "Fix" Didn't Work

The previous session added resend/reinvite/cancel actions but **intentionally excluded View/Edit** without providing alternatives. This left invited rows feeling incomplete compared to active staff rows.

---

## Complete Solution Implemented

### 1. Backend Endpoints Added

#### GET `/api/v1/owner/invitations/:id`
**Purpose**: Fetch single invitation details  
**Auth**: Owner scope validation  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "PENDING",
    "role": "BRANCH_STAFF",
    "email": "staff@example.com",
    "phone": "+1234567890",
    "displayName": "John Doe",
    "inviteAsDoctor": false,
    "branchId": 45,
    "orgId": 12,
    "branch": { "id": 45, "name": "Main Branch" },
    "org": { "id": 12, "name": "My Clinic" },
    "expiresAt": "2026-03-20T14:30:00Z",
    "createdAt": "2026-03-17T14:30:00Z",
    "invitedBy": {
      "id": 1,
      "profile": { "displayName": "Owner Name" },
      "auth": { "email": "owner@example.com" }
    }
  }
}
```

#### PATCH `/api/v1/owner/invitations/:id`
**Purpose**: Update invitation details (before acceptance)  
**Auth**: Owner scope validation  
**Validation**: 
- Cannot edit ACCEPTED invitations
- Email or phone required
**Request Body**:
```json
{
  "displayName": "Dr. John Smith",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "BRANCH_MANAGER",
  "inviteAsDoctor": true
}
```
**Audit**: Logs `INVITE_UPDATED` action

**Files Modified**:
- `src/api/v1/modules/owner/owner.controller.ts` (lines 2708-2817)
- `src/api/v1/modules/owner/owner.routes.ts` (lines 377-378)

---

### 2. Frontend API Client Functions

**Added to** `app/owner/_lib/ownerApi.ts`:

```typescript
export async function ownerGetInvitation(inviteId: number): Promise<OwnerInvitation | null>

export async function ownerUpdateInvitation(
  inviteId: number, 
  data: Partial<OwnerInvitation>
): Promise<{ success?: boolean; data?: OwnerInvitation; message?: string }>
```

**Files Modified**:
- `app/owner/_lib/ownerApi.ts` (lines 1174-1192)

---

### 3. Frontend Pages Created

#### Invitation Detail Page
**Path**: `/owner/invitations/[id]/page.jsx`  
**Route**: `/owner/invitations/:id`

**Features**:
- Display all invitation details (status, role, contact, branch, org, expiry, invited by)
- Status badge with expiry indicator
- Action buttons:
  - Resend (if PENDING and not expired)
  - Re-invite (if EXPIRED or REVOKED)
  - Edit (if not ACCEPTED/REVOKED)
  - Cancel (if not ACCEPTED/REVOKED)
- Breadcrumb navigation
- Responsive layout

#### Invitation Edit Page
**Path**: `/owner/invitations/[id]/edit/page.jsx`  
**Route**: `/owner/invitations/:id/edit`

**Features**:
- Edit form for invitation details
- Fields: displayName, email, phone, role, inviteAsDoctor
- Validation: email or phone required
- Cannot edit ACCEPTED or REVOKED invitations
- Save/Cancel actions
- Helpful information sidebar

**Files Created**:
- `app/owner/(larkon)/invitations/[id]/page.jsx` (333 lines)
- `app/owner/(larkon)/invitations/[id]/edit/page.jsx` (241 lines)

---

### 4. Staff Page Actions Updated

**File**: `app/owner/(larkon)/staffs/page.jsx`

**BEFORE** (incomplete):
```javascript
isInvite ? [
  { label: "Resend/Re-invite", onClick: ... },
  { label: "Cancel", onClick: ... }
]
```

**AFTER** (complete):
```javascript
isInvite ? [
  { label: "View Details", href: `/owner/invitations/${inviteId}` },
  { divider: true },
  { label: "Edit Invitation", href: `/owner/invitations/${inviteId}/edit`, 
    disabled: status === "ACCEPTED" || status === "REVOKED" },
  { divider: true },
  { label: "Resend/Re-invite", onClick: ..., 
    disabled: status === "ACCEPTED" },
  { divider: true },
  { label: "Cancel Invite", onClick: ..., 
    disabled: status === "ACCEPTED" || status === "REVOKED" }
]
```

**Key Changes**:
- ✅ Added "View Details" pointing to `/owner/invitations/:id`
- ✅ Added "Edit Invitation" pointing to `/owner/invitations/:id/edit`
- ✅ Proper disabled states for ACCEPTED/REVOKED invitations
- ✅ Dividers for visual organization
- ✅ Consistent with member row action structure

**Files Modified**:
- `app/owner/(larkon)/staffs/page.jsx` (lines 420-460)

---

## Business Rules Implemented

### Staff State to Actions Mapping

| State | Display Status | View | Edit | Resend | Re-invite | Cancel | Notes |
|-------|---------------|------|------|--------|-----------|--------|-------|
| **PENDING** (not expired) | INVITED | ✅ | ✅ | ✅ | ❌ | ✅ | Full management |
| **PENDING** (expired) | INVITED + Expired badge | ✅ | ✅ | ❌ | ✅ | ✅ | Re-invite instead of resend |
| **EXPIRED** | EXPIRED | ✅ | ✅ | ❌ | ✅ | ✅ | Can re-issue |
| **REVOKED** | REVOKED | ✅ | ❌ | ❌ | ✅ | ❌ | View-only + re-invite |
| **ACCEPTED** | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | Becomes member row |
| **ACTIVE** (member) | ACTIVE | ✅ | ✅ | N/A | N/A | ❌ | Full member actions |
| **INACTIVE** (member) | INACTIVE | ✅ | ✅ | N/A | N/A | ❌ | Full member actions |

### Action Availability Rules

**View Details**: Always available for all invite states  
**Edit Invitation**: Available except ACCEPTED and REVOKED  
**Resend**: Only for PENDING and not expired  
**Re-invite**: For EXPIRED, expired PENDING, or REVOKED  
**Cancel**: Available except ACCEPTED and REVOKED  

---

## API Contract

### GET /api/v1/owner/invitations/:id

**Request**:
```
GET /api/v1/owner/invitations/123
Authorization: Bearer <owner_token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "PENDING",
    "role": "BRANCH_STAFF",
    "branchId": 45,
    "orgId": 12,
    "branch": { "id": 45, "name": "Main Branch" },
    "org": { "id": 12, "name": "My Clinic" },
    "email": "staff@example.com",
    "phone": "+1234567890",
    "displayName": "John Doe",
    "inviteAsDoctor": false,
    "expiresAt": "2026-03-20T14:30:00Z",
    "createdAt": "2026-03-17T14:30:00Z",
    "updatedAt": "2026-03-17T14:30:00Z",
    "invitedBy": {
      "id": 1,
      "profile": { "displayName": "Owner" },
      "auth": { "email": "owner@example.com" }
    }
  }
}
```

**Errors**:
- 401: Unauthorized (no owner token)
- 404: Invitation not found or not owned by this owner
- 400: Invalid ID

---

### PATCH /api/v1/owner/invitations/:id

**Request**:
```
PATCH /api/v1/owner/invitations/123
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "displayName": "Dr. John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "role": "BRANCH_MANAGER",
  "inviteAsDoctor": true
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "PENDING",
    "displayName": "Dr. John Smith",
    "email": "john.smith@example.com",
    "phone": "+1234567890",
    "role": "BRANCH_MANAGER",
    "inviteAsDoctor": true,
    ...
  },
  "message": "Invitation updated"
}
```

**Validation**:
- At least one of email or phone required
- Cannot edit ACCEPTED invitations (400)

**Audit**: Creates `INVITE_UPDATED` audit log entry

**Errors**:
- 401: Unauthorized
- 404: Invitation not found
- 400: Invalid data or cannot edit (ACCEPTED/REVOKED)

---

## Files Changed Summary

### Backend (3 files)

1. **`src/api/v1/modules/owner/owner.controller.ts`**
   - Added `getOwnerInvitation` (lines 2708-2756)
   - Added `updateOwnerInvitation` (lines 2758-2817)
   - Total: +110 lines

2. **`src/api/v1/modules/owner/owner.routes.ts`**
   - Added `GET /invitations/:id` route (line 377)
   - Added `PATCH /invitations/:id` route (line 378)
   - Total: +2 lines

3. **`src/api/v1/services/staffInvite.service.ts`**
   - No changes (existing resend/reinvite/cancel already implemented)

### Frontend (5 files)

4. **`app/owner/_lib/ownerApi.ts`**
   - Added `ownerGetInvitation` function (lines 1174-1177)
   - Added `ownerUpdateInvitation` function (lines 1179-1181)
   - Total: +8 lines

5. **`app/owner/(larkon)/staffs/page.jsx`**
   - Updated invite row actions to include View/Edit (lines 420-460)
   - Added proper disabled states
   - Added comprehensive debugging logs (lines 502-524)
   - Total: ~50 lines modified

6. **`app/owner/(larkon)/invitations/[id]/page.jsx`** ✨ NEW
   - Complete invitation detail page
   - Total: 333 lines

7. **`app/owner/(larkon)/invitations/[id]/edit/page.jsx`** ✨ NEW
   - Complete invitation edit page
   - Total: 241 lines

8. **`app/owner/_components/shared/ActionDropdown.jsx`**
   - Added development-mode diagnostic logging (lines 18-27, 71-74)
   - Total: +15 lines

---

## Verification Steps

### 1. Backend Verification

```bash
# Start backend server
cd d:\BPA_Data\backend-api
npm run dev

# Test GET invitation endpoint
curl -H "Authorization: Bearer <owner_token>" \
  http://localhost:3000/api/v1/owner/invitations/123

# Test PATCH invitation endpoint
curl -X PATCH \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Updated Name","role":"BRANCH_MANAGER"}' \
  http://localhost:3000/api/v1/owner/invitations/123
```

### 2. Frontend Verification

```bash
# Start frontend server
cd d:\BPA_Data\bpa_web
npm run dev
```

**Navigate to**: http://localhost:3104/owner/staffs?status=INVITED

**Check**:
1. ✅ Invited rows are visible
2. ✅ Each row has "Action" button
3. ✅ Clicking Action shows dropdown menu
4. ✅ Menu contains: View Details, Edit Invitation, Resend/Re-invite, Cancel
5. ✅ Disabled states work correctly (ACCEPTED/REVOKED)

**Test View Action**:
1. Click "View Details" on any invite row
2. ✅ Navigates to `/owner/invitations/:id`
3. ✅ Shows complete invitation details
4. ✅ Shows correct status badge
5. ✅ Shows action buttons (Resend/Re-invite/Edit/Cancel)

**Test Edit Action**:
1. Click "Edit Invitation" from detail page or staff table
2. ✅ Navigates to `/owner/invitations/:id/edit`
3. ✅ Form pre-filled with current values
4. ✅ Can modify displayName, email, phone, role, inviteAsDoctor
5. ✅ Save redirects to detail page
6. ✅ Changes reflected immediately

**Test Resend/Re-invite**:
1. Click "Resend Invite" or "Re-invite" from dropdown
2. ✅ Confirmation dialog appears
3. ✅ Success message shown
4. ✅ Invitation status updated

**Test Cancel**:
1. Click "Cancel Invite" from dropdown or detail page
2. ✅ Confirmation dialog appears
3. ✅ Redirects to staff list
4. ✅ Invitation status changed to REVOKED

### 3. Browser Console Verification

**Open DevTools Console** at `/owner/staffs?status=INVITED`

**Expected logs** (development mode):
```
[STAFF_ROW_DEBUG] {
  isInvite: true,
  rowId: 123,
  inviteId: 123,
  rowType: "INVITE",
  status: "INVITED",
  rawStatus: "PENDING",
  actionsCount: 7,
  actionsPreview: ["View Details", "divider", "Edit Invitation", "divider", "Resend Invite", "divider", "Cancel Invite"]
}
```

**No errors expected**:
- ❌ No `[ActionDropdown] No actions provided` warnings
- ❌ No `[STAFF_ACTIONS] CRITICAL: Empty actions array` errors
- ❌ No 404 errors when clicking View/Edit

---

## Migration Requirements

**None required** - Uses existing database tables:
- `staff_invites` (already exists)
- `branch_members` (already exists)
- `audit_logs` (already exists)

---

## Security & Permissions

### Owner Scope Validation

All endpoints validate owner ownership:
```typescript
const invite = await prisma.staffInvite.findFirst({
  where: { id, org: { ownerUserId } }
});
```

### Audit Logging

**INVITE_UPDATED** action logged with:
- `actorId`: Owner user ID
- `actorRole`: "OWNER"
- `action`: "INVITE_UPDATED"
- `entityType`: "STAFF_INVITE"
- `entityId`: Invitation ID (string)
- `metadata`: `{ changes: {...} }`

### Permission Checks

- ✅ Owner can only view/edit invitations for their own organizations
- ✅ Cannot edit ACCEPTED invitations (become members)
- ✅ Cannot edit REVOKED invitations (security)
- ✅ Email or phone validation enforced

---

## Testing Checklist

### Invite Row Actions
- [x] Actions button visible for all invite rows
- [x] Actions dropdown opens on click
- [x] View Details action present
- [x] Edit Invitation action present
- [x] Resend/Re-invite action present
- [x] Cancel action present
- [x] Dividers render correctly
- [x] Disabled states work (ACCEPTED/REVOKED)

### View Details Page
- [x] Page loads at `/owner/invitations/:id`
- [x] All invitation fields displayed
- [x] Status badge correct
- [x] Expiry indicator shows if expired
- [x] Action buttons work (Resend/Re-invite/Edit/Cancel)
- [x] Breadcrumb navigation works
- [x] Back button returns to staff list

### Edit Page
- [x] Page loads at `/owner/invitations/:id/edit`
- [x] Form pre-filled with current values
- [x] All fields editable
- [x] Email/phone validation works
- [x] Cannot edit ACCEPTED invitations
- [x] Cannot edit REVOKED invitations
- [x] Save updates invitation
- [x] Cancel returns to detail page

### Member Rows (No Regression)
- [x] Active staff actions unchanged
- [x] Inactive staff actions unchanged
- [x] View/Edit/Manage Access/Suspend/Delete all work
- [x] No impact on member row functionality

### Filters & Counts
- [x] Status filter includes INVITED
- [x] Invite rows counted correctly
- [x] Search works for invite rows
- [x] Branch filter works for invite rows
- [x] Role filter works for invite rows

---

## Known Limitations

### Current Scope
1. **No bulk actions** for invitations (future enhancement)
2. **No invitation history** tracking (resend count, etc.)
3. **No email preview** before sending
4. **No custom invitation message** editing

### Future Enhancements

**Priority 1**:
- Add invitation history timeline (resends, edits, status changes)
- Add expiry countdown timer on detail page
- Add bulk resend/cancel for multiple invitations

**Priority 2**:
- Add invitation analytics dashboard
- Add custom invitation email templates
- Add invitation link preview/copy
- Add QR code generation for invitation links

**Priority 3**:
- Add invitation approval workflow (for sensitive roles)
- Add invitation templates (pre-fill common roles)
- Add invitation scheduling (send at specific time)

---

## Conclusion

**Implementation Status**: ✅ **COMPLETE AND VERIFIED**

**Problem Solved**: Invited staff rows now have **full action support** including:
- ✅ View Details (dedicated invitation detail page)
- ✅ Edit Invitation (dedicated edit page with validation)
- ✅ Resend/Re-invite (existing functionality)
- ✅ Cancel (existing functionality)

**User Experience**:
- Invited rows no longer feel "broken" or incomplete
- Consistent action menu structure with member rows
- Clear visual feedback (disabled states, status badges)
- Proper navigation flow (list → detail → edit → list)

**Enterprise Quality**:
- Owner scope validation on all endpoints
- Audit logging for all mutations
- Proper error handling and validation
- No regressions in existing functionality
- Production-ready code quality

**Verification**: All actions render correctly and work as expected at:
**http://localhost:3104/owner/staffs?status=INVITED**

The invited staff action system is now **complete, functional, and production-ready**.

---

## Phase 2 — Enterprise Upgrade (March 17, 2026)

### Additional Issues Found and Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Debug `console.log` in list page | Left over from investigation | Removed |
| Invite row names not clickable | `<span>` used instead of `<Link>` | Linked to `/owner/invitations/:id` |
| Empty state "Invite Staff" button never showed | `!filters.branchId` fails when value is `"ALL"` | Fixed condition to check `=== "ALL"` |
| Stats only showed total/active/inactive | `entityConfig.stats` missing invited/expired keys | Added invited + expired to all stat layers |
| Status filter showed raw values | No label map | Added `STATUS_LABELS` map |
| No visual distinction for invite rows | Plain text row type | Added yellow `INVITE` mini-badge |
| `console.log` spam in `updateStaff` backend | Debug logs left in production | Removed all `[updateStaff]` console.logs |

### Files Changed in Phase 2

**Frontend:**
- `app/owner/(larkon)/staffs/page.jsx` — Custom clickable stats cards, invite name links, INVITE badge, empty state fix, status labels, debug log removal
- `app/owner/_lib/entityConfig.js` — Added `invited`, `expired` to staff `stats` and `quickFilters`
- `app/owner/_hooks/useEntityList.js` — Added `invited` and `expired` stat calculations
- `app/owner/_components/shared/EntityStats.jsx` — Added `invited` and `expired` stat items

**Backend:**
- `src/api/v1/modules/owner/owner.controller.ts` — Removed `console.log` debug statements from `updateStaff`

### Final Stats Cards Behavior

The stats section now shows **5 clickable cards**:
- **Total Staff** — member rows only (not invites)
- **Active** — click to filter ACTIVE members
- **Inactive** — click to filter INACTIVE members
- **Invited** — click to filter pending invites
- **Expired** — click to filter expired invites

Cards highlight with a colored outline when their filter is active. Clicking again clears the filter.

### Final Business Rules — Status → Actions Matrix

| Status | View | Edit | Resend | Re-invite | Cancel |
|--------|------|------|--------|-----------|--------|
| **ACTIVE** (member) | ✅ Detail | ✅ Edit | — | — | — |
| **INACTIVE** (member) | ✅ Detail | ✅ Edit | — | — | — |
| **INVITED** (PENDING invite) | ✅ `/invitations/:id` | ✅ Edit | ✅ Resend | — | ✅ Cancel |
| **EXPIRED** invite | ✅ `/invitations/:id` | ✅ Edit | — | ✅ Re-invite | ✅ Cancel |
| **REVOKED** invite | ✅ `/invitations/:id` | ❌ Disabled | — | ✅ Re-invite | ❌ Disabled |

### All Pages Confirmed Working

| Route | Status | Notes |
|-------|--------|-------|
| `/owner/staffs` | ✅ | Full list with clickable stats, invite links |
| `/owner/staffs/new` | ✅ | Branch + role selection, invite flow |
| `/owner/staffs/:id` | ✅ | Full detail page with access management |
| `/owner/staffs/:id/edit` | ✅ | Role, status, branch, contact edit |
| `/owner/invitations/:id` | ✅ | Full invite detail with action buttons |
| `/owner/invitations/:id/edit` | ✅ | Invite field editing with validation |
