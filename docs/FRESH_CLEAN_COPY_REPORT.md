# Fresh Clean Copy Report

**Date:** 2026-02-17  
**Source:** `D:\BPA_Data\bpa_web`  
**Target:** `D:\BPA_Data\next_app\next_v1`

---

## 1. What was done

### PHASE 1 — Prepare target
- **Target existed:** Yes. Existing contents were moved to a timestamped backup.
- **Backup location:** `D:\BPA_Data\next_app\_backup_next_v1\2026-02-17_0541\`
- **Fresh folder:** `D:\BPA_Data\next_app\next_v1` was left empty (ready for copy).

### PHASE 2 — Clean copy (robocopy)
- **Tool:** `robocopy` with `/E` (subdirectories including empty), `/R:1` `/W:1`, and exclusions.
- **Folders copied (from source):**
  - `app\`
  - `components\`
  - `docs\`
  - `lib\`
  - `public\`
  - `scripts\`
  - `src\`
- **Root files copied:**
  - `package.json`, `package-lock.json`
  - `next.config.js`, `next.config.mjs`
  - `tsconfig.json`, `jsconfig.json`
  - `postcss.config.js`, `tailwind.config.js`
  - `eslint.config.mjs`, `.eslintrc.json` (`.eslintrc.json.bak` also present)
  - `.gitignore`, `.npmrc`, `.cursorrules`
  - `next-env.d.ts` (later removed as build artifact)
  - `proxy.ts`
  - `VERSION.json`
  - All root `*.md` (e.g. `README`-style docs, `BPA_STANDARD.md`, `PROJECT_CONTEXT.md`, etc.)
- **Build artifact removed after copy:** `tsconfig.tsbuildinfo` (and `next-env.d.ts` so Next.js can regenerate it).

### PHASE 3 — Env handling
- **No `.env` or `.env.*` files were copied** (excluded by robocopy).
- **Created:** `D:\BPA_Data\next_app\next_v1\.env.example` with placeholder keys only (no secrets):
  - `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AUTH_BASE_URL`, `AUTH_COOKIE_NAME`, `NEXT_PUBLIC_DEFAULT_PANEL`
- **`.gitignore` in target** was updated to include: `.env`, `.env*`, `.env*.local` so env files and build artifacts are not committed.

### PHASE 4 — Install and verify
- **Install command used:** `npm ci` (because `package-lock.json` exists).
- **Build command:** `npm run build`
- **Build result:** **Success.** Next.js 16.1.6 (Turbopack), compiled in ~55s, 159 static pages generated.
- **Runtime check:** `npm run dev:owner` was started; server reported ready (no missing-module errors).

---

## 2. What was excluded (never copied)

- **Directories:**  
  `_vendor_templates`, `_quarantine_cleanup`, `node_modules`, `.next`, `out`, `dist`, `build`, `coverage`, `.turbo`, `.cache`
- **Files / patterns:**  
  `*.log`, `*.zip`, `*.rar`, `*.7z`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`, `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`, `.env*`
- **Lockfile:** `package-lock.json` was **preserved** (copied); no yarn/pnpm lockfile in source.

---

## 3. Not present in source (so not copied)

- `prisma\` — folder does not exist in source.
- `types\` — folder does not exist in source (root).
- `middleware.ts` / `middleware.js` — not in source root (middleware may be under `app` or elsewhere).
- `.prettierrc*`, `.editorconfig`, `components.json` — not in source root.

---

## 4. Post-copy state of target

- **Source files + configs:** Only clean source and config files; no `node_modules`, no `.next`, no logs/zips/caches, no env secrets.
- **After `npm ci`:** `node_modules` present (565 packages).
- **After `npm run build`:** `.next` present (production build).
- **File count (excluding `node_modules` and `.next`):** 2369 files.

---

## 5. How to run from target

```batch
cd /d D:\BPA_Data\next_app\next_v1
copy .env.example .env
rem Edit .env with real values if needed
npm run dev
rem Or: npm run dev:owner, npm run dev:admin, etc.
```

Build is already done; for production run: `npm run start` (after configuring `.env` as needed).
