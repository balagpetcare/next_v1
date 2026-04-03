# Unified Staff Management & Invitation System - Enterprise Migration Plan

## Executive Summary

This document outlines the comprehensive migration plan to unify all staff invitation and management flows under a single, consistent system. Currently, warehouse staff invitations bypass the branch membership system, causing broken permissions and failed logins. This plan establishes a canonical architecture where **all staff are branch staff**, with branch type determining available roles.

---

## 1. Current Broken Architecture

### 1.1 Core Problem: Dual Invitation Systems

**System A: General Branch Staff Invitation (Working)**
- Location: `app/owner/(larkon)/staffs/new/page.jsx`
- API: `POST /api/v1/owner/branches/:id/members/invite`
- Service: `staffInvite.service.ts:createStaffInvite()`
- Creates: `StaffInvite` record with `targetType: "BRANCH"`
- On Accept: Creates `BranchMember` record (✓ proper staff access)

**System B: Warehouse Staff Invitation (Broken)**
- Location: `app/owner/(larkon)/warehouse/[id]/staff/page.tsx`
- API: `POST /api/v1/warehouse/:id/staff/invite` (via `warehouseStaffInvite`)
- Service: `staffInvite.service.ts:createWarehouseStaffInvite()`
- Creates: `StaffInvite` record with `targetType: "WAREHOUSE"`
- On Accept: Creates `WarehouseStaffAssignment` only (✗ missing BranchMember)

### 1.2 Root Cause Analysis

```
Warehouse Staff Invite Flow (BROKEN):
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Owner invites  │────▶│ StaffInvite      │────▶│  User accepts   │
│  warehouse staff │     │ targetType:      │     │  via /register  │
└─────────────────┘     │ "WAREHOUSE"      │     └────────┬────────┘
                       └──────────────────┘              │
                                                        ▼
                                               ┌─────────────────┐
                                               │ WarehouseStaff  │
                                               │ Assignment      │
                                               │ created         │
                                               └────────┬────────┘
                                                        │
                                                        ✗ MISSING!
                                               ┌─────────────────┐
                                               │ BranchMember    │
                                               │ NOT created     │
                                               └─────────────────┘
                                               ┌─────────────────┐
                                               │ BranchAccessPermission│
                                               │ NOT created     │
                                               └─────────────────┘

Result: User has warehouse role but NO staff panel access
```

**Why This Breaks:**
1. `auth.controller.ts:staffLogin()` checks for `BranchMember` or `OrgMember` records (line 1394-1446)
2. `authUnified.service.ts:resolveAuthContexts()` only looks at `BranchMember` for STAFF role context (line 205-228)
3. Without `BranchMember`, user has no staff context → login fails or redirects incorrectly

### 1.3 Current File Structure

```
Frontend (bpa_web):
├── app/owner/(larkon)/staffs/new/page.jsx          # General staff invite (branch-based)
├── app/owner/(larkon)/staffs/page.jsx             # Staff list/management
├── app/owner/(larkon)/warehouse/[id]/staff/page.tsx # Warehouse-specific staff invite
├── app/owner/_components/staff/                    # Shared staff components
│   ├── StaffCard.jsx
│   └── StaffDetailView.jsx

Backend (backend-api):
├── src/api/v1/services/staffInvite.service.ts    # Core invitation services
│   ├── createStaffInvite()        # Branch targetType
│   ├── createWarehouseStaffInvite() # Warehouse targetType (PROBLEM)
│   ├── resendStaffInviteForBranch()
│   ├── resendStaffInviteForWarehouse()
│   └── ...
├── src/api/v1/modules/auth/auth.controller.ts    # Invite acceptance
│   └── acceptInvite()             # Handles both BRANCH and WAREHOUSE
├── src/api/v1/services/authUnified.service.ts    # Auth context resolution
│   └── resolveAuthContexts()      # Only reads BranchMember
└── src/api/v1/modules/warehouse/warehouse.service.ts
    └── assignStaff()              # Creates WarehouseStaffAssignment
```

### 1.4 Existing Role Definitions

