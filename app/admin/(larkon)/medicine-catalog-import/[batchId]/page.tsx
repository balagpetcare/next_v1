import { redirect } from "next/navigation";

type Props = { params: Promise<{ batchId: string }> };

export default async function LegacyMedicineCatalogImportBatchRedirect({ params }: Props) {
  const { batchId } = await params;
  redirect(`/admin/medicine/imports/${batchId}`);
}
