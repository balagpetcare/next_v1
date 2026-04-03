"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import type { CropperConfig, CropParams, CropResult, OutputFormat } from "./types";

export type { CropperConfig, CropParams, CropResult, OutputFormat } from "./types";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToBlob(
  imageSrc: string,
  cropArea: Area,
  rotation: number,
  output: { format: "webp" | "jpg" | "png"; quality?: number; maxWidth?: number; maxHeight?: number }
): Promise<Blob | null> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotatedWidth = img.width * cos + img.height * sin;
  const rotatedHeight = img.width * sin + img.height * cos;

  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;
  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) return null;

  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const cropX = cropArea.x * scaleX;
  const cropY = cropArea.y * scaleY;
  const cropWidth = cropArea.width * scaleX;
  const cropHeight = cropArea.height * scaleY;

  const maxW = output.maxWidth || 1800;
  const maxH = output.maxHeight || 1800;
  const scale = Math.min(1, maxW / cropWidth, maxH / cropHeight);
  const finalWidth = Math.round(cropWidth * scale);
  const finalHeight = Math.round(cropHeight * scale);

  croppedCanvas.width = finalWidth;
  croppedCanvas.height = finalHeight;
  croppedCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    finalWidth,
    finalHeight
  );

  const mime = output.format === "jpg" ? "image/jpeg" : output.format === "png" ? "image/png" : "image/webp";
  const quality = output.format === "png" ? undefined : (output.quality ?? 0.92);

  return new Promise((resolve) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          croppedCanvas.toBlob(
            (fallbackBlob) => resolve(fallbackBlob),
            mime,
            Math.max(0.5, (quality ?? 0.92) - 0.2)
          );
        } else {
          resolve(blob);
        }
      },
      mime,
      quality
    );
  });
}

export interface ImageCropperModalProps {
  open: boolean;
  file: File | null;
  config: CropperConfig;
  onClose: () => void;
  onSave: (result: CropResult) => void;
}

export function ImageCropperModal({ open, file, config, onClose, onSave }: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const output = config.output;
  const aspectRatio = config.aspectRatio ?? undefined;
  const { allowRotate, allowZoom } = config.ui ?? {};


  useEffect(() => {
    if (!open || !file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setSaving(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels, rotation, output);
      if (!blob) throw new Error("Crop failed");

      // Debug: Log blob details
      console.log('Crop Debug - Blob created:', {
        type: blob.type,
        size: blob.size,
        isBlob: blob instanceof Blob,
        arrayBuffer: await blob.slice(0, 10).arrayBuffer().then(buf => new Uint8Array(buf)),
      });

      const width = Math.round(croppedAreaPixels.width);
      const height = Math.round(croppedAreaPixels.height);

      const cropParams: CropParams = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        rotation,
      };

      const fileOut = new File([blob], file?.name?.replace(/\.[^.]+$/, "") || "cropped", {
        type: blob.type,
      });

      // Debug: Log file details
      console.log('Crop Debug - File created:', {
        name: fileOut.name,
        type: fileOut.type,
        size: fileOut.size,
        lastModified: fileOut.lastModified,
      });

      const result: CropResult = {
        blob,
        file: fileOut,
        width,
        height,
        format: output.format as OutputFormat,
        size: blob.size,
        cropParams,
      };
      onSave(result);
      onClose();
    } catch (e) {
      console.error("Crop failed", e);
    } finally {
      setSaving(false);
    }
  }, [imageSrc, croppedAreaPixels, rotation, output, file, onSave, onClose]);

  if (!open) return null;

  return (
    <Modal show={open} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title>Crop Image</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div
            className="position-relative overflow-hidden bg-dark rounded"
            style={{ height: 400 }}
          >
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { height: 400 },
                }}
              />
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {allowZoom !== false && (
              <div style={{ minWidth: 200 }}>
                <label className="form-label small text-secondary mb-1">Zoom</label>
                <input
                  type="range"
                  className="form-range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
            )}
            {allowRotate !== false && (
              <Button variant="light" size="sm" onClick={handleRotate}>
                Rotate 90°
              </Button>
            )}
            <Button variant="light" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {croppedAreaPixels && (
            <div className="small text-secondary">
              Crop: {Math.round(croppedAreaPixels.width)}×{Math.round(croppedAreaPixels.height)}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
          {saving ? "Saving…" : "Confirm Crop"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
