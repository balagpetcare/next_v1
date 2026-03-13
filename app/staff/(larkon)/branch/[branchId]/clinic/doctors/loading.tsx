import { PageWorkspace, LoadingState } from "@/src/components/dashboard";

export default function DoctorsLoading() {
  return (
    <PageWorkspace>
      <LoadingState message="Loading…" />
    </PageWorkspace>
  );
}
