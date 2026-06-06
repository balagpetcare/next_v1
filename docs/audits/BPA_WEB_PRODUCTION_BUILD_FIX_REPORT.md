# BPA Web — VectorMap Production Build Fix

**Date:** 2026-06-06  
**Branch:** `main`  
**Commit message:** `fix: restore larkon vectormap module and resolve production build`

---

## Root cause

Production build failed with `Module not found: @larkon/components/VectorMap` for two reasons:

1. **Filesystem mismatch on VPS** — The module directory was renamed locally to `VectorMap_backup`, so imports resolving to `src/larkon-admin/components/VectorMap` failed. Git history always tracked `VectorMap/` (9 files); the backup name was a **manual server-side rename**, not a committed repo change.

2. **Incomplete Next.js path aliases** — `next.config.js` only configured Turbopack aliases. Linux/webpack production builds also need `webpack.resolve.alias` for `@larkon` and `@larkon-ui` (matching `tsconfig.json`).

3. **CSS build tools in devDependencies** — `tailwindcss` / `postcss` / `autoprefixer` were omitted when VPS runs `npm ci --omit=dev` (moved to `dependencies`).

---

## Files modified

| File | Change |
|------|--------|
| `next.config.js` | Webpack + Turbopack aliases for `@larkon`, `@larkon-ui` |
| `package.json` | Build deps in `dependencies`; validation/restore scripts |
| `package-lock.json` | Regenerated |
| `scripts/restore-vectormap-module.mjs` | Renames `VectorMap_backup` → `VectorMap` when needed |
| `scripts/validate-path-aliases.mjs` | Detects backup-only state |
| `scripts/validate-production-build.mjs` | Validates `npm ci --omit=dev` |
| `docs/audits/BPA_WEB_PRODUCTION_BUILD_FIX_REPORT.md` | Full audit |

**VectorMap source** — unchanged; module already correct in git (`index.tsx` exports all required maps).

---

## Exports verified (`index.tsx`)

- `WorldVectorMap`
- `CanadaVectorMap`
- `RussiaVectorMap`
- `SpainVectorMap`
- `IraqVectorMap`
- (also `UsaVectorMap`, `ItalyVectorMap`)

---

## Validation

```bash
npm install --include=dev
node scripts/validate-path-aliases.mjs
node scripts/restore-vectormap-module.mjs   # no-op when VectorMap present
npm run build
```

**Final build result:** PASS — 395 routes, exit code 0.

---

## VPS (if VectorMap_backup exists)

```bash
git pull origin main
node scripts/restore-vectormap-module.mjs
npm ci --omit=dev
npm run build
```
