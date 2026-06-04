"use client";

function statusBadge(status) {
  const map = {
    PENDING: "bg-warning text-dark",
    COMPLETED: "bg-success",
    DEFERRED: "bg-secondary",
    SKIPPED: "bg-secondary",
    IN_PROGRESS: "bg-info text-dark",
  };
  return map[status] || "bg-light text-dark";
}

export default function VaccinationHistory({ pets = [] }) {
  const completed = pets.filter((p) => p.vaccinationStatus === "COMPLETED");
  const pending = pets.filter((p) => p.vaccinationStatus === "PENDING");
  const other = pets.filter(
    (p) => !["COMPLETED", "PENDING"].includes(p.vaccinationStatus)
  );

  if (pets.length === 0) return null;

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body py-3">
        <h6 className="text-muted text-uppercase small mb-3">Vaccination history</h6>
        {completed.length > 0 ? (
          <>
            <div className="small fw-semibold text-success mb-2">Completed</div>
            {completed.map((pet) => (
              <div key={pet.id} className="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom">
                <div>
                  <div className="fw-semibold">{pet.name}</div>
                  {pet.certificateToken ? (
                    <div className="font-monospace text-muted" style={{ fontSize: "0.7rem" }}>
                      {pet.certificateToken}
                    </div>
                  ) : null}
                </div>
                <span className={`badge ${statusBadge(pet.vaccinationStatus)}`}>Done</span>
              </div>
            ))}
          </>
        ) : null}
        {pending.length > 0 ? (
          <>
            <div className="small fw-semibold text-warning mb-2 mt-2">Pending</div>
            {pending.map((pet) => (
              <div key={pet.id} className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold">{pet.name}</div>
                <span className={`badge ${statusBadge(pet.vaccinationStatus)}`}>Pending</span>
              </div>
            ))}
          </>
        ) : null}
        {other.map((pet) => (
          <div key={pet.id} className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">{pet.name}</div>
            <span className={`badge ${statusBadge(pet.vaccinationStatus)}`}>
              {String(pet.vaccinationStatus).replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
