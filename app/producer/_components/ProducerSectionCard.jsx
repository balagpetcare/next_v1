"use client";

export default function ProducerSectionCard({ title, right, className = "", children }) {
  const cardClass = "card radius-12 " + (className || "");
  return (
    <div className={cardClass}>
      {(title != null || right) && (
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between flex-wrap gap-2">
          {title != null ? <h6 className="mb-0 fw-semibold">{title}</h6> : <span />}
          {right ? <div>{right}</div> : null}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
