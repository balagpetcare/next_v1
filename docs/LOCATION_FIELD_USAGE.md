# LocationField Adoption Guide

Use the single reusable `LocationField` component for any form that collects a location (create/edit, any entity).

## Import
```tsx
import LocationField from "@/src/components/location/LocationField";
```

## Basic usage (create)
```tsx
const [location, setLocation] = useState(null);

<LocationField
  value={location}
  onChange={setLocation}
  label="Business Location"
  defaultCountryCode="BD"
  enableRecent
  enableGPS
  enableMap
  enableBdHierarchy
/>;
```

## Edit usage (prefill)
- Pass the stored address/location object to `value`; it accepts legacy shapes and normalizes them.
- On change, `LocationField` returns a normalized `LocationValue` plus back-compat fields (`fullPathText`, `bdAreaId`, `latitude/longitude`, etc.).

## Payload mapping
- To build `addressJson`, call:
```ts
import { locationValueToAddressJson } from "@/src/lib/location/normalizeLocation";

const addressJson = locationValueToAddressJson(location, { addressText });
```
- To build `/me/location/manual` payload, call:
```ts
import { locationValueToPlaceInput } from "@/src/lib/location/normalizeLocation";
const place = locationValueToPlaceInput(location);
```
- `areaId` maps to BD Area/Ward; `state`/`city`/`postalCode` map to global fields; `lat`/`lng` are provided with `latitude`/`longitude` mirrors.

## Notes
- WowDash UI ready (`radius-12`, cards).
- Map uses Leaflet with proper cleanup to avoid “Map container is already initialized”.
- Bangladesh hierarchy: Division → District → Upazila → Area/Ward via `BdHierarchyPicker`.
- Recent locations stored in localStorage; disable with `enableRecent={false}` if not needed.
