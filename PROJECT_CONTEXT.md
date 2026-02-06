# Bangladesh Pet Association (BPA) – Project Context

## Overview
BPA is a national animal welfare & pet ecosystem platform. It connects pet parents, clinics, pet shops, delivery hubs, staff, and admins.

## Tech Stack
- Backend API: Node.js + Express + Prisma
- Database: PostgreSQL
- Storage: MinIO
- Frontend:
  - Next.js (multi-app)
  - Flutter mobile app (Riverpod state management)
- Infra: Docker, Docker Compose

## Fixed Ports (DO NOT CHANGE)
- API: 3000
- Next.js Apps:
  - mother: 3100
  - shop: 3101
  - clinic: 3102
  - admin: 3103
  - owner: 3104

## API
- Base URL: http://localhost:3000/api/v1
- Auth: cookie-based (credentials include)
- Versioning: v1 (stable)

## UI
- Admin & dashboards must follow WowDash Admin Template
- No custom redesign unless explicitly instructed

## Key Principles
- Backward compatible changes only
- Update-only patches preferred
- Never overwrite existing code without merging
