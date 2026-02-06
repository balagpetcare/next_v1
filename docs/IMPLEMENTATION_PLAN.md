# BPA Implementation Plan

**Phases:** Core Foundation → Business Operations → Finance & Compliance → Testing & Polish → Extended Modules → Advanced Features  
**Governed by:** Key Success Factors (BPA Standard, Project Context)

---

## Key Success Factors

- **BPA Standard:** Follow WowDash UI; fixed ports (API 3000, Next 3100–3104); never delete working code; merge-only patches.
- **Project Context:** Cookie-based auth; RBAC; backward-compatible changes; update-only preferred.
- **Touch points:** Identify affected files before implementing; confirm changes before coding.

---

## 1. Core Foundation

| Item | Status | Notes |
|------|--------|-------|
| Auth & RBAC | Done | Cookie auth, permission middleware, session management |
| Admin layout & sidebar | Done | Section blocks (Dashboard, Verification, Users, Orgs, Commerce, etc.) |
| Menu visibility | Done | Permission-driven menu; admin fallback when empty |
| Verification flow | Done | Owner/Org/Branch/Staff verification inbox; review drawer |
| Staff login & redirects | Verify | Owner/staff routes; role-based redirect |

---

## 2. Business Operations

| Item | Status | Notes |
|------|--------|-------|
| Products | Done | List, detail, moderation queue, master catalog, approve/reject |
| Inventory | Done | List, low-stock filter, expiry watchlist (7/15/30d), reports/stock |
| POS | Done | Transactions list; POS service backend |
| Orders | Done | Funnel KPIs, filters, table, detail |
| Services | Done | Service catalog, filters, appointments placeholder |

---

## 3. Finance & Compliance

| Item | Status | Notes |
|------|--------|-------|
| Orders & Finance | Done | Funnel, Returns + Wallet links |
| Wallet / Payouts | Done | Withdraw requests, status updates, dashboard summary |
| Returns | Done | Returns list, filters |
| Audit | Done | Audit logs, filters, export |
| Verification metrics | Done | Metrics page, CSV export |

---

## 4. Testing & Polish

| Item | Status |
|------|--------|
| Smart quotes / encoding | Done – use ASCII `"` `'` and `...` in JSX |
| Loading & empty states | Done – consistent placeholders; error alerts |
| Validation | Client-side where applicable; API errors surfaced |
| Build | Zero parsing/runtime errors; ellipsis fixes applied |

---

## 5. Extended Modules

| Module | Status | Notes |
|--------|--------|-------|
| Delivery | Placeholders | Hub, jobs, riders, hubs, incidents |
| Support | Placeholders | Tickets, reviews, reports |
| Content | Placeholders | Announcements, notifications, templates, CMS |
| Policy | Placeholders | Verification, refund, commission |

*Backend to be added when requirements are fixed; frontend structure ready.*

---

## 6. Advanced Features

| Item | Status | Notes |
|------|--------|-------|
| Analytics | Page exists | Reports, charts |
| Health | Done | API health check, System hub link |
| Integrations | Placeholder | Status cards, test actions (future) |

---

## Implementation Checklist

- [x] Core Foundation: Auth, menus, verification, sidebar
- [x] Business Operations: Products, inventory, POS, orders, services
- [x] Finance & Compliance: Orders funnel, wallet, returns, audit
- [x] Testing & Polish: Quote/encoding fixes, loading/empty states, build green
- [x] Extended Modules: Placeholder pages for delivery, support, content, policy
- [x] Advanced Features: Analytics, health, integration placeholders

---

*Last updated: January 2026*
