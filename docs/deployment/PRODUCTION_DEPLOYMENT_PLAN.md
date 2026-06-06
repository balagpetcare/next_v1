# bpa_web — Production Deployment Plan

**Date:** 2026-06-06  
**Scope:** Deploy `bpa_web` (single Next.js monorepo, multi-panel) to production  
**Type:** Planning document only — no runtime changes in this pass  
**Based on:** [DEPLOYMENT_ARCHITECTURE_AUDIT.md](../architecture/DEPLOYMENT_ARCHITECTURE_AUDIT.md)  
**Ecosystem reference:** `backend-api/docs/infrastructure/PORT_AND_DOMAIN_MAP.md`

---

## 1. Architecture summary

`bpa_web` is **one codebase, one production build**, with panels exposed by **URL path** (`/admin`, `/owner`, `/staff`, …). Production may run as:

| Pattern | PM2 count | When to use |
|---------|-----------|-------------|
| **A — Gateway** | 1 (`bpa-web-staff`) | Early rollout, low traffic, clinic↔staff same-origin |
| **B — Subdomain fan-out** | 8 (`bpa-web-*`) | Full panel subdomains, branded origins per role |

Both patterns use the **same** `npm run build` artifact (unified `.next/`).  
**Do not** set `SITE_MODE` during production build.

---

## 2. Invalid process definitions (do not use)

These appear in older docs or informal runbooks. **Remove or replace** them before production cutover.

