"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Clinic Login Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for clinic login.
 * After successful authentication, users are redirected back to /clinic.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after login
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function ClinicLoginPage() {
  return (
    <AuthRedirectPage
      panelName="clinic"
      action="login"
      defaultLandingPath="/clinic"
    />
  );
}
