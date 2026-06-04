# Staff batch pricing & expiry management — implementation report (2026-04-22)

## Feature overview

Branch managers can list SHOP-location inventory batches, see resolved selling price and expiry status, and **update batch expiry** plus **batch-level selling price** with a **mandatory reason** (stored on the existing enterprise batch rule audit field).

Implementation is intentionally narrow:

- **Data path**: Existing `BatchPricingRule` with `promoPrice`, optional `sellsAtRulePrice` (when true, the clamped rule price is used as the sell path in the enterprise pricing engine; when false, legacy “clearance below list” behavior applies).
- **Scope**: Only lots on the branch **default SHOP** fulfilment location; API enforces `BRANCH_MANAGER` role **and** permission `inventory.batch.pricing`.
- **POS**: List price and retail governance resolve FEFO `lotId` where possible (`getAvailableLotsFEFO` on the shop location) and pass it into `resolveSellingPriceWithEnterprise`.
- **Org policy**: Batch promo resolution still respects **`batchPricingEnabled`** on org pricing policy; the staff UI warns when this is off.

## Files changed (summary)

### Backend (`backend-api`)

| Area | Files |
|------|--------|
| Schema / migration | `prisma/schema.prisma` (`BatchPricingRule.sellsAtRulePrice`), `prisma/migrations/20260422120000_batch_pricing_sells_at_rule_price/migration.sql` |
| Enterprise / engine | `src/api/v1/modules/pricing/enterpriseResolution.service.ts`, `pricingEngine.service.ts`, `enterprisePricing.service.ts`, `posListPriceResolution.service.ts`, `retailDiscount.service.ts` |
| Staff API | `src/api/v1/modules/inventory/staffBatchPricing.service.ts`, `staffBatchPricing.controller.ts`, `inventory.routes.ts` |
| Inventory batches (`packDisplay` inputs) | `src/api/v1/modules/inventory/inventory.service.ts` (`getInventoryBatches` variant `attributes` + `unit`) |
| Resilient batch rule persist | `src/api/v1/modules/pricing/enterprisePricing.service.ts` (stale-client fallback for `sellsAtRulePrice`) |
| RBAC | `src/api/v1/constants/branchRoles.ts` (`pickEffectiveBranchRoleKey`), `src/api/v1/services/branchAccessPermission.service.ts`, `src/api/v1/utils/permissions.js`, `prisma/seeders/seedRolesPermissions.ts` |
| FEFO export (TS) | `src/api/v1/modules/inventory/ledger.service.ts` (named `export { getAvailableLotsFEFO, … }` for ESM imports from pricing) |

### Frontend (`bpa_web`)

| Area | Files |
|------|--------|
| API helpers | `lib/api.ts` (`staffShopBatchesList`, `staffShopBatchUpdate`) |
| Navigation | `src/lib/branchSidebarConfig.ts` (Operations → **Batch pricing**, `inventory.batch.pricing`) |
| UI | `app/staff/(larkon)/branch/[branchId]/inventory/batch-pricing/page.jsx` (Pack / size column + editor hint) |

### Documentation

- This file: `docs/BATCH_PRICING_STAFF_FEATURE_2026-04-22.md`

## API

- `GET /api/v1/inventory/shop-batches?branchId=` — list batches + metadata (`batchPricingEnabled`, `shopLocationId`).
- `PATCH /api/v1/inventory/shop-batches/:lotId?branchId=` — body: `{ sellPrice, reason, expDate?, sellsAtRulePrice? }`.

Both require permission **`inventory.batch.pricing`** (middleware); service layer also requires **`BRANCH_MANAGER`**.

## Validation summary

| Check | Result |
|--------|--------|
| Backend `tsc --noEmit` | Pass (after exporting `getAvailableLotsFEFO` for TS imports) |
| ESLint on new staff page `page.jsx` | Pass |
| Full repo `npm run lint` (bpa_web) | **Not clean** — many pre-existing parse errors on `.ts`/`.tsx` without TypeScript parser; new page uses `.jsx` to align with staff inventory pages |

Manual QA recommended:

1. Seed / assign **Branch Manager** with `inventory.batch.pricing` (re-seed or backfill permissions if needed).
2. Enable org **batch pricing** where applicable; confirm staff UI warning when off.
3. Edit batch: price &gt; 0, reason ≥ 3 chars, price within catalog bounds; verify POS list uses FEFO lot and batch price after save.
4. Expired lot: cannot save sell rule until expiry moved to the future (by design).

## Limitations

