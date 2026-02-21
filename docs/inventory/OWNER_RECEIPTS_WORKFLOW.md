# Owner Inventory Receipts — Workflow & Daily Operations

Routes live under `/owner/inventory/receipts` (owner app, port 3104).

## Overview

- **Receipts (GRN)** = Goods Received Notes: inbound stock at a location (purchase receive, opening stock, or bulk receive).
- **List page**: `/owner/inventory/receipts` — filter and view GRNs; View/Print actions.
- **Bulk receive page**: `/owner/inventory/receipts/bulk` — multi-line receive (location, vendor, invoice, items grid); submits to `POST /api/v1/inventory/receipts/bulk`.

## List page (`/owner/inventory/receipts`)

- **Data**: `GET /api/v1/grn?orgId=&locationId=&status=&dateFrom=&dateTo=&page=&limit=`.
- **Filters**: Location (from `GET /api/v1/inventory/locations`), Status (All / Draft / Received), Date from, Date to. Clear and Refresh buttons.
- **Table**: Ref (GRN #), Date, Location, Vendor, Status badge, Lines count, Actions (View, Print).
- **View**: Opens right-side drawer with GRN header (date, location, vendor, invoice) and line table.
- **Print**: Opens drawer (if needed), loads GRN, then opens print window with same content.
- **Actions**: Header "Bulk receive" button → `/owner/inventory/receipts/bulk`. Footer links: Bulk receive, Warehouse.

## Bulk receive page (`/owner/inventory/receipts/bulk`)

- **Header fields**: Location (required), Vendor (optional, org-scoped lookup), Invoice No, Invoice Date, Notes.
- **Lines grid**: Variant search (SKU/name/barcode) via `GET /api/v1/inventory/variants/search?q=&limit=25`; Qty, Unit cost, Lot code, Mfg date, Expiry date. Lot/exp validation per variant (`requiresLot`, `requiresExpiry`, `requiresMfg`).
- **Actions**: Add row, Duplicate row (Copy), Remove row; paste tab/comma delimited data; Download CSV template (`GET /api/v1/inventory/receipts/bulk-template`); Submit (Ctrl+Enter).
- **Submit**: `POST /api/v1/inventory/receipts/bulk` with `{ locationId, vendorId?, invoiceNo?, invoiceDate?, notes?, lines: [{ variantId, quantity, unitCost?, lotCode?, mfgDate?, expDate? }] }`. Success shows GRN # and line/total summary; form resets.

## APIs (backend)

| Purpose              | Method | Endpoint                                   |
|----------------------|--------|--------------------------------------------|
| List GRNs            | GET    | `/api/v1/grn?orgId=&locationId=&status=&dateFrom=&dateTo=&page=&limit=` |
| GRN detail           | GET    | `/api/v1/grn/:id`                          |
| Bulk receive         | POST   | `/api/v1/inventory/receipts/bulk`          |
| Bulk CSV template    | GET    | `/api/v1/inventory/receipts/bulk-template` |
| Variant search       | GET    | `/api/v1/inventory/variants/search?q=&limit=` |
| Vendor lookup        | GET    | `/api/v1/vendors/lookup?orgId=&q=&limit=`   |
| Locations            | GET    | `/api/v1/inventory/locations`              |

## Daily operations

1. **View receipts**: Go to Inventory → Receipts; apply location/status/date filters; open View or Print for a GRN.
2. **Bulk receive (purchase)**: Inventory → Receipts → Bulk receive; select location and optional vendor/invoice; add lines (search variant, qty, cost, lot/exp if required); paste from spreadsheet or use CSV template; Submit.
3. **Opening stock**: Use bulk receive with a single line (or multiple) at the target location; no vendor required. Alternatively, legacy single-line opening flow may be available from warehouse or a dedicated opening-stock entry point per project.

## Related

- **Sidebar**: Receipts link from `src/lib/permissionMenu.ts` → `/owner/inventory/receipts` (owner.inventory.receipts).
- **Locations**: Ensure locations exist (Inventory → Locations) before receiving.
- **Staff receive**: Staff Receive Center uses branch-scoped GRN list and receive flows; see STAFF_INVENTORY_OPS_*.md.
