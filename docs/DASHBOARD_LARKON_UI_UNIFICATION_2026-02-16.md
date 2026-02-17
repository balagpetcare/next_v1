# Dashboard Larkon UI Unification — 2026-02-16

Unified form and UI styling across all dashboard panels (admin, owner, shop, clinic, producer, mother, country, staff) using the Larkon design system. **Landing and public pages were not changed.**

---

## Scope (strict)

- **In scope:** `app/<panel>/(larkon)/**` (including `app/admin/(larkon)/**`) and `src/larkon-ui/**`, `src/larkon-admin/**`.
- **Out of scope:** `app/(public)/**`, landing pages, marketing pages, producer landing (`/producer` non-dashboard).
- **Rule:** No deletions. Legacy styles/components were not removed; they can be moved to `_quarantine_cleanup/2026-02-16/legacy_form_ui/` if deprecated later.

---

## Phase 0 — Audit summary

- **Legacy class names:** `form-control`, `form-select`, `form-label`, `radius-12` appear in:
  - `src/larkon-admin` (TopNavigationBar search, RoleAdd, InvoiceAdd, StoreSettings, support/help-center/faqs, widgets, tables).
  - `app/owner/(larkon)/**` (organizations/[id]/edit, products/[id]/variants, pricing, locations).
  - `app/producer/(larkon)/dashboard`.
- **CSS imports:** All `app/<panel>/(larkon)/layout.tsx` files import only `@larkon/assets/scss/app.scss` (and admin also `react-toastify`). No `owner-panel.css` or other legacy panel CSS in active (larkon) layouts.
- **Legacy form components:** Raw `<input className="form-control">`, `<select className="form-select">`, `<textarea className="form-control">` used across (larkon) pages; no single shared form component was replaced project-wide—migration is page-by-page using the new Lk* wrappers.

---

## Phase 1 — Larkon UI wrapper layer

**New folder:** `src/larkon-ui/`

### Components (single source of truth for dashboard forms)

| Component       | Purpose |
|----------------|--------|
| `LkInput`     | Text/number/email/search input; `form-control`, optional `form-control-sm`, `is-invalid`; supports `error`, `size`, `className`. |
| `LkSelect`     | Native `<select>` with `form-select`; `error`, `size`, `className`. |
| `LkTextarea`   | Textarea with `form-control`; `error`, `size`, `className`. |
| `LkCheckbox`   | Checkbox + optional label; `form-check`, `form-check-input`, `error`. |
| `LkRadio`      | Radio + optional label; `form-check`, `form-check-input`, `error`. |
| `LkButton`     | Button with `btn`, `btn-{variant}`, `btn-{size}`; variants: primary, secondary, outline-*, etc. |
| `LkLabel`      | Label with `form-label`; optional `required` asterisk. |
| `LkHelpText`   | Muted help text; `form-text text-muted`. |
| `LkErrorText`  | Validation error; `invalid-feedback d-block`. |
| `LkFormGroup`  | Wrapper: optional label, children, help, error. Uses `mb-3`. |
| `LkFormRow`    | Row wrapper using `react-bootstrap` Row + `mb-3`. |
| `LkDatePicker` | Thin wrapper over `LkInput` with `type="date"` (no extra deps). |
| `LkFileUpload` | File input with `form-control`; `size`, `error`, `className`. |
| `LkChoicesSelect` | Wraps `ChoicesFormInput` in `LkFormGroup`; `label`, `help`, `error`, `htmlFor`; optional `inputClassName` (e.g. `form-select radius-12`). |
| `LkFlatpickr` | Wraps `CustomFlatpickr` in `LkFormGroup`; `label`, `help`, `error`, `htmlFor`, `value`, `options`, `placeholder`; optional `inputClassName`. |
| `LkSlider` | Wraps `Nouislider` in `LkFormGroup`; `label`, `help`, `error`, `htmlFor`, `sliderClassName`; forwards all Nouislider props (`range`, `start`, `connect`, `onSlide`, etc.). |

