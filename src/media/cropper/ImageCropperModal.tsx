"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import type { CropperConfig, CropParams, CropResult, OutputFormat } from "./types";
import { cropImageToBlob } from "./cropUtils";

export type { CropperConfig, CropParams, CropResult, OutputFormat } from "./types";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

/** Minimum output size (bytes) before we treat the crop as failed — avoids uploading empty/garbage buffers. */
const MIN_CROP_OUTPUT_BYTES = 64;

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
  const [cropError, setCropError] = useState<string | null>(null);

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
    setCropError(null);
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
    setCropError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setSaving(true);
    setCropError(null);
    try {
      const format = output.format as OutputFormat;
      const { blob, width, height } = await cropImageToBlob(imageSrc, croppedAreaPixels, {
        format,
        quality: output.quality ?? 0.92,
        maxWidth: output.maxWidth,
        maxHeight: output.maxHeight,
        rotation,
      });

      if (!blob || blob.size < MIN_CROP_OUTPUT_BYTES) {
        setCropError("Could not produce a valid image from this crop. Try adjusting zoom or rotation, or use another image.");
        return;
      }

      const mimeExpected =
        format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
      const mimeForFile = blob.type && blob.type.length > 0 ? blob.type : mimeExpected;
      const ext =
        mimeForFile === "image/png" ? ".png" : mimeForFile === "image/webp" ? ".webp" : ".jpg";
      const baseName = file?.name?.replace(/\.[^.]+$/, "") || "cropped";
      const fileOut = new File([blob], `${baseName}${ext}`, {
        type: mimeForFile,
      });

      const cropParams: CropParams = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        rotation,
      };

      const result: CropResult = {
        blob,
        file: fileOut,
        width,
        height,
        format,
        size: blob.size,
        cropParams,
      };
      onSave(result);
      onClose();
    } catch (e) {
      setCropError(
        e instanceof Error ? e.message : "Could not process this image. Please try another file."
      );
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
          {cropError ? (
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {cropError}
            </div>
          ) : null}
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
