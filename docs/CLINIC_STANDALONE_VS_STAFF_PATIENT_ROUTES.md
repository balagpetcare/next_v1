# Standalone `/clinic` vs staff `/staff/branch` — patient routes and cross-shell navigation

**Purpose:** Architecture audit for the clinic **Larkon shell** (`basePath="/clinic"`) versus the **branch staff clinic module** (`/staff/branch/[branchId]/clinic/...`). Focus: patient list/detail and links that cross between trees.

**Deployment / same-origin:** [CROSS_SHELL_NAVIGATION.md](./CROSS_SHELL_NAVIGATION.md) (full inventory, proxy/auth notes, split-subdomain options).

**Related:** Staff canonical URLs and helpers live in [`lib/staffClinicPatientRoutes.js`](../lib/staffClinicPatientRoutes.js). Cross-shell builders: [`lib/crossShellNavigation.ts`](../lib/crossShellNavigation.ts). Staff module audit: [`STAFF_CLINIC_PATIENTS_MODULE_ENTERPRISE_AUDIT_AND_PLAN.md`](./STAFF_CLINIC_PATIENTS_MODULE_ENTERPRISE_AUDIT_AND_PLAN.md).

---

## 1. Is `/clinic` intentional or legacy overlap?

**Conclusion: intentional second product shell**, not accidental duplication of staff.

| Signal | Evidence |
|--------|----------|
| Separate layout | `app/clinic/(larkon)/layout.tsx` uses `LarkonDashboardShell` with **`basePath="/clinic"`** (not `/staff`). |
| Separate entry | `app/clinic/page.tsx` redirects to `/clinic/dashboard`; dedicated `app/clinic/login`. |
| Panel config | [`lib/authRedirect.ts`](../lib/authRedirect.ts) maps **clinic** to port **3102** and **staff** to **mother 3100** in multi-panel dev — different default bases. |
| Domain split | Standalone clinic pages are **query-param branch context** (`?branchId=`) for many flows; staff clinic is **path-param** `branchId` in the URL. |

The two trees serve different navigation and UX (clinic-wide console vs branch-scoped staff). Overlap exists where both call the **same backend** staff clinic APIs (`staffClinicPatientsList`, etc.).

---

## 2. Standalone `/clinic` patient-related routes (exact)

| Route | Role |
|-------|------|
| `/clinic/patients` | List pets for a branch (manual `branchId` input or `?branchId=`). Uses `staffClinicPatientsList`. |
| `/clinic/patients/[petId]` | Lightweight patient **read-only** card; requires `?branchId=`. Uses `staffClinicPatientGet`. |
| `/clinic/dashboard` | Cards link to `/clinic/patients${q}` with branch query. |
| `/clinic/vaccinations` | Link back to `/clinic/patients${q}`. |

Other `/clinic/*` routes (queue, appointments, visits, billing, prescriptions, lab, intake stub) stay **inside `/clinic`** except where noted below.

---

## 3. Cross-shell links (`/clinic` ↔ `/staff/branch`)

### `/clinic` → `/staff` (implemented today)

| Source | Target | Mechanism |
|--------|--------|-----------|
| [`app/clinic/(larkon)/patients/page.jsx`](../app/clinic/(larkon)/patients/page.jsx) “View” | `staffClinicPatientDetailPath(branchId, p.id)` → **`/staff/branch/.../clinic/patient-detail/...`** | **Explicit cross-shell** to staff canonical detail. |
| [`app/clinic/(larkon)/intake/[appointmentId]/page.jsx`](../app/clinic/(larkon)/intake/[appointmentId]/page.jsx) | **`/staff/branch/${branchId}/clinic/intake/${appointmentId}`** | **`router.replace`** when `branchId` present; documented in file header. |

### `/clinic` internal (no staff path in URL)

| Area | Pattern |
|------|---------|
| Dashboard, vaccinations | `/clinic/patients?branchId=...` |
| `[petId]` back links | `/clinic/patients?branchId=...` |
| Appointments / queue “Fill” | `/clinic/intake/...?branchId=...` → then redirects to staff intake |

---

## 4. Session / auth assumptions

- **Same origin (typical single-host deploy):** Cookies set for `/api/v1` on that origin work for both `/clinic` and `/staff` navigation. Cross-shell links are **relative** (`/staff/branch/...`), so the browser stays on the same site.
- **Multi-port local dev (3102 vs 3100):** Each port is a **different origin**. A session cookie scoped to `localhost:3102` is **not** sent on `localhost:3100` and vice versa. Users may need to log in per panel port, or use a single-port dev mode.
- **Subdomain split in production:** If clinic and staff ever move to **different subdomains**, relative links to `/staff/...` from a clinic-only host would **break** or hit the wrong app unless reverse-proxied to one Next app. That is a **deployment architecture** decision, not fixable by route helpers alone.

---

## 5. Risk assessment

| Risk | Severity | Notes |
|------|----------|--------|
| List “View” jumps from `/clinic` UI to `/staff` UI | **Low–medium** | Same origin: OK. User may be surprised by shell change; permissions should match `clinic.patients.*` on API. |
| Direct bookmark `/clinic/patients/5?branchId=1` | **Low** | Still uses standalone **read-only** page; does not auto-redirect to staff. Two UIs for same pet possible — **documented duplication**, not a routing bug. |
| Different origins (ports/subdomains) | **High** | Cross-shell relative links fail or lose auth without a unified gateway. |

---

## 6. Options (enterprise path forward)

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A — Keep both trees intentionally** | Standalone `/clinic` for console workflows; staff for branch workspace. Document cross-shell behavior; keep legacy redirects on staff URLs only. | **Default / safest near term.** Matches current product split. |
| **B — Route standalone patient actions into staff canonical routes** | Already partially done (list → `patient-detail`). Could add “Open in staff workspace” on `[petId]` or redirect `[petId]` when `branchId` set. | **Incremental**; align with “single canonical workspace” for **edit**/**full** overview without removing `/clinic` list. |
| **C — Deprecate standalone patient routes** | Remove or 307 `/clinic/patients*` to staff. | **High churn**; needs product sign-off, redirects from bookmarks, and clinic dashboard link updates. **Not recommended** without explicit stakeholder decision. |

**Recommended standard going forward:** **Option A** with **selective Option B** where it reduces confusion (optional future: single “Staff workspace” link from standalone `[petId]` using `staffClinicPatientDetailPath`).

---

## 7. Legacy staff redirects

`next.config.js` and `proxy.ts` redirects for **`/staff/branch/.../clinic/patients/...`** (register, numeric id, `/edit`) are **staff-only** and must remain unchanged. They do not apply to `/clinic/patients/*`.

---

## 8. Maintenance checklist

- Prefer **`staffClinicPatient*Path`** helpers for any **new** link that targets staff patient list/detail/edit/register.
- Standalone `/clinic/patients` URLs are **not** covered by those helpers; keep them as `/clinic/patients` + query or add a tiny `clinicPatientsHubPath(query?)` only if duplication grows.
- When adding cross-shell links, document **same-origin** requirement in runbooks.

**Last updated:** 2026-03-21 (architecture audit).
