# Build Fix Audit — bpa_web (JSX/TSX Type Mismatches)

**Date:** 2026-06-06  
**Project:** `bpa_web` (Next.js 16.1.6)  
**Command:** `npm run build`  
**Result:** ✅ Success (395 static pages generated)

---

## Scope

Searched for TypeScript syntax embedded in JavaScript files under:

| Directory | `.js` / `.jsx` files scanned |
|-----------|------------------------------|
| `app/` | 344 |
| `components/` | 2 |
| **Total** | **346** |

### Search patterns used

- `interface` / `type` declarations
- Generic hooks: `useState<`, `useRef<`, `useMemo<`, `useCallback<`
- Typed parameters: `(x: string)`, `): Promise<…>`
- `import type`, `export type`, `React.FC`, `JSX.Element`, `satisfies`, `as const` (type-only usage)
- Inline type assertions in function signatures

---

## JS/JSX audit findings

**No files required rename or TypeScript stripping.**

All 346 `.js` / `.jsx` files in `app/` and `components/` use plain JavaScript. Type information appears only in **JSDoc** comments (e.g. `@param`, `@returns`, `@type`), which is valid in `.js` and does not cause build failures.

### JSDoc-only typing (no action needed)

| File | Notes |
|------|-------|
| `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx` | `@param` with inline object types for filter chip props |
| `app/producer/_lib/producerNotificationHelpers.js` | `@param` with `Record<string, unknown>` |
| `app/producer/_lib/permissionLabels.js` | `@type` index signature |
| `app/producer/_lib/apiErrorPopup.jsx` | `@returns` with typed shapes and `JSX.Element` in JSDoc |
| `app/owner/_components/dashboard/ProductSummaryCard.jsx` | Destructured prop named `loading:` (not a TS annotation) |

No `.js` / `.jsx` files contained executable TypeScript syntax (`interface`, typed params, generic hooks, etc.).

---

## Actual build failures (TS/TSX type mismatches)

The failing `next build` TypeScript phase reported errors in `.tsx` / `.ts` files, not in `.js` / `.jsx`.

### 1. `src/bpa/campaign/admin/CampaignForm.tsx`

| Error | Cause | Fix |
|-------|-------|-----|
| `Property 'walkInAllowed' does not exist on type 'CampaignFormValues'` | UI referenced `walkInAllowed` while form state only defines `allowWalkIns` | Walk-in switch now uses `allowWalkIns` only; payload already maps `config.walkInAllowed` from that field |
| `Property 'vaccineCost' / 'serviceCharge' does not exist on type '{ packageFeatures?: … }'` | `campaignToFormValues` reads nested pricing fields not declared on `pricing` | Extended inline `pricing` type with optional `vaccineCost` and `serviceCharge` |
| — | `allowWalkIns` ignored API `config.walkInAllowed` on load | Hydration now uses `c.allowWalkIns ?? cfg?.walkInAllowed ?? true` |

### 2. `src/bpa/campaign/admin/CampaignOperationsCenter.tsx`

| Error | Cause | Fix |
|-------|-------|-----|
| `Property 'coverageZoneName' does not exist on type '{ bdAreaId; areaName; … }'` | Table rows union `bookingsByBdArea` and `bookingsByArea`; only the latter lacked `coverageZoneName` | Added optional `coverageZoneName` to `bookingsByArea` in `lib/campaignApi.ts` |

---

## Files changed

| File | Change |
|------|--------|
| `src/bpa/campaign/admin/CampaignForm.tsx` | Walk-in field alignment; pricing type extension; config hydration |
| `lib/campaignApi.ts` | Optional `coverageZoneName` on `CampaignAnalyticsData.bookingsByArea` |

---

## Verification

```bash
cd bpa_web
npx tsc --noEmit   # exit 0
npm run build      # exit 0 — compiled + typecheck + 395 pages
```

---

## Recommendations

1. **Keep new campaign/admin UI in `.tsx`** — type definitions for form values and API payloads should live next to components or in `lib/campaignApi.ts`.
2. **Avoid duplicating field names** — prefer a single form field (`allowWalkIns`) and map to API shape (`walkInAllowed`) in `campaignFormToPayload`.
3. **Union row types in DataTable** — when falling back between API arrays (`bookingsByBdArea ?? bookingsByArea`), ensure shared column fields exist on all union members or use optional chaining in renderers.
4. **No mass `.jsx` → `.tsx` migration needed** for `app/` / `components/` at this time; existing JS files are clean.