- All accept `name`, `value`, `onChange`, `className` passthrough; no business logic changed.
- **Adapter:** `src/larkon-ui/adapters/toLarkonProps.ts` provides `toLarkonInputProps(legacy)` for gradual migration.

### Usage

- Import from `@larkon-ui/components` or `@larkon-ui/components/LkInput` (etc.).
- `tsconfig.json` path: `"@larkon-ui/*": ["src/larkon-ui/*"]`.

---

## Phase 2 — Dashboard-only style enforcement

- **Layouts:** Every `app/<panel>/(larkon)/layout.tsx` (admin, owner, shop, clinic, mother, producer, country, staff) now imports:
  1. `@larkon/assets/scss/app.scss`
  2. `@larkon-ui/styles/dashboard-overrides.scss`
- **Shell:** `LarkonDashboardShell` and admin (larkon) layout root use class `wrapper larkon-dashboard` so overrides apply only inside the dashboard.
- **Override file:** `src/larkon-ui/styles/dashboard-overrides.scss`
  - Scoped under `.larkon-dashboard`.
  - Unifies `.form-control.radius-12` / `.form-select.radius-12` (and `-sm`) border-radius; optional spacing tweaks.
- No old CSS (e.g. `owner-panel.css`) is referenced from any active (larkon) layout or head.

---

## Phase 3 — Migrated pages / components (including bulk migration)

### Shared components (high impact)

- **app/owner/(larkon)/products/_components/CategorySubcategorySelect.tsx** — Category/Sub-category selects → `LkFormGroup`, `LkSelect`.
- **app/owner/(larkon)/products/_components/BrandSelect.tsx** — Search input and clear button → `LkInput`, `LkButton`.
- **app/owner/(larkon)/products/_components/ProductForm.tsx** — Product name, slug, description, status, submit → `LkFormGroup`, `LkInput`, `LkTextarea`, `LkSelect`, `LkButton`.
- **app/owner/(larkon)/organizations/_components/OrganizationWizardForm.jsx** — Full: Step 1 (Business Information), Step 2 (Legal & Tax: registration type, trade license, dates, TIN/BIN, official contact), Step 3 (Directors), type-specific blocks (CLINIC, PET_SHOP, ONLINE_HUB) → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`, `LkFileUpload`.

### Top nav / search / filter bars

- **src/larkon-admin/components/layout/TopNavigationBar/page.tsx** — Search → `LkInput`.
- **src/larkon-admin/app/(admin)/support/faqs/page.tsx** — Search bar → `LkInput`.
- **src/larkon-admin/app/(admin)/support/help-center/components/HelpCenter.tsx** — Search bar → `LkInput`.
- **src/larkon-admin/app/(admin)/support/privacy-policy/page.tsx** — Search bar → `LkInput`.

### Admin (larkon) form components

- **src/larkon-admin/app/(admin)/role/role-add/components/RoleAdd.tsx** — Roles name, user name, radios → `LkFormGroup`, `LkInput`, `LkRadio`. Workspace and tag → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/role/role-edit/page.tsx** — Roles name, user name, user status → `LkFormGroup`, `LkInput`, `LkRadio`. Workspace and tag → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/settings/components/StoreSettings.tsx** — Store name, owner name, phone, email, address, zip → `LkFormGroup`, `LkInput`, `LkTextarea`. City and country → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/settings/components/SettingsBoxs.tsx** — Default items per page, min/max vouchers, default tax rate → `LkFormGroup`, `LkInput`.
- **src/larkon-admin/app/(admin)/settings/components/GeneralSettings.tsx** — Meta title, meta tag, description → `LkFormGroup`, `LkInput`, `LkTextarea`. Store themes and layout → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/settings/components/CustomersSettings.tsx** — Max login attempts → `LkFormGroup`, `LkInput`.
- **src/larkon-admin/app/(admin)/settings/components/LocalizationSettings.tsx** — Country, language, currency, length class, weight class → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/invoice/invoice-add/components/InvoiceAdd.tsx** — Sender, invoice no, amount, buyer, issuer, product table inputs, sub-total/discount/tax/grand total → `LkFormGroup`, `LkInput`, `LkTextarea`. Issue/due dates → `LkFlatpickr`; status → `LkChoicesSelect`.
- **src/larkon-admin/app/(admin)/seller/seller-add/components/SellerAddData.tsx** — Brand title/link, location, email, phone, items stock/sells, happy client → `LkFormGroup`, `LkInput`. Product categories → `LkChoicesSelect`; yearly revenue → `LkSlider` + `LkInput` (maxCost).
- **src/larkon-admin/app/(admin)/seller/seller-edit/components/SellerDataEdit.tsx** — Same as SellerAddData; product categories → `LkChoicesSelect`; yearly revenue → `LkSlider` + `LkInput`.

### Owner (larkon) pages

- **app/owner/(larkon)/organizations/[id]/edit/page.jsx** — Full: org name, type, support contact, office address, type-specific block, Step 2 Legal (registration type, trade license, dates, TIN/BIN, official contact), trade license file (and replace-doc file), Directors (name/role/mobile/email) → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`, `LkFileUpload`.
- **app/owner/(larkon)/products/[id]/variants/page.tsx** — Add/edit variant forms: SKU, title, status, attribute key/value → `LkInput`, `LkSelect`.
- **app/owner/(larkon)/products/[id]/pricing/page.tsx** — Price inline edit → `LkInput`.
- **app/owner/(larkon)/products/[id]/locations/page.tsx** — Quantity, min stock inline edit → `LkInput`.
- **app/producer/(larkon)/dashboard/page.jsx** — Code search input and button → `LkInput`, `LkButton`.

