"use client";

type Item = { key: string; label: string; done: boolean };

type Props = {
  items: Item[];
  className?: string;
};

export default function DoctorReadinessChecklist({ items, className = "" }: Props) {
  return (
    <div className={`card radius-12 ${className}`}>
      <div className="card-body">
        <h6 className="mb-3">Operational readiness</h6>
        <ul className="list-unstyled mb-0">
          {items.map((item) => (
            <li key={item.key} className="d-flex align-items-center gap-2 mb-2">
              <i
                className={item.done ? "ri-checkbox-circle-fill text-success" : "ri-checkbox-blank-circle-line text-muted"}
                aria-hidden
              />
              <span className={item.done ? "" : "text-muted"}>{item.label}</span>
            </li>
          ))}
        </ul>
        {items.every((i) => i.done) && (
          <p className="mt-3 mb-0 small text-success fw-semibold">Ready for booking</p>
        )}
      </div>
    </div>
  );
}
