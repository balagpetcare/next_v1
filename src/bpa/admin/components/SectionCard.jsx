export default function SectionCard({ title, right, children, className = "" }) {
  return (
    <div className={`card radius-12 ${className}`}>
      {title ? (
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h6 className="mb-0 fw-semibold">{title}</h6>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  );
}
