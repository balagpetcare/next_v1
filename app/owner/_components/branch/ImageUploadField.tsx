"use client";

import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

interface ImageUploadFieldProps {
  label?: string;
  valueUrl?: string;
  onUploadCroppedBlob: (blob: Blob) => void | Promise<void>;
  canDelete?: boolean;
  aspect?: number;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.95
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

export default function ImageUploadField({
  label = "Upload Image",
  valueUrl = "",
  onUploadCroppedBlob,
  canDelete = false,
  aspect = 1,
}: ImageUploadFieldProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
    });
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setUploading(true);
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onUploadCroppedBlob(blob);
      setShowCropper(false);
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Failed to process image");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setImageSrc("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove this image?")) {
      onUploadCroppedBlob(new Blob());
    }
  };

  if (showCropper) {
    return (
      <div className="mb-3">
        <div className="position-relative" style={{ width: "100%", height: 400, background: "#000" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="d-flex gap-2 mt-2">
          <button
            type="button"
            className="btn btn-primary btn-sm radius-12"
            onClick={handleCropSave}
            disabled={uploading}
          >
            {uploading ? "Processing..." : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-12"
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {label && <label className="form-label fw-semibold mb-2">{label}</label>}
      
      {valueUrl ? (
        <div className="position-relative border radius-12 overflow-hidden" style={{ width: 120, height: 120, cursor: "pointer" }}>
          <img
            src={valueUrl}
            alt={label}
            className="w-100 h-100"
            style={{ objectFit: "cover" }}
            onClick={() => fileInputRef.current?.click()}
          />
          {canDelete && (
            <button
              type="button"
              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 radius-12"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              title="Remove"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div
          className="border radius-12 p-3 text-center"
          style={{
            background: "#f8f9fa",
            borderStyle: "dashed",
            borderWidth: "2px",
            cursor: "pointer",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="ri-upload-cloud-2-line" style={{ fontSize: "32px", color: "#6c757d" }}></i>
          <div className="mt-2 fw-semibold">Click to upload {label}</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}
