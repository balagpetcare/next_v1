"use client";

/**
 * Stats cards component for displaying entity metrics
 */
export default function EntityStats({ stats = {}, className = "" }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const statItems = [
    { key: "total", label: "Total", icon: "ri-database-line", color: "primary" },
    { key: "verified", label: "Verified", icon: "ri-checkbox-circle-line", color: "success" },
    { key: "pending", label: "Pending", icon: "ri-time-line", color: "warning" },
    { key: "active", label: "Active", icon: "ri-check-line", color: "success" },
    { key: "inactive", label: "Inactive", icon: "ri-close-line", color: "danger" },
  ];

  const visibleStats = statItems.filter((item) => stats[item.key] !== undefined);

  if (visibleStats.length === 0) return null;

  return (
    <div className={`row g-3 ${className}`}>
      {visibleStats.map((item) => (
        <div key={item.key} className="col-md-4 col-lg-3">
          <div className="card radius-12 p-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0">{stats[item.key] || 0}</h6>
                <small className="text-muted">{item.label}</small>
              </div>
              <div className={`text-${item.color}-600`}>
                <i className={`${item.icon} fs-4`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
