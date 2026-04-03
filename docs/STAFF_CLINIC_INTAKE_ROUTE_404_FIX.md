# Staff Clinic Intake Route 404 Fix + Phone/Email Support

**Date:** 2026-03-19  
**Issue A:** `http://localhost:3104/staff/branch/1/clinic/intake/5` returns 404  
**Issue B:** Intake user creation only supports phone, not email  
**Status:** ✅ COMPLETED

---

## Problem A: Route 404

Staff clinic intake route `/staff/branch/[branchId]/clinic/intake/[appointmentId]` returned 404 on port 3104 (owner mode).

---

## Problem B: Phone-Only User Creation

In the clinic/staff intake flow, user creation/search currently works only with mobile number. It must support:
- Phone only
- Email only
- Phone + email

---

## Root Cause Analysis

### PROBLEM A: Dual App Directory Conflict (TRUE ROOT CAUSE)

**Critical Finding:** Next.js project has **TWO** `app` directories:

1. **`app/`** (root-level) - Primary app directory
   - Has `layout.jsx` as root layout
   - Contains `app/staff/(larkon)/branch/[branchId]/clinic/intake/[appointmentId]/page.jsx` ✅

2. **`src/app/`** (inside src) - Secondary app directory
   - Has `layout.tsx` 
   - Contains **EMPTY** `src/app/staff/branch/[branchId]/clinic/intake/[appointmentId]/` directory ❌

**Next.js Behavior:**
When both `app/` and `src/app/` exist, Next.js **prioritizes `src/app/` over `app/`** for route resolution. Since `src/app/staff/branch/[branchId]/clinic/intake/[appointmentId]/` is empty (no `page.jsx`), the route returns 404 even though the actual implementation exists in `app/staff/(larkon)/...`.

**Why Previous Fix Failed:**
The previous fix removed `app/staff/branch/[branchId]/clinic/intake/` but did NOT remove `src/app/staff/branch/[branchId]/clinic/intake/`, which is the actual shadowing directory.

### PROBLEM B: Backend vs Frontend Mismatch

**Backend (ALREADY SUPPORTS EMAIL):**
- `findOwnerByPhoneOrEmail()` in `patient.service.ts` correctly handles both phone and email
- Email detection: checks if input contains `@`
- Email matching: case-insensitive exact match
- Phone matching: normalized digits with variants (0-prefix, 88-prefix for BD)

**Frontend (PHONE-ONLY):**
- `staffClinicEnsureOwner()` API only accepts `{ phone, displayName }`
- No `email` field in the request payload
- UI shows "Phone or email" placeholder but only sends phone
- Validation doesn't support email-only creation

---

## Fix Strategy

### Fix A: Remove Shadowing src/app Directory

**Remove the entire empty staff route tree from src/app:**

```bash
src/app/staff/
```

This will allow Next.js to use the canonical routes in `app/staff/(larkon)/...`.

### Fix B: Add Email Support to User Creation

**Backend Changes:**
1. Update `ensureOwnerByPhone()` → `ensureOwner()` to accept both phone and email
2. Add validation: at least one of phone or email required
3. Reuse existing `findOwnerByPhoneOrEmail()` logic

**Frontend Changes:**
1. Update `staffClinicEnsureOwner()` API to accept `{ phone?, email?, displayName }`
2. Update register page UI to support email input
3. Add validation: require at least one of phone or email
4. Update error messages and placeholders

---

## Implementation Plan

### Phase 1: Fix Route 404

**Files to Remove:**

```text
d:\BPA_Data\bpa_web\src\app\staff\
```

**Command:**

```powershell
Remove-Item -Path "d:\BPA_Data\bpa_web\src\app\staff" -Recurse -Force
```

**Result:**
Only canonical routes remain in `app/staff/(larkon)/...`.

### Phase 2: Backend - Add Email Support

**File:** `backend-api/src/api/v1/modules/clinic/patient.service.ts`

**Changes:**
1. Rename `ensureOwnerByPhone()` → `ensureOwner()`
2. Accept `{ phone?, email?, displayName? }`
3. Validate: at least one of phone or email required
4. Create user with phone OR email OR both
5. Reuse `findOwnerByPhoneOrEmail()` for duplicate check