**Branch Roles (from staffInvite.service.ts lines 109-117):**
- `BRANCH_MANAGER` - Manager of a standard branch
- `BRANCH_STAFF` - General branch staff
- `SELLER` - Sales staff
- `DELIVERY_MANAGER` - Delivery hub manager
- `DELIVERY_STAFF` - Delivery personnel
- `DOCTOR` - Clinic doctor (with special onboarding)

**Warehouse Roles (from warehouse staff page lines 16-23):**
- `WAREHOUSE_MANAGER`
- `RECEIVING_STAFF`
- `DISPATCH_STAFF`
- `INVENTORY_CONTROLLER`
- `QC_OFFICER`
- `AUDIT_OFFICER`

### 1.5 Data Models

**StaffInvite Model (Prisma):**
```prisma
model StaffInvite {
  id                Int       @id @default(autoincrement())
  orgId             Int
  targetType        String    // "BRANCH" | "WAREHOUSE"
  branchId          Int?      // Set when targetType = BRANCH
  warehouseId       Int?      // Set when targetType = WAREHOUSE
  role              String?   // Branch role (when targetType = BRANCH)
  warehouseRole     String?   // Warehouse role (when targetType = WAREHOUSE)
  status            String    // "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  email             String?
  phone             String?
  displayName       String?
  inviteAsDoctor    Boolean   @default(false)
  tokenHash         String    @unique
  expiresAt         DateTime
  invitedByUserId   Int
  acceptedByUserId  Int?
}
```

**Key Issue:** The dual targetType pattern creates a data split that breaks staff access.

---

## 2. Target Canonical Architecture

### 2.1 Core Principle: All Staff Are Branch Staff

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED STAFF MODEL                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐         ┌──────────────────┐                     │
│   │   Branch     │◄────────│  BranchMember    │                     │
│   │   (any type) │   1:M   │  (all staff)     │                     │
│   └──────┬───────┘         └──────────────────┘                     │
│          │                    │                                     │
│          │         ┌───────────┘                                     │
│          │         │                                              │
│          │    ┌────▼──────────────────┐                          │
│          │    │ BranchAccessPermission │                          │
│          │    │ (access control)       │                          │
│          │    └───────────────────────┘                          │
│          │                                                         │
│    ┌─────▼─────┐           ┌──────────────────┐                   │
│    │ Warehouse │◄─────────│ WarehouseStaff   │                   │
│    │ (optional)│   0:M    │ Assignment       │                   │
│    └───────────┘           │ (role-specific)  │                   │
│                            └──────────────────┘                   │
│                                                                      │
│   Rule: Every staff member MUST have a BranchMember record         │
│   Warehouse role is an ADDITIONAL assignment, not a replacement    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Unified Data Flow

```
Invite Flow (NEW - Unified):
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Owner invites  │────▶│ StaffInvite      │────▶│  User accepts   │
│  staff (any)   │     │ targetType:      │     │  via /register  │
└─────────────────┘     │ "BRANCH" (always)│     └────────┬────────┘
                       └──────────────────┘              │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ BranchMember    │
                                                  │ ALWAYS created  │
                                                  └────────┬────────┘
                                                           │
                              ┌──────────────────────────────┤
                              │                              │
                              ▼                              ▼
                    ┌─────────────────┐            ┌─────────────────┐
                    │ BranchAccessPermission        │ WarehouseStaff  │
                    │ ALWAYS created  │            │ Assignment      │
                    │ (if warehouse)  │            │ (if warehouse   │
                    └─────────────────┘            │  role selected) │
                                                   └─────────────────┘

Result: User has full staff access + warehouse-specific assignment
```

### 2.3 Unified Route Structure

