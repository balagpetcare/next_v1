# Owner Team Invite UX – Manual Test Steps

This document covers manual verification for the improved Team Invite flow at **`/owner/teams/[teamId]`**.

## Prerequisites

- Logged in as an Owner (or user with team management access).
- At least one team exists; team has default scopes and optionally default branches.
- At least one organization with branches (for branch picker and “all branches” mode).

## 1. Invite with team default branches

1. Go to **Owner → Teams** and open a team (e.g. `/owner/teams/1`).
2. In **Invite member by email**:
   - Leave **Branch access** as **Use team default branches**.
   - Enter a valid email and optionally reduce scopes (uncheck some).
3. Click **Invite**.
4. **Verify:**
   - Request succeeds (invite link shown).
   - In network tab, request body does **not** include `branchIds` (or `branchIds` is omitted / null per backend contract).

## 2. Invite with specific branches

1. On the same team page, set **Branch access** to **Specific branches**.
2. Use the searchable multi-select:
   - Search by branch name/city.
   - Select one or more branches.
   - Use **Select all branches** and **Clear** and confirm they work.
3. Ensure at least one branch is selected, then enter email and click **Invite**.
4. **Verify:**
   - Request body includes `branchIds: [number, ...]` with the selected branch IDs only.

## 3. Invite org-wide (all branches)

1. Set **Branch access** to **All branches (org-wide)**.
2. Enter email and click **Invite**.
3. **Verify:**
   - Request body includes `branchIds` as an array of all branch IDs the owner has access to (same as `GET /api/v1/owner/branches` IDs).

## 4. Scopes override – remove-only

1. Ensure the team has at least two default scopes (e.g. Products, Inventory).
2. In the invite form, **Scopes** section:
   - Initially all team default scopes should be checked.
   - Uncheck one or more scopes (restrict access).
3. **Verify:**
   - You cannot add scopes that are not in the team’s default list (only team default scopes are shown as checkboxes).
   - Request body includes `scopes` only with a subset of team default scope keys (never more than team defaults).

## 5. Payload matches backend expectations

- **Backend contract:** `POST /api/v1/owner/teams/:teamId/invite` accepts:
  - `email` (required)
  - `scopes` (optional): string[] – subset of team’s scopes
  - `branchIds` (optional): number[] – omit or do not send when using team default branches
- **Verify** in network tab for the three branch modes:
  - Team default: no `branchIds` (or omitted).
  - Specific: `branchIds` = selected IDs.
  - All branches: `branchIds` = all accessible branch IDs.

## 6. Effective Access Preview and empty state

1. Check the **Effective access preview** box:
   - Shows current **Scopes** (names or “team defaults”).
   - Shows **Branches**: “Team default branches”, “All branches (org-wide)”, “N branch(es)”, or “No branches selected → uses team defaults”.
2. In **Specific branches** mode with no selection:
   - **Verify** the helper text: “No branches selected → uses team defaults.” is visible.

## 7. No regression on other owner pages

- Open **Owner → Teams** list, **Owner → Overview**, and any **Owner → Organizations / Branches** page.
- **Verify** they load and behave as before (no broken imports or missing components).
