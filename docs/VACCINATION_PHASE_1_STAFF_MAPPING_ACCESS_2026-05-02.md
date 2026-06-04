# Vaccination Phase 1 - Staff Mapping Access

**Date:** 2026-05-02  
**Phase:** 1 of 6  
**Status:** Complete

---

## Summary

This phase addresses the **vaccine mapping permission barrier** identified in the Vaccination System Status Report. Previously, vaccine mapping was only accessible via the Owner Panel, which required `clinic.services.manage` permission that regular clinic staff typically do not have.

This implementation creates a staff-accessible vaccine mapping page that allows clinic staff with `clinic.emr.write` permission to configure vaccine-to-inventory mappings from the staff clinic area.

---

## What Changed

### 1. New API Function
**File:** `D:\BPA_Data\bpa_web\lib\api.ts`

Added `staffClinicCatalogItemById(branchId, itemId)` function to fetch clinical item details including variants. This wraps the existing backend endpoint:
```
GET /branches/:branchId/catalog/items/:itemId
```

### 2. New Staff Page
**File:** `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\clinic\vaccine-mappings\page.jsx`

Created a new staff-accessible vaccine mapping page with the following features:
- Lists all vaccine types from the master catalog
- Shows current mapping status (MAPPED, UNMAPPED, INVALID_ITEM, INACTIVE)
- Dropdown to select clinical item (filtered to vaccine-like MEDICINE items)
- Dropdown to select variant (optional, loads variants on demand)
- Notes field for additional information
- Active toggle to enable/disable mappings
- Save button per row with loading state
- Refresh button to reload data
- Success/error message handling
- Back navigation to Vaccination dashboard

**UI Consistency:**
- Uses staff clinic styling (Card, BranchHeader, AccessDenied, PageWorkspace)
- Follows existing staff page patterns
- Bootstrap-based table layout
- Consistent with other staff clinic pages

### 3. Sidebar Menu Update
**File:** `D:\BPA_Data\bpa_web\src\lib\branchSidebarConfig.ts`

Added new menu item under Clinic group:
- **Label:** Vaccine Mapping
- **Icon:** ri:links-line
- **Route:** /staff/branch/[branchId]/clinic/vaccine-mappings
- **Permission:** clinic.emr.write
- **Position:** Immediately after Vaccination menu item

---

## New Route

```
/staff/branch/[branchId]/clinic/vaccine-mappings
```

**Access Requirements:**
- User must have `clinic.emr.write` permission
- Branch must have `clinicEnabled === true`

---

## Permission Used

**Primary Permission:** `clinic.emr.write`

**Rationale:** 
- Staff who can administer vaccinations (require `clinic.emr.write`) should also be able to configure vaccine mappings
- This permission is already standard for clinic staff (veterinarians, nurses)
- Removes the barrier of requiring `clinic.services.manage` which is typically reserved for service catalog managers

**Access Control Flow:**
1. User accesses `/staff/branch/[branchId]/clinic/vaccine-mappings`
2. Page checks `clinic.emr.write` permission via `useBranchContext`
3. If no permission, shows `<AccessDenied missingPerm="clinic.emr.write" />`
4. If permission exists, loads and displays mapping interface

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `D:\BPA_Data\bpa_web\lib\api.ts` | Modified | Added `staffClinicCatalogItemById()` function |
| `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\clinic\vaccine-mappings\page.jsx` | Created | New staff vaccine mapping page |
| `D:\BPA_Data\bpa_web\src\lib\branchSidebarConfig.ts` | Modified | Added "Vaccine Mapping" menu item to Clinic group |
| `D:\BPA_Data\bpa_web\docs\VACCINATION_PHASE_1_STAFF_MAPPING_ACCESS_2026-05-02.md` | Created | This documentation file |

---

## How to Manually Test

### Prerequisites
1. Backend server running on port 3000
2. Frontend dev server running (npm run dev or npm run dev:owner)
3. User account with `clinic.emr.write` permission
4. Branch with `clinicEnabled: true`
5. Existing vaccine types seeded in database
6. Some clinical items with domainType="MEDICINE" and vaccine-like names

### Test Steps

1. **Access the Page:**
   - Navigate to `/staff/branch/{branchId}/clinic/vaccinations`
   - Verify "Vaccine Mapping" appears in left sidebar under Clinic group
   - Click "Vaccine Mapping" menu item
   - Verify URL changes to `/staff/branch/{branchId}/clinic/vaccine-mappings`

2. **Verify Page Loads:**
   - Page title shows "Vaccine Mapping"
   - Subtitle displays description text
   - Back button links to Vaccination page
   - Refresh button present

3. **Check Data Loading:**
   - Vaccine types list loads (may show spinner briefly)
   - Each row shows:
     - Vaccine name (e.g., "Rabies", "DHPP")
     - Target animal type (e.g., "Dog", "All animals")
     - Default interval days
     - Current mapping status badge
   - If items exist: Clinical item dropdown populated
   - If no items: Warning message with link to Clinic Items

4. **Test Mapping Creation:**
   - Select an UNMAPPED vaccine type
   - Select a clinical item from dropdown
   - (Optional) Select a variant if available
   - (Optional) Add notes
   - Toggle "Active" checkbox (default: checked)
   - Click "Save"
   - Verify success message appears
   - Verify status changes to "MAPPED"
   - Refresh page and verify mapping persists

