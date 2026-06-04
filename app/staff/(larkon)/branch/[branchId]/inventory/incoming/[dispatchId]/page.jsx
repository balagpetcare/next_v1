"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { staffDispatchReceiveWorkspacePath } from "@/lib/staffInventoryRoutes";

/**
 * Legacy URL: incoming/[dispatchId] → canonical receive workspace.
 */
export default function IncomingDispatchIdRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const dispatchId = useMemo(() => String(params?.dispatchId ?? ""), [params]);

  useEffect(() => {
    if (!branchId || !dispatchId) return;
    router.replace(staffDispatchReceiveWorkspacePath(branchId, dispatchId, { from: "incoming" }));
  }, [branchId, dispatchId, router]);

  return (
    <div className="container py-40 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-16 text-secondary-light small">Opening receive workspace…</p>
    </div>
  );
}