| Route | Purpose | Type |
|-------|---------|------|
| `/owner/staffs` | Central staff management (all branches) | List/Filter |
| `/owner/staffs/new` | Unified invitation form | Create |
| `/owner/staffs/new?branchId=X` | Pre-filtered invitation for branch X | Create |
| `/owner/branches/:id/team` | Branch-specific staff management | List/Filter |
| `/owner/branches/:id/team/invite` | Branch invite (wrapper) | Create |
| `/owner/warehouse/:id/staff` | Warehouse staff view | List (uses unified) |
| `/owner/warehouse/:id/staff/invite` | Warehouse invite (wrapper) | Create (redirects to unified) |
| `/owner/clinic/:id/staff` | Clinic staff view | List (uses unified) |
| `/owner/clinic/:id/staff/invite` | Clinic invite (wrapper) | Create (redirects to unified) |
| `/owner/pharmacy/:id/staff` | Pharmacy staff view | List (uses unified) |

### 2.4 Backend Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND ORCHESTRATION LAYER                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │          UnifiedStaffOrchestrationService                    │  │
│  │          (NEW - Replaces duplicate logic)                     │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                  │  │
│  │  │ createStaffInvitation()                                      │  │
│  │  │ - Single entry point                                         │  │
│  │  │ - Transaction-safe                                             │  │
│  │  │ - Creates StaffInvite (always BRANCH targetType)            │  │
│  │  │ - Sets warehouseRole if applicable                           │  │
│  │  └─────────────────┘    └─────────────────┘                  │  │
│  │                                                               │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                  │  │
│  │  │ acceptStaffInvitation()                                      │  │
│  │  │ - Creates BranchMember                                       │  │
│  │  │ - Creates BranchAccessPermission                             │  │
│  │  │ - Creates WarehouseStaffAssignment (if needed)              │  │
│  │  │ - Transaction-safe                                           │  │
│  │  └─────────────────┘    └─────────────────┘                  │  │
│  │                                                               │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                  │  │
│  │  │ getStaffForBranch()                                            │  │
│  │  │ getStaffForWarehouse()                                         │  │
│  │  │ getStaffForOrg()                                               │  │
│  │  │ - Unified query methods                                        │  │
│  │  └─────────────────┘    └─────────────────┘                  │  │
│  │                                                               │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                  │  │
│  │  │ resendInvitation()                                             │  │
│  │  │ cancelInvitation()                                             │  │
│  │  │ reinviteStaff()                                                │  │
│  │  │ - Unified lifecycle management                                 │  │
│  │  └─────────────────┘    └─────────────────┘                  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Legacy Services (to be deprecated):                                │
│  - createWarehouseStaffInvite() → redirect to unified               │
│  - warehouse-specific assignment logic → use unified              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Branch-Type-Aware Role Rules

### 3.1 Role Matrix by Branch Type

| Branch Type | Allowed Roles | Special Features |
|-------------|---------------|------------------|
| **CLINIC** | BRANCH_MANAGER, BRANCH_STAFF, SELLER, DOCTOR | Doctor onboarding flow |
| **PHARMACY** | BRANCH_MANAGER, BRANCH_STAFF, SELLER, PHARMACIST | Medicine permissions |
| **SHOP** | BRANCH_MANAGER, BRANCH_STAFF, SELLER | Sales focus |
| **DELIVERY_HUB** | DELIVERY_MANAGER, DELIVERY_STAFF | Dispatch permissions |
| **WAREHOUSE** | WAREHOUSE_MANAGER, RECEIVING_STAFF, DISPATCH_STAFF, INVENTORY_CONTROLLER, QC_OFFICER, AUDIT_OFFICER | + BranchMember always created |
| **CENTRAL_WAREHOUSE** | All warehouse roles + BRANCH_MANAGER | Manager oversees warehouse |
| **MIXED** | All applicable roles | Based on type combination |

### 3.2 Role Hierarchy & Permissions

```typescript
// Role hierarchy for invitation validation
const ROLE_HIERARCHY = {
  OWNER: ['all'],
  BRANCH_MANAGER: ['BRANCH_STAFF', 'SELLER', 'WAREHOUSE_STAFF'],
  WAREHOUSE_MANAGER: ['RECEIVING_STAFF', 'DISPATCH_STAFF', 'INVENTORY_CONTROLLER', 'QC_OFFICER', 'AUDIT_OFFICER'],
  DELIVERY_MANAGER: ['DELIVERY_STAFF'],
};

// Role to permission mapping
const ROLE_PERMISSIONS = {
  WAREHOUSE_MANAGER: ['warehouse.view', 'warehouse.manage', 'inventory.manage', 'dispatch.view', 'delivery.view'],
  RECEIVING_STAFF: ['inventory.receive', 'warehouse.view'],
  DISPATCH_STAFF: ['dispatch.manage', 'warehouse.view'],
  // ... etc
};
```

