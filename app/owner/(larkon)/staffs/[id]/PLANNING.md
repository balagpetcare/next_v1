# Staff Detail Page Improvement Plan

## Current State Analysis
- Very basic implementation with Tailwind classes (not WowDash)
- Simple information display (Membership, User)
- Basic Disable/Delete buttons
- No breadcrumbs or proper navigation
- No links to related entities (Branch, Organization)
- Missing timestamps and metadata
- No proper loading/error states
- Not using existing components (PageHeader, StatusBadge, etc.)

## Improvement Plan

### 1. Page Header & Navigation
- ✅ Add breadcrumbs: Home > Staffs > [Staff Name]
- ✅ Use PageHeader component with proper title and subtitle
- ✅ Add action buttons: Edit, Disable, Delete, Refresh, Back
- ✅ Show staff ID and status badge in header

### 2. Information Sections (Cards)
- **Overview Card**
  - Staff name with avatar/initials
  - Role badge
  - Status badge
  - Quick stats/info
  
- **Membership Information Card**
  - Organization (with link)
  - Branch (with link)
  - Role
  - Status
  - Created date
  - Updated date (if available)
  - Membership ID

- **User Profile Card**
  - Display name / Full name
  - Username
  - Email (with mailto link)
  - Phone (with tel link)
  - User ID
  - Profile completion status

- **Activity/History Card** (if available)
  - Last login
  - Activity log
  - Notes

### 3. Action Buttons
- Edit Staff (link to edit page)
- Activate/Disable (toggle based on status)
- Delete (with confirmation)
- View Branch (link to branch detail)
- View Organization (link to org detail)
- Refresh
- Back to List

### 4. UI/UX Improvements
- Use WowDash patterns (radius-12, mb-24, etc.)
- Use StatusBadge component
- Use PageHeader component
- Better loading states with spinner
- Better error handling with alerts
- Responsive design
- Consistent spacing and colors
- Icons for all actions

### 5. Additional Features
- Link to branch detail page
- Link to organization detail page
- Show related information (branch team link)
- Timestamps (created, updated)
- Better formatting for dates
- Copy to clipboard for IDs
- Better empty state handling

### 6. Code Quality
- Use ownerApi helper functions
- Use entityConfig for paths
- Consistent error handling
- Proper TypeScript types
- Follow BPA_STANDARD.md

## Implementation Priority
1. Replace Tailwind with WowDash patterns
2. Add PageHeader with breadcrumbs
3. Create comprehensive information cards
4. Add action buttons with proper links
5. Improve loading/error states
6. Add links to related entities
7. Add timestamps and metadata

## Files to Modify
- `app/owner/staffs/[id]/page.jsx` - Main page component

## Components to Use
- `PageHeader` from `@/app/owner/_components/shared/PageHeader`
- `StatusBadge` from `@/app/owner/_components/StatusBadge`
- `ownerGet`, `ownerPatch`, `ownerDelete` from `@/app/owner/_lib/ownerApi`
- `getEntityConfig` from `@/app/owner/_lib/entityConfig`
