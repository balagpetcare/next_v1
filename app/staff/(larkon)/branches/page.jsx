"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * /staff/branches redirects to /staff/branch (branch selector).
 * Single source of truth: /staff/branch — avoids redirect loop with /staff → /staff/branches.
 */
export default function StaffBranchesRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Idempotent: only redirect if we're on /staff/branches (exact)
    if (pathname === "/staff/branches") {
      router.replace("/staff/branch");
    }
  }, [router, pathname]);
  return (
    <div className="container py-40 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Redirecting...</span>
      </div>
    </div>
  );
}
