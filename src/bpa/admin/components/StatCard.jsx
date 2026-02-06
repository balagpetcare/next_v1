export default function StatCard({ title, value, subtitle, icon, tone = "primary", href }) {
  const content = (
    <div className="card radius-12">
      <div className="card-body d-flex align-items-center justify-content-between">
        <div>
          <div className="text-secondary-light">{title}</div>
          <h6 className="mb-0 fw-semibold">{value ?? "—"}</h6>
          {subtitle ? <div className="text-secondary-light" style={{ fontSize: 12 }}>{subtitle}</div> : null}
        </div>
        {icon ? <div className={`icon-box bg-${tone}-50 text-${tone}-600 radius-12`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    );
  }

  return content;
}
