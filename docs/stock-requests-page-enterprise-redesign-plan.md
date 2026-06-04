# Stock requests list — enterprise redesign (staff branch)

## Analysis note (pre-implementation)

### Current implementation

- **Route:** `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx` — client component, `inventory.read`, list via `staffStockRequestsList` (`GET /api/v1/stock-requests` with `branchId`, optional `status`, `requestIntent`, `dateFrom`, `dateTo`, `limit`).
- **Detail / create:** `staffStockRequestDetailPath`, `staffStockRequestCreatePath` from `@/lib/staffInventoryRoutes` (canonical detail URL uses `stock-request-detail` segment + rewrites).
- **UI stack:** `BranchHeader`, `Card` from `@/src/bpa/components/ui/Card`, `LkFormGroup` / `LkSelect` (WowDash/Larkon), Bootstrap table, local `statusBadgeClass` duplicated from owner list pattern (does not use API `derivedStatusDisplay.color`).

### Conflicts / gaps

1. **Badge semantics:** Backend already returns `derivedStatusDisplay: { label, color }` with a small palette (`gray` | `blue` | `yellow` | `green` | `red`) from `getStatusDisplay`. The page ignored `color` and re-derived Bootstrap classes from status strings — duplicated and slightly out of sync with enterprise naming (e.g. APPROVED → “Ready to Fulfill”).
2. **Search:** List API has **no** text search parameter (`ListRequestsFilter` is branch/org/status/intent/dates only). Any search must be **client-side** on the loaded list (ID, requester, notes, line/product text).
3. **KPI scope:** Summary counts are computed from the **loaded** page of results (up to `limit: 100`), not global branch totals — honest labeling avoids implying full-tenant analytics.
4. **Sticky header:** `position: sticky` on `thead` can be unreliable inside `.table-responsive` in some browsers; **per-`th` sticky** with explicit background is the safer pattern; capped `max-height` + scroll for long lists.

### Chosen approach

- **Safe refactor:** Same data source, permissions, and routes; add date filters wired to existing API params; add client search; add KPI row and layout/typography/table polish; map badges from `derivedStatusDisplay.color` when present with fallback to existing string-based mapping.
- **Secondary CTA:** Link to **Incoming** (`/inventory/incoming`) when `inventory.receive` — aligns with “what to do next” for dispatched stock.

---

## Verification (post-implementation)

### Files changed

- `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx` — main redesign.
- `docs/stock-requests-page-enterprise-redesign-plan.md` — this plan.

### Visual improvements

- **Header strip:** Title “Stock requests”, operational subtitle, primary **New request**, optional **Incoming** (`inventory.receive`) for receive workflow.
- **Five KPI cards:** **Total requests**, **Pending action**, **In progress**, **Received**, **Cancelled** — all computed from the **visible table rows** (after API filters + client search). Hint text states the max loaded row count (`100`).
- **Filter bar:** Status, intent (URL synced on change; `intent` / `requestIntent` query still seeds from URL), **Created from / to** wired to `staffStockRequestsList` (`dateFrom` / `dateTo`), client-only **Search**, **Reset filters** (clears dates, status, intent, search, and intent query param).
- **Table:** Card-wrapped workspace, scrollable body (`max-height`), **sticky** `thead` cells with `bg-light`, intent pill, status pill using **`derivedStatusDisplay.color`** when present with string fallback, short **next-step** line under status, **ID as primary link**, right-aligned line count and total qty, **Open** action, **inset primary rule** on rows that match “pending action” heuristic.

### Business behavior preserved

- `inventory.read` gate, `AccessDenied`, redirect on `unauthorized`.
- Create button still requires `inventory.update` OR `inventory.transfer`.
- List fetch still keyed by `branchId`, server-side `status` + `requestIntent` + optional `dateFrom` / `dateTo`; limit raised from `50` to **`100`** (API cap) for a fuller on-page picture — same endpoint contract.

### Small behavior fix (safe)

- Intent filter state now follows the URL when the `intent` / `requestIntent` query is removed (previously the dropdown could stay on the old intent after the query was cleared).

### Known limitations

- KPIs and search apply to the **loaded page only** (max **100** rows; no pagination control on this screen).
- Text **search is client-side only** (no backend `q` parameter on stock-requests list).

---

## Second-pass polish (analysis + implementation)

### What was already working

- Card-based layout, breadcrumb, permissions, API wiring, sticky `thead`, intent URL sync, and use of `derivedStatusDisplay` for badges.

### What still felt “first-pass”

- KPI cards were informational only; operators could not jump straight into a segment.
- Badge / lifecycle / “next step” logic lived entirely in the page file, duplicating patterns used on the stock request **detail** client.
- Row emphasis used a strong inset bar; combined with KPI drill-down it could feel heavy.
- Filter bar mixed label styles; laptop wrapping was acceptable but not tight.
- Empty states did not fully separate “no API rows” vs “search hid everything” vs “KPI segment empty on loaded set”.
- Data-scope (client search + row cap) was only in KPI hint text.

