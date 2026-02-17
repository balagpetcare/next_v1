# Staff New/Invite Page Planning

## Current State Analysis
- `/owner/staffs/new` route doesn't exist
- Route is being caught by `[id]` dynamic route, causing "Invalid id" error
- Staff list page has link to `/owner/staffs/new` with "Add / Invite" button
- Branch team page has invite functionality that works well
- Staff are invited to branches, not created standalone

## System Understanding
- Staff members are invited to branches via `/api/v1/owner/branches/{branchId}/members/invite`
- Invite requires: role, phone (optional), email (optional), displayName (optional)
- At least phone OR email is required
- Role options depend on branch type (Delivery Hub vs Regular Branch)
- After invite, staff member appears in branch team

## Improvement Plan

### 1. Page Structure
- Route: `/owner/staffs/new` (must be created before `[id]` route)
- PageHeader with breadcrumbs: Home > Staffs > Invite Staff
- Clear title and subtitle explaining the purpose

### 2. Form Fields
- **Branch Selection** (Required)
  - Dropdown with all available branches
  - Show branch name and organization
  - Required field
  - Help text: "Select the branch where this staff member will work"

- **Role Selection** (Required)
  - Dropdown with role options
  - Role options change based on selected branch type
  - If Delivery Hub: DELIVERY_MANAGER, DELIVERY_STAFF
  - If Regular Branch: BRANCH_MANAGER, BRANCH_STAFF, SELLER
  - Required field

- **Contact Information**
  - Phone (optional but at least phone or email required)
  - Email (optional but at least phone or email required)
  - Display Name (optional)
  - Help text: "At least phone or email is required"

### 3. Form Layout
- Single form card
- Branch selection at top
- Role selection (updates based on branch)
- Contact information section
- Clear validation messages
- Submit button

### 4. Validation
- Branch is required
- Role is required
- At least phone or email is required
- Show clear error messages
- Inline validation

### 5. Success/Error Handling
- Success message after invite
- Show invite details (expires at, dev token if applicable)
- Option to invite another or go to branch team
- Error messages for failed invites
- Loading states during submission

### 6. UI/UX
- Use WowDash patterns (radius-12, mb-24, etc.)
- Responsive design
- Clear labels and help text
- Icons for actions
- Branch info display when selected
- Role help text explaining permissions

### 7. Additional Features
- Link to view all staffs
- Link to branch detail after selection
- Link to branch team page
- Option to invite multiple staff (future enhancement)
- Show branch type info when selected

## Implementation Priority
1. Create new page structure
2. Add branch selection dropdown
3. Add role selection (dynamic based on branch)
4. Add contact information fields
5. Implement invite functionality
6. Add validation
7. Add success/error handling
8. Add navigation links

## API Endpoints
- GET `/api/v1/owner/branches` - Load all branches for selection
- GET `/api/v1/owner/branches/{branchId}` - Get branch details (for role options)
- POST `/api/v1/owner/branches/{branchId}/members/invite` - Invite staff member

## Files to Create
- `app/owner/staffs/new/page.jsx` - Main invite page component

## Components to Use
- `PageHeader` from `@/app/owner/_components/shared/PageHeader`
- `ownerGet`, `ownerPost` from `@/app/owner/_lib/ownerApi`
- `getEntityConfig` from `@/app/owner/_lib/entityConfig`

## Important Notes
- This page must be created in `app/owner/staffs/new/` directory
- The route `/owner/staffs/new` will take precedence over `/owner/staffs/[id]`
- Staff are always invited to a specific branch
- Role options depend on branch type
