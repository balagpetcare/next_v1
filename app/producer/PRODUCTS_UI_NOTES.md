# Producer Products UI — Implementation Notes

**Panel:** Producer only (port 3105).  
**Scope:** `app/producer/**` and producer-only shared libs/components.

---

## Routes

| Route | Purpose |
|-------|--------|
| `/producer/products` | List with filters, pagination, grid/table, saved views |
| `/producer/products/new` | Create product (steps: basic info → proof pack → submit) |
| `/producer/products/[id]` | Product detail: timeline, evidence, review notes, create batch |
| `/producer/products/[id]/edit` | Edit product (prefill; rules by status) |

---

## Endpoints Used (no backend changes)

| Method | Path | Used for |
|--------|------|----------|
| GET | `/api/v1/producer/products` | List (no query params supported by backend yet) |
| GET | `/api/v1/producer/products/:id` | Detail + proofs with media |
| POST | `/api/v1/producer/products` | Create |
| PATCH | `/api/v1/producer/products/:id` | Update (backend: **only when status is DRAFT**) |
| POST | `/api/v1/producer/products/:id/submit` | Submit for approval |
| GET | `/api/v1/producer/products/:id/status` | Status (optional) |
| POST | `/api/v1/producer/products/:id/proofs` | Add proof (multipart: file, proofType) |
| GET | `/api/v1/producer/factories` | Factories for filter + factory link |
| POST | `/api/v1/producer/factories` | Create factory |
| POST | `/api/v1/producer/products/:id/batches` | Create batch |

All requests use session cookies (`apiFetch` with `credentials: 'include'`). Backend enforces producer-org scope.

---

## Backend Query Params (list)

**Current:** `GET /api/v1/producer/products` accepts **no** query params; returns all products for the producer org, ordered by `createdAt` desc.

**UI behavior:** Filtering, sorting, and pagination are done **client-side** after fetching the full list. URL query params (`q`, `status`, `page`, `sort`, `view`, etc.) are synced for refresh/share; they are not sent to the backend.

**Future:** If backend adds `?q=&status=&page=&limit=&sort=`, the client already passes an `opts` object to `producerProductsList(opts)` in `_lib/producerApi.js`; only the wiring to use response pagination would need to be added.

---

## Gaps / TODOs (backend)

1. **List pagination/filtering**  
   Backend does not support `page`, `limit`, `q`, `status`, `sort`. UI uses client-side filtering and pagination. For 1000+ products, consider adding server-side params.

2. **Update when REJECTED**  
   `PATCH /api/v1/producer/products/:id` returns 400 if status is not `DRAFT`. Rejected products cannot be updated for resubmission. UI allows opening Edit for REJECTED and shows a warning; Save will fail with a clear message until backend allows update when `status === 'REJECTED'` (or a dedicated “resubmit” flow).

3. **Proof count in list**  
   List response does not include `proofs` or `_count.proofs`. “Has documents” filter is not implemented (would require backend to return proof count or list proofs in list response).

4. **Delete proof**  
   No `DELETE /api/v1/producer/products/:id/proofs/:proofId` (or similar). UI does not offer “remove” for already-uploaded proofs.

5. **Media URL in addProof response**  
   After adding a proof, the UI refetches the product to get `proofs[].media.url` for thumbnails. Optional: backend could return the created proof with `media` in the add-proof response.

---

## Document Upload & Preview

- **New / Edit:** `ProducerProofUpload` shows image thumbnails (from `media.url` after upload or object URL before submit) and PDF file cards with a “Preview” modal (embed/iframe).
- **Evidence summary:** “Evidence Pack Summary” shows “At least 1 proof required” with checkmarks for uploaded types.
- Upload is immediate (no “pending” queue); progress/retry is handled by existing `producerProductAddProof` + toast.

---

## Status Lifecycle (UI)

- **DRAFT** → full edit; can add proofs, link factory, submit.
- **SUBMITTED / UNDER_REVIEW** → edit restricted (backend only allows update in DRAFT); UI shows read-only/disabled with message.
- **REJECTED** → UI allows Edit and shows form; Save will fail until backend supports update for REJECTED.
- **APPROVED / ACTIVE** → core fields immutable; Create batch shown.

---

## Error Handling & Security

- **401:** Redirect to `/producer/login?from=<current path>`.
- **403:** Show “You don’t have access” message; do not expose other producers’ data.
- **404:** “Product not found” with link back to list.
- All API calls are session-based; no private URLs or tokens exposed in UI.

---

## Files Touched (summary)

- `app/producer/(larkon)/products/page.jsx` — list: filters, URL sync, saved views, grid/table, pagination.
- `app/producer/(larkon)/products/[id]/page.jsx` — detail: timeline, evidence, review notes, 401/403.
- `app/producer/(larkon)/products/[id]/edit/page.jsx` — edit route, prefill, status rules.
- `app/producer/(larkon)/products/new/page.jsx` — proof upload component + evidence summary.
- `app/producer/_lib/producerApi.js` — `producerProductsList(opts)` with optional query params.
- `app/producer/_components/ProducerProofUpload.jsx` — proof cards, image/PDF preview, evidence summary.
