# Auth Route Deduplication (2026-03-12)

## Summary

Duplicate Next.js page files for the same routes were removed to fix the owner/staff login redirect loop. Only one page component per route remains.

## Duplicate Routes Found and Resolved

| Route | Duplicate files | Kept | Removed | Notes |
|-------|------------------|------|---------|--------|
| `/owner` | `app/owner/page.jsx`, `app/owner/page.tsx` | `page.tsx` | `page.jsx` | Server redirect to `/owner/dashboard`; no flash. |
| `/staff` | `app/staff/page.jsx`, `app/staff/page.tsx` | `page.tsx` | `page.jsx` | Canonical redirect is `/staff/branch` (branch selector). Avoids loop with branches. |
| `/staff/login` | `app/staff/login/page.jsx`, `app/staff/login/page.tsx` | `page.jsx` | `page.tsx` | Kept .jsx: loop guard and staff-only `returnTo` (no cross-panel /owner). |

## Merged Logic

- **No merge required.** For each pair, one file was chosen as canonical and the other removed.
- `/staff/login` **page.jsx** retains: loop guard (`staffLogin_lastRedirectAt`), staff-path-only validation for `returnTo`/`next`, and redirect to `/login?app=staff&returnTo=...`. The removed **page.tsx** used `AuthRedirectPage` and did not restrict returnTo to staff paths, which could contribute to loops.

## Other Routes Checked

- **/login** – single file: `app/login/page.jsx`.
- **/post-auth-landing** – single file: `app/post-auth-landing/page.tsx`.
- **Logout** – `app/owner/logout/page.jsx`, `app/staff/logout/page.jsx` (no .tsx duplicates).
- **Branch selector** – `app/staff/(larkon)/branch/page.jsx` (serves `/staff/branch`); no duplicate.

## Redirect Alignment After Cleanup

- **Owner:** `/owner` → server `redirect("/owner/dashboard")` (app/owner/page.tsx).
- **Staff:** `/staff` → server `redirect("/staff/branch")` (app/staff/page.tsx). ReturnTo after login = `/staff` → lands on `/staff/branch`.
- **Staff login:** `/staff/login` → redirect to `/login?app=staff&returnTo=<staff-only URL>`. Loop guard prevents repeated redirects; staff never gets returnTo=/owner.

## /login ↔ /staff/login Loop

- **Resolved** by: (1) removing duplicate route files so only one page handles each path, and (2) keeping `/staff/login` as the page.jsx that restricts `returnTo` to staff paths and uses the loop guard. Conflicting behavior between the old .jsx and .tsx versions is removed.
