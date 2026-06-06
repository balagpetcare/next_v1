# bpa_web — Deployment Execution Report

**Date:** 2026-06-06  
**Scope:** Implement [PRODUCTION_DEPLOYMENT_PLAN.md](./PRODUCTION_DEPLOYMENT_PLAN.md)  
**Status:** Complete (repo changes + validation)

---

## 1. Summary

Production deployment tooling is now committed in `bpa_web`:

- Canonical **PM2 ecosystem** (`ecosystem.config.js`) driven by shared panel registry
- **Per-panel `start:*` scripts** with explicit ports (no accidental admin on :3100)
- **Deploy pipeline** (`deploy:build`, `deploy:pm2:phase*`)
- **Build guard** blocking `SITE_MODE` during production `npm run build`
- **Removed obsolete PM2 names:** `bpa-web`, `bpa-web-mother`

---

## 2. Files created

| File | Purpose |
|------|---------|
| `ecosystem.config.js` | PM2 app definitions (8 `bpa-web-*` processes, explicit ports) |
| `scripts/deployment/panel-registry.cjs` | Single source of truth: ports, PM2 names, phases, env |
| `scripts/deployment/guard-production-build.mjs` | Fails build if `SITE_MODE` is set |
| `scripts/deployment/deploy-build.mjs` | lint → typecheck → build → validate:panels |
| `scripts/deployment/pm2-start-phase.mjs` | `pm2 start/restart` by deployment phase |

---

## 3. Files updated

| File | Change |
|------|--------|
| `package.json` | `start:*`, `deploy:*`, `prebuild` guard |
| `docs/deployment/PRODUCTION_DEPLOYMENT_PLAN.md` | Points to committed `ecosystem.config.js` + npm scripts |
| `docs/deployment/GITHUB_RELEASE_CHECKLIST.md` | Documents `npm run deploy:build` |

---

## 4. PM2 ecosystem (canonical)

| PM2 name | Port | Phase | Notes |
|----------|------|-------|-------|
| `bpa-web-staff` | 3100 | 1 | `/staff` + `/mother` |
| `bpa-web-admin` | 3103 | 2 | `AUTH_COOKIE_NAME=bpa_admin` |
| `bpa-web-shop` | 3101 | 3 | ⚠ bare-metal conflict with `bpa-landing` |
| `bpa-web-clinic` | 3102 | 3 | |
| `bpa-web-owner` | 3104 | 3 | |
| `bpa-web-producer` | 3105 | 3 | |
| `bpa-web-country` | 3106 | 3 | |
| `bpa-web-doctor` | 3107 | 3 | |

**Removed (obsolete):**

| Name | Reason |
|------|--------|
| `bpa-web` | Ambiguous; no explicit port |
| `bpa-web-mother` | Duplicate of staff on :3100 |

### Phase commands

```bash
npm run deploy:pm2:phase1          # bpa-web-staff
npm run deploy:pm2:phase2          # staff + admin
npm run deploy:pm2:phase3          # shop, clinic, owner, producer, country, doctor
npm run deploy:pm2:restart:phase2  # after new build
```

On Linux production, set log directory:

```bash
export BPA_PM2_LOG_DIR=/var/log/bpa
```

---

## 5. package.json scripts

### Production start (explicit ports)

| Script | Command |
|--------|---------|
| `start` | Alias → `start:staff` |
| `start:staff` | `next start -p 3100` |
| `start:admin` | `next start -p 3103` |
| `start:shop` | `next start -p 3101` |
| `start:clinic` | `next start -p 3102` |
| `start:owner` | `next start -p 3104` |
| `start:producer` | `next start -p 3105` |
| `start:country` | `next start -p 3106` |
| `start:doctor` | `next start -p 3107` |

### Deploy

| Script | Action |
|--------|--------|
| `deploy:build` | Full pre-deploy pipeline |
| `deploy:pm2:phase1` | PM2 start phase 1 |
| `deploy:pm2:phase2` | PM2 start phases 1–2 |
| `deploy:pm2:phase3` | PM2 start phase 3 panels |
| `deploy:pm2:restart:phase*` | PM2 restart by phase |

### Build guard

`prebuild` now runs:

1. `guard-production-build.mjs` — rejects `SITE_MODE` during build
2. `clean-workspace.mjs` — clears caches

Dev scripts (`dev:mother`, `dev:admin`, …) unchanged for local multi-port development.

---

## 6. Validation results

Executed on **2026-06-06** from `D:\BPA_Data\bpa_web`:

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` | **PASS** (exit 0) |
| Build | `npm run build` | **PASS** (exit 0, 395 routes) |
| Panel routes | `npm run validate:panels` | **PASS** (all 8 panels + logins) |
| Ecosystem load | `node -e "require('./ecosystem.config.js')"` | **PASS** (8 apps) |

Build timings (approximate):

- Compile: ~109s
- TypeScript: ~93s
- Static generation: 395 pages

---

## 7. Nginx mappings (documentation — not committed to infra yet)

Per [PRODUCTION_DEPLOYMENT_PLAN.md](./PRODUCTION_DEPLOYMENT_PLAN.md) §10, add to `backend-api/infra/nginx/` when ready:

| Host | Upstream | Port |
|------|----------|------|
| `staff.bangladeshpetassociation.com` | `bpa_web_staff` | 3100 |
| `admin.bangladeshpetassociation.com` | `bpa_web_admin` | 3103 |
| `shop.bangladeshpetassociation.com` | `bpa_web_shop` | 3101 |
| `clinic.bangladeshpetassociation.com` | `bpa_web_clinic` | 3102 |
| `owner.bangladeshpetassociation.com` | `bpa_web_owner` | 3104 |
| `producer.bangladeshpetassociation.com` | `bpa_web_producer` | 3105 |
| `country.bangladeshpetassociation.com` | `bpa_web_country` | 3106 |
| `doctor.bangladeshpetassociation.com` | `bpa_web_doctor` | 3107 |

Phase 0 hosts (`bangladeshpetassociation.com` → `bpa_landing:3101`, `vaccination.*` → `:3110`) remain unchanged.

---

## 8. Server deploy quick start

```bash
cd /opt/bpa/bpa_web
git pull origin main
npm ci
export BPA_PM2_LOG_DIR=/var/log/bpa
npm run deploy:build
npm run deploy:pm2:phase2
pm2 list
```

---

## 9. Out of scope (follow-up)

| Item | Owner |
|------|-------|
| Commit nginx vhosts for panel subdomains | `backend-api/infra/nginx` |
| Update `backend-api` `DEPLOYMENT_CHECKLIST_FINAL.md` (`bpa-web` → `bpa-web-*`) | backend-api docs |
| Docker network isolation for shop :3101 vs landing | Ops |
| `.env.production.local` on server | Ops / secrets vault |

---

## 10. Related documents

- [PRODUCTION_DEPLOYMENT_PLAN.md](./PRODUCTION_DEPLOYMENT_PLAN.md)
- [DEPLOYMENT_ARCHITECTURE_AUDIT.md](../architecture/DEPLOYMENT_ARCHITECTURE_AUDIT.md)
- [GITHUB_RELEASE_CHECKLIST.md](./GITHUB_RELEASE_CHECKLIST.md)
