import { notFound } from "next/navigation";
import StaffStockRequestDetailClient from "../../_components/StaffStockRequestDetailClient";

/**
 * Nested detail route — kept for backward compatibility.
 * Prefer linking to .../inventory/stock-request-detail/[id] (see staffInventoryRoutes).
 * Requests to .../stock-requests/[id] are redirected to stock-request-detail by next.config + proxy.
 */
export default async function StaffStockRequestDetailPageNested({
  params,
}: {
  params: Promise<{ branchId: string; id: string }>;
}) {
  const p = await params;
  const raw = p?.id;
  if (raw == null || !/^\d+$/.test(String(raw))) {
    notFound();
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) {
    notFound();
  }
  return <StaffStockRequestDetailClient />;
}
