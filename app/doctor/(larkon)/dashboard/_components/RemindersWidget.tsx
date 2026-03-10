"use client";

export function RemindersWidget({ reminders }: { reminders: any | null }) {
  const summary = reminders?.summary ?? {
    followUpToday: 0,
    followUpOverdue: 0,
    vaccinationDue: 0,
    labPending: 0,
    draftPrescriptions: 0,
  };

  return (
    <div className="card radius-12 h-100">
      <div className="card-header">
        <h6 className="mb-0">Smart Reminders</h6>
      </div>
      <div className="card-body">
        <div className="row g-2">
          <div className="col-6">
            <div className="border rounded-3 p-2 small">
              Follow-up Today: <strong>{summary.followUpToday}</strong>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded-3 p-2 small">
              Overdue: <strong>{summary.followUpOverdue}</strong>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded-3 p-2 small">
              Vaccination Due: <strong>{summary.vaccinationDue}</strong>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded-3 p-2 small">
              Lab Pending: <strong>{summary.labPending}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
