# Step-1 Factual Code Paths (Phase 1 — Owner Requests Hub)

Date: 2026-02-04

Concrete file and symbol references for implementing the Master Plan Phase 1. Use this for patches and verification.

---

## 1. Owner Requests Inbox (GET /api/v1/owner/requests)

### Backend

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| Route | `backend-api/src/api/v1/modules/owner/owner.routes.ts` | `router.get('/requests', ctrl.getOwnerRequestsInbox)` (line 117) |
| Handler (current mock) | `backend-api/src/api/v1/modules/owner/owner.controller.ts` | `exports.getOwnerRequestsInbox` (≈4692), `buildMockInboxRequests` (≈4616), `computePendingCounts` (≈4675) |
| Response shape | Same file | `res.json({ success, data: inbox, meta: { pendingCounts, total, generatedAt } })` — **preserve** for frontend |

### Frontend consumers

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| Badge counts | `bpa_web/app/owner/_hooks/useEntityCounts.js` | `ownerGet("/api/v1/owner/requests?summary=1")` (line 44); reads `meta.pendingCounts` (58–62) and maps to `requests`, `productRequests`, `transfers`, etc. (76–82) |
| Inbox page | `bpa_web/app/owner/requests/page.tsx` | `ownerGet("/api/v1/owner/requests")` (line 89); expects `res.data` (array), `res.meta.pendingCounts` (92); uses `item.kind`, `item.href`, `item.status`, `item.branch`, etc. |

### Inbox item shape (required for each row)

- `id`, `ref`, `kind`, `title`, `summary`, `status`, `branch?: { id, name }`, `requestedBy?`, `createdAt`, `href`, `meta?`
- `kind` values used by UI: `PRODUCT_REQUEST`, `STOCK_REQUEST`, `TRANSFER`, `ADJUSTMENT`, `RETURN`, `CANCELLATION`, `NOTIFICATION`

---

## 2. Product Change Requests (real DB-backed)

### Backend

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| List (owner) | `backend-api/src/api/v1/modules/owner/owner.routes.ts` | `router.get('/product-change-requests', ctrl.listProductChangeRequests)` (112) |
| Approve/Reject | Same | `router.patch('/product-change-requests/:id/approve', ...)` (113), `.../reject` (114) |
| Controller | `backend-api/src/api/v1/modules/owner/owner.controller.ts` | `listProductChangeRequests` (≈1847), `approveProductChangeRequest` (≈1934), `rejectProductChangeRequest` (≈1968) |
| Model | `backend-api/prisma/schema.prisma` | `ProductChangeRequest` (≈2761); `orgId`, `status`, `requestedFromBranchId`, `requestedByUserId`, `payload` |

### Mock (to deprecate / keep for compatibility)

| Purpose | File | Symbol |
|--------|------|--------|
| Mock list | `owner.controller.ts` | `listOwnerProductRequests` (≈4714), `buildMockProductRequests` (used by mock inbox) |
| Mock routes | `owner.routes.ts` | `GET/POST /product-requests`, `POST /product-requests/:id/approve`, `.../reject`, `.../create-transfer` (116–120) |

---

## 3. Stock Requests (branch → owner dispatch)

### Backend

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| Routes | `backend-api/src/api/v1/modules/stock_requests/stock_requests.routes.ts` | All stock-request routes |
| List (supports orgId for owner) | `backend-api/src/api/v1/modules/stock_requests/stock_requests.controller.ts` | `list` (≈65); query `orgId` → owner’s orgs |
| Detail + lots | Same | `getById` (≈115); query `fromLocationId` for available lots |
| Submit / Cancel / Dispatch | Same | `submit`, `cancel`, `dispatch` (see file header comments) |
| Service | `backend-api/src/api/v1/modules/stock_requests/stock_requests.service.ts` | `listRequests`, `getRequestById`, dispatch flow |
| Model | `backend-api/prisma/schema.prisma` | `StockRequest` (≈3754); `orgId`, `branchId`, `status` (e.g. SUBMITTED) |

---

