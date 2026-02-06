"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Staff Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for staff registration.
 * After successful registration, users are redirected back to /staff/branches.
 * 
 * Note: Staff accounts are typically created via invitation from owners/managers.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function StaffRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="staff"
      action="register"
      defaultLandingPath="/staff/branches"
    />
  );
}
