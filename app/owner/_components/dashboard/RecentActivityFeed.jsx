"use client";

import Link from "next/link";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}

function getActivityIcon(type) {
  const iconMap = {
    order: "solar:cart-large-2-outline",
    stock: "solar:box-outline",
    verification: "solar:verified-check-outline",
    staff: "solar:user-id-outline",
    product: "solar:box-outline",
    payment: "solar:wallet-outline",
    default: "solar:notification-outline",
  };
  return iconMap[type?.toLowerCase()] || iconMap.default;
}

function getActivityColor(type) {
  const colorMap = {
    order: "text-primary",
    stock: "text-warning",
    verification: "text-success",
    staff: "text-info",
    product: "text-secondary",
    payment: "text-success",
    default: "text-muted",
  };
  return colorMap[type?.toLowerCase()] || colorMap.default;
}

export default function RecentActivityFeed({ activities = [], loading = false, limit = 10 }) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Recent Activity</h6>
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="d-flex align-items-start gap-3">
                <span className="placeholder rounded-circle" style={{ width: 40, height: 40 }} />
                <div className="flex-grow-1">
                  <span className="placeholder col-8 mb-2 d-block" />
                  <span className="placeholder col-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Recent Activity</h6>
          <div className="text-center text-secondary py-4">No recent activity</div>
        </div>
      </div>
    );
  }

  const sliced = activities.slice(0, limit);

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <h6 className="mb-3 fw-semibold">Recent Activity</h6>
        <div className="d-flex flex-column gap-3">
          {sliced.map((activity, index) => (
            <div key={activity.id || index} className="d-flex align-items-start gap-3">
              <div className={`flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center ${getActivityColor(activity.type)}`} style={{ width: 40, height: 40, backgroundColor: "var(--bs-gray-100)" }}>
                <i className={`${getActivityIcon(activity.type)} fs-5`} />
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold small">{activity.title || "Activity"}</div>
                    {activity.description && <div className="text-muted small mt-1">{activity.description}</div>}
                  </div>
                  <div className="text-muted small text-nowrap">{formatTimeAgo(activity.timestamp)}</div>
                </div>
                {activity.link && (
                  <Link href={activity.link} className="btn btn-link btn-sm p-0 mt-1">
                    View details →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
