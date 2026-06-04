# Owner vaccination card — TypeScript build fix

**Date:** 2026-05-04  
**Reference:** `docs/VACCINATION_SYSTEM_FINAL_COMPLETION_PLAN_2026-05-04.md`

---

## Root cause

`formatPetTaxonomyLine` in `lib/formatPetTaxonomy.ts` types nested relations as `{ name?: string }` (i.e. `name` is `string | undefined`, not `null`).

`OwnerVaccinationCardPet` in `lib/api.ts` types the same relations as `{ id: number; name: string | null }`, which is correct for JSON from the API.

Passing `pet` directly to `formatPetTaxonomyLine(pet)` therefore failed strict null checks: `string | null` is not assignable to `string | undefined` for `animalType.name` (and the same pattern for breed, subBreed, color, size).

Runtime behavior was already safe (`??` in the helper coerces missing values); the failure was **compile-time only**.

---

## Files changed

| File | Change |
|------|--------|
| `app/owner/(larkon)/pets/[id]/vaccination-card/page.tsx` | Added `toTaxonomyPetInput()` to map each relation to `{ name: row.name ?? undefined }` and pass that object into `formatPetTaxonomyLine`. |
| `docs/VACCINATION_OWNER_CARD_BUILD_FIX_2026-05-04.md` | This note. |

**Unchanged:** `lib/api.ts`, `lib/formatPetTaxonomy.ts`, backend, Prisma, billing, stock, void logic.

---

## Exact fix

1. **`toTaxonomyPetInput(pet)`** — Copies snapshot fields unchanged. For each of `animalType`, `breed`, `subBreed`, `color`, `size`, if the row exists, passes `{ name: row.name ?? undefined }`; if absent, passes `null`.

2. **Call site** — `formatPetTaxonomyLine(toTaxonomyPetInput(pet)) || pet.animalType?.name || ""`  
   Display fallback chain is unchanged; only the argument to `formatPetTaxonomyLine` is normalized for types.

---

## Validation result

| Command | Result |
|---------|--------|
| `cd D:\BPA_Data\bpa_web` → `npm run build` | **Success** (exit code 0). TypeScript step completed; owner vaccination card page compiles. |
| `npm run lint` | **Not run** for this change (repo has many unrelated pre-existing lint issues per project context). |

---

## Remaining vaccination limitations (unchanged by this fix)

Per the completion plan, the owner vaccination card still does not include:

- Print / PDF export (UI still shows “Coming soon” where applicable).
- QR code on the owner card.
- Public certificate verification endpoint.
- Automatic stock or billing reversal on void (backend product gap).

This fix only restores a **successful production build** for the owner vaccination card taxonomy line.
