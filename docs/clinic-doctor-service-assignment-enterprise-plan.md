# Clinic doctor–service assignment: enterprise redesign plan

This document specifies the enterprise redesign of staff **Service Assignment** (`/staff/branch/[branchId]/clinic/doctors/service-assignment`). Implementation follows the phased approach below; additive APIs coexist with legacy `service-matrix` until deprecation.

**Release / rollout:** `docs/CLINIC_DOCTOR_SERVICE_ASSIGNMENT_RELEASE.md`

**Related code:** `app/staff/.../clinic/doctors-service-assignment/` (browser URL remains `.../doctors/service-assignment` via `next.config.js` rewrite), `lib/api.ts`, `backend-api` `staffDoctorManagement.*`, `DoctorServiceMapping`, `DoctorAuditLog`.

---

## 1. Executive Summary

| Topic | Detail |
|-------|--------|
| **Legacy behavior** | Full **doctors × services** matrix via `GET/PUT .../doctors/service-matrix`. |
| **Enterprise direction** | **Doctor-centric** workspace: directory, category-grouped services, cards, bulk PATCH, templates, audit drawer, fee context with existing permissions. |
| **Implementation status** | New endpoints shipped; Prisma model `DoctorServiceAssignmentTemplate` + migration `20260322140000_doctor_service_assignment_templates`. Staff UI: `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2=false` forces legacy matrix; any other value (including unset) uses the enterprise workspace. |

---

## 2. Current State Analysis

- **Frontend (same route, two UIs):** `app/staff/(larkon)/branch/[branchId]/clinic/doctors-service-assignment/page.tsx` — enterprise vs legacy matrix per `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2`; legacy uses `staffDoctorsServiceMatrix` / `staffDoctorsPutServiceMatrix`, permissions `clinic.doctors.view` / `clinic.doctors.manage_services`.
- **Backend:** `clinic.routes.ts` — `GET/PUT service-matrix`; `putServiceMatrix` loops `upsertDoctorServiceMapping` without a transaction.
- **Semantics:** Matrix `assigned: !!m` ignores `isAllowed`; new API exposes `effectiveAssigned` on each service row.

---

## 3. Problem Breakdown

Horizontal matrix overload, weak bulk/audit UX, O(doctors × services) payload, role drift vs server.

---

## 4. Target Enterprise UX Architecture

Two-pane layout (directory + workspace), category accordions, assignment cards, bulk bar, template modal with preview, audit drawer, optional fees tab.

---

## 5. Recommended Information Architecture

Header, summary bar, filters, doctor directory, assignment workspace, pricing/fee tab (read-only where permitted), audit drawer, bulk toolbar.

---

## 6. Functional Requirements

Assign/unassign (delete op removes mapping), validated roles per `ServiceCategory`, branch-scoped services, templates (branch + optional per-member scope), bulk with per-op errors, `DoctorAuditLog` on each change.

---

## 7. Roles and Permissions

| Capability | Permission |
|------------|------------|
| View | `clinic.doctors.view` or `clinic.doctors.manage_services` |
| Edit / bulk / templates | `clinic.doctors.manage_services` |
| Fee numbers on cards | `clinic.doctors.view` + (`clinic.services.manage` or `manager.pricing.view`) |

---

## 8. Domain / Data Model

- **Reuse:** `DoctorServiceMapping`, `DoctorAuditLog`, `DoctorServiceFee`, `ClinicApprovalRequest` (`DOCTOR_SERVICE_PRIVILEGE`).
- **Added:** `DoctorServiceAssignmentTemplate` (branch-scoped template + optional `branchMemberId` for personal templates).

---

## 9. Backend Architecture

- Additive routes on clinic branch doctors path; validators `assertRoleAllowedForCategory`, branch service + doctor profile checks.
- Bulk `PATCH` uses `prisma.$transaction`; validation failures return **422** with `errors[]`.
- Per-mapping audit log rows on bulk (parity with single upsert).

---

## 10. API Contract (implemented)

**GET** `/api/v1/clinic/branches/:branchId/doctors/service-assignment/summary`  
**GET** `/api/v1/clinic/branches/:branchId/doctors/:memberId/service-assignment`  
**PATCH** `/api/v1/clinic/branches/:branchId/doctors/:memberId/service-assignment/bulk`  
Body: `{ "ops": [{ "op": "upsert"|"delete", "serviceId", "role?", "isAllowed?" }] }`  
**GET/POST** `/api/v1/clinic/branches/:branchId/doctors/service-assignment/templates`  
**PATCH/DELETE** `.../templates/:templateId`  
**POST** `.../templates/:templateId/apply` — `{ "memberId", "mode": "merge"|"replace" }`

Response shapes align with TypeScript types in `bpa_web/src/types/doctorServiceAssignment.ts`.

---

## 11–13. Frontend Architecture, Components, Loading

Feature flag `NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2=true` enables new UI; otherwise legacy matrix. Doctor-first load: summary → per-doctor assignment payload.

---

## 14. Pricing / Fee Integration

List price from `Service.price`; per-service doctor fee from `getDoctorFees` when user has fee-view permissions.

---

## 15. Templates

Branch-wide or `scope: "MEMBER"` with `branchMemberId`; apply merge/replace with confirmation in UI.

---

## 16. Auditability

`SERVICE_MAPPING_*` actions in `DoctorAuditLog`; UI uses `staffDoctorsAuditLogs` with `action` filter `SERVICE_MAPPING`.

---

## 17. Validation Rules

Server enforces role ∈ allowed set for category; inactive doctor cannot receive new assignments; inactive service cannot be newly assigned; bulk returns per-index errors without silent drops.

---

## 18. Rollout

Feature flag; keep `service-matrix` for rollback.

---

## 19. Implementation Phases

Phases 1–7 as in the approved plan (contracts → backend → UI shell → cards → bulk/templates → audit → hardening).

---

## 20. File Map

See git history for: `bpa_web/.../service-assignment/**`, `bpa_web/src/types/doctorServiceAssignment.ts`, `bpa_web/lib/api.ts`, `backend-api/prisma/schema.prisma`, `doctorServiceAssignmentRoles.ts`, `staffDoctorManagement.service.ts`, `staffDoctorManagement.controller.ts`, `clinic.routes.ts`, `staffDoctorManagement.service.assignment.test.ts`.

---

## 21–24. Testing, Acceptance, Risks, Approach

Jest tests for role policy + bulk validation; manual QA on two-pane UI, permissions, audit rows. Open decisions: approval workflow for all assignment changes, canonical unassign (delete vs `isAllowed`).

---

## Inspection summary

```
INSPECTED: staff service-assignment page, lib/api clinic doctors routes,
  staffDoctorManagement service/controller/routes, prisma DoctorServiceMapping,
  DoctorAuditLog, Service/ServiceCategory, FeesTab permission pattern.
DELIVERABLE: This file + implemented APIs + V2 UI behind NEXT_PUBLIC_FEATURE_DOCTOR_ASSIGNMENT_V2.
```
