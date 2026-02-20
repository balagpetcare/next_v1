# Image Cropper System

Single reusable cropping system for all image uploads in the BPA/WPA Next.js (Larkon) app. Supports configurable presets per use-case, optional crop-before-upload, and SSR-safe usage.

## Layout

- **`src/media/cropper/`** – Cropper module (types, presets, modal, hook, crop util)
- **`src/media/uploader/`** – Unified `ImageUploader` that can run crop then upload
- **`src/services/mediaUpload.ts`** – Standardized `uploadMedia(file)` to `POST /api/v1/media/upload`
- **`src/media/cropper/upload-points.md`** – Map of pages/components and suggested configs

## How to use

### 1. Use the unified ImageUploader (recommended)

Use when you want: file select → optional crop → upload → callback with url/meta.

```tsx
import { ImageUploader } from "@/src/media/uploader";
import { notify } from "@/app/owner/_components/Notification";

<ImageUploader
  useCase="product_gallery"
  cropEnabled
  label="Add image"
  onUploaded={(url, meta) => {
    // e.g. add media to product: POST products/:id/media with meta.id
  }}
  onSuccess={(msg) => notify.success("Success", msg)}
  onError={(msg) => notify.error("Error", msg)}
/>
```

- **useCase**: `"product_primary"` | `"product_gallery"` | `"avatar"` | `"banner"` | `"logo"` | `"document"` | `"generic"`
- **cropEnabled**: if `true`, opens the cropper modal before upload (using the preset for `useCase`).
- **cropperConfig**: optional full config; overrides `useCase` when crop is enabled.
- **value** / **onChange**: for controlled list (single or multiple). Omit for “add only” (e.g. product gallery where list comes from API).

### 2. Use the cropper only (no upload)

When you already handle upload (e.g. upload blob then POST to another API):

```tsx
import { useImageCropper, getCropperConfig } from "@/src/media/cropper";

const { openCropper, CropperModal } = useImageCropper();

// When user selects a file:
const result = await openCropper(file, getCropperConfig("product_primary"));
if (result) {
  await yourUpload(result.blob);
  // result has: blob, file, width, height, format, size, cropParams
}

return (
  <>
    <input type="file" accept="image/*" onChange={...} />
    {CropperModal}
  </>
);
```

### 3. Upload helper only

```ts
import { uploadMedia } from "@/src/services/mediaUpload";

const { id, url } = await uploadMedia(fileOrBlob, "image.webp");
```

## Per–use-case config

`getCropperConfig(useCase)` returns:

| useCase           | Mode   | Aspect   | Notes                          |
|------------------|--------|----------|--------------------------------|
| product_primary   | fixed  | 1:1      | min 600×600, webp, required     |
| product_gallery  | free   | natural  | min 600×600, webp              |
| avatar           | fixed  | 1:1      | min 256×256                    |
| banner           | fixed  | 16:9     | min 1200×675                   |
| logo             | free   | natural  | png, transparent               |
| document         | free   | natural  | jpg, allow rotate              |
| generic          | free   | natural  | unlocked                       |

Product use-cases should enforce rules (e.g. block save if primary image missing or below min size); that logic stays in the page/form.

## Adding a new preset

1. **`src/media/cropper/config-presets.ts`**
   - Add a new config object (see `CropperConfig` in `types.ts`).
   - Add it to `PRESETS` and to `getCropperConfig(useCase)` (and extend `UseCaseKey` if you add a new key).

2. **`src/media/cropper/upload-points.md`**
   - Add the page/component and the suggested config.

3. Use the new preset via `useCase="your_new_key"` or by passing `cropperConfig={YOUR_PRESET}`.

## Examples

- **Product detail (owner) – add image to gallery**  
  `app/owner/(larkon)/products/[id]/page.tsx`: uses `ImageUploader` with `useCase="product_gallery"`, `onUploaded` POSTs to `products/:id/media` and reloads.

- **Avatar**  
  `useCase="avatar"`, `cropEnabled`, then upload and set profile image URL.

- **Banner / logo**  
  `useCase="banner"` or `useCase="logo"`, same pattern; banner is 16:9, logo is free aspect.

## Notifications

Use the project’s existing toast/notify (e.g. `notify.success`, `notify.error` from `@/app/owner/_components/Notification`). Pass `onSuccess` / `onError` into `ImageUploader` so messages are shown in one place.

## Rollout summary (integrated points)

| Panel / area | Integration |
|--------------|-------------|
| Owner product detail | `ImageUploader` product_gallery; primary enforced on submit/publish |
| Owner BranchForm | 6× `ImageUploader` (banner, banner, logo, document, banner, document); accept image/*,.pdf where needed |
| Owner org new/registration/edit | `uploadMedia` from `src/services/mediaUpload.ts` |
| Owner VerificationCasePanel | `useImageCropper` + document config; image → crop then uploadDoc |
| Producer KYC | `useImageCropper` + document config; image → crop then POST kyc/documents |
| Legacy branch ImageUploader.jsx | Uses shared `mediaUpload`; deprecated in favour of `@/src/media/uploader` |

## Checklist (verification)

- [x] Owner (3104) product detail: add image opens cropper (product_gallery), save uploads and adds to product; submit/publish blocked if no image.
- [x] Owner BranchForm: storefront/signboard/logo/trade license/inside/other use ImageUploader with per-field useCase; PDF accepted without crop.
- [x] Owner VerificationCasePanel: image files open cropper (document), then upload to verification-case/documents.
- [x] Producer (3105) KYC: image files open cropper (document), then upload to kyc/documents.
- [ ] Profile avatar: use `useCase="avatar"` when profile image upload is added.
- [x] Banner/logo: BranchForm uses `useCase="banner"` and `useCase="logo"`.
- [x] Product constraints: at least one image required before submit-for-approval and publish on product detail page.

## Crop engine (handle-based)

The cropper modal uses **Cropper.js** (via `react-cropper`) for true handle-based interaction:

- **Crop rectangle**: 8 resize handles (4 corners + 4 edges). Dragging corners changes width and height; dragging edges changes only width or height. Dragging inside the crop box moves it.
- **Aspect ratio**: From config — `aspectRatio: null` (or `NaN`) = freeform; `aspectRatio: number` = locked ratio.
- **Zoom**: Slider controls image zoom (Cropper.js `zoomTo`).
- **Rotate 90°**, **Flip H/V**: Applied via Cropper.js `rotate`, `scaleX`, `scaleY`.
- **Undo/Redo**: History of crop data (`getData`/`setData`).
- **Grid overlay**: Config `ui.showGrid` maps to Cropper.js `guides`.
- **SSR**: `react-cropper` is loaded with `next/dynamic` and Cropper.js CSS is imported when the modal opens.

## Constraints

- **SSR**: Cropper UI is loaded via `next/dynamic` and only on client; no direct top-level import of the cropper library in shared code.
- **Styling**: Cropper.js CSS is loaded when the modal opens; no global CSS that affects other components.
- **Reuse**: Cropper and uploader are loosely coupled; you can use cropper alone, uploader with another upload pipeline, or both together.
