import { redirect } from "next/navigation";
import { apiFetch } from "@/src/lib/apiFetch";

/**
 * Mandatory Owner KYC guard (server-side).
 * Redirects to /owner/kyc if KYC is missing or not submitted.
 */
export async function requireOwnerKyc() {
  try {
    const kyc = await apiFetch("/api/v1/owner/kyc");
    const status = String(kyc?.verificationStatus || "UNSUBMITTED").toUpperCase();
    const ok = status === "SUBMITTED" || status === "VERIFIED";
    const hasDocs = Array.isArray(kyc?.documents) ? kyc.documents.length > 0 : true;

    if (!ok || !hasDocs) {
      redirect("/owner/kyc");
    }
  } catch {
    // If API denies or not logged-in, the existing auth guard/pages will handle.
    // For safety, send user to KYC page.
    redirect("/owner/kyc");
  }
}
