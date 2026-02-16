/**
 * Owner KYC types – international address + document model.
 * CHECKPOINT: Step A complete. Resume at Step B if disconnected.
 */

export type KycDocumentType = "NID" | "PASSPORT" | "DRIVING_LICENSE" | "TRADE_LICENSE";

export type KycDocumentSlot = "FRONT" | "BACK" | "SELFIE";

export interface InternationalAddress {
  countryCode: string;
  countryName: string;
  admin1?: { code?: string; name?: string };
  admin2?: { code?: string; name?: string };
  locality?: string;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  timezone?: string;
}

export interface KycDocumentFile {
  slot: KycDocumentSlot;
  fileKey: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
}

export interface KycDocument {
  type: KycDocumentType;
  files: KycDocumentFile[];
  issuedCountryCode?: string;
  issuedNumber?: string;
}

export interface KycConsent {
  accepted: boolean;
  timestamp: string;
}

export interface KycSubmitPayload {
  documents: KycDocument[];
  address: InternationalAddress;
  consent: KycConsent;
}

export type KycStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

export interface KycRecord {
  status: KycStatus;
  rejectionReason?: string;
  payload?: KycSubmitPayload;
  submittedAt?: string;
}
