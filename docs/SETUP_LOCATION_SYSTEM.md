# Location System Setup Instructions

## Installation Steps

### 1. Install Frontend Dependencies

Navigate to the `bpa_web` directory and install the required map libraries:

**Note:** A `.npmrc` file has been created to handle the React 19 peer dependency conflict automatically. You can now install normally:

```bash
cd D:\BPA_Data\bpa_web
npm install
```

This will install `react-leaflet` and `leaflet` along with all other dependencies. The `.npmrc` file uses `legacy-peer-deps=true` to allow React 19 compatibility - this is safe as `react-leaflet` works fine with React 19, it just hasn't updated its peer dependency requirements yet.

### 2. Run Database Migration

Navigate to the `backend-api` directory and run the migration to add coordinate fields:

```bash
cd D:\BPA_Data\backend-api
npx prisma migrate dev --name add_location_coordinates
npx prisma generate
```

### 3. Restart Development Servers

After installing dependencies and running migrations:

1. **Restart Backend API** (if running):
   ```bash
   cd D:\BPA_Data\backend-api
   npm run dev
   ```

2. **Restart Frontend** (if running):
   ```bash
   cd D:\BPA_Data\bpa_web
   npm run dev:owner
   ```

## Features

Once installed, the enhanced location system provides:

- **Map-based location picker** with drag-drop marker
- **Geocoding search** (free, using OpenStreetMap/Nominatim)
- **Enhanced dropdown** showing all location fields together
- **Auto-sync** between map coordinates and dropdown selection
- **Backward compatible** with existing location components

## Troubleshooting

### Map not showing?

1. Ensure dependencies are installed: `npm install react-leaflet leaflet`
2. Restart the development server after installation
3. Check browser console for any errors

### Geocoding not working?

1. Ensure backend API is running
2. Check that `/api/v1/locations/geocode` endpoint is accessible
3. Nominatim API is free but has rate limits - if issues persist, check backend logs

### Database migration errors?

1. Ensure Prisma is up to date: `npm install prisma @prisma/client`
2. Check database connection in `.env` file
3. Run `npx prisma generate` after migration

## Usage

The enhanced location picker is now enabled in:
- Branch forms (Edit/Create)
- Organization forms
- Any form using `UnifiedLocationPicker` with `useEnhanced={true}`

You can switch between three modes:
- **Map**: Interactive map with search and drag-drop
- **Dropdown**: Enhanced dropdown with all locations
- **Combined**: Both map and dropdown side-by-side with auto-sync
