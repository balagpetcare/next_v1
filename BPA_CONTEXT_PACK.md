# 🎯 BPA Context Pack
## Complete AI Assistant Guide for Bangladesh Pet Association (BPA)

> **Purpose:** This document provides comprehensive context to AI assistants (Cursor AI, GitHub Copilot, etc.) to work on BPA system professionally, maintaining standards, and delivering scalable solutions.

---

## 📋 Table of Contents

1. [Project Identity & Scope](#1-project-identity--scope)
2. [Never Change Rules (Hard Constraints)](#2-never-change-rules-hard-constraints)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Domain Model (Business Entities)](#4-domain-model-business-entities)
5. [RBAC (Role-Based Access Control)](#5-rbac-role-based-access-control)
6. [Routes Map](#6-routes-map)
7. [UI/UX Standards (WowDash)](#7-uiux-standards-wowdash)
8. [Development Workflow](#8-development-workflow)
9. [Master Prompt for AI](#9-master-prompt-for-ai)
10. [Change Management Policy](#10-change-management-policy)

---

## 1. Project Identity & Scope

### A) Project Identity

* **Project Name:** Bangladesh Pet Association (BPA)
* **Goal:** Multi-tenant ecosystem connecting:
  * 🏥 Pet Clinics
  * 🛍️ Pet Shops
  * 🚚 Delivery Hubs
  * 📦 Online Marketplace
  * 💳 Membership/Ownership Cards
* **Target Market:** Bangladesh (Bilingual: English + Bengali)
* **Success Criteria:** Production-ready, scalable, secured, maintainable

### B) Project Scope

BPA is a **unified digital ecosystem** where:
- Pet parents can manage their pets, book appointments, shop online
- Clinics can manage patients, prescriptions, appointments
- Pet shops can manage inventory, POS, online orders
- Delivery hubs can manage shipments and logistics
- All services are integrated under one platform

---

## 2. Never Change Rules (Hard Constraints)

### ⚠️ CRITICAL: These rules MUST NEVER be violated

#### A) Port Configuration (FIXED - DO NOT CHANGE)

* **API Port:** `3000` (reserved, must never change)
* **Next.js Ports (Fixed):**
  * `mother` = `3100`
  * `shop` = `3101`
  * `clinic` = `3102`
  * `admin` = `3103`
  * `owner` = `3104`
* **Rule:** Do not modify `package.json` scripts or port assignments

#### B) State Management

* **Flutter App:** Must use **Riverpod** for state management
* **Next.js:** React hooks + Context API (as needed)

#### C) UI Standard

* **Template:** **WowDash Admin Template** (mandatory)
* **Components:** Must follow WowDash patterns:
  * Cards: `radius-12` class
  * Badges: `badge bg-{tone}-focus text-{tone}-main radius-12`
  * Sidebar/Topbar: Follow existing layout patterns
  * Tables: Filter/search/pagination standard
  * Forms: Stepper, validation, success toast
  * Breadcrumb + Page title + Card layout

#### D) Code Change Policy

* **Never delete existing working code**
* **Always merge changes** - preserve old code when updating
* **Prefer smallest possible patch** - minimal changes
* **Update-only patches** - only changed/new files in deliverables

#### E) Deliverable Format

Every change must include:
* `PATCH_NOTES.md` - What changed and why
* `CHANGED_FILES.txt` - List of modified/new files
* `APPLY_INSTRUCTIONS.md` - Step-by-step apply guide
* **Patch ZIP** - Only changed/new files (not full codebase)

#### F) Breaking Changes Policy

* **If breaking change needed:**
  1. Stop and create `CHANGE_PROPOSAL.md`
  2. Explain: Why needed, what breaks, migration steps, rollback plan
  3. Wait for approval before implementing

---

## 3. Architecture & Tech Stack

### A) Frontend

* **Framework:** Next.js (App Router)
* **Multi-App Routes:**
  * `/mother` - Public landing + auth
  * `/shop` - Pet shop dashboard
  * `/clinic` - Clinic dashboard
  * `/admin` - Admin dashboard
  * `/owner` - Owner dashboard
* **Mobile:** Flutter (Android & iOS)
* **State Management (Flutter):** Riverpod

### B) Backend

* **Runtime:** Node.js + Express
* **ORM:** Prisma
* **Database:** PostgreSQL
* **Storage:** MinIO (Media & Documents)
* **API Prefix:** `/api/v1`
* **Authentication:** Cookie-based (credentials include)

### C) Infrastructure

* **Containerization:** Docker & Docker Compose
* **Orchestration:** Docker Compose for local development
* **Versioning:** Semantic versioning (MAJOR.MINOR.PATCH)

### D) Development Environment

* **API Base URL:** `http://localhost:3000/api/v1`
* **CORS:** Configured for Next.js apps (ports 3100-3104)
* **Environment Variables:** `.env` files (see `.env.example`)

---

## 4. Domain Model (Business Entities)

### Core Entities

#### A) Organization & Branch

* **Organization:**
  * Multi-tenant entity
  * Can have multiple branches
  * Owner manages organization
* **Branch:**
  * Type: Clinic / Shop / Hub
  * Location-based (Division, District, Upazila, Area)
  * Status: Draft → Submitted → Approved → Active
  * Verification: Location + Photos required

#### B) User & Authentication

* **User:**
  * Profile, Contact, Status
  * Auth: Email/Phone + Password
  * Invite-based registration for staff
* **UserAuth:**
  * Credentials, OTP, Email verification
  * Cookie-based sessions

#### C) Staff & Roles

* **Staff:**
  * Assigned to Organization/Branch
  * Role-based permissions
  * Invitation system
* **Roles:**
  * SUPER_ADMIN, ORG_OWNER, BRANCH_MANAGER, SELLER, STAFF, VET, CLINIC_ASSISTANT, DELIVERY_MANAGER, DELIVERY_STAFF

#### D) Products & Inventory

* **Products:**
  * CRUD operations
  * Variants (Size, Flavor, etc.)
  * Stock per branch
  * Expiry tracking
* **Inventory:**
  * Central + Branch stock
  * Auto stock deduction on sale
  * Stock alerts (low stock, expiring items)

#### E) Services (Clinic)

* **Services:**
  * Consultation, Vaccine, Grooming, etc.
  * Price per branch
  * Staff assignment (Vet)

#### F) Orders

* **Online Orders:**
  * Customer → Shop/Clinic
  * Status flow: Pending → Confirmed → Processing → Shipped → Delivered
* **POS Orders:**
  * Offline sales at branch
  * Real-time stock update

#### G) Delivery

* **Delivery Hub:**
  * Consolidation point
  * Packaging management
* **Delivery Staff:**
  * Rider assignment
  * Status tracking
  * Cost tracking (future)

#### H) Ownership Card

* **Membership Card:**
  * Premium subscription
  * Discount rules
  * Eligibility criteria
  * Usage logs

#### I) Reports

* **Stock Reports:**
  * Aging analysis
  * Top sellers
  * Zero sales (last 3 months)
  * Expiring items
* **Sales Reports:**
  * Summary by branch
  * Revenue tracking
  * Customer analytics

---

## 5. RBAC (Role-Based Access Control)

### A) Roles

| Role | Description | Scope |
|------|-------------|-------|
| **SUPER_ADMIN** | Platform administrator | Full system access |
| **ORG_OWNER** | Organization owner | Own organization + branches |
| **BRANCH_MANAGER** | Branch manager | Single branch management |
| **SELLER** | Sales staff | POS, orders, inventory view |
| **STAFF** | General staff | Limited access |
| **VET** | Veterinarian | Clinical services, prescriptions |
| **CLINIC_ASSISTANT** | Clinic helper | Appointment management |
| **DELIVERY_MANAGER** | Delivery hub manager | Hub operations |
| **DELIVERY_STAFF** | Delivery rider | Order delivery |

### B) Permission Naming Convention

Format: `{resource}.{action}`

Examples:
* `branch.read` - View branches
* `branch.create` - Create branch
* `branch.update` - Update branch
* `product.create` - Create product
* `product.update` - Update product
* `order.view` - View orders
* `inventory.update` - Update inventory
* `report.view` - View reports
* `staff.manage` - Manage staff
* `org.read` - View organization
* `settings.read` - View settings
* `settings.manage` - Manage settings

### C) Permission Rules

* **Backend:** Middleware checks permissions
* **Frontend:** Menu visibility based on permissions
* **Single Source:** Permission keys must match between backend and frontend
* **Menu Registry:** `src/lib/permissionMenu.ts` (Next.js)
* **API Middleware:** `src/middleware/auth.middleware.ts` (Backend)

### D) Permission Matrix Example

| Role | branch.read | branch.create | product.create | order.view | staff.manage |
|------|------------|---------------|----------------|------------|--------------|
| ORG_OWNER | ✅ | ✅ | ✅ | ✅ | ✅ |
| BRANCH_MANAGER | ✅ (own) | ❌ | ✅ | ✅ | ❌ |
| SELLER | ✅ (own) | ❌ | ❌ | ✅ | ❌ |
| STAFF | ✅ (own) | ❌ | ❌ | ✅ | ❌ |

---

## 6. Routes Map

### A) Next.js App Routes

#### Owner Dashboard (Port 3104)
* `/owner` - Dashboard home
* `/owner/dashboard` - Main dashboard
* `/owner/organizations` - Organization list
* `/owner/organizations/[id]` - Organization details
* `/owner/organizations/new` - Create organization
* `/owner/branches` - Branch list
* `/owner/branches/[id]` - Branch details
* `/owner/branches/[id]/edit` - Edit branch
* `/owner/branches/[id]/team` - Branch team
* `/owner/branches/new` - Create branch
* `/owner/staff` - Staff list
* `/owner/staffs` - Staff management
* `/owner/staffs/[id]` - Staff details
* `/owner/staff/invitations` - Staff invitations
* `/owner/kyc` - KYC verification
* `/owner/profile` - User profile
* `/owner/settings` - Settings
* `/owner/wallet` - Wallet
* `/owner/reports` - Reports
* `/owner/orders` - Orders
* `/owner/services` - Services
* `/owner/login` - Login
* `/owner/logout` - Logout

#### Admin Dashboard (Port 3103)
* `/admin` - Dashboard home
* `/admin/dashboard` - Main dashboard
* `/admin/organizations` - Organizations
* `/admin/branches` - Branches
* `/admin/branch-types` - Branch types
* `/admin/users` - Users
* `/admin/staff` - Staff
* `/admin/roles` - Roles
* `/admin/permissions` - Permissions
* `/admin/verifications` - Verifications
* `/admin/verifications/owners` - Owner verifications
* `/admin/verifications/branches` - Branch verifications
* `/admin/verifications/organizations` - Organization verifications
* `/admin/audit` - Audit logs
* `/admin/login` - Login
* `/admin/logout` - Logout

#### Shop Dashboard (Port 3101)
* `/shop` - Dashboard home
* `/shop/orders` - Orders
* `/shop/inventory` - Inventory
* `/shop/customers` - Customers
* `/shop/staff` - Staff
* `/shop/dashboards/seller` - Seller dashboard

#### Clinic Dashboard (Port 3102)
* `/clinic` - Dashboard home
* `/clinic/appointments` - Appointments
* `/clinic/patients` - Patients
* `/clinic/staff` - Staff
* `/clinic/dashboards/staff` - Staff dashboard

#### Mother App (Port 3100)
* `/mother` - Landing page
* `/login` - Public login
* `/register` - Registration
* `/invite/accept` - Invite acceptance

### B) API Routes

Base: `http://localhost:3000/api/v1`

* `/auth/login` - Login
* `/auth/logout` - Logout
* `/auth/me` - Current user
* `/owner/*` - Owner endpoints
* `/admin/*` - Admin endpoints
* `/shop/*` - Shop endpoints
* `/clinic/*` - Clinic endpoints
* `/locations/*` - Location data (divisions, districts, upazilas, areas)

---

## 7. UI/UX Standards (WowDash)

### A) Layout Structure

* **Sidebar:** Collapsible, grouped menus
* **Topbar:** User menu, theme toggle, notifications
* **Main Content:** Card-based layout
* **Footer:** Copyright, links

### B) Component Standards

#### Cards
```jsx
<div className="card radius-12">
  <div className="card-body">
    {/* Content */}
  </div>
</div>
```

#### Badges
```jsx
<span className="badge bg-success-focus text-success-main radius-12">
  Active
</span>
```

#### Buttons
```jsx
<button className="btn btn-primary radius-12">
  Submit
</button>
```

#### Tables
* Filter/Search bar
* Pagination
* Status badges
* Actions dropdown
* Responsive design

#### Forms
* Stepper for multi-step forms
* Validation (client + server)
* Success toast notification
* Error handling

### C) Sidebar Menu Grouping

Example (Owner):
```
Dashboard
My Business
  ├── Organization
  ├── Branches
  └── Staffs
Dashboards
  ├── Branch Manager
  └── General Staff
Settings
  └── Profile
```

### D) Page Structure

1. **Breadcrumb** (if applicable)
2. **Page Title** (`<h5>` or `<h6>`)
3. **Description** (small text-muted)
4. **Action Buttons** (top right)
5. **Content Cards**
6. **Footer** (if needed)

### E) Color Scheme

* Primary: Blue tones
* Success: Green
* Warning: Yellow/Orange
* Danger: Red
* Secondary: Gray
* Follow WowDash color palette

---

## 8. Development Workflow

### A) Task Breakdown (PHASE-wise)

1. **Audit Phase (Read-Only)**
   * Analyze codebase structure
   * Identify broken routes (404)
   * Check Prisma schema mismatches
   * Find UI compliance gaps
   * Output: `AUDIT_REPORT.md` (no code changes)

2. **Fix Phase (Update-Only)**
   * Fix broken routes
   * Fix permission/menu mismatches
   * Fix Prisma errors
   * Fix CORS issues
   * Output: Update-only patch ZIP

3. **Feature Phase (Additive)**
   * Add new features
   * Extend existing modules
   * Add new routes
   * Output: Feature patch ZIP

4. **QA Phase**
   * Test steps
   * Verification commands
   * Rollback instructions (if needed)

### B) Change Documentation

Every change must include:

#### PATCH_NOTES.md
```markdown
# Patch Notes vX.Y.Z

## Changes
- Fixed: [What was fixed]
- Added: [What was added]
- Updated: [What was updated]

## Affected Files
- [List of files]

## Migration Steps
1. [Step 1]
2. [Step 2]

## Testing
- [Test case 1]
- [Test case 2]
```

#### CHANGED_FILES.txt
```
app/owner/branches/page.tsx
src/lib/permissionMenu.ts
prisma/schema.prisma
```

#### APPLY_INSTRUCTIONS.md
```markdown
# Apply Instructions

1. Backup current codebase
2. Extract patch ZIP
3. Copy files to respective locations
4. Run: npm install (if package.json changed)
5. Run: npx prisma migrate dev (if schema changed)
6. Restart services
7. Verify changes
```

### C) Code Quality Rules

* **Never delete working code** - Always merge
* **Backward compatibility** - Existing routes must work
* **Semantic versioning** - MAJOR.MINOR.PATCH
* **Update-only patches** - Only changed files
* **Test before deliver** - Verify changes work

---

## 9. Master Prompt for AI

### Copy this prompt when starting work on BPA:

```
You are working on the BPA (Bangladesh Pet Association) platform.

HARD CONSTRAINTS (never violate):
- API runs on port 3000 only.
- Next.js ports fixed: mother=3100, shop=3101, clinic=3102, admin=3103, owner=3104. 
  Do not change scripts or ports.
- Keep Flutter state management Riverpod (if touched).
- UI must follow WowDash admin template patterns:
  - radius-12 cards, badges
  - sidebar/topbar, breadcrumb
  - tables/forms standard
- Never delete or overwrite old code blindly. Always merge changes so existing features remain.
- Deliverables must be "update-only patch zip" (only changed files) + 
  APPLY_INSTRUCTIONS.md + PATCH_NOTES.md + CHANGED_FILES.txt.
- If any breaking change is required, stop and write CHANGE_PROPOSAL.md explaining why, impact, and alternatives.

TECH STACK:
- Next.js App Router multi-app routes: /mother /shop /clinic /admin /owner
- Node/Express API with Prisma + PostgreSQL, MinIO, Docker compose
- API prefix /api/v1
- Auth: cookie-based

RBAC:
- Roles: SUPER_ADMIN, ORG_OWNER, BRANCH_MANAGER, SELLER, STAFF, VET, CLINIC_ASSISTANT, DELIVERY_MANAGER, DELIVERY_STAFF
- Permissions: branch.read, product.create, product.update, order.view, inventory.update, report.view, staff.manage etc.
- Backend authz + frontend menu visibility must match from single source (src/lib/permissionMenu.ts).

TASK MODE:
1. First produce AUDIT_REPORT.md (read-only) describing:
   - routes, ports, broken pages (404)
   - prisma schema mismatches
   - wowdash UI gaps
2. Then produce update-only patch implementing highest priority fixes without breaking existing features.
3. Provide exact apply steps and verification commands.

PRIORITY:
- Fix 404 owner/staff routes, login routing, menu visibility by role
- Fix Prisma select/unknown fields errors, CORS origin issues
- Ensure owner dashboard pages match WowDash layout consistently
```

---

## 10. Change Management Policy

### A) Breaking Changes

If any of these need to change:
- Port numbers
- API route structure (`/api/v1` prefix)
- Database schema (Prisma models)
- Authentication method
- Permission key names
- Route paths (existing routes)

**Process:**
1. **STOP** - Do not implement
2. Create `CHANGE_PROPOSAL.md` with:
   - Why change is needed
   - What will break
   - Migration steps
   - Rollback plan
   - Alternatives considered
3. Wait for approval
4. Then implement with full documentation

### B) Safe Changes (Can proceed)

- Adding new routes
- Adding new features
- UI enhancements (WowDash compliant)
- Bug fixes (non-breaking)
- Performance optimizations
- Documentation updates

### C) Change Approval Checklist

Before implementing any change, verify:
- [ ] Does it violate any "Never Change" rules?
- [ ] Will it break existing functionality?
- [ ] Is it backward compatible?
- [ ] Are migration steps documented?
- [ ] Is rollback plan available?
- [ ] Are test steps included?

---

## 📚 Related Documents

* [BPA_STANDARD.md](./BPA_STANDARD.md) - Technical standards
* [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Technical context
* [BPA_PROJECT_DOCUMENTATION.md](./BPA_PROJECT_DOCUMENTATION.md) - Project overview
* [BPA_VISION.md](./BPA_VISION.md) - Vision document
* [DECISIONS_LOG.md](./DECISIONS_LOG.md) - Architecture decisions
* [TASKS.md](./TASKS.md) - Current tasks

---

## 🎯 Quick Reference

### Ports
- API: `3000`
- Mother: `3100`
- Shop: `3101`
- Clinic: `3102`
- Admin: `3103`
- Owner: `3104`

### Key Files
- Menu Registry: `src/lib/permissionMenu.ts`
- API Client: `src/lib/apiFetch.js`
- Auth Middleware: `src/middleware/auth.middleware.ts` (backend)
- Prisma Schema: `prisma/schema.prisma` (backend)

### Common Commands
```bash
# Next.js dev
npm run dev:owner    # Port 3104
npm run dev:admin    # Port 3103
npm run dev:shop     # Port 3101
npm run dev:clinic   # Port 3102
npm run dev:mother   # Port 3100

# Prisma (backend)
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

---

*Last Updated: January 2026*
*Version: 1.0.0*
*For AI Assistants: Use this document as your primary context when working on BPA system.*
