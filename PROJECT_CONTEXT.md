# Bangladesh Pet Association (BPA) – Project Context

## Overview
BPA is a national animal welfare & pet ecosystem platform. It connects pet parents, clinics, pet shops, delivery hubs, staff, and admins.

## Tech Stack
- Backend API: Node.js + Express + Prisma (`backend-api`, port 3000)
- Database: PostgreSQL
- Storage: MinIO (dev) / B2 (production path)
- Frontend:
  - **This repo (`bpa_web`)** — Next.js multi-panel monorepo
  - **bpa-landing** — marketing site (port 3101)
  - **vaccination_2026** — campaign booking (port 3110)
  - **bpa_app** — Flutter mobile app (Riverpod)
- Infra: Docker, Docker Compose, Nginx (production)

## Fixed Ports (DO NOT CHANGE)

### API
- **3000** — `backend-api`

### bpa_web panels (`SITE_MODE`)
- mother / staff: **3100**
- shop: **3101** (local conflict with `bpa-landing` — see port map)
- clinic: **3102**
- admin: **3103**
- owner: **3104**
- producer: **3105**
- country: **3106**
- doctor: **3107**

### Other frontends
- **bpa-landing:** **3101**
- **vaccination_2026:** **3110**

**Canonical ecosystem map:** `backend-api/docs/infrastructure/PORT_AND_DOMAIN_MAP.md`

## API
- Base URL: http://localhost:3000/api/v1
- Auth: cookie-based (credentials include)
- Versioning: v1 (stable)

## UI
- Admin & dashboards must follow WowDash / Larkon Admin Template
- No custom redesign unless explicitly instructed

## Key Principles
- Backward compatible changes only
- Update-only patches preferred
- Never overwrite existing code without merging
