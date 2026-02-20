"use client";

import { useCallback, useRef, useState } from "react";
import { ImageCropperModal } from "./ImageCropperModal";
import type { CropperConfig, CropResult } from "./types";

export interface UseImageCropperReturn {
  openCropper: (file: File, config: CropperConfig) => Promise<CropResult | null>;
  CropperModal: React.ReactNode;
}

/**
 * Hook to open the cropper modal and get the result.
 * API: openCropper(file, config) -> Promise<CropResult | null>
 * Resolves with null if user cancels.
 */
export function useImageCropper(): UseImageCropperReturn {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState<CropperConfig | null>(null);
  const resolveRef = useRef<((value: CropResult | null) => void) | null>(null);

  const openCropper = useCallback((f: File, cfg: CropperConfig): Promise<CropResult | null> => {
    return new Promise((resolve) => {
      setFile(f);
      setConfig(cfg);
      resolveRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(null);
    resolveRef.current = null;
    setFile(null);
    setConfig(null);
  }, []);

  const handleSave = useCallback((result: CropResult) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOpen(false);
    setFile(null);
    setConfig(null);
  }, []);

  const CropperModal =
    config != null ? (
      <ImageCropperModal
        open={open}
        file={file}
        config={config}
        onClose={handleClose}
        onSave={handleSave}
      />
    ) : null;

  return { openCropper, CropperModal };
}
