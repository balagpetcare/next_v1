"use client";

/**
 * Loading skeletons for Branch Overview (WowDash style).
 * KPI row + Today Board + Alerts + Activity placeholders.
 */
function SkeletonLine({ width = "100%", height = 14, className = "" }) {
  return (
    <div
      className={`bg-secondary-200 radius-4 ${className}`}
      style={{ width, height, maxWidth: "100%" }}
      aria-hidden
    />
  );
}

export default function BranchOverviewSkeleton() {
  return (
    <div className="container py-24">
      {/* Header skeleton */}
      <div className="mb-24">
        <SkeletonLine width="280px" height={24} className="mb-12" />
        <div className="d-flex gap-12">
          <SkeletonLine width={80} height={22} />
          <SkeletonLine width={70} height={22} />
        </div>
      </div>

      {/* KPI row */}
      <div className="row g-20 mb-24">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-6 col-md-3">
            <div className="card radius-12 h-100">
              <div className="card-body">
                <SkeletonLine width="60%" height={12} className="mb-12" />
                <SkeletonLine width="50%" height={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today Board + Alerts row */}
      <div className="row g-20 mb-24">
        <div className="col-md-6">
          <div className="card radius-12">
            <div className="card-header bg-transparent">
              <SkeletonLine width={120} height={16} />
            </div>
            <div className="card-body">
              <SkeletonLine width="100%" className="mb-12" />
              <SkeletonLine width="90%" className="mb-12" />
              <SkeletonLine width="70%" />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card radius-12">
            <div className="card-header bg-transparent">
              <SkeletonLine width={80} height={16} />
            </div>
            <div className="card-body">
              <SkeletonLine width="100%" className="mb-12" />
              <SkeletonLine width="85%" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="card radius-12">
        <div className="card-header bg-transparent">
          <SkeletonLine width={100} height={16} />
        </div>
        <div className="card-body">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="d-flex gap-12 mb-12">
              <SkeletonLine width={24} height={24} className="flex-shrink-0" />
              <div className="flex-grow-1">
                <SkeletonLine width="80%" className="mb-8" />
                <SkeletonLine width="40%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
