"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Doctor Login Page - Redirects to Central Auth
 *
 * After successful authentication, users with doctor panel access are redirected to /doctor/dashboard.
 */
export default function DoctorLoginPage() {
  return (
    <AuthRedirectPage
      panelName="doctor"
      action="login"
      defaultLandingPath="/doctor/dashboard"
    />
  );
}
