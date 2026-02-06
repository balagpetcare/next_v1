# Owner Stock Request UI

Routes live under `/owner/inventory/stock-requests` (owner app, port 3104).

## List page
- Path: `/owner/inventory/stock-requests`.
- Data: `GET /api/v1/stock-requests?orgId={ownerOrgId}&limit=100&status=&branchId=&dateFrom=&dateTo=`.
- Filters: status, branch (from `GET /api/v1/owner/branches`), date from, date to. Clear + refresh buttons included.
- Table shows id, created date, branch name, status badge, item count, and an `Open` action that links to detail.
- Empty state message clarifies branches originate requests from their inventory.

## Detail page
- Path: `/owner/inventory/stock-requests/[id]`.
- Base detail: `GET /api/v1/stock-requests/{id}` (shows branch, created/submitted timestamps, transfer if present).
- Inventory locations (from-location) loaded via `GET /api/v1/inventory/locations`.
- Available lots reload per from-location via `GET /api/v1/stock-requests/{id}?fromLocationId={locationId}` (expects `availableLotsByVariant` on the payload).
- Requested items are read-only.

### Fulfill & dispatch
- UI lets owners pick a from-location (their stock) and auto-locks the branch to-location (first branch inventory location).
- For each requested variant, lots with `onHandQty > 0` are listed so users can set `fulfillQty`.
- Dispatch button is enabled only when status is `SUBMITTED` or `OWNER_REVIEW` **and** at least one fulfill quantity > 0.
- Dispatch call: `POST /api/v1/stock-requests/{id}/dispatch` with
  ```json
  {
    "fromLocationId": number,
    "toLocationId": number,
    "items": [
      { "variantId": number, "lotId": number, "quantity": number }
    ]
  }
  ```
- Backend creates the transfer; UI refreshes the detail and shows a success banner once dispatched.

## Notes
- Follows WowDash cards/forms; no layout redesign.
- All changes are additive; existing endpoints are reused (no new API surface). 
