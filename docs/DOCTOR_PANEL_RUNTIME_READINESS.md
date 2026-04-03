# Doctor Panel (localhost:3107) – Runtime Readiness

## 1. Modified files in active branch/worktree

**Branch:** `V-A1.0.6` (bpa_web)

**Doctor workflow changes (saved in worktree, uncommitted):**

| File | Status |
|------|--------|
| `app/doctor/(larkon)/appointments/[id]/page.tsx` | M (modified) |
| `app/doctor/(larkon)/appointments/page.tsx` | M (modified) |
| `app/doctor/(larkon)/appointments/_components/QuickActionBar.tsx` | M (modified) |
| `app/doctor/(larkon)/appointments/_components/DoctorAppointmentTable.tsx` | M (modified) |
| `app/doctor/(larkon)/appointments/_components/DoctorAppointmentCard.tsx` | M (modified) |

All five files are on disk in the current worktree. To persist to branch history, run:  
`git add app/doctor/` then `git commit -m "Doctor panel: visible Start Treatment / Open Visit"`.

---

## 2. Dev server and SITE_MODE

The doctor panel is served by the **same Next.js app** (bpa_web) with:

- **Script:** `dev:doctor` → `cross-env SITE_MODE=doctor next dev -p 3107`
- **Port:** 3107
- **Env:** `SITE_MODE=doctor` (no separate build; Next.js serves the same `app/doctor/(larkon)/*` routes)

So when you run the doctor dev process, it uses the **current code** in the worktree for those routes.

---

## 3. Compile / lint

- **Linter:** No errors in `app/doctor/(larkon)/appointments` (ESLint/IDE).
- **Imports:** All imports in the modified files resolve:
  - `@/lib/api`, `@/lib/useDoctorSocket`
  - `../_components/...` (QuickActionBar, PatientSnapshotCard, etc.)
  - `@/src/lib/displayFormatters` (DoctorAppointmentTable)
- **TypeScript:** If you use `npx tsc --noEmit`, run it from `bpa_web`; the project is large so it may take a minute. No type errors were introduced in the changed components.

Nothing in the modified files should block the updated UI from rendering.

---

## 4. Commands to restart only the doctor panel cleanly

**Option A – Doctor panel only (recommended for QA)**

1. Stop the current doctor dev process (the one on 3107).  
   If using `npm run dev:all`, stop the whole process (Ctrl+C), then start only the doctor panel:

   ```bash
   cd D:\BPA_Data\bpa_web
   npm run dev:doctor
   ```

2. Optional: clear Next.js cache once if you suspect stale output:

   ```bash
   cd D:\BPA_Data\bpa_web
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev:doctor
   ```

**Option B – Restart doctor panel when using dev:all**

1. Stop all: Ctrl+C in the terminal where `npm run dev:all` is running.
2. (Optional) clear cache:  
   `Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue`
3. Start all again:

   ```bash
   cd D:\BPA_Data\bpa_web
   npm run dev:all
   ```

The doctor panel will be at **http://localhost:3107** (DOCTOR in the concurrently list).

---

## 5. Manual QA checklist (≤ 5 clicks) – Start Treatment / Open Visit

**Prereqs:** Backend API running (e.g. port 3000). Doctor user logged in at http://localhost:3107. At least one appointment in a status that shows the button (e.g. BOOKED, CONFIRMED, CHECKED_IN, IN_QUEUE, or CALLED without a visit; or any with a visit for “Open Visit”).

| Step | Action | What to verify |
|------|--------|----------------|
| 1 | Open **http://localhost:3107** and log in if needed. | Doctor panel loads. |
| 2 | Go to **Appointments** (sidebar or nav). | Appointments list page loads. |
| 3 | In the list (table or card), find a row with **“Start”** or **“Open Visit”**. | **Start** is visible for appointments with no visit and status BOOKED/CONFIRMED/CHECKED_IN/IN_QUEUE/CALLED; **Open Visit** is visible when the appointment has a visit. |
| 4 | Click that appointment (row or “View”) to open **appointment detail**. | Detail page loads. |
| 5 | On the detail page, check the **header** and the **Quick Actions** card. | You see either **“Start Treatment”** (no visit, eligible status) or **“Open Visit”** (has visit) in the header and/or in Quick Actions. Clicking **Start Treatment** starts consult and redirects to `/doctor/visits/:id`; clicking **Open Visit** goes to `/doctor/visits/:id`. |

**Pass:** Steps 1–5 complete with the buttons visible and redirects going to the visit workspace.  
**If buttons are missing:** Confirm appointment has the right status and visit state (and that the API returns `status` and `visit.id` as expected).
