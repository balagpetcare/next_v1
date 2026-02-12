# Getting Started & Onboarding — Guard Regression Checklist

Use this checklist to verify informational routes are never blocked by KYC enforcement.

## Routes That Must Be Accessible Without KYC Completion

| Route | Condition | Expected |
|-------|-----------|----------|
| `/getting-started` | Logged-in user with `onboardingIntroRequired` | Page loads; requirements docs viewable |
| `/getting-started#requirements-owner` | Same | Tab "Owner" selected; section scrolled into view |
| `/getting-started#requirements-producer` | Same | Tab "Producer" selected |
| `/owner/onboarding?intro=1` | Owner with KYC UNSUBMITTED | Overview screen loads; "Continue to Setup" visible |
| `/owner/onboarding` | Owner with KYC UNSUBMITTED | Create-org form OR redirect to KYC only after overview "Continue" |

## KYC Guard Does NOT Block

- `/getting-started` — Outside owner layout; no KYC check.
- `/owner/onboarding` — `isOnboardingRoute` is true; KYC guard returns early.

## KYC Guard Blocks (Dashboard, etc.)

- `/owner/dashboard` — Requires KYC APPROVED or PENDING (per policy).
- `/owner/organizations` — Same.
- Other owner business routes — Same.

## Verification Steps

1. Log in as owner with KYC UNSUBMITTED.
2. Navigate to `/getting-started` — should load (or redirect from post-auth-landing).
3. Click "View Requirements" — should scroll, no redirect.
4. Navigate to `/owner/onboarding?intro=1` directly — should show overview.
5. Click "Continue to Setup" — should redirect to `/owner/kyc?reason=kyc_required`.
6. KYC page should show banner: "Complete KYC to continue..."

## Production Build

- `process.env.NODE_ENV === "development"` checks ensure redirect logging and `sessionStorage.owner_redirect_reason` are disabled in production.
