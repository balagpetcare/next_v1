/**
 * Ready-to-use cropper presets. Edit as needed.
 */
import type { CropperConfig, CropperPreset } from "./types";

export const PRODUCT_PRIMARY: CropperConfig = {
  presetId: "product_primary",
  mode: "fixed",
  aspectRatio: 1,
  output: {
    format: "webp",
    quality: 0.9,
    maxWidth: 1200,
    maxHeight: 1200,
    generateThumbs: true,
  },
  constraints: {
    minWidth: 600,
    minHeight: 600,
    maxFileMB: 5,
    allowUpscale: false,
  },
  ui: {
    showGrid: true,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
  required: true,
};

export const PRODUCT_GALLERY: CropperConfig = {
  presetId: "product_gallery",
  mode: "free",
  aspectRatio: null,
  output: {
    format: "webp",
    quality: 0.88,
    maxWidth: 1200,
    maxHeight: 1200,
  },
  constraints: {
    minWidth: 600,
    minHeight: 600,
    maxFileMB: 5,
    allowUpscale: false,
  },
  ui: {
    showGrid: true,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const AVATAR: CropperConfig = {
  presetId: "avatar",
  mode: "fixed",
  aspectRatio: 1,
  output: {
    format: "webp",
    quality: 0.9,
    maxWidth: 512,
    maxHeight: 512,
  },
  constraints: {
    minWidth: 256,
    minHeight: 256,
    maxFileMB: 2,
    allowUpscale: false,
  },
  ui: {
    showGrid: false,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const BANNER: CropperConfig = {
  presetId: "banner",
  mode: "fixed",
  aspectRatio: 16 / 9,
  output: {
    format: "webp",
    quality: 0.88,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  constraints: {
    minWidth: 1200,
    minHeight: 675,
    maxFileMB: 5,
    allowUpscale: false,
  },
  ui: {
    showGrid: true,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const LOGO: CropperConfig = {
  presetId: "logo",
  mode: "free",
  aspectRatio: null,
  output: {
    format: "png",
    quality: 1,
    maxWidth: 800,
    maxHeight: 800,
  },
  constraints: {
    minWidth: 64,
    minHeight: 64,
    maxFileMB: 2,
    allowUpscale: false,
  },
  ui: {
    showGrid: false,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const DOCUMENT_SCAN: CropperConfig = {
  presetId: "document",
  mode: "free",
  aspectRatio: null,
  output: {
    format: "jpg",
    quality: 0.92,
    maxWidth: 1600,
    maxHeight: 1600,
  },
  constraints: {
    minWidth: 100,
    minHeight: 100,
    maxFileMB: 10,
    allowUpscale: false,
  },
  ui: {
    showGrid: false,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const GENERIC: CropperConfig = {
  presetId: "generic",
  mode: "free",
  aspectRatio: null,
  output: {
    format: "webp",
    quality: 0.9,
    maxWidth: 1600,
    maxHeight: 1600,
  },
  constraints: {
    minWidth: 1,
    minHeight: 1,
    maxFileMB: 10,
    allowUpscale: false,
  },
  ui: {
    showGrid: false,
    allowRotate: true,
    allowFlip: true,
    allowZoom: true,
  },
};

export const PRESETS: CropperPreset[] = [
  { ...PRODUCT_PRIMARY, id: "product_primary", label: "Product (1:1)" },
  { ...PRODUCT_GALLERY, id: "product_gallery", label: "Product gallery" },
  { ...AVATAR, id: "avatar", label: "Avatar" },
  { ...BANNER, id: "banner", label: "Banner (16:9)" },
  { ...LOGO, id: "logo", label: "Logo" },
  { ...DOCUMENT_SCAN, id: "document", label: "Document" },
  { ...GENERIC, id: "generic", label: "Free" },
];

export type UseCaseKey =
  | "product_primary"
  | "product_gallery"
  | "avatar"
  | "banner"
  | "logo"
  | "document"
  | "generic";

export function getCropperConfig(useCase: UseCaseKey): CropperConfig {
  switch (useCase) {
    case "product_primary":
      return { ...PRODUCT_PRIMARY };
    case "product_gallery":
      return { ...PRODUCT_GALLERY };
    case "avatar":
      return { ...AVATAR };
    case "banner":
      return { ...BANNER };
    case "logo":
      return { ...LOGO };
    case "document":
      return { ...DOCUMENT_SCAN };
    case "generic":
    default:
      return { ...GENERIC };
  }
}
