"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Mother Login Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for mother panel login.
 * After successful authentication, users are redirected back to /mother.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after login
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function MotherLoginPage() {
  return (
    <AuthRedirectPage
      panelName="mother"
      action="login"
      defaultLandingPath="/mother"
    />
  );
}
