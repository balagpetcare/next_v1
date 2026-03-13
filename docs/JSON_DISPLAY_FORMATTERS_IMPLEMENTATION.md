# JSON / Raw Data Display Formatters – Implementation Summary

## 1. Current-state scan (findings)

### User-facing raw JSON/object rendering

| Location | Type | Issue |
|----------|------|--------|
| `src/components/clinic/doctors/AuditTimelinePanel.tsx` | Audit log | `From: {JSON.stringify(e.oldValue)}` and `To: {JSON.stringify(e.newValue)}` in Details column |
| `src/components/branch/BranchActivityTimeline.jsx` | Activity timeline | `JSON.stringify(item.metadata)` when metadata is object |
| `src/components/clinic/doctors/tabs/ApprovalsTab.tsx` | Approval history | Remarks showed `a.payload?.reason` (could be object); status shown as raw enum (e.g. APPROVED) |
| `app/owner/(larkon)/approvals/page.tsx` | Owner approvals | Expanded "Details" showed `<pre>{JSON.stringify(e.payload, null, 2)}</pre>` |
| `app/owner/(larkon)/escalations/page.tsx` | Escalations | Same payload `<pre>{JSON.stringify(e.payload, null, 2)}</pre>` in expanded row |
| `app/owner/(larkon)/clinic/[branchId]/doctors/[memberId]/page.tsx` | Owner doctor audit | Details column: `Old: JSON.stringify(row.oldValue)` / `New: JSON.stringify(row.newValue)`; Field column raw key |
| `app/owner/(larkon)/dashboards/branch-manager/page.jsx` | Branch manager dashboard | `Overrides: ${JSON.stringify(a.permissionOverrides)}` |
| `app/owner/(larkon)/dashboards/staff/page.jsx` | Staff dashboard | Same permission overrides JSON |
| `app/admin/(larkon)/approvals/[id]/page.tsx` | Admin approval detail | Product specs `<pre>{JSON.stringify(product.specJson, null, 2)}</pre>`; revision diff `JSON.stringify(from)` / `JSON.stringify(to)` |

### Not changed (intentional or out of scope)

- **API / fetch**: `body: JSON.stringify(...)` for request bodies – correct; not user-facing.
- **localStorage**: `JSON.stringify` for persistence – not UI.
- **Owner clinic reports page** (`reports/page.tsx`): `JSON.stringify(data)` – debug/raw data view; can be switched to formatters later if made user-facing.
- **Finance config, clinic lab/vaccinations/prescriptions, cases variance, post-auth-landing debug**: Same – left as future cleanup or dev-only.
- **Package templates** `itemsJsonStr`: Editor uses JSON string for editing; not a “display” of raw JSON in a card/table.

---

## 2. Problem list (classified)

- **Audit logs**: Doctor audit (staff + owner) and any timeline showing oldValue/newValue as JSON.
- **Approval history**: Staff ApprovalsTab remarks; owner approvals/escalations expanded payload; admin approval detail specs and revision diff.
- **Activity timelines**: BranchActivityTimeline metadata.
- **Tables / cells**: Owner doctor audit table (Field + Details); dashboards permission overrides.
- **Details panels**: Owner approvals “Details”, escalations “Details”, admin approval specs and diff.

---

## 3. Reusable formatting strategy

Single shared module: **`src/lib/displayFormatters.ts`**.

- **humanizeFieldLabel(key)**  
  Technical keys → readable labels (e.g. `roleInPackage` → “Role in package”, `surgeryPackageId` → “Surgery package”).

- **humanizeEnum(value)**  
  Enum-like values → readable (e.g. CONSULTANT → Consultant, ACTIVE → Active, PENDING → Pending).

- **formatValueForDisplay(value)**  
  Any value → safe string; no raw JSON. Primitives as-is; arrays as comma-separated; objects as “Label: value · …”.

- **formatPayloadForDisplay(payload)**  
  For payloads (e.g. approval): prefer `reason`/`rejectReason`/`remarks`; else flatten via formatValueForDisplay.

