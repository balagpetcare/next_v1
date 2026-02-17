"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /staff/branches redirects to Staff Home /staff (source of truth).
 */
export default function StaffBranchesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff");
  }, [router]);
  return (
    <div className="container py-40 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Redirecting...</span>
      </div>
    </div>
  );
}
