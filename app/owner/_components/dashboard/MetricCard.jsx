"use client";

export default function MetricCard({ label, value, sub, variant = "primary", icon, loading = false, onClick }) {
  const bgMap = {
    primary: "bg-primary-focus",
    success: "bg-success-focus",
    warning: "bg-warning-focus",
    danger: "bg-danger-focus",
    info: "bg-info-focus",
    secondary: "bg-secondary-focus",
  };
  const textMap = {
    primary: "text-primary-main",
    success: "text-success-main",
    warning: "text-warning-main",
    danger: "text-danger-main",
    info: "text-info-main",
    secondary: "text-secondary-main",
  };
  const bg = bgMap[variant] || "bg-primary-focus";
  const textCls = textMap[variant] || "text-primary-main";

  if (loading) {
    return (
      <div className={`card radius-12 ${bg}`}>
        <div className="card-body p-24">
          <div className="placeholder-glow">
            <span className="placeholder col-6 mb-2 d-block" />
            <span className="placeholder col-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card radius-12 ${bg} ${onClick ? "cursor-pointer" : ""}`} onClick={onClick} style={onClick ? { transition: "transform 0.2s" } : {}} onMouseEnter={onClick ? (e) => (e.currentTarget.style.transform = "translateY(-2px)") : null} onMouseLeave={onClick ? (e) => (e.currentTarget.style.transform = "translateY(0)") : null}>
      <div className="card-body p-24">
        <div className="d-flex align-items-start justify-content-between">
          <div className="flex-grow-1">
            <div className="text-muted small mb-1">{label}</div>
            <div className={`fw-bold fs-4 ${textCls}`}>{value}</div>
            {sub != null && sub !== "" && <div className="text-muted small mt-1">{sub}</div>}
          </div>
          {icon && <span className="opacity-75 ms-2">{icon}</span>}
        </div>
      </div>
    </div>
  );
}
