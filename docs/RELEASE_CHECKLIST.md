# BPA Release Checklist

Use this checklist for every release (PATCH/MINOR/MAJOR).  
**Non-negotiables:** fixed ports, WowDash UI consistency, no breaking existing routes/features.

## 1) Preflight
- [ ] Ports unchanged: API=3000, mother=3100, shop=3101, clinic=3102, admin=3103, owner=3104
- [ ] `.env` keys documented (no secrets committed)
- [ ] `docker compose up` runs cleanly (API + DB + MinIO if used)
- [ ] `npm run typecheck` / `npm test` (if present) passes

## 2) API (if touched)
- [ ] New endpoints are under `/api/v1`
- [ ] Auth middleware consistent; no duplicate/conflicting guards introduced
- [ ] Prisma changes:
  - [ ] `npx prisma migrate dev` creates migration
  - [ ] `npx prisma generate` OK
  - [ ] `MIGRATION.md` written (steps + rollback notes)

## 3) Next.js (if touched)
- [ ] No port changes in scripts
- [ ] WowDash UI strict mode:
  - [ ] Header + Sidebar + Content + Breadcrumb + Card sections
  - [ ] tables/badges/forms use existing WowDash/Bootstrap classes
- [ ] Existing routes not broken (smoke test key routes)

## 4) Packaging (update-only zip)
- [ ] Zip includes only changed files, preserving paths
- [ ] `PATCH_NOTES.md` included and accurate
- [ ] `MIGRATION.md` included only if DB changed
- [ ] Zip naming follows: `bpa-<app>-vX.Y.Z-update-only.zip`

## 5) Smoke Tests
- [ ] Owner (3104): login + dashboard loads
- [ ] Admin (3103): login + auth/me ok
- [ ] API (3000): `/api/v1/health` (if exists) + key endpoints ok
