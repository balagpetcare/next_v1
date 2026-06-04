# Vendor receipts: detail route fix and premium warehouse workspace

## 1. Root cause analysis (404 on `/staff/branch/:branchId/warehouse/vendor-receipts/:grnId`)

### 1.1 What exists today

- **List (physical = URL):** `app/staff/(larkon)/branch/[branchId]/warehouse/vendor-receipts/page.tsx` → `/staff/branch/[branchId]/warehouse/vendor-receipts`.
- **Detail (physical ≠ public URL):** `app/staff/(larkon)/branch/[branchId]/warehouse/vendor-receipt-grn-detail-page/[grnId]/page.tsx`.
- **Public detail URL (intended):** `/staff/branch/[branchId]/warehouse/vendor-receipts/[grnId]`.
- **Routing mechanism:** `next.config.js` `rewrites().beforeFiles` maps  `/staff/branch/:branchId/warehouse/vendor-receipts/:grnId(\\d+)` →  
  `.../warehouse/vendor-receipt-grn-detail-page/:grnId`.

### 1.2 Why 404s can still happen

- **No sibling dynamic segment under `vendor-receipts/`:** Adding `vendor-receipts/[grnId]/page.tsx` next to `vendor-receipts/page.tsx` is intentionally avoided (same class of Turbopack / nested dynamic issues documented for stock requests and dispatch receive).
- **Rewrite-only resolution:** If the `beforeFiles` rewrite does not run for a given request class (dev bundler edge case, ordering, or RSC payload path), Next has **no** page file for `.../vendor-receipts/17` and returns **404**.
- **Redirects vs rewrites:** `proxy.ts` redirects bookmarked physical URLs to the canonical URL; that depends on the second hop also resolving via rewrite.

### 1.3 Conclusion

The404 is not “missing feature work” on the React page—the detail module exists—but **intermittent or environment-specific failure of rewrite-only routing** for the public URL. The robust fix is to **duplicate the routing decision at the edge** with an authenticated `NextResponse.rewrite` in `proxy.ts` so the filesystem always receives `vendor-receipt-grn-detail-page/:grnId` when the browser shows `vendor-receipts/:grnId`.

---

## 2. Route inventory (warehouse receive / vendor receipts / GRN)

| Area | Path | Role |
|------|------|------|
| Receive workspace | `/staff/branch/:id/warehouse/receive-po` | Create/edit draft GRNs; query prefill `?purchaseOrderId=&vendorId=` |
| Legacy deep link | `/staff/branch/:id/warehouse/receive-po/:numericId` | Redirected (next.config + proxy) → `vendor-receipts/:grnId` |
| Vendor receipts list | `/staff/branch/:id/warehouse/vendor-receipts` | Queue/list module |
| GRN detail (canonical URL) | `/staff/branch/:id/warehouse/vendor-receipts/:grnId` | Public detail; must rewrite/edge-rewrite to physical page |
| GRN detail (physical) | `/staff/branch/:id/warehouse/vendor-receipt-grn-detail-page/:grnId` | Turbopack-stable page file; redirect to canonical when hit directly (bookmark cleanup) |

---

## 3. Canonical route decision

- **Canonical browser URL remains:** `/staff/branch/[branchId]/warehouse/vendor-receipts/[grnId]`.
- **Physical page remains:** `warehouse/vendor-receipt-grn-detail-page/[grnId]/page.tsx`.
- **Implementation:** Keep `next.config.js` rewrite; **add** matching `proxy.ts` rewrite for authenticated staff requests so resolution does not depend on a single mechanism.

---

## 4. Detail page shape: stable route vs workspace-only

- **Stable page route (chosen):** Dedicated detail page at the physical path above, with public alias `vendor-receipts/:grnId`. Not a drawer-only queue—managers need a durable record URL for print, audit, and sharing.

---

## 5. File-by-file change list

