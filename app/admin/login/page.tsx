"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Admin Login Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for admin login.
 * After successful authentication, users are redirected back to /admin.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after login
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function AdminLoginPage() {
  return (
    <AuthRedirectPage
      panelName="admin"
      action="login"
      defaultLandingPath="/admin"
    />
  );
}
