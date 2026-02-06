export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`card radius-12 ${className}`}>
      {(title || subtitle) ? (
        <div className="card-header bg-transparent">
          {title ? <h6 className="mb-0 fw-semibold">{title}</h6> : null}
          {subtitle ? <div className="text-secondary-light mt-1">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  );
}