### Standardization choice (shared vs page-only)

- **Conflict:** `StaffStockRequestDetailClient.jsx` used a separate `statusBadgeClass` map (no `derivedStatusDisplay.color`, different `bg-info` contrast).
- **Fix:** Introduced `src/lib/stockRequestUi.js` with one mapping for badge classes, lifecycle buckets, attention rule, label normalization, next-step hints, and KPI counting. List page and detail header badge both import from it.

### URL / query behavior (KPI drill-down)

- **`srBucket` query param** (`attention` | `progress` | `received`) is the **source of truth** for multi-status KPI views (no duplicate React state). Keeps deep links and back/forward predictable alongside existing `intent` / `requestIntent`.
- **Cancelled** KPI continues to use the **status** dropdown + API (`status=CANCELLED`) and clears `srBucket`.
- **`Total`** clears `srBucket` and clears single-status filter (`All statuses`).
- When `srBucket` is present, the status `<select>` is disabled and the API omits `status` so the client can segment the loaded window; banner explains this.

### “Needs attention” rule (explicit)

Rows need attention when derived status is one of: **DRAFT**, **DISPATCHED**, **PARTIALLY_DISPATCHED**, **PARTIALLY_RECEIVED**, **RECEIVED_PARTIAL** — branch can submit, track inbound, or finish receiving. Implemented as `stockRequestNeedsAttention()` in `stockRequestUi.js` and reused for subtle row tint when not already viewing the attention KPI.

### Files changed (second pass)

- `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx` — KPI interactions, URL `srBucket`, filter/table/empty/error polish, data-scope strip.
- `src/lib/stockRequestUi.js` — **new** shared helpers.
- `app/staff/(larkon)/branch/[branchId]/inventory/_components/StaffStockRequestDetailClient.jsx` — badge/label uses shared helpers.
- `docs/stock-requests-page-enterprise-redesign-plan.md` — this section.

### Refinements made

1. **KPI cards:** Clickable; apply `srBucket` or `status=CANCELLED`; active card uses light primary background; `aria-pressed` set; **Reset all** disabled when nothing active.
2. **Status system:** Centralized in `stockRequestUi.js`; labels via `formatStockRequestStatusLabel`; badges via `stockRequestStatusBadgeClass` (API `color` first, then code fallback aligned with list semantics).
3. **Attention rows:** Softer background tint only when not in attention KPI view; inset bar removed.
4. **Next-step line:** Shortened strings via `stockRequestNextStepHint`.
5. **Filter bar:** Single “Filters & search” header, `LkFormGroup` for date + search, `Reset all`, KPI-view alert with clear action, improved empty copy branches.
6. **Table:** Uppercase compact header row, monospace emphasized ID link, line count sublabel under total qty, `shadow-sm` on scroll container, `z-index` on sticky headers.
7. **Loading / error:** More operational copy; error includes icon and guidance.
8. **Data scope:** Subtle paragraph above KPIs stating server cap + that search is **loaded rows only**.

### Final verification

- List fetch still uses `branchId`, `requestIntent`, `dateFrom`, `dateTo`, `limit: 100`; `status` omitted only when `srBucket` is a valid bucket.
- Permissions unchanged (`inventory.read`, create rules, `Incoming` link).
- Intent URL sync unchanged; `srBucket` added without breaking intent query.

### Remaining limitations

- Same as before: no server text search; max **100** rows; KPI “Received” / “Pending action” segments are computed on the **current fetch** (when `srBucket` is set, status is not sent to API, so the segment reflects up to 100 mixed-status rows).

---

## Detail page — list consistency pass

### Analysis (pre-change)

- **Route / component:** Staff stock request detail is implemented in `StaffStockRequestDetailClient.jsx` (canonical URL `…/stock-request-detail/[requestId]`).
- **Mismatch vs list:** Intent badges used ad hoc `bg-warning` for procurement (list uses primary-subtle pill). Header was a single flat row without the list’s “operations strip” hierarchy. No shared **next-step** / **attention** language. Timeline was minimal; no explicit lifecycle vs “where we are now”. Line table omitted fulfilled/cancelled/remaining despite API enriching items via canonical summary. Submit only patched local `status`, leaving **derived** status stale until reload.

### Shared approach (documented before code)

- Extend `stockRequestUi.js` with **intent** (`getStockRequestIntentBadgeProps`), **attention banner** (`stockRequestAttentionMessage`), and **progress steps** (`stockRequestProgressSteps`) so list + detail share one vocabulary. **Submitted** detection for progress must not treat `CANCELLED` (from draft) as “submitted”.
- Detail uses the same badge + label helpers as the list; **refetch** after submit/cancel to refresh derived fields.

