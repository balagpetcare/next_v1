import { notFound } from "next/navigation";
import StaffStockRequestDetailClient from "../../_components/StaffStockRequestDetailClient";

/**
 * Staff stock request detail — canonical filesystem route (URL matches this path).
 * /staff/branch/[branchId]/inventory/stock-request-detail/[requestId]
 * Legacy .../inventory/stock-requests/:id and .../stock-request-detail-page/:id redirect here (next.config.js + proxy.ts).
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
