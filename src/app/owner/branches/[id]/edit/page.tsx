import { getBranch } from "@/src/lib/mockBranches";
import EditBranchClient from "@/src/components/EditBranchClient";

export default async function EditBranchPage({ params }: { params: { id: string } }) {
  const b = await getBranch(params.id);
  return <EditBranchClient id={params.id} initial={b} />;
}