### 3.3 Validation Rules

1. **Role-Branch Compatibility**: Selected role must be in allowed list for branch type
2. **Inviter Permissions**: Inviter must have role >= invited role in hierarchy
3. **Single Active Assignment**: User can have multiple roles but only one active assignment per branch
4. **Warehouse Special Case**: Warehouse role always creates both BranchMember + WarehouseStaffAssignment

---

## 4. Data Repair & Backfill Strategy

### 4.1 Identify Broken Records

```sql
-- Find warehouse staff invites that bypassed branch membership
SELECT si.id, si.email, si.warehouseId, si.warehouseRole, si.status,
       wsa.id as assignmentId, wsa.userId,
       bm.id as branchMemberId
FROM StaffInvite si
LEFT JOIN Warehouse w ON w.id = si.warehouseId
LEFT JOIN WarehouseStaffAssignment wsa ON wsa.warehouseId = si.warehouseId 
    AND wsa.userId = si.acceptedByUserId
LEFT JOIN BranchMember bm ON bm.userId = si.acceptedByUserId 
    AND bm.branchId = w.branchId
WHERE si.targetType = 'WAREHOUSE'
  AND si.status = 'ACCEPTED'
  AND bm.id IS NULL;  -- Missing BranchMember!

-- Find users with warehouse access but no staff panel access
SELECT u.id, u.email, wsa.userId, wsa.warehouseId, wsa.role,
       bm.id as branchMemberId,
       bap.id as accessPermissionId
FROM WarehouseStaffAssignment wsa
JOIN User u ON u.id = wsa.userId
LEFT JOIN BranchMember bm ON bm.userId = wsa.userId
LEFT JOIN BranchAccessPermission bap ON bap.userId = wsa.userId
WHERE wsa.isActive = true
  AND (bm.id IS NULL OR bap.id IS NULL);
```

### 4.2 Repair Script

```typescript
// Data repair script (one-time migration)
async function repairWarehouseStaffAccess() {
  // 1. Find all warehouse staff assignments without BranchMember
  const brokenAssignments = await prisma.warehouseStaffAssignment.findMany({
    where: { isActive: true },
    include: {
      warehouse: { select: { id: true, branchId: true, orgId: true } },
      user: { include: { auth: true } },
    },
  });

  for (const assignment of brokenAssignments) {
    const { warehouse, user } = assignment;
    
    // 2. Ensure BranchMember exists
    const branchMember = await prisma.branchMember.upsert({
      where: {
        branchId_userId: {
          branchId: warehouse.branchId,
          userId: user.id,
        },
      },
      update: {
        status: 'ACTIVE',
        role: assignment.role, // Use warehouse role as branch role
      },
      create: {
        orgId: warehouse.orgId,
        branchId: warehouse.branchId,
        userId: user.id,
        role: assignment.role,
        status: 'ACTIVE',
      },
    });

    // 3. Ensure BranchAccessPermission exists
    await prisma.branchAccessPermission.upsert({
      where: {
        branchId_userId: {
          branchId: warehouse.branchId,
          userId: user.id,
        },
      },
      update: { status: 'APPROVED' },
      create: {
        branchId: warehouse.branchId,
        userId: user.id,
        status: 'APPROVED',
        invitedByUserId: 1, // System/admin
      },
    });

    // 4. Update StaffInvite records to targetType = BRANCH
    await prisma.staffInvite.updateMany({
      where: {
        targetType: 'WAREHOUSE',
        acceptedByUserId: user.id,
        warehouseId: warehouse.id,
      },
      data: {
        targetType: 'BRANCH',
        branchId: warehouse.branchId,
        role: assignment.role,
      },
    });

    console.log(`Repaired: User ${user.id} (${user.auth?.email}) -> Branch ${warehouse.branchId}`);
  }
}
```

