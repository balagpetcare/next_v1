/**
 * Crop image to blob with rotation, flip, and output options.
 * Works with react-easy-crop's croppedAreaPixels (in rotated image bounding box).
 */
import type { OutputFormat } from "./types";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getRadianAngle(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

export interface CropToBlobOptions {
  format: OutputFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

/**
 * Draw full image rotated and flipped, then extract crop region (crop in rotated bbox coords).
 */
export async function cropImageToBlob(
  imageSrc: string,
  croppedAreaPixels: CropArea,
  options: CropToBlobOptions
): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await createImage(imageSrc);
  const {
    format,
    quality = 0.92,
    maxWidth,
    maxHeight,
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.naturalWidth, image.naturalHeight, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.drawImage(image, 0, 0);

  const sx = Math.max(0, Math.round(croppedAreaPixels.x));
  const sy = Math.max(0, Math.round(croppedAreaPixels.y));
  const sw = Math.round(croppedAreaPixels.width);
  const sh = Math.round(croppedAreaPixels.height);

  const data = ctx.getImageData(sx, sy, sw, sh);
  canvas.width = sw;
  canvas.height = sh;
  ctx.putImageData(data, 0, 0);

  let outW = sw;
  let outH = sh;
  if (maxWidth != null || maxHeight != null) {
    const maxW = maxWidth ?? outW;
    const maxH = maxHeight ?? outH;
    const scale = Math.min(1, maxW / outW, maxH / outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
    const scaleCanvas = document.createElement("canvas");
    scaleCanvas.width = outW;
    scaleCanvas.height = outH;
    const sctx = scaleCanvas.getContext("2d");
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, outW, outH);
      const mime = format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
      const q = format === "png" ? undefined : quality;
      const blob = await new Promise<Blob | null>((res) => scaleCanvas.toBlob(res, mime, q));
      if (!blob) throw new Error("toBlob failed");
      return { blob, width: outW, height: outH };
    }
  }

  const mime = format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
  const q = format === "png" ? undefined : quality;
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, q));
  if (!blob) throw new Error("toBlob failed");
  return { blob, width: outW, height: outH };
}
