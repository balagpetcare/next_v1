"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import dynamic from "next/dynamic";
import type { CropperConfig, CropResult, CropParams, OutputFormat } from "./types";

const ReactCropper = dynamic(
  () => import("react-cropper").then((m) => m.default),
  { ssr: false }
);

type CropperData = { x: number; y: number; width: number; height: number; rotate: number; scaleX: number; scaleY: number };
type HistoryEntry = CropperData;

const MAX_HISTORY = 20;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const MAX_READY_FRAMES = 10;

type CropperInstance = import("cropperjs").default;

function isCanvasReady(cropper: CropperInstance | null): boolean {
  if (!cropper?.getCanvasData) return false;
  try {
    const d = cropper.getCanvasData();
    return d != null && typeof (d as { width?: number }).width === "number" && typeof (d as { height?: number }).height === "number";
  } catch {
    return false;
  }
}

function applyTransforms(
  cropper: CropperInstance,
  zoom: number,
  flipH: boolean,
  flipV: boolean,
  onReady: (data: { width: number; height: number }) => void
): void {
  let frameCount = 0;
  function tryApply() {
    if (!isCanvasReady(cropper)) {
      if (frameCount < MAX_READY_FRAMES) {
        frameCount += 1;
        requestAnimationFrame(tryApply);
      }
      return;
    }
    try {
      if (zoom !== 1) cropper.zoomTo(zoom);
      cropper.scaleX(flipH ? -1 : 1);
      cropper.scaleY(flipV ? -1 : 1);
      const d = cropper.getData(true);
      onReady({ width: d.width, height: d.height });
    } catch {
      if (frameCount < MAX_READY_FRAMES) {
        frameCount += 1;
        requestAnimationFrame(tryApply);
      }
    }
  }
  requestAnimationFrame(tryApply);
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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropBoxData, setCropBoxData] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const cropperRef = useRef<HTMLImageElement & { cropper?: CropperInstance } | null>(null);
  const cropperReadyRef = useRef(false);
  const output = config.output;
  const aspectRatio = config.aspectRatio ?? NaN;
  const { showGrid, allowRotate, allowFlip, allowZoom } = config.ui ?? {};

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      import("./cropper.css");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !file) {
      setImageSrc(null);
      cropperReadyRef.current = false;
      return;
    }
    cropperReadyRef.current = false;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCropBoxData(null);
    setHistory([]);
    setHistoryIndex(-1);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const getCropper = useCallback(() => cropperRef.current?.cropper ?? null, []);

  const pushHistory = useCallback(() => {
    const cropper = getCropper();
    if (!cropper || !isCanvasReady(cropper)) return;
    try {
      const data = cropper.getData(true);
      const entry: HistoryEntry = { x: data.x, y: data.y, width: data.width, height: data.height, rotate: data.rotate, scaleX: data.scaleX, scaleY: data.scaleY };
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(entry);
        if (next.length > MAX_HISTORY) next.shift();
        else setHistoryIndex(next.length - 1);
        return next;
      });
    } catch {
      /* ignore when canvas not ready */
    }
  }, [getCropper, historyIndex]);

  const handleCropEnd = useCallback(() => {
    const cropper = getCropper();
    if (!cropper || !isCanvasReady(cropper)) return;
    try {
      const data = cropper.getData(true);
      setCropBoxData({ width: data.width, height: data.height });
    } catch {
      /* ignore when canvas not ready */
    }
  }, [getCropper]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const e = history[idx];
    const cropper = getCropper();
    if (e && cropper && isCanvasReady(cropper)) {
      try {
        cropper.setData(e);
        setHistoryIndex(idx);
        setCropBoxData({ width: e.width, height: e.height });
      } catch {
        /* ignore */
      }
    }
  }, [history, historyIndex, getCropper]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    const e = history[idx];
    const cropper = getCropper();
    if (e && cropper && isCanvasReady(cropper)) {
      try {
        cropper.setData(e);
        setHistoryIndex(idx);
        setCropBoxData({ width: e.width, height: e.height });
      } catch {
        /* ignore */
      }
    }
  }, [history, historyIndex, getCropper]);

  const handleReset = useCallback(() => {
    pushHistory();
    const cropper = getCropper();
    if (cropper && isCanvasReady(cropper)) {
      try {
        cropper.reset();
        cropper.scaleX(1);
        cropper.scaleY(1);
      } catch {
        /* ignore */
      }
    }
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
  }, [getCropper, pushHistory]);

  const handleRotate90 = useCallback(() => {
    pushHistory();
    const cropper = getCropper();
    if (cropper && isCanvasReady(cropper)) {
      try {
        cropper.rotate(90);
      } catch {
        /* ignore */
      }
    }
    setRotation((r) => (r + 90) % 360);
  }, [getCropper, pushHistory]);

  const handleFlipH = useCallback(() => {
    pushHistory();
    setFlipH((h) => !h);
    const cropper = getCropper();
    if (cropper && isCanvasReady(cropper)) {
      try {
        cropper.scaleX(flipH ? 1 : -1);
      } catch {
        /* ignore */
      }
    }
  }, [getCropper, pushHistory, flipH]);

  const handleFlipV = useCallback(() => {
    pushHistory();
    setFlipV((v) => !v);
    const cropper = getCropper();
    if (cropper && isCanvasReady(cropper)) {
      try {
        cropper.scaleY(flipV ? 1 : -1);
      } catch {
        /* ignore */
      }
    }
  }, [getCropper, pushHistory, flipV]);

  useEffect(() => {
    const cropper = getCropper();
    if (!cropper || !isCanvasReady(cropper)) return;
    try {
      cropper.zoomTo(zoom);
    } catch {
      /* ignore until ready */
    }
  }, [zoom, getCropper]);

  const handleSave = useCallback(async () => {
    const cropper = getCropper();
    if (!imageSrc || !cropper) return;
    if (!isCanvasReady(cropper)) {
      console.warn("Cropper canvas not ready yet");
      return;
    }

    setSaving(true);
    try {
      const data = cropper.getData(true);
      const canvas = cropper.getCroppedCanvas({
        maxWidth: output.maxWidth,
        maxHeight: output.maxHeight,
        imageSmoothingQuality: "high",
      });
      if (!canvas) throw new Error("getCroppedCanvas failed");

      const mime = output.format === "jpg" ? "image/jpeg" : output.format === "png" ? "image/png" : "image/webp";
      const quality = output.format === "png" ? undefined : (output.quality ?? 0.92);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality));
      if (!blob) throw new Error("toBlob failed");

      const width = Math.round(canvas.width);
      const height = Math.round(canvas.height);

      const cropParams: CropParams = {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        rotation: data.rotate,
        flipHorizontal: data.scaleX < 0,
        flipVertical: data.scaleY < 0,
      };

      const fileOut = new File([blob], file?.name?.replace(/\.[^.]+$/, "") || "cropped", {
        type: blob.type,
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
  }, [imageSrc, getCropper, output, file, onSave, onClose]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  if (!open) return null;

  const cropperAspectRatio = Number.isNaN(aspectRatio) ? NaN : aspectRatio;

  return (
    <Modal show={open} onHide={onClose} size="lg" centered className="radius-16">
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title>Crop image</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div
            className="position-relative overflow-hidden bg-dark rounded"
            style={{ height: 400 }}
          >
            {imageSrc && (
              <ReactCropper
                ref={cropperRef}
                src={imageSrc}
                style={{ height: 400, width: "100%" }}
                aspectRatio={cropperAspectRatio}
                dragMode="crop"
                guides={showGrid ?? true}
                center={true}
                highlight={true}
                autoCropArea={1}
                cropBoxMovable={true}
                cropBoxResizable={true}
                movable={true}
                rotatable={true}
                scalable={true}
                zoomable={true}
                zoomOnWheel={false}
                zoomOnTouch={false}
                toggleDragModeOnDblclick={false}
                cropend={handleCropEnd}
                crop={handleCropEnd}
                onInitialized={(instance) => {
                  applyTransforms(instance, zoom, flipH, flipV, (data) => {
                    setCropBoxData(data);
                    cropperReadyRef.current = true;
                  });
                }}
              />
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {allowZoom !== false && (
              <div style={{ minWidth: 160 }}>
                <label className="form-label small text-secondary mb-0">Zoom</label>
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
              <Button variant="light" size="sm" className="radius-12" onClick={handleRotate90}>
                Rotate 90°
              </Button>
            )}
            {allowFlip !== false && (
              <>
                <Button variant="light" size="sm" className="radius-12" onClick={handleFlipH}>
                  Flip H
                </Button>
                <Button variant="light" size="sm" className="radius-12" onClick={handleFlipV}>
                  Flip V
                </Button>
              </>
            )}
            <Button variant="light" size="sm" className="radius-12" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="light" size="sm" className="radius-12" disabled={!canUndo} onClick={handleUndo}>
              Undo
            </Button>
            <Button variant="light" size="sm" className="radius-12" disabled={!canRedo} onClick={handleRedo}>
              Redo
            </Button>
          </div>

          {cropBoxData && (
            <div className="small text-secondary">
              Crop: {Math.round(cropBoxData.width)}×{Math.round(cropBoxData.height)}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" className="radius-12" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" className="radius-12" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save crop"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