| Invalid definition | Problem | Correct approach |
|--------------------|---------|------------------|
| `pm2 start npm --name bpa-web-admin -- run start` | `package.json` `"start"` binds **port 3100**, not 3103 | `next start -p 3103` with explicit port |
| `pm2 restart bpa-web` (generic) | Ambiguous; may restart wrong port or wrong panel | Restart named processes: `bpa-web-admin`, `bpa-web-staff`, … |
| Separate `next build` per panel | Panels are path prefixes in one App Router tree | **One** `npm run build` per release |
| `SITE_MODE=admin npm run build` (production) | Writes to `.next/admin` instead of unified `.next` | **Omit** `SITE_MODE` for production build |
| `SITE_MODE` required at runtime for routing | App routes by path, not hostname | `SITE_MODE` optional at start (metadata only); routing unchanged |
| `bpa-web-mother` **and** `bpa-web-staff` on 3100 | Two processes cannot bind the same port | **One** process: `bpa-web-staff` serves `/staff` **and** `/mother` |
| Admin vhost → `127.0.0.1:3100` | Wrong upstream for `admin.*` subdomain | Admin vhost → `127.0.0.1:3103` |
| Treating panels as independent Next.js repos (`next_v1`, per-panel packages) | Incorrect mental model | Single repo `bpa_web`, single `package.json` |
| `bpa-landing` + `bpa_web` shop both listening on host `:3101` (bare metal) | **Port bind conflict** on one VPS | See [§6 Port conflict](#6-port-3101-conflict-bpa-landing-vs-bpa_web-shop) |
| Expecting hostname routing inside Next.js | `proxy.ts` uses pathname only | Nginx maps `Host` → loopback port; app uses path prefixes |
| Per-panel PM2 with different git checkouts/builds | Wastes disk; drift risk | One checkout at `/opt/bpa/bpa_web`, one build, N processes |

**Supersedes:** Phase 2 snippet in `backend-api/docs/deployment/BPA_PRODUCTION_DEPLOYMENT_PLAN.md` that runs `npm run start` for admin without `-p 3103`.

---

## 3. Deployment phases

### Phase 0 — Prerequisites (already live or parallel track)

| Host | Repo | Port | PM2 name |
|------|------|------|----------|
| `api.bangladeshpetassociation.com` | `backend-api` | 3000 | `bpa-api`, `bpa-worker` |
| `bangladeshpetassociation.com` | `bpa-landing` | 3101 | `bpa-landing` |
| `vaccination.bangladeshpetassociation.com` | `vaccination_2026` | 3110 | `bpa-vaccination` |

### Phase 1 — bpa_web minimal (recommended first)

Deploy **one** `bpa_web` process for staff operations:

| Host | PM2 | Port | Paths |
|------|-----|------|-------|
| `staff.bangladeshpetassociation.com` | `bpa-web-staff` | 3100 | `/staff`, `/mother`, shared auth routes |

Enables branch staff workflows without full 8-process fan-out.

### Phase 2 — Admin panel

| Host | PM2 | Port |
|------|-----|------|
| `admin.bangladeshpetassociation.com` | `bpa-web-admin` | 3103 |

### Phase 3 — Full panel fan-out

Add remaining processes (after shop port isolation is resolved — see §6):

| Host | PM2 | Port |
|------|-----|------|
| `shop.bangladeshpetassociation.com` | `bpa-web-shop` | 3101 |
| `clinic.bangladeshpetassociation.com` | `bpa-web-clinic` | 3102 |
| `owner.bangladeshpetassociation.com` | `bpa-web-owner` | 3104 |
| `producer.bangladeshpetassociation.com` | `bpa-web-producer` | 3105 |
| `doctor.bangladeshpetassociation.com` | `bpa-web-doctor` | 3107 |
| Internal / VPN | `bpa-web-country` | 3106 |

---

## 4. Server prerequisites

| Resource | Minimum (Phase 1–2) | Full fan-out (Phase 3) |
|----------|---------------------|-------------------------|
| RAM | 8 GB | 16 GB+ |
| Node.js | **22.x** (per `GITHUB_RELEASE_CHECKLIST.md`) | 22.x |
| PM2 | Global install | Global install |
| Disk | 20 GB free under `/opt/bpa` | 40 GB+ (one build + logs) |

```bash
# On origin server (once)
sudo mkdir -p /opt/bpa/bpa_web /var/log/bpa
sudo chown -R deploy:deploy /opt/bpa /var/log/bpa
sudo npm install -g pm2
```

---

## 5. Build and release workflow

Run **once per release** before starting or restarting any `bpa-web-*` process.

```bash
cd /opt/bpa/bpa_web
git fetch origin && git checkout main && git pull origin main

# Pre-deploy gates (from workstation or CI)
npm ci
npm run lint
npx tsc --noEmit
npm run build
npm run validate:panels

# Optional full pipeline
# npm run validate:build
```

**Rules:**

- **Never** set `SITE_MODE` during `npm run build`.
- **One** `.next/` directory shared by all PM2 processes.
- Tag release before deploy: `git tag release-YYYYMMDD-bpa-web`.

**Restart all panel processes after a new build:**

```bash
pm2 restart bpa-web-staff bpa-web-admin   # Phase 1–2
# pm2 restart bpa-web-staff bpa-web-shop bpa-web-clinic bpa-web-admin \
#   bpa-web-owner bpa-web-producer bpa-web-country bpa-web-doctor   # Phase 3
```

---

## 6. Port 3101 conflict (bpa-landing vs bpa_web shop)

Both ecosystems document port **3101**:

| App | Port | Host |
|-----|------|------|
| `bpa-landing` | 3101 | `bangladeshpetassociation.com` |
| `bpa_web` shop panel | 3101 | `shop.bangladeshpetassociation.com` |

On a **single bare-metal VPS** (one network namespace), **only one process** may bind `127.0.0.1:3101`.

**Valid resolutions (pick one before Phase 3 shop deploy):**

| Option | Description |
|--------|-------------|
| **A — Docker / separate network namespaces** | `bpa-landing` container and `bpa-web-shop` container each listen on `:3101` internally; nginx upstreams use container IPs |
| **B — Defer shop subdomain** | Run shop UI via staff gateway (`staff.*`) until shop gets isolated host/container |
| **C — Additional origin server** | Landing on VPS-A:3101, shop on VPS-B:3101 |

**Do not** change documented canonical ports (3101) without updating `PORT_AND_DOMAIN_MAP.md` and `BPA_STANDARD.md`.

---

## 7. Required ports

### Fixed — do not change

| Port | Service | Repo | PM2 name |
|------|---------|------|----------|
| 3000 | REST API | backend-api | `bpa-api` |
| 3100 | Staff + mother panels | bpa_web | `bpa-web-staff` |
| 3101 | Shop panel **or** apex landing | bpa_web / bpa-landing | `bpa-web-shop` / `bpa-landing` |
| 3102 | Clinic panel | bpa_web | `bpa-web-clinic` |
| 3103 | Admin panel | bpa_web | `bpa-web-admin` |
| 3104 | Owner panel | bpa_web | `bpa-web-owner` |
| 3105 | Producer panel | bpa_web | `bpa-web-producer` |
| 3106 | Country panel | bpa_web | `bpa-web-country` |
| 3107 | Doctor panel | bpa_web | `bpa-web-doctor` |
| 3110 | Campaign app | vaccination_2026 | `bpa-vaccination` |

### bpa_web panel → path mapping

| Port | Base paths | Login |
|------|------------|-------|
| 3100 | `/staff`, `/mother` | `/staff/login`, `/mother/login` |
| 3101 | `/shop` | `/shop/login` |
| 3102 | `/clinic` | `/clinic/login` |
| 3103 | `/admin` | `/admin/login` |
| 3104 | `/owner` | `/owner/login` |
| 3105 | `/producer` | `/producer/login` |
| 3106 | `/country` | `/country/login` |
| 3107 | `/doctor` | `/doctor/login` |

Shared routes (all processes): `/auth/*`, `/login`, `/post-auth-landing`, `/choose-activity`, `/api/v1/*`, `/invite/*`.

---

## 8. PM2 ecosystem (canonical)

Committed in repo root: **`ecosystem.config.js`** (registry: `scripts/deployment/panel-registry.cjs`).  
On the server, set `BPA_PM2_LOG_DIR=/var/log/bpa` if not using default `./logs/pm2`.

### Start commands

```bash
# First deploy (Phase 1–2 example)
cd /opt/bpa/bpa_web && npm ci && npm run deploy:build
export BPA_PM2_LOG_DIR=/var/log/bpa   # optional on Linux
npm run deploy:pm2:phase2

# Phase 3 (after shop :3101 isolation from bpa-landing)
npm run deploy:pm2:phase3

# Restart after new build
npm run deploy:pm2:restart:phase2
```

Per-panel production start (without PM2):

```bash
npm run start:staff    # :3100
npm run start:admin    # :3103
# … start:shop, start:clinic, start:owner, start:producer, start:country, start:doctor
```

### Full ecosystem PM2 inventory (all BPA repos)

| PM2 name | Repo | Port | Phase |
|----------|------|------|-------|
| `bpa-api` | backend-api | 3000 | 0 |
| `bpa-worker` | backend-api | — | 0 |
| `bpa-landing` | bpa-landing | 3101 | 0 |
| `bpa-vaccination` | vaccination_2026 | 3110 | 0 |
| `bpa-web-staff` | bpa_web | 3100 | 1 |
| `bpa-web-admin` | bpa_web | 3103 | 2 |
| `bpa-web-shop` | bpa_web | 3101 | 3 |
| `bpa-web-clinic` | bpa_web | 3102 | 3 |
| `bpa-web-owner` | bpa_web | 3104 | 3 |
| `bpa-web-producer` | bpa_web | 3105 | 3 |
| `bpa-web-country` | bpa_web | 3106 | 3 |
| `bpa-web-doctor` | bpa_web | 3107 | 3 |

**Removed from canonical list:** `bpa-web` (generic), `bpa-web-mother` (duplicate of staff on 3100).

---

## 9. Environment variables

### Shared (all `bpa-web-*` processes)

| Variable | Production value | Notes |
|----------|------------------|-------|
| `NODE_ENV` | `production` | |
| `API_BASE_URL` | `https://api.bangladeshpetassociation.com` | Server-side proxy |
| `NEXT_PUBLIC_API_BASE_URL` | same | Browser uses same-origin `/api/v1` |
| `NEXT_PUBLIC_AUTH_BASE_URL` | same | Auth redirects |
| `NEXT_PUBLIC_SITE_URL` | **Per subdomain** | See PM2 config above |

### Per-panel overrides

| Process | Extra env |
|---------|-----------|
| `bpa-web-admin` | `AUTH_COOKIE_NAME=bpa_admin`, `NEXT_PUBLIC_DEFAULT_PANEL=admin` |
| `bpa-web-owner` | `NEXT_PUBLIC_DEFAULT_PANEL=owner` |

Store secrets in `/opt/bpa/bpa_web/.env.production.local` (mode `600`, not in git). PM2 `env` block can reference values loaded via `dotenv` in a wrapper script if preferred.

### Backend API (required for panel auth)

On `backend-api`, ensure:

```bash
CORS_ORIGINS=https://staff.bangladeshpetassociation.com,https://admin.bangladeshpetassociation.com,...
COOKIE_DOMAIN=.bangladeshpetassociation.com
```

Add each new panel origin when enabling Phase 3 processes.

---

## 10. Nginx mappings

Add upstreams to `backend-api/infra/nginx/conf.d/00-upstreams.conf` (or server-local equivalent):

```nginx
# bpa_web panels — loopback ports (Pattern B)
upstream bpa_web_staff   { server 127.0.0.1:3100; keepalive 32; }
upstream bpa_web_shop    { server 127.0.0.1:3101; keepalive 32; }
upstream bpa_web_clinic  { server 127.0.0.1:3102; keepalive 32; }
upstream bpa_web_admin   { server 127.0.0.1:3103; keepalive 32; }
upstream bpa_web_owner   { server 127.0.0.1:3104; keepalive 32; }
upstream bpa_web_producer{ server 127.0.0.1:3105; keepalive 32; }
upstream bpa_web_country { server 127.0.0.1:3106; keepalive 32; }
upstream bpa_web_doctor  { server 127.0.0.1:3107; keepalive 32; }

# Existing (Phase 0) — do not remove
upstream bpa_landing     { server 127.0.0.1:3101; keepalive 32; }
upstream bpa_vaccination { server 127.0.0.1:3110; keepalive 32; }
```

**Note:** `bpa_landing` and `bpa_web_shop` upstreams both target `:3101` only when using **container isolation** (§6). On bare metal with landing already on 3101, **do not** enable `bpa_web_shop` upstream until shop has its own namespace.

### Host → upstream matrix

| Public host | Upstream | Loopback | TLS |
|-------------|----------|----------|-----|
| `bangladeshpetassociation.com` | `bpa_landing` | :3101 | Existing |
| `www.bangladeshpetassociation.com` | 301 → apex | — | Existing |
| `vaccination.bangladeshpetassociation.com` | `bpa_vaccination` | :3110 | Existing |
| `api.bangladeshpetassociation.com` | `bpa_api` (or direct) | :3000 | Planned |
| `staff.bangladeshpetassociation.com` | `bpa_web_staff` | :3100 | Phase 1 |
| `admin.bangladeshpetassociation.com` | `bpa_web_admin` | :3103 | Phase 2 |
| `shop.bangladeshpetassociation.com` | `bpa_web_shop` | :3101 | Phase 3 |
| `clinic.bangladeshpetassociation.com` | `bpa_web_clinic` | :3102 | Phase 3 |
| `owner.bangladeshpetassociation.com` | `bpa_web_owner` | :3104 | Phase 3 |
| `producer.bangladeshpetassociation.com` | `bpa_web_producer` | :3105 | Phase 3 |
| `doctor.bangladeshpetassociation.com` | `bpa_web_doctor` | :3107 | Phase 3 |
| `country.bangladeshpetassociation.com` | `bpa_web_country` | :3106 | Internal / VPN |

### DNS records (Cloudflare)

| Type | Name | Content | Phase |
|------|------|---------|-------|
| `A` | `staff` | `<ORIGIN_IP>` | 1 |
| `A` | `admin` | `<ORIGIN_IP>` | 2 |
| `A` | `shop`, `clinic`, `owner`, `producer`, `doctor` | `<ORIGIN_IP>` | 3 |
| `A` | `country` | internal IP or omit public | 3 |

### Panel vhost template

Create one file per subdomain under `sites-available/` (example: `staff.bangladeshpetassociation.com.conf`):

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name staff.bangladeshpetassociation.com;

    include /etc/nginx/snippets/ssl-letsencrypt.conf;
    include /etc/nginx/snippets/security-headers.conf;

    access_log /var/log/nginx/bpa-web-staff.access.log combined buffer=32k flush=5s;
    error_log  /var/log/nginx/bpa-web-staff.error.log warn;

    limit_conn bpa_conn_per_ip 40;

    location ^~ /_next/static/ {
        limit_req zone=bpa_static burst=200 nodelay;
        include /etc/nginx/snippets/proxy-nextjs.conf;
        proxy_pass http://bpa_web_staff;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location ^~ /_next/image {
        limit_req zone=bpa_static burst=80 nodelay;
        include /etc/nginx/snippets/proxy-nextjs.conf;
        proxy_pass http://bpa_web_staff;
    }

    # Same-origin API proxy (Next.js app/api/v1 + next.config rewrites)
    location ^~ /api/v1/ {
        limit_req zone=bpa_general burst=40 nodelay;
        limit_req zone=bpa_api_auth burst=5 nodelay;
        include /etc/nginx/snippets/proxy-nextjs.conf;
        proxy_pass http://bpa_web_staff;
    }

    location / {
        limit_req zone=bpa_general burst=60 nodelay;
        include /etc/nginx/snippets/proxy-nextjs.conf;
        proxy_pass http://bpa_web_staff;
    }
}
```

Repeat for each panel, replacing `server_name`, upstream name, and log file prefix (`bpa_web_admin`, etc.).

**Optional hardening:** restrict `country.*` with `allow`/`deny` or mTLS. Each process still serves all routes in the build — nginx path blocks are optional defense-in-depth; primary isolation is API auth.

### Certbot

```bash
sudo certbot --nginx \
  -d staff.bangladeshpetassociation.com \
  -d admin.bangladeshpetassociation.com \
  # ... add Phase 3 hosts when enabled
  --email admin@bangladeshpetassociation.com \
  --agree-tos
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Smoke tests

