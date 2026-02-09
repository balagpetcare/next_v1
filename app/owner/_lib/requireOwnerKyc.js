import { redirect } from "next/navigation";
import { apiFetch } from "@/src/lib/apiFetch";
import { normalizeKycStatus, shouldForceKycPage } from "./ownerKycGuard";

/**
 * Optional server-side Owner KYC guard. Aligned with layout guard (ownerKycGuard.js).
 * Redirects to /owner/kyc only when NOT_SUBMITTED or REJECTED. PENDING/APPROVED allow access.
 */
export async function requireOwnerKyc() {
  try {
    const kyc = await apiFetch("/api/v1/owner/kyc");
    const data = kyc?.data ?? kyc;
    const apiStatus = String(data?.verificationStatus || "UNSUBMITTED").toUpperCase();
    const normalized = normalizeKycStatus(apiStatus);
    if (!shouldForceKycPage(normalized)) return;
    redirect("/owner/kyc");
  } catch {
    redirect("/owner/kyc");
  }
}