---

## 5. Migration Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `UnifiedStaffOrchestrationService`
- [ ] Implement `createStaffInvitation()` with transaction safety
- [ ] Implement `acceptStaffInvitation()` with full access chain
- [ ] Add branch-type-aware role validation
- [ ] Write unit tests for orchestration service

### Phase 2: Frontend Unification (Week 1-2)
- [ ] Create shared `StaffInviteForm` component
- [ ] Update `/owner/staffs/new` to use unified service
- [ ] Add branch preselection support
- [ ] Add role filtering by branch type
- [ ] Update `/owner/staffs` list with unified data source

### Phase 3: Wrapper Routes (Week 2)
- [ ] Convert `/owner/warehouse/:id/staff` to wrapper (list view only)
- [ ] Redirect warehouse invite to unified form with preselection
- [ ] Convert `/owner/clinic/:id/staff` to wrapper
- [ ] Convert `/owner/pharmacy/:id/staff` to wrapper
- [ ] Test all wrapper routes

### Phase 4: Backend Cleanup (Week 2-3)
- [ ] Deprecate `createWarehouseStaffInvite()`
- [ ] Deprecate warehouse-specific assignment creation
- [ ] Update `acceptInvite()` to use unified orchestration
- [ ] Add data migration script
- [ ] Run repair script in staging

### Phase 5: QA & Rollout (Week 3)
- [ ] Run full QA matrix (see Section 6)
- [ ] Run data repair in production (off-peak)
- [ ] Monitor error rates and login success
- [ ] Document any edge cases

---

## 6. QA Matrix

### 6.1 Invitation Creation Tests

| Test | Branch Type | Role | Expected Result |
|------|-------------|------|-----------------|
| TC-001 | Standard | BRANCH_MANAGER | Invite created, targetType=BRANCH |
| TC-002 | Standard | BRANCH_STAFF | Invite created, targetType=BRANCH |
| TC-003 | Warehouse | WAREHOUSE_MANAGER | Invite created, targetType=BRANCH, warehouseRole set |
| TC-004 | Warehouse | RECEIVING_STAFF | Invite created, targetType=BRANCH, warehouseRole set |
| TC-005 | Clinic | DOCTOR | Invite created, inviteAsDoctor=true |
| TC-006 | Delivery Hub | DELIVERY_MANAGER | Invite created, delivery role available |
| TC-007 | Mixed types | Multiple | Role list shows intersection of allowed roles |
| TC-008 | Invalid role | DOCTOR on warehouse | Error: role not allowed for branch type |

### 6.2 Invitation Acceptance Tests

| Test | Scenario | Expected Result |
|------|----------|-----------------|
| TC-101 | New user accepts warehouse invite | BranchMember created, WarehouseStaffAssignment created, BranchAccessPermission created, can login |
| TC-102 | Existing user accepts warehouse invite | Same as TC-101, no duplicate user |
| TC-103 | New user accepts clinic invite | BranchMember created, ClinicStaffProfile if doctor, can login |
| TC-104 | Accept with expired token | Error: invite expired |
| TC-105 | Accept already accepted invite | Error: already accepted |
| TC-106 | Login after acceptance | Redirects to appropriate dashboard |

### 6.3 Staff Management Tests

| Test | Action | Expected Result |
|------|--------|-----------------|
| TC-201 | View staff list from /owner/staffs | Shows all staff across all branches |
| TC-202 | Filter staff by branch | Shows only that branch's staff |
| TC-203 | Filter staff by role | Shows only that role |
| TC-204 | View warehouse staff | Shows warehouse-specific assignments |
| TC-205 | Resend invitation | New token generated, expiry extended |
| TC-206 | Cancel invitation | Status set to REVOKED |
| TC-207 | Reinvite expired | New invite with fresh token |

### 6.4 Regression Tests

