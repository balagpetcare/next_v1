# BPA Clinic System – Enterprise Dashboard Layout Refactor

## Overview

The BPA Clinic System UI was refactored to a premium enterprise SaaS dashboard layout: full-width workspace, shared layout components, and consistent spacing and states across staff, owner, clinic, and doctor pages.

## Shared Layout Architecture

### AppShell

- **LarkonDashboardShell** (`src/larkon-admin/components/layout/LarkonDashboardShell.tsx`): Unchanged structure. Content area now has class `bpa-app-workspace` in addition to `page-content`. Children are still wrapped in `container-fluid` for full width.
- **PageWorkspace**: New full-width wrapper used by each page. Replaces all `container py-24` usage. Provides consistent padding (1.5rem / 2rem on md+) and 12-column grid context.

### Shared Dashboard Components

All live under `src/components/dashboard/` and are exported from `src/components/dashboard/index.ts`:

| Component | Purpose |
|-----------|---------|
| **PageWorkspace** | Full-width page wrapper; replaces `container py-24`. |
| **PageHeader** | Title, optional subtitle, breadcrumbs, optional stats, actions. |
| **StatCard** | KPI card with label, value, icon, optional loading/onClick. |
| **FilterBar** | Wrapper for filter controls + optional reset. |
| **SectionCard** | Card with optional title/subtitle/actions and body. |
| **DataTableWrapper** | Card + table-responsive + optional loading/empty state. |
| **EmptyState** | Icon + title + description + optional action. |
| **StickyActionBar** | Sticky bottom bar for primary actions. |
| **DetailDrawer** | Right-side Offcanvas for entity preview. |
| **LoadingState** | Centered spinner + message. |
| **ErrorState** | Alert with optional retry. |

### Styling

- **dashboard-workspace.scss** (`src/components/dashboard/dashboard-workspace.scss`): Workspace padding, page header, filter bar, stat card hover, sticky action bar z-index, detail drawer width, empty/loading min-height.
- Imported from `src/larkon-ui/styles/dashboard-overrides.scss`, which is loaded in each `(larkon)` layout.

## Pages Updated

### Staff clinic (branch-scoped)

- **Doctors**: `app/staff/(larkon)/branch/[branchId]/clinic/doctors/page.tsx` – PageWorkspace, PageHeader, LoadingState, ErrorState, 12-col layout.
- **Doctors sub-pages**: invite, assign-existing, approvals, availability, credentials, package-assignment, service-assignment, schedule-board, [doctorId] – all use PageWorkspace + LoadingState and no longer use `container py-24`.
- **Catalog**: PageWorkspace, PageHeader, LoadingState; breadcrumbs and actions in header.
- **Analytics, Billing, Rooms, Settlement**: PageWorkspace, PageHeader, LoadingState, SectionCard.

### Owner

- **Approvals**: `app/owner/(larkon)/approvals/page.tsx` – PageWorkspace, shared PageHeader, SectionCard, ErrorState. No longer uses owner-specific PageHeader or raw card.

## Patterns

1. **No fixed-width content wrappers**: Pages do not use `container py-24` or other max-width containers; they use `PageWorkspace` for full-width content with standard padding.
2. **12-column grid**: Main content is wrapped in `<div className="row g-0"><div className="col-12">` inside PageWorkspace where a single column is needed; use Bootstrap grid (e.g. `col-lg-8`) for multi-column layouts.
3. **Loading**: Use `<PageWorkspace><LoadingState message="..." /></PageWorkspace>` for initial context loading.
4. **Errors**: Use `<ErrorState message={...} onRetry={...} />` for inline errors.
5. **Empty**: Use `<EmptyState title="..." description="..." action={...} />` or pass `emptyState` into DataTableWrapper.

## Right-Side Detail Drawer

Use `DetailDrawer` from `@/src/components/dashboard` for quick entity preview (e.g. doctor, catalog item). Example:

```tsx
<DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Doctor" subtitle="Profile">
  {children}
</DetailDrawer>
```

## Responsive Behavior

- Workspace padding and layout use Bootstrap breakpoints (e.g. increased padding from 768px).
- Sidebar and topbar remain as in LarkonDashboardShell (existing vertical/top nav).
- Tables use `table-responsive`; cards and filters wrap with `flex-wrap` and `gap-*`.

## Business Logic

All existing business logic (API calls, permissions, branch context, forms, tables) is unchanged. Only layout wrappers, headers, and shared UI components were introduced or swapped.
