# ADMIN Larkon Assets Resync (2026-02-17)

## Scope
- Goal: resync full Larkon template runtime assets for dashboard routes only.
- Kept unchanged: public/landing route structure and non-Larkon app code.
- No runtime imports from `_vendor_templates` were added.

## Phase 1: TEMPLATE_ROOT Detection
- Candidate template roots found:
  - `_vendor_templates/Larkon-Nextjs_v2.0.2/Larkon/JS`
  - `_vendor_templates/Larkon-Nextjs_v2.0.2/Larkon/TS`
- Selected `TEMPLATE_ROOT`:
  - `_vendor_templates/Larkon-Nextjs_v2.0.2/Larkon/TS`
- Why TS root:
  - Contains `package.json`
  - Contains `src/assets/scss`, `src/assets/images`, `src/assets/fonts`
  - Matches current runtime alias + TypeScript code layout

## Phase 2: Runtime Target Detection
- Alias mapping in `tsconfig.json`:
  - `"@larkon/*": ["src/larkon-admin/*"]`
- Dashboard layout import remains:
  - `import '@larkon/assets/scss/app.scss'`
- Runtime targets:
  - `TARGET_SCSS_DIR`: `src/larkon-admin/assets/scss`
  - `TARGET_JS_DIR`: not applicable (`src/assets/js` does not exist in template/runtime)
  - `TARGET_PUBLIC_DIR`: not used for Larkon Next runtime (template uses module/bundled assets under `src/assets/*`)
- Public `public/assets/*` is left untouched for landing/public flows.

## Phase 3: Quarantine of Previous Vendor Assets
- Created quarantine path:
  - `_quarantine_cleanup/2026-02-17/larkon_vendor_assets_prev/`
- Moved previous runtime vendor asset folders:
  - `src/larkon-admin/assets/scss` -> `_quarantine_cleanup/2026-02-17/larkon_vendor_assets_prev/scss`
  - `src/larkon-admin/assets/images` -> `_quarantine_cleanup/2026-02-17/larkon_vendor_assets_prev/images`
  - `src/larkon-admin/assets/fonts` -> `_quarantine_cleanup/2026-02-17/larkon_vendor_assets_prev/fonts`
- No app routes/pages/components were moved.

## Phase 4: Full Asset Sync
- Synced from `TEMPLATE_ROOT` to runtime targets with directory structure preserved:
  - `src/assets/scss/**` -> `src/larkon-admin/assets/scss/**`
  - `src/assets/images/**` -> `src/larkon-admin/assets/images/**`
  - `src/assets/fonts/**` -> `src/larkon-admin/assets/fonts/**`
- JS sync skipped (no template/runtime `assets/js` in Next template).
- Integrity verification:
  - SCSS: 153 source files, 153 target files, 0 hash mismatches
  - Images: 129 source files, 129 target files, 0 hash mismatches
  - Fonts: 14 source files, 14 target files, 0 hash mismatches

## Phase 5: Imports and Path References
- Confirmed dashboard layouts still use `@larkon/assets/scss/app.scss`.
- Confirmed `@larkon` alias still resolves to `src/larkon-admin/*`.
- Searched runtime code for `_vendor_templates` references: none found (except `tsconfig.json` exclude).
- No SCSS URL rewrite needed; template relative structure preserved.

## Phase 6: Verification
- Dependency check:
  - `npm install` completed successfully.
- Build check:
  - `npm run build` completed successfully.
- Runtime smoke check:
  - Started `npm run dev:admin` (port 3103).
  - Requested dashboard route (`/admin/dashboard`) and linked local assets.
  - Sampled linked local assets (`/_next/*`, `/assets/*`) returned no 404 in probe set.
  - Dev server then stopped.

## Apply Steps Used
1. Quarantine existing runtime Larkon vendor folders into `_quarantine_cleanup/2026-02-17/larkon_vendor_assets_prev/`.
2. Copy full template assets from `TEMPLATE_ROOT/src/assets/{scss,images,fonts}` into `src/larkon-admin/assets/{scss,images,fonts}`.
3. Keep alias/imports unchanged (`@larkon` + `@larkon/assets/scss/app.scss`).
4. Run `npm install` then `npm run build`.
5. Run `npm run dev:admin` and perform route/asset smoke check.
