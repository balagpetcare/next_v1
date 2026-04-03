"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import DoctorApprovalRequestDetailPage from "../../../doctors-approvals/_components/DoctorApprovalRequestDetailPage";

/**
 * Canonical staff URL: /staff/branch/[branchId]/clinic/doctors/approvals/[approvalId]
 * (filesystem route — avoids Turbopack/dev issues with beforeFiles rewrites to flat folders.)
 */
export default function StaffClinicDoctorApprovalDetailByApprovalIdPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const raw = params?.approvalId as string | undefined;
  const requestId = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : NaN;

  return <DoctorApprovalRequestDetailPage branchId={branchId} requestId={requestId} />;
}