5. **Test Permission Check:**
   - Log in as user WITHOUT `clinic.emr.write` permission
   - Navigate to `/staff/branch/{branchId}/clinic/vaccine-mappings`
   - Verify AccessDenied component is shown
   - Verify message mentions missing `clinic.emr.write` permission

6. **Test Variant Loading:**
   - Select a mapped vaccine
   - Change clinical item selection
   - Verify variant dropdown clears
   - Focus variant dropdown
   - Verify variants load (may show loading state)
   - Select a variant
   - Save and verify variant is saved

7. **Test Edge Cases:**
   - Try to save without selecting clinical item → Save button disabled
   - Try to save with deactivated mapping → isActive=false saved
   - Add notes → Verify notes persist after save
   - Click Refresh → Data reloads

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/branches/:branchId/vaccine-inventory-mappings` | GET | Load existing mappings |
| `/branches/:branchId/vaccine-inventory-mappings/:vaccineTypeId` | PUT | Save/update mapping |
| `/branches/:branchId/items/search?q=vaccine&limit=100` | GET | Search vaccine items |
| `/branches/:branchId/catalog/items/:itemId` | GET | Load item details with variants |

---

## Technical Implementation Notes

### Data Flow
1. Page loads → Calls `staffClinicVaccineInventoryMappings()` to get all vaccine types and their mappings
2. Calls `staffClinicItemSearch()` with `q="vaccine"` to find vaccine-like items
3. Combines search results with already-mapped items to ensure mapped items don't disappear from dropdown
4. Filters items to only show MEDICINE domain, active, inventory-tracked, vaccine-like items
5. User selects item → On focus/change, loads variants via `staffClinicCatalogItemById()`
6. User saves → Calls `staffClinicUpsertVaccineInventoryMapping()` with PUT request
7. On success, reloads page to refresh data

### Helper Functions
- `isVaccineLikeItem()`: Filters items by vaccine-related keywords
- `normalizeMappingRows()`: Normalizes API response to consistent format
- `normalizeClinicalItems()`: Normalizes item data from search results
- `dedupeClinicalItems()`: Removes duplicates and sorts by name
- `buildItemOptionLabel()`: Formats item display string
- `statusBadgeClass()`: Returns CSS class for status badge
- `buildDraft()`: Builds draft state from existing mapping

### State Management
- `rows`: Array of vaccine type mappings
- `itemOptions`: Array of available clinical items for dropdown
- `variantsByItemId`: Object mapping item IDs to their variants (lazy-loaded)
- `drafts`: Object tracking form state per vaccine type
- `savingByVaccineTypeId`: Object tracking save loading state per row
- `loading`: Global loading state for initial data fetch
- `error`/`success`: Message states for user feedback

---

## Known Remaining Limitations

This phase addresses only the **access/navigation** issue. The following limitations from the original status report still exist and will be addressed in subsequent phases:

### P0 (Critical - Phase 6)
- **Stock Reversal on Void**: When voiding a vaccination, stock is NOT automatically reversed. Staff must manually adjust stock. Risk of inventory inaccuracy.
- **Billing Cancellation on Void**: When voiding a vaccination with billing, invoice is NOT automatically cancelled/refunded. Staff must manually handle billing reversal. Risk of financial inaccuracy.

### P1 (Important - Future Phases)
- **Multi-Dose Vial Tracking**: System assumes single-dose vials (quantityDelta: -1). Cannot track partial usage of multi-dose vaccines (e.g., 10-dose Rabies vials). No wastage tracking.
- **QR Code Certificate Verification**: Certificate tokens are generated but QR code shows "Coming soon" placeholder. Digital verification not implemented.

### P2 (Improvements - Future Phases)
- **Vaccination Reports**: No analytics on vaccination coverage, compliance rates, or stock usage patterns.
- **Vaccination Schedule Templates**: Cannot create standard vaccination schedules for species/breeds. Each vaccination requires manual next-due date entry.
- **Bulk Operations**: Cannot administer vaccines to multiple pets at once or import vaccination histories.
- **Reminder Channel Support**: Reminders created in database but SMS/Email/WhatsApp sending not fully implemented.

---

## Rollback Instructions

If issues are discovered, rollback by:

1. Remove sidebar menu item from `branchSidebarConfig.ts`
2. Delete `D:\BPA_Data\bpa_web\app\staff\(larkon)\branch\[branchId]\clinic\vaccine-mappings\` directory
3. Remove `staffClinicCatalogItemById` function from `lib/api.ts`
4. Delete this documentation file

No database changes or backend modifications were made, so no rollback needed there.

---

## Next Phase

**Phase 2: Vaccine Mapping Completion**

Goals:
- Run seed scripts to ensure vaccine types exist
- Configure all vaccine mappings for the organization
- Test mapping workflow end-to-end
- Add additional vaccine types if needed
- Validate fallback matching works correctly

See VACCINATION_SYSTEM_STATUS_REPORT_2026-05-02.md for full implementation plan.

---

*Document created: 2026-05-02*  
*Phase implemented by: OpenCode Agent*
