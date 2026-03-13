# Staff/Branch Re-login After Logout – Root Cause and Fix

## Problem

- First-time flow worked: new account, branch assignment, permissions, entering branch dashboard.
- After logging out once, staff could not reliably log in again, or could log in but could not re-enter the assigned branch dashboard.

## Root Cause Summary

1. **Staff had no dedicated logout page**  
   Staff panel used a direct link to `/api/logout`. That route only clears **cookies** (server response). It does **not** run any client-side code, so **localStorage** and **sessionStorage** were never cleared.

2. **Stale `lastActiveBranchId` in localStorage**  
   The staff branch selector and dashboard persist the last visited branch in `localStorage.lastActiveBranchId`. After logout this value was left in place. On re-login:
   - User was sent to `/staff` → `/staff/workspace` or eventually `/staff/branch`.
   - Branch selector page loaded, called `getMeBranchAccess()`, and read `lastActiveBranchId`.
   - It redirected to `/staff/branch/:id` for that stored id **before** or **in race with** full rehydration of auth/me or branch membership.
   - If the cookie or session was not yet fully applied, or the branch check failed (401/403), the user was bounced back to login or saw access denied.

3. **Other stale client state**  
   Tokens/ids in localStorage (`access_token`, `bpa_access_token`, `bpa_branch_id`, `bpa_org_id`, etc.) and anything in sessionStorage were not cleared on staff logout, so re-login could see old values.

4. **No clearing of `lastActiveBranchId` on auth/branch errors**  
   When the branch dashboard returned 401/403/404 or when `getMeBranchAccess()` failed, we did not clear `lastActiveBranchId` for that branch. So the next load could keep redirecting to the same invalid or forbidden branch.

## Files Changed

| File | Change |
|------|--------|
| `lib/logoutState.ts` | **New.** Defines `LAST_ACTIVE_BRANCH_KEY`, `LOGOUT_LOCAL_STORAGE_KEYS`, and `clearLogoutState()` for use by logout pages. |
| `app/staff/logout/page.jsx` | **New.** Staff logout page: backend logout, POST /api/logout, `clearLogoutState()`, redirect to /staff/login. |
| `app/owner/logout/page.jsx` | Use `clearLogoutState()` instead of ad-hoc removeItem/clear; POST /api/logout for cookie clear. |
| `lib/authHelpers.ts` | Add `/staff/logout` to `PUBLIC_PATH_PREFIXES`. |
| `src/larkon-admin/.../ProfileDropdown.tsx` | Staff panel: change logout link from `/api/logout` to `/staff/logout`. |
| `lib/useBranchContext.js` | Import `LAST_ACTIVE_BRANCH_KEY`; clear it on 401, 403, and not_found for current branch. |
| `app/staff/(larkon)/branch/page.jsx` | On `getMeBranchAccess()` error, clear `lastActiveBranchId`. If exactly one approved branch, auto-redirect to that branch (single-branch UX). Use `LAST_ACTIVE_BRANCH_KEY` from logoutState. |
| `app/staff/(larkon)/branch/[branchId]/page.jsx` | On 401, 403, 404 clear `lastActiveBranchId` for current branchId before redirect/display. Use `LAST_ACTIVE_BRANCH_KEY` from logoutState. |

## Stale State That Was Preserved Incorrectly

- `lastActiveBranchId` – caused auto-redirect to a branch URL that could 401/403 or not be rehydrated yet.
- `access_token`, `bpa_access_token`, `token`, `jwt` – could be used by some clients; clearing avoids confusion.
- `bpa_branch_id`, `bpa_org_id`, `bpa.owner.branchId` – org/branch context that should not survive logout.
- `selectedPanel`, `intendedPanel` – post-auth-landing/panel selection; should be reset.
- Entire `sessionStorage` – cleared so no leftover session flags persist.

## How Logout Now Clears State

1. **Staff**  
   User goes to `/staff/logout` (e.g. from profile dropdown).  
   - Call backend `POST /api/v1/auth/logout` (best-effort).  
   - Call `POST /api/logout` to clear auth cookies on the app origin.  
   - Call `clearLogoutState()`: remove all `LOGOUT_LOCAL_STORAGE_KEYS` and `sessionStorage.clear()`.  
   - Redirect to `/staff/login`.

