"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy stock request detail route — redirects to canonical route.
 * Old URL: .../inventory/stock-request-detail/[requestId]
 * New URL: .../inventory/stock-requests/[requestId]
 */
export default function LegacyStockRequestDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const branchId = params?.branchId;
    const requestId = params?.requestId;
    if (branchId && requestId) {
      // Redirect to canonical route
      router.replace(`/staff/branch/${branchId}/inventory/stock-requests/${requestId}`);
    }
  }, [params, router]);

  return (
    <div className="container py-40 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-16 text-secondary-light">Redirecting...</p>
    </div>
  );
}