- **SHOP-only**: Only the default **SHOP** location for the branch; warehouse or secondary retail locations are out of scope.
- **Policy gate**: If **`batchPricingEnabled`** is false, enterprise batch promos may not apply at POS even after staff edits; UI surfaces this.
- **RBAC seed**: New permission `inventory.batch.pricing` is in code and **BRANCH_MANAGER** seed list; existing databases may need a **permission backfill** or **re-seed** for the key to exist in `Permission` / role links.
- **Lint**: Project-wide ESLint does not parse TypeScript syntax in many files; use **`npm run typecheck`** on the API and Next/IDE for TS, or extend ESLint with `@typescript-eslint/parser` for a full green lint.

---

## Final QA & integration verification (2026-04-22)

Static/code-path verification was performed in Cursor; **browser and live-DB steps** are listed under manual post-checks (no running seeded environment in this pass).

### 1. Access / RBAC (verified in code)

| Rule | Result |
|------|--------|
| `inventory.batch.pricing` is assigned only to **BRANCH_MANAGER** in `branchRoles.ts` | Pass — single role entry. |
| Route middleware `requirePermission("inventory.batch.pricing")` on `GET`/`PATCH` shop-batches | Pass. |
| Service `listShopBatch` / `updateShopBatch` require `profile.role === "BRANCH_MANAGER"` **and** permission | Pass; wrong role → `FORBIDDEN` even with a forged permission in JWT. |
| Branch isolation | Pass — `lot` must have `stockLotBalance` on **this branch’s** default SHOP `locationId` matching `query.branchId`. |
| **Staff page** | Updated to require **`myAccess.role === "BRANCH_MANAGER"`** in addition to `inventory.batch.pricing` (aligns with service; sidebar still permission-only, which is sufficient because only managers get the key in `branchRoles`). |
| **Sidebar** | `getFilteredBranchSidebar` shows **Batch pricing** when `permissions` includes `inventory.batch.pricing`; item has `hideForWarehouseBranch: true` (hidden for warehouse-hub branch types; retail SHOP branches see it if permitted). |
| **DB / seed** | `seedRolesPermissions.ts` defines the permission and attaches it to **BRANCH_MANAGER**. **Does not run automatically on existing DBs** — operators must `db seed` / migrate + backfill `BranchAccessPermission` / role matrix to match, or the API returns 403 and the branch summary may omit the permission. |

### 2. Data / page (verified in code)

| Check | Result |
|------|--------|
| List source | `getInventoryBatches({ locationId: shopLocationId, ... })` with `shopLocationId` from `getDefaultFulfilmentLocationForBranch(..., "SHOP")` | Pass — SHOP-only. |
| Table mapping | `productName`, `packDisplay`, `sku`, `lotCode`/`lotId`, `expDate`, `availableQty`, `currentSellingPrice`, `status` | Pass vs `listShopBatchesForBranch` output. |
| `batchPricingEnabled` warning | Page reads `data.batchPricingEnabled` and shows org-policy alert when false | Pass. |
| Empty / loading | Empty table message when `items.length === 0`; header spinner when `loading` | Pass. |

### 3. Editor / validation (verified in code)

| Check | Result |
|------|--------|
| Reason ≥ 3 chars, price &gt; 0 | Service validation + controller maps `VALIDATION` → 400 | Pass. |
| Catalog bounds | `clampToBounds` + `BOUNDS` / zero clamp | Pass. |
| Expired lot + price | Blocked until `expDate` in future (`LOT_EXPIRED` / in-transaction validation for new expiry) | Pass. |
| `sellsAtRulePrice` | Persisted on rule; default true when field omitted | Pass. |

### 4. API (verified in code)

| Check | Result |
|------|--------|
| `GET` / `PATCH` + `branchId` query | Controllers require `branchId` | Pass. |
| Lot not on SHOP of branch | `FORBIDDEN` "not on this branch's SHOP location" | Pass. |
| Response shape for UI | `{ success, data: { shopLocationId, orgId, items, batchPricingEnabled } }` | Matches `page.jsx` expectations (`res.data`). |

### 5. POS integration (verified in code — not E2E in browser)

| Path | Result |
|------|--------|
| FEFO lot for list | `posListPriceResolution.service.ts` / `retailDiscount.service.ts` use `getAvailableLotsFEFO(shopLocationId, variantId)` and pass `lots[0]?.lotId` into `resolveSellingPriceWithEnterprise` | Pass. |
| Batch price application | `findBestBatchPromoPrice` short-circuits if `!batchPricingEnabled` | Pass — batch rules ignored at engine when org policy off. |
| `sellsAtRulePrice` | `pricingEngine.service.ts` uses clamped rule as list when true; else clearance-below-list branch | Pass. |
| **Regression note** | `resolveSellingPrice` still applies **branch/override** and catalog layers before batch; behavior unchanged for variants without batch rules. |

