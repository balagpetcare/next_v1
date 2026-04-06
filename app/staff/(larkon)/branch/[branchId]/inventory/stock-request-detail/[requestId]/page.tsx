import { notFound } from "next/navigation";
import StaffStockRequestDetailClient from "../../_components/StaffStockRequestDetailClient";

/**
 * Canonical staff stock request detail (flat segment — reliable under Next 16 / Turbopack).
 * Public URL: /staff/branch/[branchId]/inventory/stock-request-detail/[requestId]
 *
 * Legacy nested URL .../inventory/stock-requests/[id] redirects here (next.config redirects + proxy.ts).
 */
export default async function StaffStockRequestDetailPage({
  params,
}: {
  params: Promise<{ branchId: string; requestId: string }>;
}) {
  const p = await params;
  const raw = p?.requestId;
  if (raw == null || !/^\d+$/.test(String(raw))) {
    notFound();
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) {
    notFound();
  }
  return <StaffStockRequestDetailClient />;
}
