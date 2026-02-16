/**
 * Owner KYC API – uses existing /api/v1/owner/kyc* endpoints.
 * CHECKPOINT: Step B complete. Resume at Step C if disconnected.
 */

import { ownerGet, ownerPost, ownerPut, ownerUpload } from "@/app/owner/_lib/ownerApi";
import type { KycDocumentSlot, KycDocumentType } from "../_types/kyc";

// Backend document types (OwnerKycDocument.type enum)
const BACKEND_DOC_TYPES = new Set([
  "NID_FRONT",
  "NID_BACK",
  "SELFIE_WITH_NID",
  "TRADE_LICENSE",
  "OTHER",
]);

/** Map our type+slot to backend document type. Backend uses NID_FRONT, NID_BACK, SELFIE_WITH_NID, TRADE_LICENSE, OTHER. */
export function toBackendDocType(type: KycDocumentType, slot: KycDocumentSlot): string {
  if (type === "NID" && slot === "FRONT") return "NID_FRONT";
  if (type === "NID" && slot === "BACK") return "NID_BACK";
  if (slot === "SELFIE") return "SELFIE_WITH_NID";
  if (type === "TRADE_LICENSE") return "TRADE_LICENSE";
  return "OTHER";
}

export interface GetOwnerKycResponse {
  success?: boolean;
  data?: {
    id: number;
    verificationStatus: string;
    fullName?: string | null;
    mobile?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    nationality?: string | null;
    nidNumber?: string | null;
    presentAddressJson?: Record<string, unknown> | null;
    declarationsJson?: Record<string, unknown> | null;
    rejectionReason?: string | null;
    reviewNote?: string | null;
    submittedAt?: string | null;
    documents?: Array<{
      id: number;
      type: string;
      status?: string | null;
      media?: { key?: string; mimeType?: string; size?: number } | null;
      url?: string;
    }>;
  };
}

/** Fetch existing KYC. GET /api/v1/owner/kyc */
export async function getOwnerKyc(): Promise<GetOwnerKycResponse["data"] | null> {
  const res = await ownerGet<GetOwnerKycResponse>("/api/v1/owner/kyc");
  return res?.data ?? null;
}

/** Save KYC draft. PUT /api/v1/owner/kyc */
export async function putOwnerKycDraft(payload: {
  fullName: string;
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
  nationality?: string;
  nidNumber?: string;
  presentAddressJson?: Record<string, unknown>;
  declarationsJson?: Record<string, unknown>;
}) {
  const res = await ownerPut<{ success?: boolean; data?: unknown }>("/api/v1/owner/kyc", payload);
  return res;
}

/**
 * Target submit payload format (e.g. for backend that accepts full body):
 * {
 *   NID_FRONT: "minio://kyc/owner/123/nid-front.jpg",
 *   NID_BACK: "minio://kyc/owner/123/nid-back.jpg",
 *   SELFIE_WITH_NID: "minio://kyc/owner/123/selfie.jpg",
 *   presentAddressJson: "{\"countryCode\":\"BD\",...}",
 *   declarationsJson: "{\"consentAccepted\":true,\"consentTimestamp\":\"...\",\"documentType\":\"NID\"}"
 * }
 * Current backend reads docs/address from DB; we send declarationsJson (object) for backward compat.
 */
export interface OwnerKycSubmitPayload {
  NID_FRONT?: string;
  NID_BACK?: string;
  SELFIE_WITH_NID?: string;
  presentAddressJson?: string | Record<string, unknown>;
  declarationsJson?: string | Record<string, unknown>;
}

/** Submit KYC for review. POST /api/v1/owner/kyc/submit */
export async function submitOwnerKyc(payload: OwnerKycSubmitPayload) {
  const res = await ownerPost<{ success?: boolean; data?: unknown }>(
    "/api/v1/owner/kyc/submit",
    payload
  );
  return res;
}

/** Upload a single KYC document. Uses existing POST /api/v1/owner/kyc/documents (multipart). */
export async function uploadKycFile(
  file: File,
  backendType: string
): Promise<{ fileKey: string; fileUrl?: string; mimeType?: string; size?: number }> {
  const fd = new FormData();
  fd.append("type", backendType);
  fd.append("file", file);

  const res = await ownerUpload<{
    success?: boolean;
    data?: {
      id: number;
      type: string;
      media?: { key?: string; mimeType?: string; size?: number } | null;
      url?: string;
    };
  }>("/api/v1/owner/kyc/documents", fd);

  const data = (res as { data?: typeof res })?.data ?? res;
  const media = (data as { media?: { key?: string; mimeType?: string; size?: number } })?.media;
  const key = media?.key ?? "";
  const base = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const fileUrl = key ? `${base}/api/v1/files/${encodeURIComponent(key)}` : undefined;

  return {
    fileKey: key,
    fileUrl,
    mimeType: media?.mimeType ?? file.type,
    size: media?.size ?? file.size,
  };
}