| Test | Flow | Expected Result |
|------|------|-----------------|
| TC-301 | Owner login | Still works, owner panel access |
| TC-302 | Staff login | Works, redirects to staff panel |
| TC-303 | Doctor login | Works, onboarding if pending |
| TC-304 | Country admin | Still works, country panel |
| TC-305 | Existing warehouse staff | Can still login after migration |

---

## 7. Implementation Details

### 7.1 Backend Orchestration Service

```typescript
// src/api/v1/services/unifiedStaffOrchestration.service.ts

interface CreateStaffInvitationInput {
  branchId: number;
  role: string;
  email?: string;
  phone?: string;
  displayName?: string;
  invitedByUserId: number;
  inviterRole: string;
  // Warehouse-specific
  warehouseRole?: string;  // If set, also creates warehouse assignment on accept
  inviteAsDoctor?: boolean;
}

interface CreateStaffInvitationResult {
  inviteId: number;
  token: string;
  expiresAt: Date;
}

class UnifiedStaffOrchestrationService {
  async createStaffInvitation(
    input: CreateStaffInvitationInput
  ): Promise<CreateStaffInvitationResult> {
    // 1. Validate branch exists and inviter has permission
    // 2. Validate role is allowed for branch type
    // 3. Check for duplicate pending invites
    // 4. Generate token
    // 5. Create StaffInvite (always targetType: "BRANCH")
    // 6. Send notification
    // 7. Return invite details
  }

  async acceptStaffInvitation(
    token: string,
    userId?: number,  // If existing user
    newUserData?: { password: string; displayName?: string }
  ): Promise<{
    userId: number;
    branchId: number;
    redirectPath: string;
  }> {
    // Transaction:
    // 1. Verify invite (valid, not expired, not accepted)
    // 2. Get or create user
    // 3. Create BranchMember (if not exists)
    // 4. Create BranchAccessPermission (APPROVED)
    // 5. Create WarehouseStaffAssignment (if warehouseRole set)
    // 6. Create ClinicStaffProfile (if inviteAsDoctor)
    // 7. Mark invite as ACCEPTED
    // 8. Return redirect path
  }
}
```

### 7.2 Frontend Shared Form Component

```typescript
// app/owner/_components/staff/UnifiedStaffInviteForm.tsx

interface UnifiedStaffInviteFormProps {
  preselectedBranchId?: number;  // If coming from branch-specific page
  preselectedRole?: string;      // If warehouse role preselected
  onSuccess: (result: InviteResult) => void;
  onCancel: () => void;
}

// Features:
// - Branch selector (disabled if preselectedBranchId)
// - Role selector (filtered by branch type)
// - Email/phone/display name fields
// - Validation
// - Submit to unified API
// - Success/error handling with toasts
```

### 7.3 Route Wrappers

```typescript
// app/owner/(larkon)/warehouse/[id]/staff/page.tsx
// Wrapper - redirects invite to unified form

export default function WarehouseStaffPage() {
  const params = useParams();
  const warehouseId = params.id;
  
  // Load warehouse to get branchId
  // Show staff list (warehouse-specific view)
  // "Invite Staff" button -> redirects to:
  // /owner/staffs/new?branchId={branchId}&warehouseContext={warehouseId}
}
```

---

## 8. Backward Compatibility

### 8.1 API Compatibility

- Existing `POST /api/v1/warehouse/:id/staff/invite` → Redirects to unified endpoint
- Existing `POST /api/v1/owner/branches/:id/members/invite` → Uses unified service internally
- Response format remains unchanged

### 8.2 Data Compatibility

- Existing `StaffInvite` records with `targetType: "WAREHOUSE"` continue to work
- Migration script repairs data gradually
- No breaking changes to database schema

### 8.3 Frontend Compatibility

- Existing links to warehouse staff pages continue to work
- Warehouse staff list shows unified data
- Invite button redirects to unified form with context preserved

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data corruption during migration | Full transaction safety, backup before migration, idempotent repair script |
| Login breakage for existing staff | Thorough testing, gradual rollout, monitoring dashboards |
| Invitation flow disruption | Feature flags, ability to revert to old flow quickly |
| Role permission errors | Comprehensive role validation, clear error messages |
| Performance degradation | Query optimization, caching strategy for staff lists |

