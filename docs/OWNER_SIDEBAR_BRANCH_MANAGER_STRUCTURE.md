# Owner Panel Sidebar – Full Branch Manager Structure (2026-02-18)

## Overview

The Owner panel (port 3104) sidebar uses the full Branch Manager structure so both Owners and Branch Managers see all branch-scoped modules. Menu source: `src/lib/permissionMenu.ts`.

## Menu Source and Flow

1. **Source:** `CORE_OWNER_FALLBACK` in `src/lib/permissionMenu.ts`
2. **Flow:** `VerticalNavigationBar` → `getMenuItems` → `getPanelMenuItems` → `getFullMenu('owner')` → returns `CORE_OWNER_FALLBACK`
3. **Role logic:** Owner uses `CORE_OWNER_FALLBACK` directly; no permission filtering at menu level. Branch Managers see the same menu. API-level permissions enforce access on the backend.

## Sidebar Structure (CORE_OWNER_FALLBACK)

| Section | Children | Target Routes |
|---------|----------|---------------|
| **Dashboard** | — | `/owner/dashboard` |
| **Operations** | Appointments, POS, Orders | Appointments/POS → `/owner/dashboards/branch-manager`, Orders → `/owner/orders` |
| **Medical** | Patients, Prescriptions, Treatments | All → `/owner/dashboards/branch-manager` |
| **My Business** | Organizations, Branches, Staffs | `/owner/organizations`, `/owner/branches`, `/owner/staffs` |
| **People** | Staff, Customers | Staff → `/owner/staff`, Customers → `/owner/dashboards/branch-manager` |
| **Access & Staff** | Access Requests, Staff, Access Control, Access Map | `/owner/access/*`, `/owner/staff` |
| **Requests & Approvals** | Inbox, Product Requests, Inventory Transfers, etc. | Various |
| **Inventory** | Products, Stock, Vendors, Warehouse, Stock Requests, etc. | Products → `/owner/products`, Stock → `/owner/inventory`, Vendors → `/owner/vendors` |
| **Products** | Catalog, All Products, New Product, Approvals, etc. | Various |
| **Finance** | — | `/owner/finance` |
| **Reports** | Sales, Stock, Revenue | `/owner/reports/*` |
| **Audit & System** | — | `/owner/audit` |
| **Settings** | Profile | `/owner/settings` |
| **Teams & Delegation** | Team dashboard, Teams, Overview | `/owner/team`, `/owner/teams`, `/owner/overview` |
| **Notifications** | — | `/owner/notifications` |

## Placeholder Routes

These items currently point to `/owner/dashboards/branch-manager` (Branch Manager dashboard). Dedicated pages can be added later:

- Operations → Appointments, POS
- Medical → Patients, Prescriptions, Treatments
- People → Customers

## Changes Made

- **Added:** Operations (Appointments, POS, Orders), Medical (Patients, Prescriptions, Treatments), People (Staff, Customers)
- **Inventory:** Products, Stock, Vendors with explicit routes (`/owner/products`, `/owner/inventory`, `/owner/vendors`)
- **Reports:** Sales, Stock, Revenue
- **Settings:** Profile with `required: []` so Branch Managers can access
- **Removed duplicate:** Top-level Orders (Orders is under Operations only)

## REGISTRY vs CORE_OWNER_FALLBACK

- **CORE_OWNER_FALLBACK:** Used for Owner sidebar; auth-only, no permission checks.
- **REGISTRY.owner:** Used when `buildMenu(app, permissions)` is called; applies `required` permission keys. Both were updated for consistency.

## Files Touched

| File | Change |
|------|--------|
| `src/lib/permissionMenu.ts` | Extended CORE_OWNER_FALLBACK and REGISTRY.owner with Operations, Medical, People; Inventory (Products, Stock, Vendors); Reports; Settings; removed duplicate Orders. |
