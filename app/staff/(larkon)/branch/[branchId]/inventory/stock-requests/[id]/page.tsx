import { notFound } from "next/navigation";
import StaffStockRequestDetailClient from "../../_components/StaffStockRequestDetailClient";

/**
 * Nested detail route — fallback if redirects are bypassed; prefer canonical URL (see staffInventoryRoutes).
 * Normal requests to .../stock-requests/[id] are redirected to .../stock-request-detail/[id] (next.config + proxy.ts).
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