### Files changed

- `app/staff/(larkon)/branch/[branchId]/inventory/_components/StaffStockRequestDetailClient.jsx` — enterprise header, metrics, progress, grouped metadata, line table, actions, states.
- `src/lib/stockRequestUi.js` — `getStockRequestIntentBadgeProps`, `stockRequestAttentionMessage`, `stockRequestProgressSteps`; submitted detection fix for cancelled-from-draft.
- `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx` — intent column uses `getStockRequestIntentBadgeProps` (removed duplicate local helper).
- `docs/stock-requests-page-enterprise-redesign-plan.md` — this section.

### Design improvements

1. **Header:** Breadcrumb spacing aligned with list; hero strip with primary border when `stockRequestNeedsAttention`; monospace **#ID**; meta row (created, requester, branch); status pill + `stockRequestNextStepHint`; intent + PO pills match list semantics; **Submit** / **Cancel** / **Incoming** / **Receive dispatch** (when `inventory.receive` + first dispatch + inbound-related derived status).
2. **Attention:** `stockRequestAttentionMessage` in a warning alert when branch action applies.
3. **Summary metrics:** Compact metric cards only for grounded fields (`canonicalRequestSummary` / `summary`, line count, dispatch count, allocation shortage if &gt; 0).
4. **Progress:** Card combining vertical **progress steps** (complete / current / pending / skipped) and a **milestones** column (created, submitted, transfer, each dispatch with optional receive link).
5. **Line items:** Table with right-aligned qty columns, fulfilled/cancelled/remaining, SKU subline, partial-row highlight when fulfilled but remaining &gt; 0.
6. **Metadata:** “Context & notes” (procurement note, procurement-demand info, decline reason) and “Organization” (org, branch, updated) in two cards.
7. **States:** Loading and not-found copy aligned with list tone; dismissible error alert with icon.

### Preserved behavior

- `inventory.read`, `AccessDenied`, login redirect, `staffStockRequestGet` / submit / cancel API usage and permission gates (`inventory.update` or `inventory.transfer` for submit/cancel).
- Cancel still allowed for **DRAFT** and **SUBMITTED**; submit only for **DRAFT**.
- List path unchanged.

### Verification notes

- After submit/cancel, **GET detail** runs again so `derivedStatus` / `derivedStatusDisplay` stay accurate.
- Progress “Submitted” step does not mark complete for **cancelled-from-draft** (no `submittedAt` and status not in the submitted-or-beyond set).

### Remaining limitations

- **Progress model** is staff-facing and heuristic (not a full state machine); cancelled mid-flight shows later steps as **skipped** rather than partially complete.
- **Dispatch-level shipped totals** are not summarized unless already present on line items / canonical fields exposed by the API.

---

## Larkon alignment pass (staff stock requests list)

### Larkon alignment analysis

- **Reference patterns:** Staff inventory pages such as **Transfers** and **Adjustments** use `BranchHeader`, a compact **h5 + optional actions** row, **`Card`** for the main block, **`LkFormGroup` + `LkSelect` / `LkInput`** for filters, and plain **`table table-sm`** (simple `thead`, standard `badge` classes) without heavy custom chrome.
- **What felt off-theme before:** Large tinted hero header strip, long standalone data-scope paragraph, KPI cards with thick colored **left stripes** and `fs-2` numerals, uppercase table header row, sticky headers + shadowed scroll panel, `rounded-pill` status badges, extra micro-copy under status on every row, separate Intent column plus verbose styling — together this read as “custom dashboard” rather than Larkon admin.

### What was changed

1. **Header:** Matches transfers-style layout — **breadcrumb**, then **h5 + one-line muted subtitle** + **small outline/primary buttons** (`radius-12` preserved). Removed the large rounded hero panel.
2. **Scope note:** One **muted sentence** inside the main `Card` above KPIs (not a separate marketing-style block).
3. **KPIs:** Replaced stripe cards with **compact `StatFilter` buttons**: plain `card` body, small label + `fs-6` value, **primary border only when active**; `row-cols-*` for responsive density. **Behavior preserved** (`srBucket`, cancelled → status filter, counts from search-filtered rows).
4. **Filters:** Same controls; **`LkInput`** for search (aligns with adjustments); **`text-sm`** on `LkFormGroup`; compact **Reset** as link-style next to “Filters”; KPI bucket banner shortened.
5. **Errors / empty / loading:** Simplified to the same **alert / py-40 text-center** patterns as transfers/incoming — no large icon blocks.
6. **Table:** **Primary focus** — `table table-sm table-hover`, normal `thead`, standard **`badge`** (no pill), **no sticky/shadow wrapper**. Columns consolidated: **ID** (link + intent label line), **Created** (date + time), **Finalized** (date + time from `stockRequestListCompletedAt` or “— / Not finalized”), **Status** (badge + “Action due” only when `stockRequestNeedsAttention`), **Qty** (total + “N lines”), **Requester** (single line truncate), **Open** button without extra padding classes.
7. **Shared helpers:** Still use `stockRequestStatusBadgeClass`, `formatStockRequestStatusLabel`, KPI/bucket helpers; added **`stockRequestListCompletedAt`** in `stockRequestUi.js` for consistent “finalized” sourcing from list payload (`transfers[0].receivedAt` / `updatedAt`).

