# Image upload points – BPA/WPA (rollout inventory)

## Rollout checklist

- [x] Product detail (owner) add image → ImageUploader product_gallery
- [x] BranchForm (6 fields) → ImageUploader with useCase per field (banner/logo/document)
- [x] Org new/registration/edit → use mediaUpload.ts
- [x] VerificationCasePanel → useImageCropper for images, then existing uploadDoc
- [x] Producer KYC → useImageCropper for images, then existing FormData upload
- [x] Product detail: primary enforced on submit/publish (block if no images)
- [x] Duplicate uploadMedia replaced; legacy branch ImageUploader.jsx uses src/services/mediaUpload.ts

## Upload points table

| Page/Component | Use-case | Method | useCase | Notes |
|----------------|----------|--------|---------|-------|
| `app/owner/(larkon)/products/[id]/page.tsx` | Product gallery | ImageUploader | product_gallery | Done |
| `app/owner/_components/branch/BranchForm.jsx` | Storefront, signboard, logo, trade license, inside, other | ImageUploader | banner, banner, logo, document, banner, document | 6 fields; TRADE_LICENSE/OTHER accept image/*,.pdf (crop only for images) |
| `app/owner/_components/branch/ImageUploader.jsx` | (Legacy) branch docs | Replaced by src/media/uploader | — | BranchForm switches to universal ImageUploader |
| `app/owner/_components/branch/ImageUploadField.tsx` | Product/branch crop UI | Reference only | — | Superseded by ImageUploader + cropper modal |
| `app/owner/(larkon)/organizations/new/page.jsx` | Org trade license | mediaUpload.ts | document | Replace local uploadMedia |
| `app/owner/(larkon)/organizations/[id]/registration/page.jsx` | Org registration docs | mediaUpload.ts | document/logo | Replace local uploadMedia |
| `app/owner/(larkon)/organizations/[id]/edit/page.jsx` | Org logo/docs | mediaUpload.ts | logo | Replace local uploadMedia; image fields use cropper |
| `app/owner/_components/verification/VerificationCasePanel.jsx` | Verification attachments | useImageCropper + uploadDoc | document | Image: crop then upload to verification-case/documents |
| `app/producer/kyc/page.jsx` | KYC documents | useImageCropper + FormData | document | Image: crop then POST to producer/kyc/documents |
| `app/owner/(larkon)/products/[id]/edit` | Product form | No image UI | — | ProductForm is metadata only; media on detail page |
| `app/owner/(larkon)/products/new` | Product form | No image UI | — | Same |
| `src/components/common/ImageUploadWithCrop.jsx` | Generic crop | Reference | — | Prefer ImageUploader or useImageCropper |
| `src/bpa/components/media/ImageUploadCard.jsx` | BPA media | Optional later | product_gallery / generic | Not in critical owner/producer path |
| Profile/avatar (larkon-admin, etc.) | Avatar | Optional later | avatar | When wired to owner/producer profile |

## Out of scope (demo/child/forms)

- `src/components/child/*`, `src/larkon-admin/forms/*`, `app/admin/(larkon)/*`: demo or non-BPA panels; no change unless used in owner/producer flows.
- `app/owner/(larkon)/integrations/product-import/page.tsx`: CSV/Excel import, not image crop.

## Existing crop libs

- **react-easy-crop**: used by ImageCropperModal (dynamic import). Aspect, zoom, rotate, flip.
- **src/utils/cropImage.js**: getCroppedImg (rotation/flip); used by some flows. Cropper module uses its own cropUtils.
