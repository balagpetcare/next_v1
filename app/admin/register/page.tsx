"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Admin Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for admin registration.
 * After successful registration, users are redirected back to /admin.
 * 
 * Note: Admin registration typically requires additional verification
 * and is handled by the central auth server.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function AdminRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="admin"
      action="register"
      defaultLandingPath="/admin"
    />
  );
}
