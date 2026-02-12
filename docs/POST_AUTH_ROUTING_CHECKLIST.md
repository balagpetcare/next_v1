# Post-Auth Routing System — Test Checklist (Port 3104)

Deterministic decision tree: **getting-started → documents/KYC → activity selection → dashboard**.

## Flow Overview

1. **Post-auth-landing** (`/post-auth-landing`) — ONLY post-login/post-register landing for ALL users
2. **Priority order:**
   - A) `onboardingIntroRequired` (first-time user) → `/getting-started`
   - B) `verificationRequired` && `verificationStatus` != APPROVED → `verificationRedirect` (e.g. `/owner/kyc`, `/producer/kyc`)
   - C) `needsActivitySelection` → `/choose-activity` (or selectedPanel cookie → panel)
   - D) else → `default_redirect`
3. **`/getting-started`** — First-time onboarding intro: cards for Owner/Business, Clinic, Shop, Producer, Customer with requirements/steps; CTAs set `intendedPanel` or `selectedPanel` and redirect
4. **`/mother`** — Terminal only for `isCustomerOnly` users; business-intended users (intendedPanel cookie) redirect to post-auth-landing
5. **`/choose-activity`** — Activity selection; customer-only gets "Shop as Customer" + CTA to create/join business (no auto-redirect to mother)

---

## Backend GET /api/v1/auth/me — Routing Payload

Response includes `routing`:

- `onboardingIntroRequired` (boolean) — unclassified: no contexts, no org, no branch, allowedPanels empty
- `onboardingReason` (string) — e.g. "intro_first_login_no_context_no_panels"
- `recommendedNextPaths` (object) — e.g. `{ owner: "/owner/onboarding", customer: "/mother" }`
- `needsActivitySelection` (boolean)
- `default_redirect` (string)
- `allowedPanels` (array)
- `isCustomerOnly` (boolean)
- `hasBusinessContext` (boolean)
- `verificationRequired` (boolean)
- `verificationStatus` (NONE | PENDING | APPROVED | REJECTED)
- `verificationRedirect` (string, e.g. `/owner/kyc`)
- `debugReason` (dev-only)

---

## Manual Test Checklist

### 1. New user (first-time) → post-auth-landing → getting-started docs → no choose-activity/mother loop

- [ ] Register a new user (role USER, no panels, no org/branch)
- [ ] After login → lands on `/post-auth-landing`
- [ ] Redirects to `/getting-started` (onboarding documentation/requirements) — **not** choose-activity or mother
- [ ] See cards: Owner/Business, Clinic, Shop/Partner, Producer, Customer
- [ ] Each card shows "What you'll need" and "Steps"
- [ ] **Business path:** Click "Start Business Setup" → sets `intendedPanel=owner` → `/owner/onboarding` → org creation + docs → dashboard
- [ ] **Customer path:** Click "Continue as Customer" → sets `selectedPanel=mother` → `/mother` and stays
- [ ] Stale `selectedPanel=mother` cookie is cleared for unclassified users (no bias to /mother)
- [ ] No redirect loop; no choose-activity/mother loop for newly registered users

### 2. New business user with missing docs

- [ ] Register as owner (no org/branch yet) or login as owner with UNSUBMITTED/REJECTED KYC
- [ ] After login → lands on `/post-auth-landing`
- [ ] Redirects to `/owner/kyc` (documents/KYC page)
- [ ] Complete KYC → approval → then can access dashboard

### 3. New business user with docs complete but no panel chosen

- [ ] Owner with VERIFIED KYC but no org/branch/context
- [ ] Login → post-auth-landing → `/choose-activity`
- [ ] Select "Owner Dashboard" → `/owner/dashboard`
- [ ] No loop, no /mother

### 4. Customer-only user

- [ ] Register/login as customer (no business roles)
- [ ] First-time: Login → post-auth-landing → `/getting-started` → "Browse as Customer" → `/mother`
- [ ] Returning (has selectedPanel=mother): Login → post-auth-landing → `/mother` directly
- [ ] Or via `/choose-activity`: Select "Shop as Customer" → `/mother` and **stays there** (no loop)

### 5. Direct /mother for business user

- [ ] Login as owner/admin/producer/staff
- [ ] Visit `/mother` directly
- [ ] Immediately redirects to `/post-auth-landing` → then to dashboard
- [ ] Business-intended (intendedPanel=owner etc.): same redirect to post-auth-landing
- [ ] No loops

### 6. Post-auth-landing is the only post-login landing

- [ ] Login from any panel (owner, mother, etc.) with no `returnTo`
- [ ] Always lands on `/post-auth-landing` first
- [ ] Never lands directly on `/mother` (except when customer selects it from choose-activity)

### 7. Invite accept

- [ ] Accept team invite → redirect to `/owner/workspace` or `/owner/dashboard`
- [ ] Accept staff invite → redirect to staff panel
- [ ] Never redirects to `/mother` for business users

### 8. Loop guard and dev diagnostics

- [ ] In dev: `[post-auth-landing]`, `[mother]`, `[choose-activity]` log routing payload
- [ ] X-Redirect-Reason logged in console for each redirect
- [ ] If redirect would repeat within 5s, loop guard shows **Onboarding & Requirements** as primary CTA (not choose-activity/mother)

---

## Affected Files

**Backend:**
- `auth.controller.ts` — `getProfile` returns `routing` payload

**Frontend:**
- `app/getting-started/page.tsx` — First-time onboarding intro with path cards and CTAs
- `app/post-auth-landing/page.tsx` — Priority redirect A→B→C→D, loop guard, debug UI
- `app/choose-activity/page.tsx` — No auto-redirect to mother for customer-only; CTA to create/join business
- `app/mother/page.jsx` — Terminal only for `isCustomerOnly`; business-intended users → post-auth-landing
- `app/login/page.jsx` — Post-auth-landing is ONLY default post-login target
- `app/mother/login/page.tsx`, `app/mother/register/page.tsx` — `defaultLandingPath="/post-auth-landing"`
- `app/invite/accept/page.jsx` — Rewrites `/mother` to post-auth-landing