**File:** `backend-api/src/api/v1/modules/clinic/clinic.controller.ts`

**Changes:**
1. Update `/patients/ensure-owner` endpoint to accept email
2. Update validation and error messages

### Phase 3: Frontend - Add Email Support

**File:** `bpa_web/lib/api.ts`

**Changes:**
1. Update `staffClinicEnsureOwner()` signature:
   ```typescript
   { phone?: string; email?: string; displayName?: string }
   ```

**File:** `bpa_web/app/staff/(larkon)/branch/[branchId]/clinic/patients/register/page.jsx`

**Changes:**
1. Add `newOwnerEmail` state
2. Add email input field
3. Update validation: require phone OR email (at least one)
4. Update `createOwner()` to send both phone and email
5. Update placeholders and labels
6. Update error messages

---

## Validation Steps

### Route Fix Validation

1. Remove `src/app/staff` directory
2. Restart dev server (port 3104): `npm run dev:owner`
3. Navigate to: `http://localhost:3104/staff/branch/1/clinic/intake/5`
4. **Expected:** Intake page loads successfully (no 404, no build error)
5. Verify appointment data displays correctly

### Phone/Email Support Validation

**Test Case 1: Create owner with phone only**
1. Go to patient register page
2. Enter phone only (e.g., `01777888993`)
3. Click "Create Owner"
4. **Expected:** Owner created successfully

**Test Case 2: Create owner with email only**
1. Go to patient register page
2. Enter email only (e.g., `owner@example.com`)
3. Click "Create Owner"
4. **Expected:** Owner created successfully

**Test Case 3: Create owner with both phone and email**
1. Enter both phone and email
2. Click "Create Owner"
3. **Expected:** Owner created with both fields

**Test Case 4: Search by email**
1. Search for existing owner by email
2. **Expected:** Owner found correctly

**Test Case 5: Validation - both empty**
1. Leave both phone and email empty
2. Click "Create Owner"
3. **Expected:** Error message "Phone or email is required"

**Test Case 6: Duplicate email**
1. Try to create owner with existing email
2. **Expected:** Returns existing owner (no duplicate created)

**Test Case 7: Duplicate phone**
1. Try to create owner with existing phone
2. **Expected:** Returns existing owner (no duplicate created)

---

## Related Documentation

- `CLINIC_INTAKE_RETURN_FLOW_FIX.md` - Intake page behavior and return flow from patient registration
- `STAFF_ROUTES_REGRESSION_FIX_2026-02-18.md` - Staff branch sidebar and route structure

---

## Architecture Notes

### Dual App Directory Issue

**Root Cause:**
Next.js supports both `app/` and `src/app/` directories, but when both exist, `src/app/` takes precedence. This project has:
- `app/` - Contains all actual route implementations
- `src/app/` - Contains only owner routes and empty staff directories

The empty `src/app/staff/` directory shadows the real `app/staff/` routes, causing 404s.

**Resolution:**
Remove `src/app/staff/` entirely. Keep only `src/app/owner/` and `src/app/api/` if needed.

**Prevention:**
- Never create routes in both `app/` and `src/app/`
- Use only one app directory structure
- If `src/app/` is needed for specific routes (e.g., owner), ensure no overlapping paths with `app/`

### User Creation Pattern

**Existing Pattern (Backend):**
- `findOwnerByPhoneOrEmail()` already supports both phone and email
- Email detection: checks for `@` character
- Phone normalization: handles BD phone formats (0-prefix, 88-prefix)

**New Pattern (Frontend):**
- Accept both phone and email in UI
- Validate: at least one required
- Send both to backend when available
- Backend deduplicates using existing logic

---

## Files Modified

### Backend
- `src/api/v1/modules/clinic/patient.service.ts` - Add email support to ensureOwner
- `src/api/v1/modules/clinic/clinic.controller.ts` - Update ensure-owner endpoint

### Frontend
- `lib/api.ts` - Update staffClinicEnsureOwner signature
- `app/staff/(larkon)/branch/[branchId]/clinic/patients/register/page.jsx` - Add email input and validation

## Files Removed

- `src/app/staff/` (entire directory tree)