### Files changed

- `app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx`
- `src/lib/stockRequestUi.js` (`stockRequestListCompletedAt`)
- `docs/stock-requests-page-enterprise-redesign-plan.md` (this section)

### Verification notes

- Permissions, routes, `intent` / `requestIntent` URL sync, `srBucket`, API query params, list limit, client search, and KPI click behavior are unchanged in intent.
- **Finalized** column is best-effort: depends on fields returned on the list endpoint (e.g. `transfers[0].receivedAt`, `updatedAt`); in-flight requests correctly show “Not finalized”.

### Limitations

- **Finalized** is not a dedicated business “closed at” timestamp on every row; it approximates completion for display only.
- KPI counts remain **for the loaded window** after search, as before.

---

## Detail page — Larkon alignment pass

### Larkon alignment analysis

- **Reference:** Same staff inventory rhythm as the list pass — `BranchHeader`, breadcrumb + **h5** title strip, **`Card`** sections with `title` / `subtitle`, compact **bordered stat tiles** (not thick KPI stripes), **`table table-sm`** for the operational block, standard **`badge`** classes from `stockRequestUi.js` (no `rounded-pill`).
- **What looked too raw / custom before:** Long stacked paragraphs in the header, mixed “report” typography, progress as a symbol-heavy vertical list (Unicode markers), metric row using nested Bootstrap `col` inside tiles (layout fragile), and sections that did not mirror the list page’s card density and filter-table tone.

### What was changed

1. **Header:** List-aligned breadcrumb, compact title line (**Stock request #ID**), intent + status badges via `getStockRequestIntentBadgeProps` / `stockRequestStatusBadgeClass`, single **meta line** (branch, requester, created/updated), actions as **small outline/primary** buttons (Submit / Cancel / Incoming / Receive dispatch) without extra text fragments.
2. **Summary metrics:** **StatTile** row — plain `card radius-12 border` tiles, `tabular-nums`, responsive **`col-6 col-md-4 col-lg-3 col-xl-2`** wrappers only at the row level (no nested `col` inside the tile).
3. **Attention / next step:** Keeps `stockRequestAttentionMessage` and `stockRequestNextStepHint` in compact **alert** + muted one-liner form, consistent with list “Action due” tone.
4. **Progress card:** Single **`Card title="Progress"`** with `stockRequestProgressSteps` rendered as a **dense list** (title + subtitle per step): **current** step uses `fw-semibold text-primary`; completed/pending use weight/muted styling — **no Unicode step glyphs** (better cross-font rendering).
5. **Milestones:** Remains in the same card as a structured, compact second column (created / submitted / dispatch / receive) without long prose blocks.
6. **Context:** Split **Notes & context** vs **Organization** into separate **`Card`** blocks with label-value rows; notes truncated where needed in tables.
7. **Line items:** Primary **`Card title="Line items"`** with `table table-sm`, merged product column (name + variant/SKU subline), short numeric headers, compact line/backorder badges, truncated line notes.
8. **States:** Loading / error / missing detail use the same **spinner / alert / centered muted text** patterns as list and transfers-style pages.

### Files changed

- `app/staff/(larkon)/branch/[branchId]/inventory/_components/StaffStockRequestDetailClient.jsx` — layout hierarchy, StatTile grid fix, progress list typography, Larkon card/table rhythm.
- `docs/stock-requests-page-enterprise-redesign-plan.md` — this section.

### Verification notes

- **Lint:** `StaffStockRequestDetailClient.jsx` passes IDE diagnostics after edits.
- **Logic:** No intentional changes to submit/cancel rules, permission gates, `refetchRequest` after mutations, dispatch/receive link construction, `stockRequestProgressSteps` / milestone derivation, or line quantity calculations — layout and presentation only.
- **Shared UI:** Badges and labels still sourced from `@/src/lib/stockRequestUi.js` for parity with the list page.

### Remaining limitations

- Progress remains a **staff-facing heuristic** (same as the list consistency pass), not a full audited state machine.
- **Finalized / milestone timestamps** depend on fields returned by the detail API; sparse payloads may still show “—” in places.
