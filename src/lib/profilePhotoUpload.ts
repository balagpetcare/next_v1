/** Must match backend `profilePhotoUpload.config.ts` (8 MB, JPG/PNG/WEBP). */
export const PROFILE_PHOTO_MAX_MB = 8;
export const PROFILE_PHOTO_MAX_BYTES = PROFILE_PHOTO_MAX_MB * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isClientAllowedProfilePhotoType(file: File): boolean {
  return ALLOWED.has(String(file.type || "").toLowerCase());
}