After each phase:

```bash
# Process health
pm2 list | grep bpa-web
curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/staff/login   # expect 200
curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:3103/admin/login   # Phase 2+

# Public HTTPS
curl -fsS -o /dev/null -w "%{http_code}" https://staff.bangladeshpetassociation.com/staff/login
curl -fsS -o /dev/null -w "%{http_code}" https://admin.bangladeshpetassociation.com/admin/login

# API proxy (same-origin)
curl -fsS -o /dev/null -w "%{http_code}" https://staff.bangladeshpetassociation.com/api/v1/health
```

**Manual:**

- [ ] Staff login → branch dashboard
- [ ] Admin login → admin dashboard (403 → `/admin/forbidden` for non-whitelisted users)
- [ ] Logout clears session cookie on panel host
- [ ] `next/image` loads file from API (verify prod API in `next.config.js` remotePatterns if broken)

---

## 12. Rollback

```bash
cd /opt/bpa/bpa_web
git checkout release-YYYYMMDD-bpa-web   # pre-deploy tag
npm ci && npm run build
pm2 restart bpa-web-staff bpa-web-admin   # or all enabled bpa-web-* names
```

No database migration in `bpa_web` — frontend-only rollback.  
If API contract changed, coordinate with `backend-api` rollback per `backend-api/docs/deployment/BPA_PRODUCTION_DEPLOYMENT_PLAN.md`.

