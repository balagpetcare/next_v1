import StaffBatchLabelPrintClient from "@/app/_components/barcode/StaffBatchLabelPrintClient";

export default async function StaffPrintBatchLabelPage({
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
