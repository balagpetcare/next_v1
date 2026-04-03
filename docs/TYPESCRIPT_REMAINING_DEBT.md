# TypeScript source hygiene — status

**Last validated:** 2026-03-21  
**Command:** `npx tsc --noEmit -p tsconfig.json` (from repo root; `.next` remains excluded per project config)

## Current status

`npx tsc --noEmit -p tsconfig.json` completes with **no diagnostics** on real sources.

## Root-cause categories addressed (recent pass)

| Category | What was wrong | Typical fix |
|----------|----------------|-------------|
| **Unknown API payloads** | `ownerGet` / list endpoints typed as `unknown[]` | Runtime normalization (narrow objects, validate required fields) before `setState` |
| **ReactNode vs `unknown`** | `Record<string, unknown>` fields used in JSX | `String(...)` for display fallbacks |
| **`useEffect` + async closure** | Params like `branchId` not narrowed inside nested `async function` | `typeof x === "string"` guards before capturing |
| **DTO vs domain row** | UI state was a subset of `DoctorScheduleTemplateRow` but PUT expected full rows | State aligned to `DoctorScheduleTemplateRow[]`; new rows use `id: 0`, `status: "ACTIVE"` (backend replaces rows and ignores client ids on create) |
| **Helper optionals** | `field: string \| null` passed where `field?: string` expected | `field: field ?? undefined` at call site |

## Files touched in the final cleanup slice

- `src/lib/displayFormatters.ts` — `formatAuditChangeLines` options compatibility
- `app/owner/(larkon)/clinic/[branchId]/page.tsx` — branch id narrowing in `useEffect`
- `app/owner/(larkon)/clinic/[branchId]/settings/page.tsx` — same
- `app/owner/(larkon)/clinic/[branchId]/staff/page.tsx` — same
- `app/owner/(larkon)/clinic/[branchId]/staff/[memberId]/page.tsx` — branch + member narrowing
- `app/owner/(larkon)/clinic/[branchId]/services/[serviceId]/edit/page.tsx` — branch + service narrowing
- `app/owner/(larkon)/clinic/[branchId]/appointments/page.tsx` — `normalizeOwnerSlotList` for slots
- `app/owner/(larkon)/clinic/[branchId]/inventory/page.tsx` — string fallbacks in table cells
- `app/owner/(larkon)/clinic/[branchId]/packages/[packageId]/edit/page.tsx` — services list normalization
- `app/owner/(larkon)/clinic/[branchId]/schedule/exceptions/page.tsx` — `normalizeScheduleExceptions`
- `app/owner/(larkon)/clinic/[branchId]/schedule/page.tsx` — typed templates / `DoctorScheduleTemplateRow` state
- `app/owner/(larkon)/clinic/[branchId]/settlement-batches/[batchId]/page.tsx` — `String(...)` for profile id display
- `app/staff/(larkon)/branch/[branchId]/clinic/items/page.tsx` — string fallbacks (ledger + instruments)

## Optional follow-ups (not required for green `tsc`)

1. **`ownerApi.ts`** — Give `ownerClinicSlots`, `ownerClinicScheduleExceptions`, and similar endpoints **narrowed return types** so pages do not each duplicate normalizers (keep runtime checks at the boundary).
2. **`ownerClinicScheduleTemplatesPut`** — Introduce a dedicated **upsert input** type (no `id` required) that matches the backend service contract, and map from UI rows in one place; reduces coupling to Prisma-shaped `DoctorScheduleTemplateRow`.

## Intentionally not changed

- Re-including `.next` or generated artifacts in TypeScript project scope.
