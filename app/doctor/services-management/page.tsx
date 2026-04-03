import { redirect } from "next/navigation";

/**
 * Legacy standalone doctor services page (disconnected from v1 API).
 * Canonical: Larkon **Service fees & pricing** at `/doctor/service-fees`.
 */
export default function LegacyDoctorServicesManagementRedirect() {
  redirect("/doctor/service-fees");
}
