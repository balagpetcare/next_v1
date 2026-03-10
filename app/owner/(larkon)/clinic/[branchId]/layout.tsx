import type { ReactNode } from "react";
import ClinicConsoleHeader from "@/app/owner/_components/clinic/ClinicConsoleHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

type ClinicBranchLayoutProps = {
  children: ReactNode;
  params: Promise<{ branchId: string }>;
};

export default async function ClinicBranchLayout({ children, params }: ClinicBranchLayoutProps) {
  const resolvedParams = await params;
  const branchId = String(resolvedParams?.branchId || "");

  return (
    <>
      <div className="dashboard-main-body pb-0">
        <ClinicConsoleHeader branchId={branchId} />
        <ClinicConsoleTabs branchId={branchId} />
      </div>
      {children}
    </>
  );
}