**Cannot verify in this pass (needs real org/branch/shop stock):** add-to-cart price after PATCH, barcode scan, and cache timing on POS.

### 6. Regression / safety (spot-check)

| Area | Result |
|------|--------|
| `ledger.service` named export for FEFO | Typecheck clean; no duplicate logic. |
| Other inventory routes | Only added routes; no change to `GET /`, summary, etc. |
| `branchSidebarConfig` | Valid TS structure; `isWarehouseHubBranch` unchanged. |

### 7. Fixes applied in this QA pass

- **`bpa_web/.../batch-pricing/page.jsx`**: Require **`BRANCH_MANAGER`** in `canEdit` (in addition to `inventory.batch.pricing`) so the shell matches `staffBatchPricing.service` and failed loads are less confusing for mis-scoped users.

### 8. Re-validation run (this pass)

| Command | Result |
|---------|--------|
| `npm run typecheck` (`backend-api`) | Pass |
| `npx eslint .../batch-pricing/page.jsx` (`bpa_web`) | Pass |

### 9. Release readiness

- **Code:** Ready to ship from a static-review perspective; **DB seed/backfill** and **org `batchPricingEnabled`** must be confirmed per environment.
- **Manual:** Required before production sign-off: one happy-path in browser (list → edit → save → POS price check) on a branch with SHOP stock and enterprise POS list resolution enabled.

### 10. Manual post-check checklist (real data)

1. After deploy, confirm `Permission` / role links include `inventory.batch.pricing` for branch manager (or re-run seed for dev).
2. Log in as branch manager → `/staff/branch/{id}/inventory/batch-pricing` loads without 403.
3. Set org **`batchPricingEnabled: true`**, then PATCH a lot on SHOP; confirm `GET` shows updated `batchRulePrice` / resolved price and POS shows expected amount for FEFO lot.
4. Set **`batchPricingEnabled: false`**, confirm POS no longer applies batch promos; staff page still allows edits but org warning is visible.
5. Non–branch-manager staff: no sidebar link (no permission) and 403 on API if called directly.
6. **Warehouse hub branch:** sidebar hides retail ops including batch pricing — use a retail/SHOP branch for UAT.

---

## 11. RBAC access fix — “Access Denied” on batch pricing (2026-04-23)

### Root cause (exact)

`GET /api/v1/branches/:id/me` and **`resolveBranchAccessProfile`** (used by that endpoint and by **`staffBatchPricing.service`**) derived the staff **`role`** and the static permission list from:

```ts
member.roles[0]?.role?.key || member.role
```

When a branch manager has **multiple** `branch_member_roles` rows (e.g. **CLINIC_STAFF** and **BRANCH_MANAGER**), Prisma returns `roles` in **non-deterministic order**. If **`CLINIC_STAFF`** appeared first, the effective role became **`CLINIC_STAFF`**, whose `BRANCH_ROLE_PERMISSIONS` entry **does not** include **`inventory.batch.pricing`**, and **`myAccess.role` was not `BRANCH_MANAGER`**.

That produced a **frontend-only** denial on `batch-pricing/page.jsx` (`canEdit` requires both `BRANCH_MANAGER` and the permission) and a matching **backend** denial in **`listShopBatchesForBranch`** / **`updateShopBatch`** (same profile). Route middleware could still pass in some cases if other permission sources added `inventory.batch.pricing`, but the page and service remained the source of truth for **branch-scoped** manager checks — so the user still saw **Access Denied**.

**Mismatch:** “first join row” ≠ **intended primary branch role**.

### Fix applied (code)

Single canonical helper **`pickEffectiveBranchRoleKey`** in **`src/api/v1/constants/branchRoles.ts`**: union all keys from **`member.roles`** plus legacy **`member.role`**, then choose the key with the **best (lowest) index** in **`BRANCH_ROLE_PRIORITY`** (e.g. **BRANCH_MANAGER** wins over **CLINIC_STAFF**).

| File | Change |
|------|--------|
| `backend-api/src/api/v1/constants/branchRoles.ts` | Export **`pickEffectiveBranchRoleKey`** (+ priority map). |
| `backend-api/src/api/v1/services/branchAccessPermission.service.ts` | **`resolveBranchAccessProfile`** and **`resolveBranchAccessProfileFromPermission`** use the helper. |
| `backend-api/src/api/v1/utils/permissions.js` | Branch member + BAP paths use the same helper when expanding **`LEGACY_ROLE_PERMS`** / **`BRANCH_ROLE_PERMISSIONS`** (with fallback if the helper is missing). |
| `backend-api/src/api/v1/constants/branchRoles.pickEffective.test.ts` | Jest coverage for multi-role ordering. |

