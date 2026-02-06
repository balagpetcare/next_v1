"use client";

import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

/**
 * Shop Registration Page - Redirects to Central Auth
 * 
 * This page redirects to the central auth server for shop registration.
 * After successful registration, users are redirected back to /shop.
 * 
 * Query Parameters:
 * - ?returnTo=<url> - Custom return URL (must be same-origin or allowed localhost port)
 * - ?next=<path> - Relative path to redirect to after registration
 * 
 * @see lib/authRedirect.ts for URL building and security validation
 */
export default function ShopRegisterPage() {
  return (
    <AuthRedirectPage
      panelName="shop"
      action="register"
      defaultLandingPath="/shop"
    />
  );
}
