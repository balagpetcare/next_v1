/**
 * Standardized media upload to POST /api/v1/media/upload.
 * Reuse from any upload flow (cropper result, direct file).
 */

const getBase = (): string => {
  if (typeof window !== "undefined") return "";
  return String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
};

export interface MediaUploadResult {
  id: number;
  url: string;
}

/**
 * Upload a File or Blob to the media API.
 * @param file - File or Blob (e.g. cropped image)
 * @param fileName - Optional name for the blob (e.g. "image.webp")
 */
export async function uploadMedia(
  file: File | Blob,
  fileName?: string
): Promise<MediaUploadResult> {
  const blob = file instanceof Blob ? file : file;
  const name = fileName ?? (file instanceof File ? file.name : "image.webp");
  const fd = new FormData();
  fd.append("file", blob, name);

  const res = await fetch(`${getBase()}/api/v1/media/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) {
    throw new Error(j?.message ?? `Upload failed (${res.status})`);
  }

  const data = j?.data ?? j;
  return { id: data.id, url: data.url };
}
