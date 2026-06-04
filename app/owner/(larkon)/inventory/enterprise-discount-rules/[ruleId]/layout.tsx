import { Suspense } from "react";

export default function EnterpriseDiscountRuleSegmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="dashboard-main-body">
          <p className="text-muted small mb-0">Loading…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
