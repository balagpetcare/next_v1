/**
 * Single source of truth for image cropper configuration.
 */

export type CropperMode = "free" | "fixed";

export type OutputFormat = "webp" | "jpg" | "png";

export interface CropperOutput {
  format: OutputFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Generate thumbnail sizes (e.g. for product thumbs) */
  generateThumbs?: boolean;
}

export interface CropperConstraints {
  minWidth?: number;
  minHeight?: number;
  maxFileMB?: number;
  allowUpscale?: boolean;
}

export interface CropperUI {
  showGrid?: boolean;
  allowRotate?: boolean;
  allowFlip?: boolean;
  allowZoom?: boolean;
}

export interface CropperPreset {
  id: string;
  label: string;
  mode: CropperMode;
  aspectRatio: number | null;
  output: CropperOutput;
  constraints: CropperConstraints;
  ui: CropperUI;
  /** For product primary image – block save if missing or below min size */
  required?: boolean;
}

export interface CropperConfig {
  mode: CropperMode;
  aspectRatio: number | null;
  output: CropperOutput;
  constraints: CropperConstraints;
  ui: CropperUI;
  required?: boolean;
  /** Optional preset id for display */
  presetId?: string;
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

export interface CropResult {
  blob: Blob;
  file?: File;
  width: number;
  height: number;
  format: OutputFormat;
  size: number;
  cropParams?: CropParams;
}
