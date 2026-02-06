## Execution Playbook (Safe, Low-Token, Incremental)

Date: 2026-02-04

This is an execution guide for implementing `docs/master-plan/MASTER_PLAN.md` **without breaking existing routes** and while staying compatible with current UI/API consumers.

---

## Before you start (hard gates)

- **Ports unchanged**: API `3000`, Owner `3104`.
- **No deletions**: only additive changes or safe merges. Obsolete endpoints become **DEPRECATED** in place.
- **One change-set at a time**: keep patches small and reversible.

---

## Phase 1 — Requests hub + Stock Request flow end-to-end (one warehouse selector)

### Gate P1-0 — Environment sanity

- Backend dependencies installed: `cd D:/BPA_Data/backend-api && npm install`
- Frontend dependencies installed: `cd D:/BPA_Data/bpa_web && npm install`
- Prisma is usable:\n+  - `cd D:/BPA_Data/backend-api && npx prisma generate`\n+  - Confirm DB connectivity via existing dev workflow

### Step P1-1 — Replace mock Owner inbox backend (keep shape)

Goal: Make `GET /api/v1/owner/requests` real while preserving `meta.pendingCounts` used by:\n+- `bpa_web/app/owner/_hooks/useEntityCounts.js`\n+- `bpa_web/app/owner/requests/page.tsx`

Implementation order:\n+- Implement aggregation in `backend-api/src/api/v1/modules/owner/owner.controller.ts`.\n+- Keep support for `?summary=1` (counts-only).\n+
Gate:\n+- `/owner/requests` page loads without errors and badges update.\n+
Manual test:\n+- Load Owner panel → sidebar counts update.\n+- Open `/owner/requests` → list renders.

### Step P1-2 — Wire `/owner/product-requests/*` to real `ProductChangeRequest`

Goal: keep UI routes, remove dependency on mock `/api/v1/owner/product-requests`.

Implementation order:\n+- Update UI pages:\n+  - `bpa_web/app/owner/product-requests/page.jsx`\n+  - `bpa_web/app/owner/product-requests/[id]/page.jsx`\n+  to use `GET/PATCH /api/v1/owner/product-change-requests*`.\n+- Keep mock endpoints working but mark **DEPRECATED**.\n+
Gate:\n+- Owner can approve/reject and see real DB-backed rows.\n+
Manual test:\n+- Create request via `POST /api/v1/branches/:branchId/product-change-requests` and confirm it appears on Owner page.\n+- Approve/reject works; UI refreshes.

### Step P1-3 — Stock request decline with reason/source (DB + API)

Goal: implement “decline with clear reason/source”.

Implementation order:\n+- Prisma migration: add cancellation fields to `StockRequest`.\n+- Add owner decline endpoint:\n+  - `POST /api/v1/stock-requests/:id/decline` (owner-scoped)\n+  - persist reason/source fields.\n+- Ensure existing `cancel` endpoint keeps working.\n+
Gate:\n+- Decline action is auditable (stored reason/source).\n+
Manual test:\n+- Branch submits stock request.\n+- Owner declines with reason.\n+- Request shows `CANCELLED` + reason (UI can show from API).

### Step P1-4 — Owner stock request detail UX: add extra items + decline

Goal: deliver the operational page `/owner/inventory/stock-requests/[id]`.\n+
Implementation order:\n+- Enhance `bpa_web/app/owner/inventory/stock-requests/[id]/page.tsx`:\n+  - Decline button\n+  - Add-extra-item picker (variant → FEFO lots)\n+  - Warehouse selector filtered to locations under `WAREHOUSE_DC` branches (from backend branch type data)\n+- Keep dispatch API unchanged (still `POST /api/v1/stock-requests/:id/dispatch`).\n+
Gate:\n+- Owner can dispatch partial quantities.\n+- Owner can add extra variants (not requested) and dispatch.\n+- Decline works.\n+
Manual test:\n+- Dispatch less than requested → transfer created.\n+- Dispatch extra variant → transfer includes it.\n+- Receive transfer → request status updates (`RECEIVED_*`).

### Step P1-5 — Notifications (deduped + actionable)

Goal: queue operational work via in-app notifications.

Implementation order:\n+- On stock request submit: notify org owner/team.\n+- On product change request create: notify owner/team.\n+- Use dedupeKey patterns from `docs/master-plan/MASTER_PLAN.md`.\n+
Gate:\n+- No notification spam (dedupe works).\n+- Notification actionUrl opens the right Owner page.\n+
Manual test:\n+- Submit same request twice (should be blocked by status); ensure no duplicate notifications.\n+
### Step P1-6 — Owner Team access (minimal viable)

Goal: allow delegation without making everyone an OWNER.

Implementation order:\n+- Seed roles + `panel.owner` permission.\n+- Update `/api/v1/auth/me` `panels.owner` to allow users with `panel.owner`.\n+- Replace `roleGuard(['OWNER'])` usage under `/api/v1/owner/*` with a guard that allows Owner Team.\n+
Gate:\n+- Owner team member can access `/owner/*`.\n+- Permissions restrict actions (read vs write).\n+
Manual test:\n+- Create an `INVENTORY_MANAGER` user with org role, ensure:\n+  - can open `/owner/inventory/stock-requests`\n+  - can dispatch\n+- Create an `AUDITOR` user, ensure:\n+  - can open lists\n+  - cannot dispatch/approve

---

## Phase 2 — Receipts/GRN + discrepancy UX

High-level order:\n+- Add GRN models + endpoints.\n+- Add warehouse receipt UI.\n+- Add discrepancy review UI for transfers.\n+- Add expiry dashboards for warehouse locations.\n+
Gates:\n+- All inbound stock is lot-based.\n+- Ledger remains the single source of truth.

---

## Phase 3 — Multi-warehouse routing rules (optional)

High-level order:\n+- Add `WarehouseRoutingRule`.\n+- Use rules to suggest default warehouse on stock requests/dispatch.\n+- Add override + audit trail.\n+
Gates:\n+- No breaking change to existing dispatch endpoints.\n+- Deterministic behavior when no routing rule exists (fallback to manual selector).

---

## Manual test checklist (Phase 1 minimum)

- Stock request lifecycle:\n+  - branch creates draft → submits\n+  - owner sees in `/owner/requests` and `/owner/inventory/stock-requests`\n+  - owner dispatches partial\n+  - owner adds extra items\n+  - owner declines (stored reason/source)\n+  - branch receives transfer (full/partial/disputed)\n+- Notifications:\n+  - created with correct actionUrl\n+  - dedupe prevents spam\n+- RBAC:\n+  - owner team roles can access Owner panel\n+  - write actions blocked for read-only roles

---

## Commands to run (no port changes)

Backend (API 3000):\n+- `cd D:/BPA_Data/backend-api`\n+- `npm run dev`\n+- `npm run typecheck`\n+- If migrations added: `npx prisma migrate dev` then `npx prisma generate`\n+
Frontend (Owner 3104):\n+- `cd D:/BPA_Data/bpa_web`\n+- `npm run dev:owner`\n+- `npm run lint`

