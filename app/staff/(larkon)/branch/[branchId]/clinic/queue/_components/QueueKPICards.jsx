"use client";

export default function QueueKPICards({ tickets }) {
  const waiting = tickets.filter((t) => t.status === "WAITING").length;
  const called = tickets.filter((t) => t.status === "CALLED").length;
  const inService = tickets.filter((t) => t.status === "IN_SERVICE").length;
  const completed = tickets.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;

  const cards = [
    { label: "Waiting", value: waiting, color: "info", icon: "⏱️" },
    { label: "Called", value: called, color: "warning", icon: "🔔" },
    { label: "In Service", value: inService, color: "primary", icon: "🩺" },
    { label: "Completed", value: completed, color: "success", icon: "✓" },
  ];

  return (
    <div className="row g-3 mb-4">
      {cards.map((card) => (
        <div key={card.label} className="col-6 col-md-3">
          <div className={`card border-${card.color} h-100`}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 small">{card.label}</p>
                  <h3 className={`mb-0 text-${card.color}`}>{card.value}</h3>
                </div>
                <div className="fs-1">{card.icon}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