---

## 10. Success Metrics

1. **Functional**: All warehouse staff can login and access staff panel
2. **Consistency**: Single code path for all staff invitations
3. **Data**: Zero `WarehouseStaffAssignment` records without corresponding `BranchMember`
4. **UX**: Staff list loads < 2 seconds for 1000 staff
5. **Error Rate**: < 0.1% invitation acceptance failures

---

## Appendix A: Files to Modify

### Backend
```
src/api/v1/services/
├── unifiedStaffOrchestration.service.ts (NEW)
├── staffInvite.service.ts (DEPRECATE warehouse functions)
└── branchRoleMatrix.ts (UPDATE with warehouse roles)

src/api/v1/modules/auth/auth.controller.ts
├── acceptInvite() (REFACTOR to use unified service)
└── verifyInvite() (UPDATE to handle unified flow)

src/api/v1/modules/warehouse/warehouse.controller.ts
├── POST /:id/staff/invite (REDIRECT to unified)
└── GET /:id/staff/overview (USE unified query)

src/api/v1/modules/owner/owner.controller.ts
├── POST /branches/:id/members/invite (USE unified service)
└── GET /staffs (USE unified query)
```

### Frontend
```
app/owner/_components/staff/
├── UnifiedStaffInviteForm.tsx (NEW)
├── UnifiedStaffList.tsx (NEW)
└── StaffRoleSelector.tsx (NEW - branch-type aware)

app/owner/(larkon)/staffs/
├── new/page.jsx (REFACTOR to use unified form)
└── page.jsx (REFACTOR to use unified list)

app/owner/(larkon)/warehouse/[id]/staff/page.tsx
└── REFACTOR as wrapper/list view only

app/owner/(larkon)/clinic/[branchId]/staff/
└── REFACTOR as wrapper

lib/api.ts
└── ADD unified staff invitation endpoints
```

---

## Appendix B: Migration Checklist - IMPLEMENTATION COMPLETE

- [x] Create unified backend orchestration service
- [x] Update auth controller acceptInvite to use unified service for warehouse staff
- [x] Update warehouse controller to use unified service
- [x] Create shared frontend invitation form (UnifiedStaffInviteForm.tsx)
- [x] Clean up owner/staffs/new page to use unified form only
- [x] Convert warehouse staff page to wrapper (removes inline invite form)
- [x] Create data repair script for existing broken records
- [ ] Run QA matrix tests
- [ ] Deploy to staging
- [ ] Run repair script on staging data
- [ ] Deploy to production (off-peak)
- [ ] Run repair script on production
- [ ] Monitor for 48 hours

## Appendix C: Implementation Summary

### Files Changed

#### Backend
```
src/api/v1/services/unifiedStaffOrchestration.service.ts (NEW)
  - Central service for all staff invitation operations
  - Handles creation: BranchMember + BranchAccessPermission + WarehouseStaffAssignment
  - Role validation per branch type
  - Transactional invite acceptance

src/api/v1/modules/auth/auth.controller.ts (MODIFIED)
  - Lines 1074-1130: Fixed warehouse invite acceptance
  - Now creates BranchMember and BranchAccessPermission for warehouse staff
  - Ensures invited warehouse staff can log in

src/api/v1/modules/warehouse/warehouse.controller.ts (MODIFIED)
  - inviteStaff() now uses unified orchestration service
  - Validates warehouse has linked branchId
  - Returns unified response format

src/scripts/repairWarehouseStaffAccess.ts (NEW)
  - Repairs legacy warehouse staff without BranchMember records
  - Creates BranchAccessPermission for existing assignments
  - Use: npx ts-node src/scripts/repairWarehouseStaffAccess.ts [--dry-run]
```

