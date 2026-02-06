"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Owner Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for registration.
 * After successful registration, users are redirected back to /owner.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function OwnerRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="owner"
      action="register"
      defaultLandingPath="/owner"
    />
  );
}