| File | Change |
|------|--------|
| `docs/VENDOR_RECEIPTS_DETAIL_ROUTE_AND_PREMIUM_WORKSPACE_PLAN.md` | This plan |
| `proxy.ts` | Authenticated rewrite: `.../vendor-receipts/:grnId` → `.../vendor-receipt-grn-detail-page/:grnId` |
| `lib/staffInventoryRoutes.js` | Document; optional `staffVendorReceiptDetailPathWithQuery` if needed |
| `lib/staffInventoryRoutes.test.js` | Assert `staffVendorReceiptDetailPath` |
| `app/.../receive-po/_components/VendorReceiveGrnCard.tsx` | Use `staffVendorReceiptDetailPath` |
| `src/components/warehouse/vendor-receipts/VendorReceiptTable.tsx` | Columns, row actions, canonical href helper |
| `src/components/warehouse/vendor-receipts/VendorReceiptRowActions.tsx` | **New** — dropdown actions |
| `src/components/warehouse/vendor-receipts/VendorReceiptFilterChips.tsx` | **New** — Today / discrepancy / clear |
| `src/components/warehouse/vendor-receipts/VendorReceiptFilters.tsx` | Vendor filter (client list) |
| `src/components/warehouse/vendor-receipts/VendorReceiptEmptyState.tsx` | Richer empty / no-result copy where needed |
| `app/.../warehouse/vendor-receipts/page.tsx` | Wire chips, vendor filter, pass props |
| `src/components/warehouse/vendor-receipts/VendorReceiptDetailHeader.tsx` | Summary-first header, actions |
| `src/components/warehouse/vendor-receipts/VendorReceiptDetailKpiStrip.tsx` | **New** — KPI cards |
| `src/components/warehouse/vendor-receipts/VendorReceiptDetailSectionTabs.tsx` | **New** — Overview / Items / … |
| `src/components/warehouse/vendor-receipts/VendorReceiptLineItemsTable.tsx` | Enterprise columns |
| `src/components/warehouse/vendor-receipts/GrnStatusTimeline.tsx` | Milestones (discrepancy, posted) |
| `src/components/warehouse/vendor-receipts/VendorReceiptActivityPanel.tsx` | **New** — audit scaffold |
| `src/components/warehouse/vendor-receipts/VendorReceiptDocumentsPanel.tsx` | **New** — print / PO print links |
| `src/components/warehouse/vendor-receipts/index.ts` | Export new pieces |
| `app/.../vendor-receipt-grn-detail-page/[grnId]/page.tsx` | Compose new layout + `focus` / tab query |
| `src/lib/vendorReceiptTypes.ts` | Optional fields: `purchaseOrder.status`, line `unitCost` |

---

## 6. UI/UX upgrade plan

### 6.1 List page

- Filters: search (GRN / vendor / PO), date range, **vendor** select from current result set, quick chips (**Today**, **Discrepancy**, clear dates).
- Table: GRN, Vendor, PO, **line count**, received vs expected, status, dates, discrepancy flag, **actions** menu.
- Row: click → detail; actions stop propagation; menu entries gated by status/permissions.
- Empty/loading/error: keep skeleton; improve no-match copy; retry on error.

### 6.2 Detail page

- Header: breadcrumbs, title, vendor, PO link (receive-po prefill), branch/location, status badge, dates, **primary actions** (view PO workspace, print, copy IDs).
- KPI strip: lines, expected/received, discrepancy count, session stage, PO link card.
- Timeline: draft → submitted → received / discrepancy → posted (data-driven).
- Tabs: Overview (info cards + notes), Items (table), Discrepancies (subset), Activity (scaffold), Documents (print links).
- Items table: SKU, product, expected/received/accepted/damaged/short/excess, unit cost when present, notes, lot/expiry.

---

## 7. Risk analysis

- **Other warehouse routes:** No changes to inbound transfers, pick lists, or receive-po logic beyond link helpers.
- **Auth:** Rewrite only when `hasAuth`; unauthenticated users still go to login with canonical `next` param.
- **Backend:** No API changes required; optional type widen for fields already returned by `getGrnById`.

---

## 8. Verification checklist

- [ ] `/staff/branch/{id}/warehouse/vendor-receipts/{grnId}` returns 200 (authenticated), not 404.
- [ ] List row and “View details” open the same canonical URL.
- [ ] `staffVendorReceiptDetailPath` used (grep for hardcoded paths).
- [ ] Row actions valid for DRAFT / AWAITING_CONFIRMATION / RECEIVED / VOIDED.
- [ ] Detail handles invalid id and branch mismatch (existing messages).
- [ ] `npm run test:unit:inbound` passes.
- [ ] ESLint clean on touched files.

---

## 9. Rollout notes

- Deploy **frontend only**; no migration.
- `next.config.js` rewrite stays for static/export parity; `proxy.ts` is the runtime hardening layer.
- Bookmarked `vendor-receipt-grn-detail-page` URLs still redirect to canonical via existing proxy rule.
