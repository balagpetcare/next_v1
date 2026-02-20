/**
 * Reusable image cropper module – single source of truth for crop UI and config.
 */

export type {
  CropperConfig,
  CropperConstraints,
  CropperMode,
  CropperOutput,
  CropperPreset,
  CropperUI,
  CropParams,
  CropResult,
  OutputFormat,
} from "./types";

export {
  PRODUCT_PRIMARY,
  PRODUCT_GALLERY,
  AVATAR,
  BANNER,
  LOGO,
  DOCUMENT_SCAN,
  GENERIC,
  PRESETS,
  getCropperConfig,
} from "./config-presets";
export type { UseCaseKey } from "./config-presets";

export { ImageCropperModal } from "./ImageCropperModal";
export type { ImageCropperModalProps } from "./ImageCropperModal";

export { useImageCropper } from "./useImageCropper";
export type { UseImageCropperReturn } from "./useImageCropper";

export { cropImageToBlob } from "./cropUtils";
export type { CropArea, CropToBlobOptions } from "./cropUtils";