No broadening of who gets **`inventory.batch.pricing`**: only roles that already include it in **`BRANCH_ROLE_PERMISSIONS`** (still **BRANCH_MANAGER** for batch pricing) gain it when that role is present in the join set but was not first in the array.

### Relogin / cache

- **API:** No migration; redeploy the API.
- **Browser:** Staff **`useBranchContext`** caches branch summary **~45s** per `branchId` — after deploy, **hard refresh** or wait for TTL; switching branch and back also invalidates. Re-login is **not** strictly required unless the client holds an old error state.

### Manual verification

1. **`GET /api/v1/branches/1/me`**: `data.myAccess.role` === **`BRANCH_MANAGER`** and `data.myAccess.permissions` includes **`inventory.batch.pricing`** for a manager with both clinic and manager roles.
2. **`GET /api/v1/inventory/shop-batches?branchId=1`**: **200** for that user.
3. **`/staff/branch/1/inventory/batch-pricing`**: page loads (not Access Denied).
4. **Sidebar**: **Batch pricing** visible on retail branch when `hideForWarehouseBranch` does not apply and permission is present.
5. **Negative:** user with only **CLINIC_STAFF** (no manager role in join + legacy set) still denied.

### Database reseed / backfill

- **Not required** for this fix: matrix keys come from **`BRANCH_ROLE_PERMISSIONS`** at runtime.
- Optional: ensure **`BRANCH_MANAGER`** `Role` rows in DB match product expectations if you rely on DB-only `RolePermission` for other features.

---

## 12. Runtime validation follow-up (2026-04-23, live app)

### Exact final root cause

The active API process on `localhost:3000` was a stale Node process (not the current repo `nodemon` instance). Runtime probes showed it served an older permission matrix/route behavior:

- `GET /api/v1/branches/1/me` returned `role: BRANCH_MANAGER` but **without** `inventory.batch.pricing` for manager users.
- `GET /api/v1/inventory/shop-batches?branchId=1` returned an old non-batch-pricing error shape until the backend process was restarted from this workspace.

After restarting API from this repo, runtime aligned with code:

- manager users (`userId` 1 and 3 in this DB): `role: BRANCH_MANAGER`, `inventory.batch.pricing: true`
- non-manager (`userId` 5): `role: BRANCH_STAFF`, `inventory.batch.pricing: false`, 403 on `shop-batches`

### Runtime mismatch found

- The user expected to be a branch manager, but runtime branch profile for the tested non-manager account resolved as:
  - `myAccess.role = BRANCH_STAFF`
  - permissions did **not** include `inventory.batch.pricing`
  - page guard in `batch-pricing/page.jsx` correctly denied
  - sidebar filter in `branchSidebarConfig.ts` correctly hid Batch Pricing (`requiredPerm` missing)
- Branch 1 is not a warehouse hub (`branchType: CLINIC`, includes `PET_SHOP`), so `hideForWarehouseBranch` was **not** the blocker.

### Files touched in this follow-up

- No RBAC logic change was required beyond Section 11.
- Operational fix performed: restart API process bound to `:3000` from `backend-api` workspace (`npm run dev:api`).

### Restart / refresh / backfill

- **Required:** restart backend API when stale process is serving older code.
- **Recommended:** hard refresh staff tab (or wait ~45s cache TTL in `useBranchContext`) after backend restart.
- **Data backfill:** not required for code parity.  
  If the intended login account should be manager but resolves `BRANCH_STAFF`, update branch membership/role assignment for that account.

### Manual verification steps

1. Manager account: `GET /api/v1/branches/1/me` includes `role=BRANCH_MANAGER` and `inventory.batch.pricing`.
2. Same manager: `GET /api/v1/inventory/shop-batches?branchId=1` returns **200** with `shopLocationId` and `items` when the branch has a resolvable SHOP `InventoryLocation` (see §13 — inactive SHOP auto-reactivate).
3. Staff page `/staff/branch/1/inventory/batch-pricing` no Access Denied for manager role.
4. Sidebar shows `Batch pricing` when branch is non-warehouse and permission present.
5. Non-manager account still denied (403 or Access Denied).

---

## 13. Default SHOP location — `Branch has no default SHOP location` (2026-04-23)

### Root cause

`getDefaultFulfilmentLocationForBranch` only considered **`InventoryLocation` with `type: SHOP` and `isActive: true`**. Branch 1 already had a SHOP row with stock, but it was **`isActive: false`**, so POS and `GET /inventory/shop-batches` could not resolve a shop floor.

