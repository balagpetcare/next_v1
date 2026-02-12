"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Mother Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for mother panel registration.
 * After successful registration, users are redirected back to /mother.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function MotherRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="mother"
      action="register"
      defaultLandingPath="/post-auth-landing"
    />
  );
}
