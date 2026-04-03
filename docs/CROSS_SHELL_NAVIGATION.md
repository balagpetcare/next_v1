# Cross-shell navigation — deployment safety (`/clinic` ↔ `/staff/branch`)

**Audience:** Engineers changing routes, auth, or deployment topology.

**Companion:** [CLINIC_STANDALONE_VS_STAFF_PATIENT_ROUTES.md](./CLINIC_STANDALONE_VS_STAFF_PATIENT_ROUTES.md) (patient-specific audit).

---

## 1. Shells

| Shell | Base path | Typical layout |
|-------|-----------|----------------|
| Standalone clinic | `/clinic/*` | `app/clinic/(larkon)/…`, `LarkonDashboardShell basePath="/clinic"` |
| Staff workspace | `/staff/branch/[branchId]/…` | `app/staff/(larkon)/branch/[branchId]/…` |

Both are served by the **same Next.js app** in this repo. **Relative** links between them assume **one origin**.

---

## 2. Inventory: clinic → staff (cross-shell)

| Location | Mechanism | Target |
|----------|-----------|--------|
| `app/clinic/(larkon)/patients/page.jsx` | `Link` + `staffClinicPatientDetailPath` | `/staff/branch/…/clinic/patient-detail/[petId]` |
| `app/clinic/(larkon)/intake/[appointmentId]/page.jsx` | `router.replace` + [`staffBranchClinicIntakePath`](../lib/crossShellNavigation.ts) | `/staff/branch/…/clinic/intake/[appointmentId]` |

No other `app/clinic/**` files currently emit `/staff/branch` URLs in this codebase (re-grep when adding features).

---

## 3. Inventory: staff → clinic

**None** under `app/staff/**` link to `/clinic/*` today. Shared components under `src/components/**` used from staff also use `/staff/branch/…` only.

---

## 4. Same-origin assumptions

| Layer | Assumption |
|-------|------------|
| **Relative `href` / `router.push`** | Browser resolves on **current origin**; `/staff/...` from `localhost:3102` stays on 3102 if the Next app serves both paths there. |
| **Multi-port dev** (`authRedirect` `PANEL_CONFIG`) | Ports **3100–3107** are different **origins**; cookies do not automatically follow across ports. Cross-shell links on the **wrong port** may 404 or show logged-out state. |
| **`proxy.ts` matcher** | Includes `/clinic/:path*` and `/staff/:path*` — both protected by the **same** cookie check on the **request host**. |
| **API** | Browser `fetch('/api/v1/...')` is same-origin to the Next host; independent of which shell UI is shown. |

---

## 5. When are relative `/staff/...` links safe?

**Safe:** Single deployment where **one hostname** serves both `/clinic` and `/staff` (typical production: one app behind one domain).

**Unsafe / needs design:** Clinic on `clinic.example.com`, staff on `staff.example.com` — relative `/staff/...` from a clinic page resolves to **clinic’s host**, not staff’s.

---

## 6. Future-ready patterns (if origins split)

1. **Same-origin gateway (recommended):** Reverse proxy serves **one** host; path-based routes `/clinic` and `/staff` unchanged — **no app code change**.
2. **Environment-driven absolute URLs:** e.g. `NEXT_PUBLIC_STAFF_APP_ORIGIN` + builders in `lib/crossShellNavigation.ts` returning `https://staff…/staff/branch/...` when set.
3. **No cross-shell:** Standalone clinic stops linking to staff; duplicate flows or deep links only within each shell.

Until (2) is implemented, **do not** assume cross-shell works across different registrable domains.

---

## 7. Developer rules

1. From **`app/clinic/`**, never hand-roll `/staff/branch/...` except via **`staffClinicPatient*Path`** or **`staffBranchClinicIntakePath`** (or extend `lib/crossShellNavigation.ts` with a named builder + doc update).
2. Adding **staff → clinic** links: document here and consider auth (clinic may use different login entry — see `proxy.ts` redirect for unauthenticated `/clinic`).
3. **Regression check:** `rg '/staff/branch' app/clinic` and `rg '/clinic/' app/staff` after route changes.

**Last updated:** 2026-03-21