## 4. Stock Adjustment Requests (owner approvals)

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| List/Approve/Reject | `backend-api/src/api/v1/modules/owner/owner.routes.ts` | `GET /adjustment-requests`, `PATCH .../approve`, `.../reject` (130–132) |
| Controller | `backend-api/src/api/v1/modules/owner/owner.controller.ts` | `listStockAdjustmentRequests` (≈1996), `approveStockAdjustmentRequest` (≈2015), `rejectStockAdjustmentRequest` (≈2054) |
| Model | `backend-api/prisma/schema.prisma` | `StockAdjustmentRequest` (≈3870); `orgId`, `status` (PENDING, etc.) |

---

## 5. Transfers (lot-backed)

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| Routes | `backend-api/src/api/v1/modules/transfers/transfers.routes.ts` | List, get, create, send, receive, resolve-dispute |
| Model | `backend-api/prisma/schema.prisma` | `StockTransfer` (≈3705); `fromLocationId`, `toLocationId`, `status` (DRAFT, IN_TRANSIT, etc.); no direct `orgId` — org via location → branch → org |

---

## 6. Owner frontend UI (Requests Hub + Inventory)

| Purpose | File |
|--------|------|
| Requests hub list | `bpa_web/app/owner/requests/page.tsx` |
| Product requests list (mock-wired) | `bpa_web/app/owner/product-requests/page.jsx` |
| Product requests detail (mock-wired) | `bpa_web/app/owner/product-requests/[id]/page.jsx` |
| Product approvals (real API) | `bpa_web/app/owner/product-approvals/page.jsx` |
| Stock requests list | `bpa_web/app/owner/inventory/stock-requests/page.tsx` |
| Stock request detail + dispatch | `bpa_web/app/owner/inventory/stock-requests/[id]/page.tsx` |
| Inventory adjustments list | `bpa_web/app/owner/inventory/adjustments/page.tsx` |

---

## 7. Sidebar and badge injection

| Purpose | File | Symbol / Line |
|--------|------|----------------|
| Menu registry (Owner) | `bpa_web/src/lib/permissionMenu.ts` | Owner items: `owner.requests` with children Inbox, Product Requests, Inventory Transfers, Adjustments, etc. (≈116–225) |
| Badge counts source | `bpa_web/app/owner/_hooks/useEntityCounts.js` | `useEntityCounts()` → `GET /api/v1/owner/requests?summary=1` |
| Layout that renders sidebar | `bpa_web/src/masterLayout/MasterLayout.jsx` | Uses `buildMenu`, `useEntityCounts` (≈12–13) |

---

## 8. Notifications (in-app)

| Purpose | File |
|--------|------|
| Creation + dedupe | `backend-api/src/api/v1/services/notification.service.ts` |
| Routes | `backend-api/src/api/v1/modules/notifications/notifications.routes.ts` |

---

## 9. Auth and scoping (owner)

| Purpose | File | Symbol |
|--------|------|--------|
| Owner route guard | `backend-api/src/api/v1/modules/owner/owner.routes.ts` | `router.use(auth, roleGuard(['OWNER']))` (line 16) |
| Resolve owner orgs | Any owner handler | `prisma.organization.findMany({ where: { ownerUserId: req.user.id } })` (pattern used in listOrganizations, stock_requests list, etc.) |

Use this document when applying patches so that all touch points are updated consistently.

---

## 10. Stock request decline (Phase 1)

| Purpose | File | Symbol |
|--------|------|--------|
| Migration | `backend-api/prisma/migrations/20260204180000_add_stock_request_decline_fields/migration.sql` | Adds `declinedAt`, `declineReason`, `declineSource`, `declinedByUserId` to `stock_requests` |
| Route | `backend-api/src/api/v1/modules/stock_requests/stock_requests.routes.ts` | `POST /:id/decline` |
| Controller | `backend-api/src/api/v1/modules/stock_requests/stock_requests.controller.ts` | `decline` |
| Service | `backend-api/src/api/v1/modules/stock_requests/stock_requests.service.ts` | `declineRequest` |

**Apply migration when DB is ready:** `cd backend-api && npx prisma migrate deploy` (or `migrate dev` if shadow DB is fixed).
