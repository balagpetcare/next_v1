"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // canvas export হলে crossOrigin লাগতে পারে (remote URL হলে)
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToBlob(imageSrc, cropAreaPx, opts) {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const sx = Math.round(cropAreaPx.x);
  const sy = Math.round(cropAreaPx.y);
  const sw = Math.round(cropAreaPx.width);
  const sh = Math.round(cropAreaPx.height);

  const mime = opts?.mime || "image/jpeg";
  const quality = typeof opts?.quality === "number" ? opts.quality : 0.92;

  // Output resize cap (optional)
  let dw = sw;
  let dh = sh;
  const maxW = opts?.maxWidth || 1800;
  const maxH = opts?.maxHeight || 1800;
  const scale = Math.min(1, maxW / dw, maxH / dh);
  dw = Math.round(dw * scale);
  dh = Math.round(dh * scale);

  canvas.width = dw;
  canvas.height = dh;

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export default function ImageUploadWithCrop({
  label = "Upload",
  disabled = false,

  // If you want to show existing preview in cropper (optional)
  existingImageUrl,

  // aspectRatio: number | null (null => FREE crop)
  aspectRatio = 1,

  showOriginalSize = true,

  // optional presets
  aspectPresets,

  // output options for cropped file
  output = { maxWidth: 1800, maxHeight: 1800, quality: 0.92, mime: "image/jpeg" },

  // callback(blob, meta)
  onImageCropped,
}) {
  const inputRef = useRef(null);

  const presets = useMemo(() => {
    return (
      aspectPresets || [
        { label: "Free", value: null },
        { label: "1:1", value: 1 },
        { label: "4:3", value: 4 / 3 },
        { label: "16:9", value: 16 / 9 },
      ]
    );
  }, [aspectPresets]);

  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(existingImageUrl || "");
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const [ratio, setRatio] = useState(aspectRatio ?? null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPx, setCroppedAreaPx] = useState(null);

  useEffect(() => {
    setRatio(aspectRatio ?? null);
  }, [aspectRatio]);

  useEffect(() => {
    if (existingImageUrl) setImageSrc(existingImageUrl);
  }, [existingImageUrl]);

  const readNaturalSize = (src) => {
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  };

  const onSelectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const src = URL.createObjectURL(file);
    setImageSrc(src);
    readNaturalSize(src);

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setOpen(true);
  };

  const onCropComplete = useCallback((_, croppedPx) => {
    setCroppedAreaPx(croppedPx);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPx) return;

    const blob = await cropToBlob(imageSrc, croppedAreaPx, output);
    onImageCropped?.(blob, {
      originalWidth: natural.w,
      originalHeight: natural.h,
      cropAreaPx: croppedAreaPx,
      ratio,
      zoom,
      rotation,
      croppedWidth: Math.round(croppedAreaPx.width),
      croppedHeight: Math.round(croppedAreaPx.height),
    });

    setOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);

  return (
    <div>
      <div className="d-flex gap-10 flex-wrap align-items-center">
        <button
          type="button"
          className="btn btn-light btn-sm radius-12"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={disabled}
          onChange={onSelectFile}
        />

        {showOriginalSize && natural.w > 0 ? (
          <span className="text-xs text-secondary-light">
            Original: <b>{natural.w}×{natural.h}</b>
          </span>
        ) : null}
      </div>

      {open ? (
        <div className="border radius-16 p-12 mt-12">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-10 mb-10">
            <div>
              <div className="fw-semibold">Crop & Adjust</div>
              {natural.w > 0 ? (
                <div className="text-xs text-secondary-light mt-4">
                  Original: <b>{natural.w}×{natural.h}</b>
                </div>
              ) : null}
            </div>

            <div className="d-flex gap-8 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`btn btn-sm radius-12 ${ratio === p.value ? "btn-primary" : "btn-light"}`}
                  onClick={() => setRatio(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="position-relative border radius-12 overflow-hidden bg-light" style={{ height: 340 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={ratio || undefined} // ✅ null => free
              onCropChange={setCrop}
              onZoomChange={(z) => setZoom(clamp(z, 1, 5))}
              onRotationChange={(r) => setRotation(clamp(r, 0, 360))}
              onCropComplete={onCropComplete}
              restrictPosition={false}
            />
          </div>

          <div className="mt-12">
            <div className="d-flex align-items-center justify-content-between gap-12 flex-wrap">
              <div style={{ minWidth: 220 }}>
                <div className="text-xs text-secondary-light mb-6">Zoom</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="form-range"
                />
              </div>

              <div style={{ minWidth: 220 }}>
                <div className="text-xs text-secondary-light mb-6">Rotate</div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="form-range"
                />
              </div>

              <div className="d-flex gap-10 flex-wrap">
                <button type="button" className="btn btn-light btn-sm radius-12" onClick={handleRotateLeft}>
                  Rotate -90°
                </button>
                <button type="button" className="btn btn-light btn-sm radius-12" onClick={handleRotateRight}>
                  Rotate +90°
                </button>

                <button type="button" className="btn btn-light radius-12" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary radius-12" onClick={handleSave}>
                  Save Crop
                </button>
              </div>
            </div>

            {croppedAreaPx ? (
              <div className="text-xs text-secondary-light mt-10">
                Crop: <b>{Math.round(croppedAreaPx.width)}×{Math.round(croppedAreaPx.height)}</b>
                {ratio ? (
                  <span className="ms-2">Ratio: <b>{ratio.toFixed(2)}</b></span>
                ) : (
                  <span className="ms-2">Ratio: <b>Free</b></span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
