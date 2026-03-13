"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect /new → /supply-request-create. The form is served at /supply-request-create to avoid Next.js 404 on nested routes.
 */
export default function NewSupplyRequestRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.branchId as string | undefined;

  useEffect(() => {
    if (!branchId) return;
    const search = searchParams.toString();
    const target = `/staff/branch/${branchId}/clinic/supply-request-create${search ? `?${search}` : ""}`;
    router.replace(target);
  }, [branchId, router, searchParams]);

  return (
    <div className="p-4 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2 text-muted small">Redirecting to new supply request…</p>
    </div>
  );
}
