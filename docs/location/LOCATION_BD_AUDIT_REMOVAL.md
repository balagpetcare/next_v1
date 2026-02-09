# Bangladesh-Only Location Logic Audit & Removal

## Summary

All Bangladesh-only logic that loads Division/District/Upazila/Ward from database seeders for location selection has been removed or deprecated. The UI now uses a single unified `LocationPickerUnified` with static country/state data and Nominatim for geocoding.

## Changes Made

### 1. UI Components – Stop Reading from DB

| Component | Before | After |
|-----------|--------|-------|
| `LocationSelector` | Fetched `/locations/divisions`, `/districts`, `/upazilas`, `/bd-areas` | Delegates to `LocationPickerUnified` (uses `/geo/countries`, `/geo/states`) |
| `EnhancedLocationDropdown` | Fetched divisions, districts, upazilas, bd-areas, city-corporations, areas | Delegates to `LocationPickerUnified` |
| `UnifiedLocationPicker` | Used LocationSelector (BD) + DhakaCityAreaDropdown | Delegates to `LocationPickerUnified` |
| `ImprovedLocationPicker` | Used EnhancedLocationDropdown | Delegates to `LocationPickerUnified` |
| `BdHierarchyPicker` | Fetched divisions/districts/upazilas/bd-areas | Deprecated (no longer used by LocationField) |
| `LocationField` | Used BdHierarchyPicker for BD | Uses `LocationPickerUnified` only |

### 2. Pages Using Location

| Page | Status |
|------|--------|
| Organization create/edit | Uses `LocationField` → `LocationPickerUnified` |
| Organization registration | Uses `LocationField` |
| Branch form | Uses `LocationField`, validation updated to unified fields |
| Owner profile | Uses `LocationField`, switched to `addressJson` (state/city/addressLine) |
| KYC | Placeholder updated to "House/Road, Area, City" |

### 3. Backend

- **Owner profile**: Accepts `addressJson` (countryCode, stateName, cityName, postalCode, addressLine, latitude, longitude). `validateBdLocationRefs` runs only when `divisionId`/`districtId`/`upazilaId`/`areaId` are provided.
- **Migration**: `20260206120000_owner_profile_address_json` adds `addressJson` to `owner_profiles`. `divisionId`/`districtId`/`upazilaId`/`areaId` remain for backward compatibility.
- **Locations API**: `/locations/divisions`, `/districts`, `/upazilas`, `/bd-areas` still exist but are not used by the UI. Kept for legacy consumers.

### 4. Data Flow

- **Country/State**: Static via `/api/v1/geo/countries` and `/api/v1/geo/states`
- **Search**: Nominatim proxy via `/api/v1/geo/search`
- **Reverse geocode**: Nominatim proxy via `/api/v1/geo/reverse`
- **Stored shape**: `countryCode`, `stateName`, `cityName`, `postalCode`, `addressLine`, `formattedAddress`, `lat`, `lng`

### 5. NormalizeLocation / locationPlace

- `locationValueToPlaceInput` uses `state`/`city` for all countries.
- Legacy BD mapping (`bdDivision`, `bdDistrict`, etc.) only applied when `divisionId` is present.

## Files Touched

### Modified
- `app/owner/profile/page.jsx` – unified location, `addressJson`
- `app/owner/_components/branch/BranchForm.jsx` – validation
- `app/owner/organizations/[id]/edit/page.jsx` – placeholder
- `app/owner/organizations/_components/OrganizationWizardForm.jsx` – placeholder
- `app/owner/kyc/page.jsx` – placeholder
- `app/owner/_components/location/UnifiedLocationPicker.jsx` – delegates
- `app/owner/_components/location/LocationSelector.jsx` – delegates
- `app/owner/_components/location/EnhancedLocationDropdown.jsx` – delegates
- `src/components/location/bd/BdHierarchyPicker.tsx` – deprecated
- `src/lib/location/normalizeLocation.ts` – unified place mapping
- `backend-api/src/api/v1/modules/owner/owner.controller.ts` – `addressJson`, optional BD validation
- `backend-api/prisma/schema.prisma` – `addressJson` on OwnerProfile

### New
- `backend-api/prisma/migrations/20260206120000_owner_profile_address_json/migration.sql`

## Tables/Migrations

- **No deletions**. `bd_divisions`, `bd_districts`, `bd_upazilas`, `bd_areas` and related migrations are unchanged.
- Seed scripts (`seedBaseBdLocations`) still run; the UI no longer uses them for dropdowns.

## Tests

- Manual checks recommended:
  1. Bangladesh shows State/City/Postal/Address (no Division/District/Upazila).
  2. No calls to `/locations/divisions`, `/districts`, `/upazilas`, `/bd-areas` from the location picker.
  3. Owner profile save/load with `addressJson` works.
  4. Organization/branch location save/load with unified fields works.
