"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect /new → /stock-request-create. The form is served at /stock-request-create to avoid Next.js 404 on nested routes under [branchId].
 */
export default function NewStockRequestRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.branchId != null ? String(params.branchId) : "";

  useEffect(() => {
    if (!branchId) return;
    const search = searchParams.toString();
    const target = `/staff/branch/${branchId}/inventory/stock-request-create${search ? `?${search}` : ""}`;
    router.replace(target);
  }, [branchId, router, searchParams]);

  return (
    <div className="p-4 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2 text-muted small">Redirecting to new stock request…</p>
    </div>
  );
}