---

## 13. Operational notes

| Topic | Guidance |
|-------|----------|
| Memory | 8× `bpa-web-*` ≈ 8× Next.js server memory; scale RAM or use Phase 1 gateway until needed |
| Cross-shell clinic→staff | Requires same origin or absolute URLs — see `docs/CROSS_SHELL_NAVIGATION.md` |
| Build cache | `npm run clean:workspace` if stale routes after deploy |
| Logs | `/var/log/bpa/bpa-web-*-{out,error}.log` |
| Monitoring | `pm2 monit`; alert on restart loops (`max_restarts`) |

---

## 14. Related documents

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_ARCHITECTURE_AUDIT.md](../architecture/DEPLOYMENT_ARCHITECTURE_AUDIT.md) | Architecture verdict and evidence |
| [GITHUB_RELEASE_CHECKLIST.md](./GITHUB_RELEASE_CHECKLIST.md) | Pre-release validation gates |
| `backend-api/docs/infrastructure/PORT_AND_DOMAIN_MAP.md` | Ecosystem-wide ports and domains |
| `backend-api/docs/deployment/BPA_PRODUCTION_DEPLOYMENT_PLAN.md` | API, landing, vaccination Phase 0 |
| `backend-api/docs/nginx-production-deployment.md` | Nginx install for Phase 0 hosts |
| `docs/BPA_STANDARD.md` | Fixed port policy |

---

**Implemented in repo:** `ecosystem.config.js`, `scripts/deployment/*`, `package.json` deploy scripts — see [DEPLOYMENT_EXECUTION_REPORT.md](./DEPLOYMENT_EXECUTION_REPORT.md).  
**Remaining:** panel nginx vhosts in `backend-api/infra/nginx/` (ops review).