### Shop (larkon) panel

- **app/shop/(larkon)/products/add-from-master/page.tsx** — Search input → `LkInput`.
- **app/shop/(larkon)/orders/page.tsx** — Status filter → `LkSelect`.
- **app/shop/(larkon)/pos/page.tsx** — Search products, cart quantity/price inputs, payment method → `LkFormGroup`, `LkInput`, `LkSelect`.

### Clinic (larkon) panel

- **app/clinic/(larkon)/services/page.tsx** — Category filter, service modal (name, description, category, price, duration, status) → `LkFormGroup`, `LkInput`, `LkTextarea`, `LkSelect`.

### Country (larkon) panel

- **app/country/(larkon)/staff/invites/page.jsx** — Filters (status, role, email), create-invite modal (email, role, scope type, state ID, display name) → `LkFormGroup`, `LkInput`, `LkSelect`.

### Staff (larkon) panel (complete)

- **app/staff/(larkon)/workspace/page.jsx** — Task modal: “Update status” (LkFormGroup), work-note comment input → `LkFormGroup`, `LkInput`.
- **app/staff/(larkon)/branch/[branchId]/staff/page.jsx** — Staff search input, invite modal (email, phone, role), revoke modal reason → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`.
- **app/staff/(larkon)/branch/[branchId]/inventory/page.jsx** — Search input → `LkInput`.
- **app/staff/(larkon)/branch/[branchId]/inventory/receive/page.jsx** — Location, reference, receive date, items section, variant/quantity lines → `LkFormGroup`, `LkInput`, `LkSelect`.
- **app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/page.jsx** — Status filter → `LkFormGroup`, `LkSelect`.
- **app/staff/(larkon)/branch/[branchId]/inventory/stock-requests/new/page.jsx** — Product/variant selects, requested qty, note per row → `LkInput`, `LkSelect`.
- **app/staff/(larkon)/branch/[branchId]/inventory/transfers/page.jsx** — Status filter, create-transfer modal (from/to location, variant, qty), receive modal (received/damaged/expired inputs) → `LkFormGroup`, `LkInput`, `LkSelect`.
- **app/staff/(larkon)/branch/[branchId]/inventory/adjustments/page.jsx** — Type, location, variant, quantity, reason → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`.
- **app/staff/(larkon)/branch/[branchId]/services/page.jsx** — Appointments filters (date, status, assigned vet), create/edit appointment modal (date/time, patient, service type, assigned vet, notes) → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`.
- **app/staff/(larkon)/branch/[branchId]/pos/page.jsx** — Product search, cart qty/price inputs, checkout (customer, custom discount %, payment method, notes), history (status filter, search), refund reason → `LkFormGroup`, `LkInput`, `LkSelect`, `LkTextarea`. Discount preset buttons + single “Discount” label left as-is.

---

## Phase 4 — Tables, cards, modals, toasts

- **Tables:** Larkon uses Bootstrap table classes (`table`, `table-striped`, etc.) from `app.scss`; no change.
- **Cards:** Larkon card classes (`card`, `card-body`, etc.) already used in (larkon) pages; no change.
- **Modals:** Bootstrap modal or Larkon modal from template; no change.
- **Toasts:** `react-toastify` already imported in admin (larkon) layout; theme `colored`; no change.

No new table/card/modal/toast components were added; consistency is “use Larkon/Bootstrap classes as in the template.”

---

## Phase 5 — Verification

- **Build:** `npm run build` in `bpa_web` completes successfully.
- **Recommend manual checks:** One list page with table, one create/edit form, one modal, one toast, and validation error display per panel.

---

## Files changed (summary)

| Area | Files |
|------|--------|
| **New** | `src/larkon-ui/components/LkInput.tsx`, `LkSelect.tsx`, `LkTextarea.tsx`, `LkCheckbox.tsx`, `LkRadio.tsx`, `LkButton.tsx`, `LkLabel.tsx`, `LkHelpText.tsx`, `LkErrorText.tsx`, `LkFormGroup.tsx`, `LkFormRow.tsx`, `LkDatePicker.tsx`, `LkFileUpload.tsx`, `LkChoicesSelect.tsx`, `LkFlatpickr.tsx`, `LkSlider.tsx`, `components/index.ts`; `src/larkon-ui/adapters/toLarkonProps.ts`; `src/larkon-ui/styles/dashboard-overrides.scss`; `src/larkon-ui/index.ts`. |
| **Config** | `tsconfig.json`: added `"@larkon-ui/*": ["src/larkon-ui/*"]`. |
| **Layouts** | `app/admin/(larkon)/layout.tsx`, `app/owner/(larkon)/layout.tsx`, `app/shop/(larkon)/layout.tsx`, `app/clinic/(larkon)/layout.tsx`, `app/mother/(larkon)/layout.tsx`, `app/producer/(larkon)/layout.tsx`, `app/country/(larkon)/layout.tsx`, `app/staff/(larkon)/layout.tsx`: import `@larkon-ui/styles/dashboard-overrides.scss`; admin + shell root div use `larkon-dashboard` class. |
| **Shell** | `src/larkon-admin/components/layout/LarkonDashboardShell.tsx`: root div `className="wrapper larkon-dashboard"`. |
| **Migrated (bulk)** | Owner: `OrganizationWizardForm.jsx` (full), `organizations/[id]/edit/page.jsx` (full). Admin: RoleAdd, RoleEditPage, StoreSettings, SettingsBoxs, GeneralSettings, CustomersSettings, InvoiceAdd, SellerAddData, SellerDataEdit; support search. Shop: add-from-master, orders, pos. Clinic: services. Country: staff/invites. Staff: workspace, branch staff, branch inventory (summary, receive, stock-requests, stock-requests/new, transfers, adjustments), branch services, branch pos (all forms). Shared: CategorySubcategorySelect, BrandSelect, ProductForm; producer dashboard; TopNav search. |

---

## Final UI consistency pass (dashboard-only) — 2026-02-16

**Scope:** `src/larkon-admin/app/(admin)/**` and `src/larkon-ui/**` only. No changes to `app/(public)/**` or non-admin panels.

**New wrappers (third-party controls):**

| Wrapper | Wraps | Purpose |
|---------|--------|--------|
| `LkChoicesSelect` | ChoicesFormInput | label/help/error in LkFormGroup; optional `inputClassName` (e.g. `form-select radius-12`). |
| `LkFlatpickr` | CustomFlatpickr | label/help/error in LkFormGroup; `value`, `options`, `placeholder`. |
| `LkSlider` | Nouislider | label/help/error in LkFormGroup; forwards `range`, `start`, `connect`, `onSlide`, etc.; `sliderClassName` for styling. |

**Admin pages migrated in this pass:** role-edit (workspace, tag, user status → LkChoicesSelect, LkRadio); GeneralSettings (themes, layout → LkChoicesSelect); StoreSettings (city, country → LkChoicesSelect); LocalizationSettings (all five selects → LkChoicesSelect); InvoiceAdd (dates → LkFlatpickr, status → LkChoicesSelect); RoleAdd (workspace, tag → LkChoicesSelect); SellerAddData (product categories → LkChoicesSelect, yearly revenue → LkSlider + LkInput); SellerDataEdit (product categories → LkChoicesSelect, yearly revenue → LkSlider + LkInput).

**Verification:** `npm run build` passes. LkSlider typed as `NouisliderProps` intersection so `range` and `start` are required.

---

## What remains / how to migrate safely

- **Left as-is (optional follow-up):**  
  - **CustomersSettings.tsx**, **SettingsBoxs.tsx** — Raw `form-check-input` radios; could be switched to `LkRadio` for consistency.  
  - **InvoiceAdd** — Raw file inputs (profile-img-file-input) in custom profile-photo-edit UI; can stay or be documented as intentional.  
  - **widgets/Tasks.tsx**, **tables/basic/page.tsx** — Raw checkboxes; could use `LkCheckbox` if desired.  
  - **app/shop/(larkon)/orders/[id]/page.tsx** — Display-only labels; optional swap to `LkLabel`.  
  - **app/country/invite/[token]/page.jsx** — Not under `(larkon)`; out of scope.

- **Staff (larkon) panel:** Completed. One intentional leftover: POS checkout “Discount” section keeps a single raw `<label>` for the preset buttons + optional custom % input.

- **Admin (larkon) — optional follow-up:**  
  - **AddProduct**, **AddCategory**, **CheckoutForm**, **attributes EditForm**, **forms/basic**, **validation**, **input-mask**, **flat-picker**, **clipboard** — Replace remaining raw inputs with Lk* where straightforward.
- **Safe migration steps:**  
  1. Add `import LkInput from '@larkon-ui/components/LkInput'` (and LkSelect, LkFormGroup, etc. as needed).  
  2. Replace `<input className="form-control" ...>` with `<LkInput ...>`; add `error={!!fieldErrors.fieldName}` and use `LkFormGroup` with `error={fieldErrors.fieldName}` for message.  
  3. Keep all `name`, `value`, `onChange`, validation, and API calls unchanged.  
  4. Run `npm run build` and a quick smoke test of the page.

## How to extend wrappers

- **New Lk* component:** Add under `src/larkon-ui/components/`, use Bootstrap/Larkon classes (`form-*`, `btn-*`), support `className` passthrough and `error` where relevant. Export from `components/index.ts` and `src/larkon-ui/index.ts`.
- **New variant/size:** Add a `size` or `variant` prop to the existing Lk* component and map to Bootstrap classes (e.g. `form-control-sm`, `btn-sm`).
- **Dashboard-only style:** Add rules under `.larkon-dashboard` in `src/larkon-ui/styles/dashboard-overrides.scss`; do not add global CSS outside (larkon) layouts.

---

## Deliverables checklist

- [x] New wrapper components under `src/larkon-ui/`.
- [x] Dashboard-only overrides stylesheet imported only in (larkon) layouts.
- [x] Refactored TopNavigationBar, producer dashboard, and owner organization edit (first block) to use Lk*.
- [x] `docs/DASHBOARD_LARKON_UI_UNIFICATION_2026-02-16.md` (this file).