2. **Owner**  
   Same pattern on `/owner/logout`: backend logout, POST /api/logout, `clearLogoutState()`, redirect to `/owner/login`.

## How Re-login Now Rebuilds Branch Access

1. **No stale branch id**  
   After logout, `lastActiveBranchId` is removed. Re-login does not auto-redirect to a branch until the branch list is loaded from the server.

2. **Branch list from server**  
   On `/staff/branch`, `getMeBranchAccess()` runs with the new session cookie and returns current branch memberships. No client cache of branch list is used for this decision.

3. **Single approved branch**  
   If the user has exactly one approved branch, the selector now auto-redirects to that branch (and sets `lastActiveBranchId`), so single-branch users get a smooth re-entry.

4. **Multiple branches**  
   If multiple approved branches exist and there is no valid `lastActiveBranchId`, the selector shows the list; user picks a branch and enters.

5. **Errors clear last branch id**  
   If the branch dashboard returns 401, 403, or 404, or if `getMeBranchAccess()` fails, we clear `lastActiveBranchId` for the current (or any) branch so the next load does not keep sending the user to an invalid route.

## Defensive Handling for Stale Branch Route

- **401 on branch dashboard**  
  Clear `lastActiveBranchId` for current `branchId`, then redirect to `/staff/login`.

- **403 / no view permission**  
  Clear `lastActiveBranchId` for current `branchId`, show AccessDenied with “Back to Branch Selector”.

- **404 / branch not found**  
  Clear `lastActiveBranchId` for current `branchId`, show “Branch Not Found” with “Back to Branch Selector”.

- **useBranchContext**  
  On `fetchBranchSummary` result with `errorCode` unauthorized, forbidden, or not_found, clear `lastActiveBranchId` for that branch id.

- **Branch selector**  
  On `getMeBranchAccess()` throw (e.g. 401), clear `lastActiveBranchId` and show error + “Back to Login”.

So if the user was previously on `/staff/branch/:id/...`, logged out, then logged in again and lands on an invalid or not-yet-hydrated branch route, the app clears the stale id and either redirects to login or back to the branch selector instead of denying access in a loop.

## Manual Test Steps

### First login

1. As owner/admin, create or use a staff user and assign them to a branch with appropriate permissions.
2. Open staff login (e.g. `/staff/login` or `/login?app=staff`).
3. Log in with that staff user.
4. Expect redirect to `/staff` then `/staff/workspace` (or configured landing).
5. Go to “Branches” / `/staff/branch`.
6. Expect to see the assigned branch; click “Enter branch” (or be auto-redirected if single branch).
7. Expect to see the branch dashboard (e.g. `/staff/branch/:id`).

### Logout

8. From the branch dashboard (or staff workspace), open the profile menu and choose **Logout**.
9. Expect to land on staff logout page (“Signing out…” then “Signed out. Redirecting…”).
10. Expect redirect to `/staff/login`.

### Second login

11. Log in again with the **same** staff account.
12. Expect redirect to `/staff` then `/staff/workspace` (or landing).
13. Navigate to `/staff/branch`.
14. Expect branch list to load (from server); if one approved branch, expect auto-redirect to that branch dashboard.
15. If multiple branches, expect branch selector; choose the same branch and enter.
16. Expect to reach the branch dashboard without “access denied” or redirect loop.

### Assigned branch dashboard access

17. From the branch dashboard, refresh the page; expect to remain on the dashboard.
18. Log out again, then log in again, then go to `/staff/branch` and enter the same branch; expect success.
19. Optionally: open `/staff/branch/:id` directly after re-login (with valid id); expect either success or a clean “Branch Not Found” / “Back to Branch Selector” without infinite redirect.

## Owner / Doctor / Shared Auth

- Owner logout already used a dedicated page; it now uses `clearLogoutState()` so all shared keys (including branch/org) are cleared. Owner and staff flows are independent; no change to doctor or shared login flow.
- Staff profile dropdown now points to `/staff/logout` instead of `/api/logout` so that full client-side clear always runs when staff log out from the UI.
