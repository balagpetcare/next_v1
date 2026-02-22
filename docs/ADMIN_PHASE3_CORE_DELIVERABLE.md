# Admin Phase 3 — Core Deliverable

**Date:** 2026-02-22  
**Branch (bpa_web):** work/admin-3103-phase3-core  
**Port:** 3103 (Larkon Admin)

---

## Summary

Phase 3 turns the admin stubs into real working modules for:

1. **Organizations** — list, search, filter, create, edit
2. **Users** — list, search, filter, create, activate/block
3. **Super Admin Whitelist** — list, add, remove (with confirm modal)
4. **Countries** — master data (list, create, edit)
5. **States** — master data (list, create, edit; filter by country)
6. **Branch Types** — master data (list, create/upsert, edit)

All pages use Larkon layout (PageTItle, Card, Row/Col, Table) and `@/lib/api` for API calls.

---

## Implemented Pages

| Route | File | Features |
|-------|------|----------|
| `/admin/organizations` | `app/admin/(larkon)/organizations/page.tsx` | Search, status filter, create (owner user picker), edit |
| `/admin/users` | `app/admin/(larkon)/users/page.tsx` | Search, status filter, create (email/phone, password), activate/block, link to Staff |
| `/admin/super-admin-whitelist` | `app/admin/(larkon)/super-admin-whitelist/page.tsx` | Search, add (email/phone), remove with confirm modal, security note |
| `/admin/countries` | `app/admin/(larkon)/countries/page.tsx` | Search, create (code 2 chars, name, currency, timezone), edit |
| `/admin/states` | `app/admin/(larkon)/states/page.tsx` | Search, country filter, create (country picker, code, name), edit |
| `/admin/branch-types` | `app/admin/(larkon)/branch-types/page.tsx` | Create/upsert by code, edit (nameEn, nameBn, description, isActive) |

---

## Menu Visibility

- **IMPLEMENTED_ADMIN_HREFS** (adminRouteMap.ts): Added `/admin/super-admin-whitelist`, `/admin/countries`, `/admin/states`, `/admin/branch-types`
- **Backend menu registry** (backend-api): Added Organizations, Super Admin Whitelist, Countries, States, Branch Types under System and Master Data groups (requires `admin.users.read`)

Backend menu registry change is in `src/api/v1/modules/me/menu.registry.ts`. If backend-api is on a different branch (e.g. work/enforce-transfer-confirmation), that commit may need to be merged or cherry-picked into the admin recovery branch.

---

## UX Standardization

- PageTItle, Card, Row/Col, form controls, Table
- Toast (react-toastify) for create/update success
- Confirm modal for destructive actions (Super Admin Whitelist remove)
- Empty state when no data
- Error alert on API failure

---

## API Endpoints Used

| Module | Endpoints |
|--------|-----------|
| Organizations | GET/POST `/api/v1/admin/organizations`, PATCH `/:id` |
| Users | GET/POST `/api/v1/admin/users`, PATCH `/:id` |
| Super Admin Whitelist | GET/POST `/api/v1/admin/super-admin-whitelist`, DELETE `/:id` |
| Countries | GET/POST `/api/v1/admin/countries`, PATCH `/:id` |
| States | GET/POST `/api/v1/admin/states`, PATCH `/:id` |
| Branch Types | GET/POST `/api/v1/admin/branch-types`, PATCH `/:id` |

---

## Git Commits (bpa_web)

1. `feat(admin): users module` — includes organizations, users, super-admin-whitelist
2. `feat(admin): countries/states/branch-types master data modules` — includes adminRouteMap updates

---

## Notes

- **Organizations create** requires `ownerUserId`; users list is loaded for dropdown
- **States create** requires `countryId`; countries list is loaded for dropdown
- **Users** role/branch assignment is via Staff page (`/admin/staff`); link provided
- **Super Admin Whitelist** has backend protection against self-removal lockout
