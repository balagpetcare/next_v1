# Staff Edit Page Planning

## Current State Analysis
- Edit page does not exist (404 error)
- Staff detail page exists and shows staff information
- System allows updating staff via PATCH endpoint
- Branch team page shows updating member role and status
- Staff detail page shows updating status

## What Can Be Edited
Based on system analysis:
1. **Role** - BRANCH_MANAGER, BRANCH_STAFF, SELLER, DELIVERY_MANAGER, DELIVERY_STAFF
2. **Status** - ACTIVE, SUSPENDED, PENDING
3. **Branch Assignment** - May be editable (needs verification)

## Improvement Plan

### 1. Page Structure
- Route: `/owner/staffs/[id]/edit`
- Use similar pattern to branch edit page
- Breadcrumbs: Home > Staffs > [Staff Name] > Edit
- PageHeader with title and subtitle

### 2. Form Fields
- **Role Selection**
  - Dropdown with available roles
  - Show current role selected
  - Role options based on branch type (Delivery Hub vs Regular Branch)
  - Help text explaining role permissions

- **Status Selection**
  - Dropdown: ACTIVE, SUSPENDED
  - Show current status
  - Warning when changing to SUSPENDED

- **Branch Assignment** (if editable)
  - Dropdown with available branches
  - Show current branch
  - May require additional permissions

### 3. Form Layout
- Single card with form
- Clear section headers
- Inline validation
- Save/Cancel buttons
- Loading states

### 4. Actions
- Save button (primary)
- Cancel button (navigate back to detail page)
- Reset button (revert to original values)
- View Detail link

### 5. Validation
- Role is required
- Status is required
- Show confirmation for status changes (especially to SUSPENDED)
- Validate branch assignment if editable

### 6. Success/Error Handling
- Success message after save
- Redirect to detail page on success
- Error messages for failed updates
- Loading states during save

### 7. UI/UX
- Use WowDash patterns (radius-12, mb-24, etc.)
- Use form components from system
- Responsive design
- Clear labels and help text
- Icons for actions

### 8. Additional Features
- Show current values clearly
- Show what changed (diff view optional)
- Confirmation dialog for critical changes
- Link to view detail page
- Link to branch detail if branch is assigned

## Implementation Priority
1. Create edit page structure
2. Add form fields (Role, Status)
3. Implement save functionality
4. Add validation
5. Add success/error handling
6. Add navigation and links
7. Polish UI/UX

## API Endpoints
- GET `/api/v1/owner/staffs/{id}` - Load staff data
- PATCH `/api/v1/owner/staffs/{id}` - Update staff
- GET `/api/v1/owner/branches` - Load branches for selection (if branch editable)

## Files to Create
- `app/owner/staffs/[id]/edit/page.jsx` - Main edit page component

## Components to Use
- `PageHeader` from `@/app/owner/_components/shared/PageHeader`
- `StatusBadge` from `@/app/owner/_components/StatusBadge`
- `ownerGet`, `ownerPatch` from `@/app/owner/_lib/ownerApi`
- `getEntityConfig` from `@/app/owner/_lib/entityConfig`