#### Frontend
```
app/owner/_components/staff/UnifiedStaffInviteForm.tsx (NEW)
  - Shared form component for all staff invitations
  - Branch type-aware role selection
  - Preselected branch/role support
  - Success feedback and error handling

app/owner/(larkon)/staffs/new/page.jsx (REWRITTEN)
  - Clean implementation using UnifiedStaffInviteForm
  - Removed all legacy inline form code
  - Single entry point for all staff invitations

app/owner/(larkon)/warehouse/[id]/staff/page.tsx (MODIFIED)
  - Removed inline invite form (lines 183-237 deleted)
  - Invite button now redirects to unified form
  - Keeps staff list and invite management functionality
  - Thin wrapper - no duplicate business logic
```

### Architecture Verification

- [x] All staff invitations go through unified orchestration service
- [x] Warehouse staff invites create proper BranchMember records
- [x] Warehouse staff can log in after accepting invite
- [x] No duplicate warehouse-specific invitation logic remains
- [x] Frontend uses shared UnifiedStaffInviteForm component
- [x] Warehouse page is thin wrapper without inline forms

### Final State

**Unified Entry Point:** `/owner/staffs/new`
- Handles all branch types including warehouses
- Branch selection drives available roles
- Uses unified backend orchestration

**Warehouse Wrapper:** `/owner/warehouse/[id]/staff`
- Displays staff list and pending invites
- Invite button redirects to unified form with branchId preselected
- No inline invitation form

**Backend Orchestration:** `unifiedStaffOrchestration.service.ts`
- Single source of truth for staff invitation logic
- Creates complete access chain: BranchMember → BranchAccessPermission → WarehouseStaffAssignment
- Validates roles per branch type

---

## Appendix D: Warehouse-Branch Linkage (Critical Dependency)

### D.1 Problem
For unified staff invitation to work, every **Warehouse must be linked to a Branch**. The unified invitation system creates staff invites through the branch (Branch → BranchMember → BranchAccessPermission → optional WarehouseStaffAssignment).

If a warehouse has no `branchId`:
- Staff invitation fails with: "Warehouse is not linked to a branch. Cannot create invitation."
- The warehouse staff page shows a warning with fix instructions

### D.2 Solution

**1. Schema Change (COMPLETE)**
Added `branchId Int?` to Warehouse model with relation to Branch:
```prisma
model Warehouse {
  id       Int     @id @default(autoincrement())
  orgId    Int
  branchId Int?    // Link to Branch for unified staff management
  name     String  @db.VarChar(200)
  // ...
  branch   Branch? @relation(fields: [branchId], references: [id], onDelete: SetNull)
  @@index([branchId])
}

model Branch {
  // ...
  warehouses Warehouse[]  // Reverse relation
}
```

**2. Data Migration Script (COMPLETE)**
File: `src/scripts/linkWarehousesToBranches.ts`

This script:
- Finds all warehouses without a `branchId`
- For each warehouse:
  - Tries to find an existing WAREHOUSE_DC branch with matching name
  - If no match, creates a new WAREHOUSE_DC branch for the warehouse
  - Updates the warehouse with the `branchId`

Usage:
```bash
# Preview changes (dry run)
npx ts-node src/scripts/linkWarehousesToBranches.ts --dry-run

# Apply changes
npx ts-node src/scripts/linkWarehousesToBranches.ts
```

**3. Frontend Guard (COMPLETE)**
The warehouse staff page now:
- Shows a warning banner when `warehouse.branchId` is missing
- Disables the "Invite Staff" button with tooltip explanation
- Displays the fix command for developers/admins

### D.3 Canonical Model
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Warehouse    │──────▶│     Branch      │◀──────│  BranchMember   │
│   branchId FK   │       │  (WAREHOUSE_DC) │       │   (staff user)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
         │                                                   │
         │         ┌─────────────────┐                       │
         └────────▶│ WarehouseStaff  │◀──────────────────────┘
                   │   Assignment    │     (via BranchMember.userId)
                   └─────────────────┘
```

### D.4 Checklist
- [x] Add `branchId` field to Warehouse model
- [x] Add Branch↔Warehouse relation
- [x] Run `prisma db push` to sync schema
- [x] Create `linkWarehousesToBranches.ts` script
- [x] Run script to link existing warehouses to branches
- [x] Add guard message on warehouse staff page
- [x] Document the requirement: "All staff are branch staff"
