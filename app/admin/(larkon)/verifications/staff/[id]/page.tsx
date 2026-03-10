"use client";

import { useParams } from "next/navigation";
import VerificationDetailPage from "@/src/bpa/admin/components/verification-center/VerificationDetailPage";

export default function VerificationsStaffDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = Number(params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return <div className="alert alert-danger">Invalid verification ID.</div>;
  }
  return <VerificationDetailPage entityKey="staff" id={id} />;
}

