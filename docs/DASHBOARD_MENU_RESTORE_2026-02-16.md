# Dashboard Menu Restore (Larkon) — 2026-02-16

Restored full sidebar menus and profile dropdown links for all non-admin panels (owner, shop, clinic, mother, producer, country, staff) in the Larkon dashboard, using WowDash menu definitions as reference only. No WowDash UI components were re-enabled.

---

## 1. Route mapping (old → new)

URLs remain **`/<panel>/<path>`**. "Old" = WowDash (same URLs). "New" = served by Larkon under `app/<panel>/(larkon)/*`.

| Panel   | Old (WowDash)     | New (Larkon)                    | Notes |
|---------|-------------------|----------------------------------|-------|
| owner   | `/owner/*`        | `app/owner/(larkon)/*`          | Same path; layout/menu from Larkon |
| shop    | `/shop/*`         | `app/shop/(larkon)/*`            | `/shop` → `/shop/dashboard` redirect |
| clinic  | `/clinic/*`       | `app/clinic/(larkon)/*`         | `/clinic` → `/clinic/dashboard` redirect |
| mother  | `/mother/*`       | `app/mother/(larkon)/*`         | `/mother` → `/mother/dashboard` (menu normalize) |
| producer| `/producer/*`     | `app/producer/(larkon)/*`       | Same paths |
| country | `/country/*`      | `app/country/(larkon)/*`        | Same paths |
| staff   | `/staff/*`        | `app/staff/(larkon)/*`          | Same paths |
| admin   | `/admin/*`        | Larkon MENU_ITEMS (unchanged)   | Admin keeps existing Larkon menu |

Redirects (unchanged): `/owner` → `/owner/dashboard`, `/shop` → `/shop/dashboard`, `/clinic` → `/clinic/dashboard`, `/country` → `/country/dashboard`.

---

## 2. Per-panel menu item list

Menus are built from `src/lib/permissionMenu.ts`: **owner** uses `CORE_OWNER_FALLBACK` (full tree, no permission filter in Larkon sidebar); all other panels use `REGISTRY[app]`. Icons and grouping match WowDash as closely as possible.

### Owner (basePath `/owner`)

- **Dashboard** — `/owner/dashboard`
- **My Business** (section)
  - Organizations — `/owner/organizations` (All, New)
  - Branches — `/owner/branches` (All, New)
  - Staffs — `/owner/staffs` (All, Invite)
- **Access & Staff** (section)
  - Access Requests, Staff, Access Control, Access Map
- **Requests & Approvals** (section)
  - Inbox, Product Requests, Inventory Transfers/Adjustments, Returns, Cancellations, Notifications
- **Inventory** (section)
  - Overview, Warehouse, Stock Requests, Transfers, Receipts, Adjustments, Batches
- **Products** (section)
  - Catalog, All Products, New, Approvals, Product Requests, Inventory, Stock Requests, Transfers, Returns
- **Finance** — `/owner/finance`
- **Audit & System** — `/owner/audit`
- **Teams & Delegation** (section) — Team dashboard, Teams, Overview
- **Notifications** — `/owner/notifications`

### Shop (basePath `/shop`)

- Dashboard — `/shop/dashboard` (normalized from `/shop`)
- POS — `/shop/pos`
- Seller Dashboard — `/shop/dashboards/seller`
- Orders — `/shop/orders`
- Inventory — `/shop/inventory`
- Products — `/shop/products`
- Customers — `/shop/customers`
- Staff — `/shop/staff`

### Clinic (basePath `/clinic`)

- Dashboard — `/clinic/dashboard` (normalized from `/clinic`)
- Services — `/clinic/services`
- Clinic Staff Dashboard — `/clinic/dashboards/staff`
- Appointments — `/clinic/appointments`
- Patients — `/clinic/patients`
- Staff — `/clinic/staff`

### Mother (basePath `/mother`)

- Home — `/mother/dashboard` (normalized from `/mother`)

### Producer (basePath `/producer`)

- Dashboard — `/producer/dashboard`
- KYC / Verification — `/producer/kyc`
- Products — `/producer/products`
- Batches — `/producer/batches`

### Country (basePath `/country`)

- **Dashboard** (section) — `/country/dashboard`
- **Operations** (section) — Adoptions, Donations, Fund Raising, Clinics, Petshops, Foster Care, Rescue Teams, Shelter Homes
- **Moderation & Support** (section) — Content Moderation, Support Tickets
- **Organizations & People** (section) — Organizations, Country Staff, Invites
- **Compliance & Reports** (section) — Compliance Center, Reports, Audit Logs
- **Settings** (section) — Feature Toggles, Policy Rules, Profile

### Staff (basePath `/staff`)

- Branches — `/staff/branches`
- Workspace — `/staff/workspace`

---

## 3. Profile dropdown links (panel-specific)

| Panel   | Profile        | Settings              | Support            | Logout       |
|---------|----------------|------------------------|--------------------|-------------|
| admin   | `/admin/settings` | `/admin/settings`   | `/admin/support`   | `/admin/logout` |
| country | `/country/profile` | `/country/settings/features` | `/country/support` | `/api/logout` |
| owner   | `/owner/settings`  | `/owner/settings`   | `/owner/notifications` | `/owner/logout` |
| staff   | `/staff/branches`  | `/staff/branches`   | —                  | `/api/logout` |
| shop, clinic, producer, mother | `/<panel>/profile` | `/<panel>/settings` | `/<panel>/notifications` | `/api/logout` |

---

## 4. Files changed summary

| File | Change |
|------|--------|
| `src/larkon-admin/helpers/Manu.ts` | `getMenuItems(basePath)` now calls `getPanelMenuItems(path)` for non-admin panels; falls back to minimal menu only when panel has no full menu. |
| `src/larkon-admin/menu/panelMenus.ts` | **New.** Maps basePath → AppKey, uses `getFullMenu(app)` from `../../lib/permissionMenu`, converts to Larkon `MenuItemType[]`; normalizes `/shop`, `/clinic`, `/mother` to dashboard. |
| `src/larkon-admin/components/layout/TopNavigationBar/components/ProfileDropdown.tsx` | Replaced generic links with panel-specific `getProfileDropdownLinks(basePath)`: Profile, Settings, Support (where applicable), Logout. Removed Messages, Pricing, Lock screen. |
| `src/lib/permissionMenu.ts` | (Already updated earlier) `getFullMenu(app)`, `AppKey` includes `staff`, `REGISTRY.staff` and `appKeyFromPath` for `/staff`. |
| `docs/DASHBOARD_MENU_RESTORE_2026-02-16.md` | This document. |

---

## 5. Verification

- **Menu links**: Each sidebar item uses the same URL as in the table; pages are under `app/<panel>/(larkon)/*`; any missing route may 404 until the corresponding page exists.
- **Redirects**: `/<panel>` → `/<panel>/dashboard` for owner, shop, clinic, country (existing `app/<panel>/page.tsx` redirects).
- **Build**: Run `npm run build` in `bpa_web` to confirm no TypeScript or import errors.
