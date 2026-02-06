export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h6 className="fw-semibold mb-0">{title || "—"}</h6>
        {subtitle ? <div className="text-secondary-light mt-1">{subtitle}</div> : null}
      </div>
      {right ? <div className="d-flex align-items-center gap-2">{right}</div> : null}
    </div>
  );
}