### Fix (code)

**`backend-api/src/api/v1/modules/orders/orders.service.ts`**

- Prefer an active SHOP/CLINIC location.
- If none, **reactivate the oldest inactive** location of that `type` for the branch (no second row created; existing `stockBalance` / `stockLotBalance` on that location remain valid).

**`backend-api/src/api/v1/modules/pos/pos.service.ts`**

- Barcode lookup now uses **`orderService.getDefaultFulfilmentLocationForBranch`** instead of duplicating a `findFirst({ isActive: true })` query.

### Validation

- `GET /api/v1/inventory/shop-batches?branchId=1` → **200**, `shopLocationId` set, `items` populated when lots exist on that SHOP location.

### Limitation

- If a branch has **no** SHOP row at all, callers must still create one (e.g. owner inventory UI or `ensureDefaultBranchInventoryLocation` when the branch has zero locations). This change only heals the **inactive SHOP with existing rows** case.

---

## 14. Prisma `sellsAtRulePrice` save error + pack / size in staff table (2026-04-23)

### Root cause (exact)

`Unknown argument 'sellsAtRulePrice' in prisma.batchPricingRule.create()` is thrown by the **Prisma Client runtime validator** when the **generated client** in `node_modules/@prisma/client` is **older than** `schema.prisma` / the code path that passes `sellsAtRulePrice` — i.e. **`prisma generate` was not run** after adding the field, or the **API process was not restarted** and is still loading an old client. The field and migration (`20260422120000_batch_pricing_sells_at_rule_price`) are correct in repo; the failure is **client/runtime alignment**, not missing application logic.

If the **database** never received the migration, a **current** client would typically fail at SQL with an **unknown column** error instead; fix that with `prisma migrate deploy` (or equivalent) on the target database.

### Fix applied (code + ops)

| Layer | Change |
|--------|--------|
| **Operations (required for a clean deploy)** | Apply migration **`20260422120000_batch_pricing_sells_at_rule_price`**, run **`npx prisma generate`**, **restart** the Node API so it loads the new client. |
| **Code (resilience)** | **`enterprisePricing.service.ts`**: `persistBatchPricingRuleCreate` / `persistBatchPricingRuleUpdate` catch the specific “Unknown argument `sellsAtRulePrice`” client error, retry create/update **without** that key, then run **`UPDATE "batch_pricing_rules" SET "sellsAtRulePrice"`** via `Prisma.$executeRaw` when the column exists so staff saves still match intent if someone forgets `generate`/restart. |

### Pack / size / weight / volume in UI

| Piece | Detail |
|--------|--------|
| **API field** | **`packDisplay`** on each `GET /inventory/shop-batches` item. |
| **Logic** | **`staffBatchPricing.service.ts`** — first non-empty string among known **`variant.attributes`** keys (`packSize`, `size`, `netWeight`, `weight`, `volume`, `capacity`, `strength`, `dosage`, `label`); else **`variant.title`**; else **`unit.name`** / **`unit.code`**. No invented numeric pack sizes. |
| **Data plumbing** | **`inventory.service.ts`** `getInventoryBatches` now selects **`attributes`** and **`unit`** on the variant and exposes them on the flattened **`variant`** object. |
| **UI** | **`batch-pricing/page.jsx`** — table column **Pack / size**; editor header shows **`(packDisplay)`** when present. |

### Files changed (this pass)

- `backend-api/src/api/v1/modules/pricing/enterprisePricing.service.ts`
- `backend-api/src/api/v1/modules/inventory/inventory.service.ts`
- `backend-api/src/api/v1/modules/inventory/staffBatchPricing.service.ts`
- `bpa_web/app/staff/(larkon)/branch/[branchId]/inventory/batch-pricing/page.jsx`
- `bpa_web/docs/BATCH_PRICING_STAFF_FEATURE_2026-04-22.md` (this section)

### Validation (this pass)

| Check | Result |
|--------|--------|
| `npm run typecheck` (`backend-api`) | Pass |
| `npx eslint` on `batch-pricing/page.jsx` (`bpa_web`) | Pass |

Live **PATCH** verification still needs a running API + DB with SHOP lots (not executed in this environment).

### Remaining limitations

- **`packDisplay`** depends on catalog data: if **`attributes`** omit pack keys and **`title`** is generic, differentiation may still be weak; **`unit`** alone (e.g. “Gram”) may not distinguish two SKUs.
- **Resilient Prisma path**: if the **`sellsAtRulePrice` column is missing** (unmigrated DB), the raw `UPDATE` is skipped silently — migrate the DB for correct semantics.
