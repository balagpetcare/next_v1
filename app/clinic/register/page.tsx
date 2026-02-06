"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Clinic Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for clinic registration.
 * After successful registration, users are redirected back to /clinic.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function ClinicRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="clinic"
      action="register"
      defaultLandingPath="/clinic"
    />
  );
}
