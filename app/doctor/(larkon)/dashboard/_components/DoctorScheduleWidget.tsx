"use client";

type ScheduleItem = {
  id?: number;
  branchId?: number;
  branchName?: string;
  startTime?: string;
  endTime?: string;
  roomTypeRequired?: string | null;
};

type LeaveItem = {
  id: number;
  date: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
  branch?: { id: number; name: string };
};

export function DoctorScheduleWidget({
  schedule,
  currentShift,
  upcomingLeaves,
}: {
  schedule: ScheduleItem[];
  currentShift?: { startTime: string; endTime: string; clinic: string } | null;
  upcomingLeaves?: LeaveItem[];
}) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Today's Schedule</h6>
        {currentShift ? (
          <span className="badge bg-success">
            On Shift: {currentShift.startTime}-{currentShift.endTime}
          </span>
        ) : (
          <span className="badge bg-secondary">No active shift</span>
        )}
      </div>
      <div className="card-body">
        {schedule.length === 0 ? (
          <p className="text-muted small mb-0">No schedule blocks for today.</p>
        ) : (
          <ul className="list-group list-group-flush mb-3">
            {schedule.map((row, idx) => (
              <li key={row.id ?? `${row.branchId}-${idx}`} className="list-group-item px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{row.branchName ?? "Clinic"}</div>
                    <div className="small text-muted">
                      {row.startTime} - {row.endTime}
                      {row.roomTypeRequired ? ` • ${row.roomTypeRequired}` : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h6 className="small text-muted mb-2">Upcoming Leave / Exceptions</h6>
        {upcomingLeaves && upcomingLeaves.length > 0 ? (
          <ul className="list-group list-group-flush">
            {upcomingLeaves.slice(0, 4).map((item) => (
              <li key={item.id} className="list-group-item px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="small">
                    {item.branch?.name ?? "Clinic"} - {new Date(item.date).toLocaleDateString()}
                  </span>
                  <span className="badge bg-light text-dark">{item.type}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small text-muted mb-0">No upcoming exceptions.</p>
        )}
      </div>
    </div>
  );
}
