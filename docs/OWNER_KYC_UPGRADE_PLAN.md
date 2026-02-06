# Owner KYC Upgrade – Complete Planning Document

**Purpose:** Owner KYC at [http://localhost:3104/owner/kyc](http://localhost:3104/owner/kyc) is the **Business identity onboarding + compliance gate**. User/Owner account remains, but business capabilities (sell, bank, withdraw, ads, verified badge) unlock progressively.

**Scope:** Form expansion, backend schema/API alignment, pending-state allow/block rules, data retention on non-approval, notifications, and UI/UX flow.

**Standards:** BPA_STANDARD.md, PROJECT_CONTEXT.md; ports: API 3000, Owner app 3104. No deletions; merge-only patches.

---

## 1. Current State (Baseline)

### 1.1 Backend (backend-api)

| Area | Current |
|------|--------|
| **OwnerKyc** | `userId`, `fullName`, `fatherName`, `motherName`, `dateOfBirth`, `genderText`, `nationality`, `nidNumber`, `nidIssueDate`, `nidAddressRaw`, `mobile`, `email`, `presentAddressJson`, `permanentAddressJson`, emergency contact; `verificationStatus` (UNSUBMITTED \| SUBMITTED \| VERIFIED \| REJECTED), `submittedAt`, `reviewedAt`, `reviewedByAdminId`, `reviewNote`, `rejectionReason`, `riskScore`, `isLocked`, `lockReason`, `deletedAt`. |
| **OwnerKycDocument** | `ownerKycId`, `type` (DocumentType: NID_FRONT, NID_BACK, SELFIE_WITH_NID, TRADE_LICENSE, …), `status`, `mediaId`. |
| **VerificationStatus** | UNSUBMITTED, SUBMITTED, VERIFIED, REJECTED (no PENDING_REVIEW / EXPIRED / DRAFT in enum). |
| **Routes** | `GET/PUT /api/v1/owner/kyc`, `POST /api/v1/owner/kyc/documents`, `POST /api/v1/owner/kyc/submit`. |
| **Middleware** | `ensureOwnerKyc` requires OwnerKyc row, status SUBMITTED or VERIFIED, not locked, ≥1 document. |
| **Organization** | `name`, `supportPhone`, `addressJson`, `status` (PartnerStatus), `countryId`, `legalProfile` (OrganizationLegalProfile). No direct `orgTypeId`; OrganizationType table exists separately. |
| **OrganizationLegalProfile** | `organizationName`, `registrationType` (PROPRIETORSHIP \| PARTNERSHIP \| LIMITED_COMPANY \| NGO), trade license, TIN/BIN, bank/payout, verificationStatus. |
| **RegistrationType** | PROPRIETORSHIP, PARTNERSHIP, LIMITED_COMPANY, NGO (no Unregistered / Trade License / RJSC explicitly). |
| **submitOwnerKyc** | Sets status SUBMITTED, clears rejection fields; audit `OWNER_KYC_SUBMIT`. No email/in-app notification today. |

### 1.2 Frontend (bpa_web)

| Area | Current |
|------|--------|
| **Page** | `app/owner/kyc/page.jsx` – 2 steps: (1) KYC Information (fullName, mobile, email, nidNumber), (2) Documents (NID front/back, selfie with NID) with ImageUploadWithCrop. |
| **Guard** | `_lib/requireOwnerKyc.js` – redirects to `/owner/kyc` if status not SUBMITTED/VERIFIED or no documents. |
| **Status** | Badge + alerts for VERIFIED/APPROVED (locked), REJECTED (reason), REQUEST_CHANGES, SUBMITTED. |

### 1.3 Gaps vs Recommended v1

- Identity: missing dateOfBirth, nationality, present address (short), passport option; selfie with NID optional for v1.
- Business: no Business Profile on Owner KYC (org name BN+EN, business type, registration type, description, business contact) – today org is created separately; decision: keep **Owner KYC = person identity only** for v1, Business = first Organization + Legal Profile.
- Address: no structured business address/location or map pin on OwnerKyc; presentAddressJson exists but UI not expanded.
- Documents: NID front/back + selfie required; Trade License optional v1; no business logo/storefront on OwnerKyc.
- Compliance: no explicit terms/consent or “info true” checkbox in form.
- Review step: no summary preview / edit sections before submit.
- Status lifecycle: no EXPIRED or PENDING_REVIEW; no `expiresAt`; no data retention job.
- Notifications: no OWNER_KYC_SUBMITTED event; no email/dashboard notification on submit.
- Pending allow/block: not enforced by feature flags; ensureOwnerKyc currently requires SUBMITTED/VERIFIED for org/branch registration.

---

## 2. Recommended v1 Form Structure (Owner KYC Page)

### A) Step 1 – Basic Identity (Owner/Representative)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full name (NID) | text | ✅ | Already in schema + UI |
| Mobile (OTP verified) | text | ✅ | Already; mark “verified” from auth if available |
| Email (verification link) | text | ✅ | Already; same |
| Date of birth | date | ✅ | In schema; add to UI |
| Nationality | text/select | ✅ | In schema (default Bangladeshi); add to UI |
| NID / Passport number | text | ✅ | Schema has nidNumber; add “Passport” option if needed later |
| Present address (short) | text or structured | ✅ | Use presentAddressJson; add short text or reuse location plan |
| Selfie with NID | file | Optional v1 | Already in docs; can remain required for submit |

**Backend:** OwnerKyc already has these; extend `upsertOwnerKycDraft` to accept and persist all. No schema change required for v1 except optional `passportNumber` if we add passport path.

### B) Step 2 – Business Profile (Organization) – v1 Scope

**Recommendation:** For v1, treat “first organization” as post-KYC. Owner KYC form **does not** create Organization. After KYC SUBMITTED/VERIFIED, owner creates org (existing flow) and fills Organization Legal Profile (name BN+EN, business type, registration type, etc.). So **Business Profile section is not part of Owner KYC form in v1**; it stays in Organization creation + Org Legal Profile wizard.

**If product insists on “business info on KYC page”:** Add a **non-blocking** “Business intent” subsection (optional): preferred business name, type (from OrganizationType: Clinic/Pet Shop/…), registration type – stored in OwnerKyc as JSON (e.g. `businessIntentJson`) for pre-fill when creating first org. No FK to Organization yet.

**Decision point:** Document in plan; implement either “KYC only identity” or “KYC + business intent JSON” in Phase 1.

### C) Step 3 – Business Address / Location

**Recommendation:** Owner is a person; “business address” belongs to Organization/Branch. On Owner KYC we only need **present address** (person). Use existing `presentAddressJson` + location picker (per LOCATION_AUDIT / INTEGRATION_PLAN): country, region, city, area, postal; for Bangladesh: Division → District → Upazila/Thana → Area (Dhaka: CityCorp/Ward optional). Optional: “Use current location” + lat/lng in JSON. No new table; extend OwnerKyc address JSON and UI.

### D) Step 4 – Document Upload (KYC Core)

| Document | Required v1 | Schema |
|----------|-------------|--------|
| NID Front | ✅ | NID_FRONT |
| NID Back | ✅ | NID_BACK |
| Selfie with NID | ✅ | SELFIE_WITH_NID |
| Trade License | Optional | TRADE_LICENSE |
| Business logo | Optional | Add DocumentType if needed or store in Org later |
| Storefront photo | Optional | Branch/Org later |

Keep existing crop/preview component; add slots for optional Trade License. No schema change if we only add optional TRADE_LICENSE to existing DocumentType usage.

### E) Step 5 – Compliance Declarations

- Terms acceptance + data processing consent (checkbox).
- “I confirm the information provided is true” (checkbox).
- Business category declaration (no illegal products/services) (checkbox).

**Backend:** Store in OwnerKyc as JSON, e.g. `declarationsJson: { termsAcceptedAt, dataProcessingConsentAt, infoTrueConfirmedAt, legalBusinessCategoryAt }` (timestamps). Or single `declarationsAcceptedAt` DateTime. Add one nullable column or JSON; validate on submit.

### F) Step 6 – Review & Submit

- Summary preview (read-only) of identity, address, document list, declarations.
- Edit links per section (jump to step 1–5).
- Submit → set status to **PENDING_REVIEW** (or keep SUBMITTED; see 4.1).
- After submit: show status banner “Pending review”; allow “Continue setup” (branches/products drafts).

---

## 3. High-Impact Upgrades (Post–v1 or Parallel)

### A) Smart Onboarding (Setup Checklist)

- After submit, show checklist: (1) Create first branch, (2) Add location, (3) Add services/products drafts, (4) Add staff invites, (5) Connect payout (locked until approved).
- Auto-fill: last used location, last org type, saved draft (already partial with draft save).

### B) Progressive KYC Levels

- **Level 0 (Pending):** Limited access (see 5).
- **Level 1 (Verified Basic):** Trade license verified.
- **Level 2 (Verified + Payout):** Bank + extra verification.
- Implement via `kycLevel` or `verificationLevel` on OwnerKyc + feature flags.

### C) Fraud / Quality Signals (Admin Review)

- Device/IP fingerprint (soft); duplicate NID/email/org-name detection flag; document quality score (blur/low light warning); “Why rejected” + resubmit flow (rejection reason already in schema and UI).

---

## 4. Status Lifecycle & Data Retention

### 4.1 KYC Status Values

- **Proposed lifecycle:** DRAFT → SUBMITTED → PENDING_REVIEW → APPROVED | REJECTED | EXPIRED.
- **Current enum:** UNSUBMITTED, SUBMITTED, VERIFIED, REJECTED.
- **Mapping:** Treat SUBMITTED as “pending review”. Optionally add PENDING_REVIEW = SUBMITTED in API responses for UI. Add **EXPIRED** to enum when implementing retention.
- **Approved:** Use VERIFIED (or add APPROVED and map to VERIFIED in middleware).

**Implementation (additive):**

1. Add `expiresAt` (DateTime?) to OwnerKyc: set on submit (e.g. submittedAt + 45 days).
2. Add enum value EXPIRED (or derive: status stays SUBMITTED/REJECTED and expiresAt &lt; now ⇒ “expired” for retention job).
3. Daily job: find OwnerKyc where status in (SUBMITTED, REJECTED) and expiresAt &lt; now ⇒ run retention (see below). Optionally set status = EXPIRED if enum added.

### 4.2 Data Retention (User Kept; Business Data Deleted)

**Rule:** If KYC is not approved within X days (e.g. 45) or remains incomplete/expired, **user account stays**; **business-related data** is permanently removed.

**Steps:**

1. **Soft-delete:** Set `deletedAt` and `deletionScheduledAt` (add if missing) on Organization(s) owned by this user. Optionally mark OwnerKyc as expired/locked.
2. **Grace period:** N days (e.g. 7) after deletionScheduledAt – no hard delete yet; allow support to restore.
3. **Nightly job (cron/BullMQ/Agenda):**  
   - Find orgs where `deletionScheduledAt` &lt; now - grace days (and deletedAt set).  
   - Hard delete in FK-safe order: e.g. branch-related → product/inventory drafts → staff links → media references → branches → organizations. OwnerKyc can be kept or anonymized; User untouched.  
   - MinIO: delete objects by prefix (e.g. orgId/ or owner/kyc/).  
   - Audit log: “Auto cleanup due to KYC expiry”, orgId, userId.

**Touch points:**

- backend-api: Prisma schema (deletionScheduledAt on Organization or new table), cron/job file, cascade order, audit write.
- bpa_web: optional “Your business data will be deleted on &lt;date&gt;” banner when expired.

---

## 5. Pending State – Allow / Block

### 5.1 Allowed While Pending (Onboarding Continuation)

- Create business (first Organization) ✅  
- Create/edit branch ✅  
- Set branch location ✅  
- Create product/inventory **drafts** ✅  
- Staff invite/create (limited permissions) ✅  
- Upload product images (storage) ✅  

**Implementation:** Relax `ensureOwnerKyc` so that **SUBMITTED** (pending) also allows org/branch create and draft operations. Middleware: allow if status is SUBMITTED or VERIFIED (and has docs, not locked). No change to “required KYC” for org creation if we keep “must have KYC submitted” (pending = can continue setup).

### 5.2 Blocked While Pending

- Online store “Go live”.
- Wallet withdraw / payouts.
- Payment collection.
- Public verified badge / ads.
- High-volume order processing (optional).
- Vendor/producer onboarding (optional).

**Implementation:** Feature gating by `kycStatus === 'VERIFIED'` (and optionally `kycLevel`). Check in: online-store publish, wallet/payout APIs, ads/verified-badge APIs. Use `requiresKycApproved: true` in config or middleware where needed.

---

## 6. Email + Dashboard Notifications (On Submit)

### 6.1 Event Triggers

- **OWNER_KYC_SUBMITTED** – when owner clicks Submit and API succeeds.
- **OWNER_KYC_EMAIL_VERIFICATION_SENT** – if email verification is pending (optional; can be Phase 2).

### 6.2 Backend

- **NotificationType:** Add `OWNER_KYC_SUBMITTED` to enum (Prisma), add-only.
- In `submitOwnerKyc` (owner.controller.ts): after updating status, call notification service:
  - **Owner:** createNotification({ userId: ownerUserId, type: 'OWNER_KYC_SUBMITTED', title: 'KYC Submitted', message: 'Your KYC is under review. You can continue setting up branches and products.', actionUrl: '/owner/kyc', dedupeKey: `kyc_submitted:${orgId}:${userId}` }). Note: orgId not applicable to OwnerKyc; use dedupeKey `kyc_submitted:owner:${userId}`.
  - **Admin:** notify admin panel (e.g. list of admin users or role-based); createNotification for each relevant admin (type OWNER_KYC_SUBMITTED, title “New Owner KYC submission”, actionUrl to admin review page).
- **Email:** Use existing notification flow (P0/P1) or dedicated template: subject “BPA Owner KYC Submitted – Pending Review”, body: status, reference (OwnerKyc id), “You can continue setting up branches/products while review is pending”, CTA “Open Owner Dashboard” (link to 3104).

### 6.3 Dedupe Key

- `kyc_submitted:owner:${userId}` (owner in-app).
- Admin: `kyc_submitted:admin:${adminUserId}` or per submission `kyc_submitted:${ownerKycId}` to avoid duplicate per admin.

---

## 7. UI/UX Flow (Owner KYC Page)

### 7.1 Steps (Recommended)

1. **Step 1 – Identity** (full name, mobile, email, DOB, nationality, NID/passport, present address).  
2. **Step 2 – Documents** (NID front/back, selfie with NID, optional trade license); reuse crop/preview.  
3. **Step 3 – Business & Location** (v1: present address only; or “Business intent” optional; or skip and keep address in Step 1).  
4. **Step 4 – Review & Submit** (summary, edit links, declarations, submit button).

So practical v1: **Step 1 Identity** (including address) → **Step 2 Documents** → **Step 3 Declarations + Review** → Submit.

### 7.2 UX Requirements

- Draft autosave (already partial; extend to all steps).  
- Progress bar + checklist sidebar.  
- Status banner: Draft | Pending | Rejected (with reason) | Approved.  
- After submit: “Continue setup” (branches/products) + link to dashboard.

---

## 8. Implementation Phases (Order of Work)

### Phase 1 – Schema & API (backend-api)

1. **Schema (additive only)**  
   - OwnerKyc: add `expiresAt` (DateTime?), `declarationsJson` (Json?) or `declarationsAcceptedAt` (DateTime?).  
   - Organization: add `deletionScheduledAt` (DateTime?) if not present.  
   - VerificationStatus: add EXPIRED if we want explicit status; else keep and use expiresAt only for job.  
   - NotificationType: add OWNER_KYC_SUBMITTED.

2. **API**  
   - `upsertOwnerKycDraft`: accept dateOfBirth, nationality, presentAddressJson (and optional businessIntentJson).  
   - `submitOwnerKyc`: set expiresAt = submittedAt + 45 days; validate declarations if column present; after update, call notification service (owner + admin), audit log.

3. **Middleware**  
   - ensureOwnerKyc: allow SUBMITTED and VERIFIED (already does); document “pending = can create org/branch”.

4. **Notifications**  
   - createNotification for owner (dedupeKey `kyc_submitted:owner:${userId}`).  
   - createNotification for admin(s) (new OWNER_KYC_SUBMITTED, link to admin verification/KYC list).

5. **Data retention job**  
   - New job: daily, find OwnerKyc with status SUBMITTED/REJECTED and expiresAt &lt; now; for each, set Organization(s).deletedAt and deletionScheduledAt; optionally set OwnerKyc status or flag.  
   - Second job or same job after grace: hard-delete orgs where deletionScheduledAt + grace passed; cascade; MinIO cleanup; audit.

### Phase 2 – Owner KYC Form UI (bpa_web)

1. **Step 1 – Identity**  
   - Add fields: dateOfBirth, nationality, present address (text or location picker per LOCATION_AUDIT).  
   - Keep fullName, mobile, email, nidNumber.  
   - Autosave draft on blur or “Save draft”.

2. **Step 2 – Documents**  
   - Keep NID front/back, selfie; add optional Trade License.  
   - Reuse ImageUploadWithCrop; show required vs optional.

3. **Step 3 – Declarations + Review**  
   - Checkboxes: terms, data processing, “info true”, legal business.  
   - Summary preview (read-only) + edit links to Step 1/2.  
   - Submit → POST /api/v1/owner/kyc/submit; show success + “Continue setup”.

4. **Progress & status**  
   - Progress bar (steps 1–3 or 1–4).  
   - Sidebar checklist.  
   - Status banner: Draft / Pending / Rejected / Approved.

### Phase 3 – Feature Gating & Polish (backend-api + bpa_web)

1. **Gating**  
   - Online store go-live: require kycStatus === VERIFIED.  
   - Wallet/payout/ads: require VERIFIED.  
   - Document which endpoints use ensureOwnerKyc vs “verified only”.

2. **Admin**  
   - Admin “New KYC submission” notification + link to Owner KYC review (existing or new admin page).

3. **Email template**  
   - “BPA Owner KYC Submitted – Pending Review” (subject/body/CTA) in notification worker or email service.

### Phase 4 – Optional (Later)

- Business intent JSON on OwnerKyc and pre-fill first org.  
- Progressive KYC levels (Level 1/2).  
- Fraud/quality signals (duplicate detection, document quality).  
- Liveness/selfie check.

---

## 9. Touch Points Summary

| Layer | Files / Areas |
|-------|----------------|
| **Backend schema** | prisma/schema.prisma (OwnerKyc, Organization, VerificationStatus, NotificationType) |
| **Backend API** | src/api/v1/modules/owner/owner.controller.ts (getOwnerKyc, upsertOwnerKycDraft, submitOwnerKyc) |
| **Backend middleware** | src/middlewares/ensureOwnerKyc.ts (doc only or relax to SUBMITTED) |
| **Backend notifications** | src/api/v1/services/notification.service.ts, src/utils/notificationTemplates.ts, submitOwnerKyc |
| **Backend jobs** | src/common/jobs/ (new: kycExpiryRetention.job.ts or similar) |
| **Frontend KYC page** | app/owner/kyc/page.jsx (steps, fields, declarations, review, submit) |
| **Frontend guard** | app/owner/_lib/requireOwnerKyc.js (no change if SUBMITTED already allowed for redirect logic) |
| **Admin** | Admin verification/KYC list + notification link (existing or new) |

---

## 10. Success Criteria

- Owner can complete identity (name, DOB, nationality, NID, address), documents (NID front/back, selfie, optional trade license), and declarations, then submit.  
- Status becomes PENDING_REVIEW/SUBMITTED; expiresAt set.  
- Owner receives in-app notification; admin receives “New Owner KYC submission”.  
- Email “KYC Submitted – Pending Review” sent (when email flow enabled).  
- Pending owners can create org, branch, drafts; cannot go live / payout / ads until VERIFIED.  
- After expiry + grace, nightly job soft-deletes then hard-deletes org data; user account remains.

---

**Next step:** Proceed phase-by-phase (Phase 1 → 2 → 3). Say “next” to start implementation (begin with Phase 1 schema and API).
