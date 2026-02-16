"use client";

import { Suspense } from "react";
import OwnerKycClientPage from "./_components/OwnerKycClientPage";

export default function OwnerKycPage() {
  return (
    <Suspense
      fallback={
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center py-5">
            <span className="spinner-border text-primary" role="status" />
          </div>
        </div>
      }
    >
      <OwnerKycClientPage />
    </Suspense>
  );
}
