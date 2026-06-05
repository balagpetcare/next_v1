# Production Build & GitHub Sync Report

**Date:** 2026-06-06  
**Repository:** `bpa_web`  
**Active branch:** `main` → `origin/main` (`https://github.com/balagpetcare/next_v1.git`)

---

## Executive summary

| Check | Status |
|-------|--------|
| Full-repo JS/JSX TypeScript syntax audit | ✅ No violations found (782 source files scanned) |
| `npm run build` | ✅ Pass (395 pages) |
| `origin/main` push | ✅ Up to date |
| Working tree | ✅ Clean (after this report commit) |
| `web_app/main` production remote | ⚠️ **Diverged** — still contains broken `app/shop/layout.jsx` |

Production servers pulling from **`web_app`** (`https://github.com/balagpetcare/web_app.git`) will continue to fail until that remote is updated or the deploy source is switched to **`origin/main`**.

---

## Reported server error (root cause)

**File on `web_app/main` (`bccc7fe`):**

```jsx
export default function ShopLayout({ children }: { children }) {
```

Invalid TypeScript parameter annotation inside a `.jsx` file.

**File on `origin/main` (`10fd658`) — fixed:**

```jsx
export default function ShopLayout({ children }) {
  return <>{children}</>;
}
```

Local and `origin/main` are aligned. The server error matches **`web_app/main`**, not `origin/main`.

---

## Repository audit

### Scope

Searched **782** `.js` / `.jsx` files under `app/`, `components/`, `src/`, and `lib/` (excluding `node_modules`).

### Patterns searched

| Pattern | Matches (executable TS) |
|---------|-------------------------|
| `}: {` (destructured param types) | 0 |
| `children }:` | 0 |
| `React.FC` | 0 |
| `: React` / `: JSX.` (in code, not JSDoc) | 0 |
| `import type` / `export type` | 0 |
| Generic hooks (`useState<`, etc.) | 0 |
| Typed function params `(x: string)` | 0 |

JSDoc-only typing (valid in `.js`) found in a handful of utility files; no action required.

### Files modified in this session

None — codebase already clean on `main`. Prior fix commit `10fd658` addressed:

- `app/shop/layout.jsx` — removed TS annotation
- `src/bpa/campaign/admin/CampaignForm.tsx` — type alignment
- `lib/campaignApi.ts` — analytics row type
- Plus analytics/SEO scaffolding (see commit stat below)

---

## Git state

### Remotes

| Remote | URL | `main` tip |
|--------|-----|------------|
| `origin` | `github.com/balagpetcare/next_v1.git` | `10fd658` |
| `web_app` | `github.com/balagpetcare/web_app.git` | `bccc7fe` (stale) |

### Commit (build-fix baseline)

```
10fd658 Fix production build issues
```

**Author:** Bala G  
**Files in `10fd658` (30 files):** `.env.example`, `app/layout.jsx`, `app/robots.ts`, `app/sitemap.ts`, `docs/audits/BUILD_FIX_WEB_APP.md`, `lib/campaignApi.ts`, `src/bpa/campaign/admin/CampaignForm.tsx`, analytics/SEO modules, etc.

### Push results

```text
$ git push origin main
Everything up-to-date

$ git push web_app main:main
! [rejected] main -> main (non-fast-forward)
```

`web_app/main` has unrelated history (`bccc7fe Next Admin`, Jan 2026 scaffold). Fast-forward push is impossible without force-push or redeploy config change.

---

## Build verification

```text
$ npm run build

▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in ~120s
  Running TypeScript ...
✓ Generating static pages (395/395)
```

Exit code: **0**

---

## Recommended production unblock

1. **Preferred:** Point production CI/CD to `origin` (`next_v1`) branch `main` at `10fd658+`.
2. **Alternative:** Force-update `web_app/main` to match `origin/main`:
   ```bash
   git push web_app main:main --force-with-lease
   ```
   Only if `web_app` is intentionally the deploy remote and its unique commit (`bccc7fe`) can be discarded.

---

## This report commit

See git log after commit for hash of `docs/audits/PRODUCTION_BUILD_AND_GITHUB_SYNC_REPORT.md`.
