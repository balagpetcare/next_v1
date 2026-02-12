# Login/Logout Routing Test Checklist

Verifies panel-specific login and logout flows work correctly across the multi-panel app.

## Owner Panel (Port 3104)

### Prerequisites
- Backend API running on port 3000
- Owner panel: `npm run dev:owner` (port 3104) or `npm run dev:all`

### Manual Tests

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open http://localhost:3104/owner/login | Redirects to /login?next=/owner; login form renders |
| 2 | Enter valid owner credentials and submit | Redirects to /owner/dashboard (or /owner/kyc if KYC pending) |
| 3 | From owner dashboard, click Logout | Goes to /owner/logout; shows "Signing out..."; redirects to /owner/login |
| 4 | Verify /owner/login after logout | Redirects to /login; no 404 |
| 5 | Navigate directly to http://localhost:3104/auth/login | Redirects to /login (no 404) |
| 6 | Navigate to http://localhost:3104/auth/login?app=owner | Redirects to /owner/login |

### API Logout (used by shop, clinic, staff, country)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7 | From /owner/dashboard, open GET /api/logout in new tab | Clears cookies; redirects to /owner/login (via Referer) |
| 8 | From /owner/dashboard, visit /api/logout directly | Redirects to /owner/login |

## Other Panels (Quick Smoke)

| Panel | Login URL | Logout flow |
|-------|-----------|-------------|
| Admin | /admin/login | /admin/logout → /admin/login |
| Partner | /partner/login | /partner/logout → /partner/login |
| Shop | /shop/login | /api/logout → /shop/login |
| Clinic | /clinic/login | /api/logout → /clinic/login |
| Staff | /staff/login | /api/logout → /staff/login |
| Country | /country/login | /api/logout → /country/login |

## Success Criteria

- [ ] No 404 on /auth/login
- [ ] Owner logout → Owner login page renders
- [ ] Post-login redirect goes to owner landing (/owner/dashboard or /owner/kyc), not /mother (see POST_AUTH_LANDING_TEST_CHECKLIST.md)
- [ ] API logout GET redirects to correct panel login based on Referer
