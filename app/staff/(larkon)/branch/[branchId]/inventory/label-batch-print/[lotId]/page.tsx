import StaffBatchLabelPrintClient from "@/app/_components/barcode/StaffBatchLabelPrintClient";

/**
 * Physical route for Next/Turbopack nested dynamic stability.
 *
 * Public URL stays:
 * /staff/branch/[branchId]/inventory/labels/batch/[lotId]/print
 */
export default async function StaffFlatBatchLabelPrintPage({
  params,
}: {
  params: Promise<{ branchId?: string; lotId?: string }> | { branchId?: string; lotId?: string };
}) {
  const p = await params;
  return (
    <StaffBatchLabelPrintClient
      branchId={String(p?.branchId ?? "")}
      lotId={String(p?.lotId ?? "")}
    />
  );
}
