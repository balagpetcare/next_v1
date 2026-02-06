"use client";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";

export default function ImageUploadCard({ label, imageUrl, onUpload, onDelete, aspect = 4 / 3 }) {
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setOpen(true);
  };

  const handleSave = useCallback(async () => {
    await onUpload(file);
    setOpen(false);
    setFile(null);
  }, [file, onUpload]);

  return (
    <div className="card radius-12 p-16">
      <div className="fw-semibold mb-8">{label}</div>
      {imageUrl ? (
        <img src={imageUrl} className="w-100 radius-8 mb-8" />
      ) : (
        <div className="bg-gray-100 p-24 text-center radius-8 mb-8">No image</div>
      )}
      <div className="d-flex gap-8">
        <label className="btn btn-primary btn-sm">
          {imageUrl ? "Replace" : "Upload"}
          <input type="file" hidden accept="image/*" onChange={handleFile} />
        </label>
        {imageUrl && (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
      {open && (
        <div className="crop-modal">
          <Cropper
            image={URL.createObjectURL(file)}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
          />
          <button className="btn btn-success mt-8" onClick={handleSave}>Save</button>
        </div>
      )}
    </div>
  );
}