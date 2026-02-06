"use client";

import { useRouter } from "next/navigation";
import Card from "@/src/bpa/components/ui/Card";

/**
 * AccessDenied – WowDash-style card for Branch Dashboard.
 * Shows title, short reason, Back + Select Branch buttons.
 * Optional: missing permission key.
 */
export default function AccessDenied({ title = "Access Denied", message, missingPerm, onBack }) {
  const router = useRouter();
  const defaultMessage =
    message ??
    "You don't have permission to view this page. Contact your manager if you need access.";
  const handleBack = () => (typeof onBack === "function" ? onBack() : router.push("/staff/branch"));

  return (
    <div className="container py-40">
      <Card>
        <div className="text-center py-40">
          <div className="mb-24">
            <i className="ri-lock-line text-danger" style={{ fontSize: "48px" }} aria-hidden />
          </div>
          <h5 className="mb-12">{title}</h5>
          <p className="text-secondary-light mb-16">{defaultMessage}</p>
          {missingPerm && (
            <p className="text-secondary-light text-sm mb-24">
              <span className="badge bg-secondary-100 text-secondary-600">{missingPerm}</span>
            </p>
          )}
          <div className="d-flex flex-wrap gap-12 justify-content-center">
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.back()}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={handleBack}>
              Select Branch
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
