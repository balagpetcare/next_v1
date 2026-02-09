# Location Unified Fix

## What Changed

### 1. Unified Approach for All Countries
- **Before:** Bangladesh used special DB-driven fields (Division → District → Upazila → Ward). Other countries used State/Province + City + Postal.
- **After:** All countries, including Bangladesh, use the same fields: **Country → State/Province → City → Postal/ZIP + Address Line + Map**.

### 2. Country Select
- **Before:** Required typing in a text input; dropdown was limited.
- **After:** Searchable dropdown (type-to-filter) with full country list. Results panel shows filtered options.

### 3. Address Line
- **Before:** Address line was sometimes implicit or combined with other fields.
- **After:** Dedicated **Address Line** field (House/Road/Area) that is manually typeable and saved.

### 4. Map Search Overlay (Z-Index Fix)
- **Before:** Map search bar and current-location button could be hidden under Leaflet map tiles.
- **After:** Dedicated overlay container (`map-overlay-container`) with `position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 9999`. Explicit Leaflet pane hierarchy (tile 1 → overlay 2 → shadow 3 → marker 4 → tooltip 5 → popup 6 → control 100). Search and GPS button always above tiles, clickable, visible on zoom/pan. Wrapper uses `overflow: visible` to avoid clipping.

### 5. Map Search Behavior
- Searching moves the marker to the selected location.
- Updates `lat`/`lng` and `formattedAddress` via reverse geocode.
- Current-location button sets marker to user’s position and fills address via reverse geocode.

### 6. Data Source Policy
- **Removed:** Bangladesh special-case UI loading from DB (`/locations/divisions`, `/locations/districts`, `/locations/upazilas`, `/locations/bd-areas`).
- **Added:** Static endpoints with no DB dependency:
  - `GET /api/v1/geo/countries` – country list from static JSON
  - `GET /api/v1/geo/states?country=BD` – states from static dataset
  - `GET /api/v1/geo/search?q=...&country=...` – Nominatim proxy
  - `GET /api/v1/geo/reverse?lat=...&lng=...` – Nominatim proxy
- **DB seeders:** `seedBaseBdLocations` still populates `bd_divisions`, `bd_districts`, `bd_upazilas`, `bd_areas` for backward compatibility. The UI no longer uses these for dropdowns.

### 7. Stored Data Shape
We store only:
- `countryCode`, `countryName`
- `stateName` (optional), `cityName` (optional), `postalCode` (optional)
- `addressLine`, `formattedAddress`
- `lat`, `lng`

Existing `divisionId`/`districtId`/`upazilaId` columns are kept for backward compatibility but are not required for the unified UI.

---

## How It Works Now

### Components
- **`LocationPickerUnified`** (`components/common/LocationPickerUnified.tsx`) – main unified picker.
- **`LocationField`** (`src/components/location/LocationField.tsx`) – delegates to `LocationPickerUnified`.
- **`MapPickerUnified`** – thin wrapper around `MapPicker` for correct z-index behavior.

### Flow
1. User selects **Country** (searchable dropdown).
2. **State/Province** – searchable dropdown if a static list exists, otherwise free text.
3. **City** – text input.
4. **Postal/ZIP** – text input.
5. **Address Line** – free text (House/Road/Area).
6. **Formatted Address** – read-only preview from map or manual fields.
7. **Coordinates** – Lat/Lng (read-only or editable).
8. **Map** – search bar + current-location button above tiles; search updates marker, lat/lng, and formatted address.

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/geo/countries` | Country list (static) |
| `GET /api/v1/geo/states?country=XX` | States for country (static) |
| `GET /api/v1/geo/search?q=...&country=...` | Forward geocode via Nominatim |
| `GET /api/v1/geo/reverse?lat=...&lng=...` | Reverse geocode via Nominatim |

### Validation
Business step completion now requires one of:
- `fullPathText`, `text`, or `formattedAddress`, or
- `countryCode` plus at least one of `state`, `city`, or `addressLine`.

The old requirement (`bdAreaId` or `dhakaAreaId`) has been removed.

---

## How to Test

### 1. Bangladesh Same as Other Countries
- Go to Organization create/edit.
- Select **Bangladesh**.
- Confirm: State/Province, City, Postal, Address Line (no Division/District/Upazila).

### 2. Country Dropdown Searchable
- Open country dropdown.
- Type e.g. `Saudi` or `Can`.
- Confirm a filtered list appears and you can select a country.

### 3. Address Line Typed and Saved
- Type in Address Line (e.g. `House 5, Road 12`).
- Save.
- Reload; confirm the value is preserved.

### 4. Map Search Bar and Current Location Always Visible (Z-Index)
- Open the map section.
- Confirm the search bar (top center) and current-location button (bottom-right) stay above the map tiles and remain clickable.
- **Bangladesh:** Select country Bangladesh → open map → search "Dhaka" → verify overlay stays visible on zoom/pan.
- **Saudi Arabia:** Select country Saudi Arabia → open map → search "Riyadh" → verify overlay stays visible on zoom/pan.
- If parent has `overflow: hidden`, ensure the map wrapper uses `overflow: visible` (or move map outside that parent).

### 5. Map Search Moves Marker
- Enter a location in the map search bar (e.g. `Banasree, Dhaka`).
- Submit search.
- Confirm the marker moves, lat/lng update, and formatted address shows.

### 6. No UI Use of DB Location Seeders
- Ensure no requests to `/api/v1/locations/divisions`, `/api/v1/locations/districts`, `/api/v1/locations/upazilas`, `/api/v1/locations/bd-areas` when using the unified picker.
- Country and state data come from `/api/v1/geo/countries` and `/api/v1/geo/states`.

---

## See Also

- [LOCATION_BD_AUDIT_REMOVAL.md](./LOCATION_BD_AUDIT_REMOVAL.md) – audit of BD-only logic removal

## Files Touched

### New
- `components/common/LocationPickerUnified.tsx`
- `src/components/location/MapPickerUnified.tsx`
- `backend-api/src/api/v1/modules/geo/geo.data.ts`
- `backend-api/src/api/v1/modules/geo/geo.controller.ts`
- `backend-api/src/api/v1/modules/geo/geo.routes.ts`

### Modified
- `src/components/location/LocationField.tsx` – delegates to `LocationPickerUnified`, removed `BdHierarchyPicker`
- `lib/admin1.ts` – added BD divisions to `ADMIN1_BY_COUNTRY`
- `public/assets/css/extra.css` – map z-index fixes
- `app/owner/organizations/_components/OrganizationWizardForm.jsx` – validation
- `app/owner/organizations/[id]/edit/page.jsx` – validation, address hydration
- `app/owner/organizations/[id]/registration/page.jsx` – validation
- `backend-api/src/api/v1/routes.ts` – mount `/geo` router
