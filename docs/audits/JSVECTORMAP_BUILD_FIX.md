# jsvectormap Production Build Fix

**Date:** 2026-06-06

## Root cause

`package.json` specified `"jsvectormap": "^1.3.2"`, which npm resolved to **1.7.0**. In 1.7.0 the npm package only ships `dist/maps/world.js` and `world-merc.js`. Country maps (`spain.js`, `us-merc-en.js`, `russia.js`, etc.) were removed from the package and must be downloaded separately per [jsvectormap docs](https://jvm-docs.vercel.app/docs/available-maps).

Imports in `src/larkon-admin/components/VectorMap/*.tsx` use the **1.3.x paths** (`jsvectormap/dist/maps/spain.js`, etc.), which do not exist in 1.7.0.

## Fix

Pin exact version: `"jsvectormap": "1.3.2"` (includes all required country map files).

## Package version

- **Before (lockfile):** 1.7.0  
- **After (pinned):** 1.3.2

## Validation

```bash
npm run validate:jsvectormap
npm run build
```

Both PASS.
