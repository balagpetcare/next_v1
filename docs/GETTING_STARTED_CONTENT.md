# Getting Started Page — Content & Configuration

This document explains where content lives, how to update it, and the difference between **View Requirements** vs **Start Setup**.

## Page Location

- **Route:** `/getting-started`
- **File:** `app/getting-started/page.tsx`
- **When shown:** First-time onboarding (users with `onboardingIntroRequired` from `/api/v1/auth/me`)

---

## 1. View Requirements vs Start Setup

### View Requirements

- **Never navigates.** Scrolls to the requirements section and selects the relevant path tab.
- Use when the user wants to read docs without starting setup.
- Hero primary CTA "See Requirements & Steps" scrolls to requirements (no redirect).
- Each path tab has a "View Requirements" button that scrolls to that path's content.
- **Anchors:** `/getting-started#requirements-owner`, `#requirements-clinic`, etc. Deep-link to a path's docs.

### Start Setup

- **Navigates** to the target route. May trigger KYC or other guards.
- Use when the user explicitly wants to begin onboarding.
- Owner/Clinic/Shop: navigates to `/owner/onboarding?intro=1` → overview screen first → KYC if needed → create org.
- Producer: navigates to `/producer`.
- Customer: navigates to `/mother`.

### Expected Behavior

- **View Requirements** — always accessible; never redirects to KYC.
- **Start Setup** — leads to onboarding overview (when `?intro=1`), then to KYC if UNSUBMITTED.
- No redirect loops.

---

## 2. Video & Poster (Background Media)

### Configuration

- **Config file:** `lib/mediaConfig.ts`
- **Env vars:**
  - `NEXT_PUBLIC_GETTING_STARTED_VIDEO` — Background video (default: `/assets/videos/getting-started.mp4`)
  - `NEXT_PUBLIC_GETTING_STARTED_POSTER` — Fallback image (default: `/assets/images/auth/auth-img.png`)

### Fallbacks

- **prefers-reduced-motion:** Uses poster instead of video.
- **Video load error:** Uses poster.

---

## 3. Requirements & Steps Content

### Source of Truth

- **File:** `lib/content/gettingStartedRequirements.ts`
- **Format:** Structured TypeScript

### Paths

| Path    | Label             | Start Setup Route          | Cookie                |
|---------|-------------------|----------------------------|------------------------|
| owner   | Owner / Business  | `/owner/onboarding?intro=1`| `intendedPanel=owner`  |
| clinic  | Clinic            | `/owner/onboarding?intro=1`| `intendedPanel=owner`  |
| shop    | Shop / Partner    | `/owner/onboarding?intro=1`| `intendedPanel=owner`  |
| producer| Producer          | `/producer`                | `intendedPanel=producer`|
| customer| Browse as Customer| `/mother`                  | `selectedPanel=mother` |

### Content Fields

- `documents` — What you'll need
- `steps` — Step-by-step flow
- `startSetupLabel` — Label for "Start Setup" button
- `useIntroParam` — If true, append `?intro=1` when navigating (owner/clinic/shop)

---

## 4. Owner Onboarding Overview (`?intro=1`)

When "Start Setup" is clicked for Owner/Clinic/Shop, the user goes to `/owner/onboarding?intro=1`.

1. **Overview screen** — Shows onboarding plan (KYC → Create org → Dashboard).
2. **"Continue to Setup"** — Fetches KYC status; if UNSUBMITTED/REJECTED, redirects to `/owner/kyc`; otherwise shows create-org form.
3. **"Skip"** — Goes straight to create-org form.

This prevents users from being sent to KYC without seeing the overview first.

---

## 5. Guard Allowlist & Cookie Sanity

### Informational Routes (Never Blocked by KYC)

- `/getting-started` — Requirements and steps; always viewable.
- `/owner/onboarding` (including `?intro=1`) — Overview and create-org form; KYC guard does not block. KYC redirect happens only after user clicks "Continue to Setup" on overview.

### Cookie Rules

- **View Requirements** — NEVER sets `intendedPanel` or `selectedPanel`. Scroll-only.
- **Start Setup** — Sets `intendedPanel` (owner/clinic/shop/producer) or `selectedPanel` (mother); uses `?intro=1` for owner/clinic/shop.
- Producer Start Setup — Goes to `/producer` without `?intro=1` (no loop).

### Debug (Development Only — Disabled in Production)

- `sessionStorage.owner_redirect_reason` — Set when owner layout redirects to KYC.
- Console logs: `[getting-started] X-Redirect-Reason: …`, `[owner/onboarding] intro=1: KYC required -> …`

---

## 6. Manual Checklist

### Anchor & UX

- [ ] `/getting-started#requirements-owner` (or clinic/shop/producer/customer) — On load: auto-select tab, auto-scroll to requirements
- [ ] "View Requirements" — Scrolls to section, updates hash, never navigates, never sets cookies
- [ ] Tab click — Updates hash; hash change (e.g. back button) syncs tab
- [ ] Smooth scroll works on first paint

### Routes & Guards

- [ ] `/getting-started` — Always accessible without KYC
- [ ] `/owner/onboarding?intro=1` — Overview shown; KYC message visible; "Continue to Setup" may redirect to `/owner/kyc?reason=kyc_required`
- [ ] `/owner/kyc?reason=kyc_required` — Shows banner: "Complete KYC to continue..."
- [ ] No redirect loops

### CTAs

- [ ] Hero "See Requirements & Steps" — Scrolls (no navigation)
- [ ] "Start Setup" Owner/Clinic/Shop → `/owner/onboarding?intro=1` → overview → KYC or create org
- [ ] "Start Setup" Producer → `/producer` (no loop)
- [ ] "Start Setup" Customer → `/mother`