- **formatAuditChangeLines(oldVal, newVal, options?)**  
  From old/new (objects or primitives) → array of “Label: old → new” or “Label: value” lines.

- **formatAuditDetails(entry)**  
  Entry `{ action?, field?, oldValue?, newValue? }` → string[] for audit Details column.

- **formatMetadataForDisplay(metadata)**  
  Activity/timeline metadata (string or object) → single readable string.

---

## 4. Files updated

| File | Change |
|------|--------|
| `src/lib/displayFormatters.ts` | **New.** All formatters above. |
| `src/components/clinic/doctors/AuditTimelinePanel.tsx` | Use `formatAuditDetails` + `humanizeFieldLabel`; Details column = list of change lines; Actor fallback “User #id”. |
| `src/components/clinic/doctors/tabs/ApprovalsTab.tsx` | Remarks: `formatPayloadForDisplay(a.payload)` when no rejectReason; status badge: `humanizeEnum(a.status)`. |
| `src/components/branch/BranchActivityTimeline.jsx` | Import `formatMetadataForDisplay`; metadata block uses it instead of `JSON.stringify`. |
| `app/owner/(larkon)/approvals/page.tsx` | Details expansion: `formatValueForDisplay(e.payload)` in a div (no `<pre>` JSON). |
| `app/owner/(larkon)/escalations/page.tsx` | Same for escalation payload. |
| `app/owner/(larkon)/clinic/[branchId]/doctors/[memberId]/page.tsx` | Audit table: Field = `humanizeFieldLabel(row.field)`; Details = `formatAuditDetails({ field, oldValue, newValue })` as list. |
| `app/owner/(larkon)/dashboards/branch-manager/page.jsx` | Overrides: `formatValueForDisplay(a.permissionOverrides)`. |
| `app/owner/(larkon)/dashboards/staff/page.jsx` | Same. |
| `app/admin/(larkon)/approvals/[id]/page.tsx` | Specs: `formatValueForDisplay(product.specJson)`; revision diff: `humanizeFieldLabel(field)` and `formatValueForDisplay(from)` / `formatValueForDisplay(to)`. |

---

## 5. Implementation notes

- **Backend**: No API or schema changes. Formatters work on existing payloads and audit shapes.
- **Conflicts/risks**: None. No removal of existing behaviour; only replacement of JSON dumps with formatted text.
- **Labels**: New keys not in `FIELD_LABELS` get auto title-case from camelCase/snake_case; new enums not in `ENUM_LABELS` get underscore-to-space and title-case.

---

## 6. Remaining edge cases

- **Owner clinic reports** (`reports/page.tsx`): Still shows `JSON.stringify(data)`; can be switched to `formatValueForDisplay(data)` if that view should be user-friendly.
- **Finance config** (`finance-config/page.tsx`): Raw config in `<pre>`; good candidate for `formatValueForDisplay(config)` or a small key-value list.
- **Clinic lab** (`lab/page.jsx`): `testsJson` in table cell as `<pre>`; could use `formatValueForDisplay(r.testsJson)`.
- **Clinic vaccinations / prescriptions**: Similar JSON in pre; same approach.
- **Staff clinic cases** (`cases/[caseId]/page.jsx`): Variance summary as JSON; could use `formatValueForDisplay(variance.summary ?? variance)`.
- **Post-auth-landing**: Debug payload; can stay as-is for dev or be gated by env.
- **Producer staff page**: Change display `(old → new)` already uses String(parsed.old/new); if parsed values are objects, consider formatValueForDisplay.
- **VerificationCasePanel** / **states rules**: JSON in editor UIs; only switch to formatters if shown as read-only display elsewhere.

---

## 7. Quality bar (achieved)

- No raw JSON in staff/owner/admin doctor audit logs, approval history, or activity timeline.
- No curly-brace dumps in approval/escoration details or owner doctor audit table.
- No array/object syntax shown directly in the updated views.
- Technical field keys in those views use humanized labels.
- Enums (e.g. status) use humanized labels where updated.
- Single reusable layer in `displayFormatters.ts`; existing behaviour preserved; no fake data.
