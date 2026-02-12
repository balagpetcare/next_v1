# PostAuthLanding Test Checklist

**See [POST_AUTH_ROUTING_CHECKLIST.md](./POST_AUTH_ROUTING_CHECKLIST.md) for the full routing system and port 3104 checklist.**

This checklist verifies the centralized PostAuthLanding flow. Users should no longer always land on `/mother`; they are routed based on their onboarding state and chosen activity.

## Flow Overview

1. **PostAuthLanding** (`/post-auth-landing`): Fetches `/api/v1/auth/me`, then:
   - If `needsActivitySelection` and no `selectedPanel` cookie → redirect to `/choose-activity`
   - If `needsActivitySelection` and valid `selectedPanel` cookie → redirect to that panel
   - Else → redirect to `default_redirect` from backend

2. **Choose Activity** (`/choose-activity`): Shows available panels based on roles. On selection, sets `selectedPanel` cookie and redirects to the panel dashboard.

3. **`/mother`**: Terminal for customer-only users. When visited:
   - **Customer-only** (no business panels): Renders mother page, no redirect.
   - **Business/staff/admin**: Redirects to `/post-auth-landing` (then to their dashboard).

---

## Manual Test Checklist

### 1. New user signup → choose-activity

- [ ] Register a new user (no org, no branch, customer-only)
- [ ] After registration, user is redirected to login
- [ ] After login, user lands on `/choose-activity` (not `/mother`)
- [ ] Choose-activity page shows "Shop / Browse as Customer" as option
- [ ] On selecting it, user is redirected to `/mother`
- [ ] `selectedPanel` cookie is set

### 2. Returning user → correct panel dashboard

- [ ] Log in as owner (has org/branch)
- [ ] User lands on `/owner/dashboard` or `/owner/kyc` (not `/mother`)
- [ ] Log in as admin
- [ ] User lands on `/admin`
- [ ] Log in as producer
- [ ] User lands on `/producer` (or `/producer/kyc` if pending)
- [ ] Log in as staff (branch member)
- [ ] User lands on `/staff` or `/staff/branch/:id`
- [ ] Log in as customer with `selectedPanel=mother` cookie
- [ ] User lands on `/mother` (via post-auth-landing)

### 3. Direct visit `/mother` → correct routing (no loop)

- [ ] Visit `/mother` while unauthenticated
- [ ] Mother page content is shown (skeleton/landing)
- [ ] Visit `/mother` while authenticated as **customer-only**
- [ ] Mother page renders, **stays on mother** (no redirect, no loop)
- [ ] Visit `/mother` while authenticated as **business user** (owner/admin/etc)
- [ ] User is redirected to `/post-auth-landing` → their dashboard

### 4. Mother login/register returnTo

- [ ] Visit `/mother/login`
- [ ] Redirects to central auth with returnTo pointing to `/post-auth-landing`
- [ ] After successful login, user lands on post-auth-landing (then chooses or goes to panel)
- [ ] Same for `/mother/register`

### 5. Invite accept

- [ ] Accept team invite
- [ ] Redirect goes to `/owner/workspace` or `/owner/dashboard` (not `/mother`)
- [ ] Accept staff (branch) invite
- [ ] Redirect goes to staff panel (not `/mother`)

### 6. Redirect loop regression (critical)

- [ ] **Customer-only**: login → choose-activity → select "Shop as Customer" → `/mother` (stays, no loop)
- [ ] **Business user**: login → `/post-auth-landing` → `/owner/dashboard` (or panel) (no loop)
- [ ] **Direct `/mother`**: customer stays; business reroutes to post-auth-landing

### 7. Login with returnTo override

- [ ] Login with `?returnTo=/owner`
- [ ] User lands on `/owner`
- [ ] Login with `?returnTo=/mother` (legacy)
- [ ] Frontend rewrites to `/post-auth-landing`; user goes through PostAuthLanding flow

---

## Affected Files

**Backend:**
- `authUnified.service.ts`: Customer fallback → `/choose-activity` (was `/mother`)
- `auth.controller.ts`: `getProfile` adds `default_redirect`, `needsActivitySelection`; staff invite adds `default_redirect`

**Frontend:**
- `app/post-auth-landing/page.tsx`: Central PostAuthLanding page
- `app/choose-activity/page.tsx`: Activity selection page
- `app/mother/page.jsx`: Customer-only users stay on mother; business users redirect to post-auth-landing
- `app/mother/login/page.tsx`, `app/mother/register/page.tsx`: `defaultLandingPath` → `/post-auth-landing`
- `app/login/page.jsx`: Rewrites `/mother` target to `/post-auth-landing`
- `app/invite/accept/page.jsx`: Uses post-auth-landing when no redirect; rewrites `/mother` to post-auth-landing

**Dev diagnostics (development only):**
- `[mother]`, `[post-auth-landing]`, `[choose-activity]` console.log auth/me response, selectedPanel cookie
