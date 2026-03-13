"use client";

export interface QuickActionBarProps {
  status: string;
  appointmentId: number | null;
  scheduledStartAt?: string | null;
  actioning: boolean;
  onCall: (id: number) => void;
  onStartConsult: (id: number) => void;
  onComplete: (id: number) => void;
  onConfirm?: (id: number) => void;
  onReschedule: (id: number, data: { scheduledStartAt: string; scheduledEndAt: string }) => void;
  onCancel: (id: number, reason: string) => void;
  onRefresh?: () => void;
}

export function QuickActionBar({
  status,
  appointmentId,
  scheduledStartAt,
  actioning,
  onCall,
  onStartConsult,
  onComplete,
  onConfirm,
  onReschedule,
  onCancel,
  onRefresh,
}: QuickActionBarProps) {
  if (!appointmentId) return null;

  const dateStr = scheduledStartAt ? new Date(scheduledStartAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const timeStart = scheduledStartAt ? new Date(scheduledStartAt).toTimeString().slice(0, 5) : "09:00";
  const timeEnd = scheduledStartAt ? new Date(scheduledStartAt).toTimeString().slice(0, 5) : "09:15";

  const handleReschedule = () => {
    const start = prompt("New start (HH:mm)", timeStart);
    const end = prompt("New end (HH:mm)", timeEnd);
    if (start != null && end != null) {
      onReschedule(appointmentId, {
        scheduledStartAt: `${dateStr}T${start}:00.000Z`,
        scheduledEndAt: `${dateStr}T${end}:00.000Z`,
      });
      onRefresh?.();
    }
  };

  const handleCancel = () => {
    if (confirm("Cancel this appointment?")) {
      onCancel(appointmentId, "Cancelled by doctor");
      onRefresh?.();
    }
  };

  return (
    <div className="d-flex flex-wrap gap-1 mb-2">
      {status === "BOOKED" && onConfirm && (
        <button
          type="button"
          className="btn btn-sm btn-success"
          disabled={actioning}
          onClick={() => onConfirm(appointmentId)}
        >
          Confirm
        </button>
      )}
      {["IN_QUEUE", "CHECKED_IN"].includes(status) && (
        <button
          type="button"
          className="btn btn-sm btn-info"
          disabled={actioning}
          onClick={() => onCall(appointmentId)}
        >
          Call Patient
        </button>
      )}
      {status === "CALLED" && (
        <button
          type="button"
          className="btn btn-sm btn-success"
          disabled={actioning}
          onClick={() => onStartConsult(appointmentId)}
        >
          Start Consultation
        </button>
      )}
      {status === "IN_CONSULT" && (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={actioning}
          onClick={() => onComplete(appointmentId)}
        >
          Complete Visit
        </button>
      )}
      {["BOOKED", "CONFIRMED"].includes(status) && (
        <>
          <button type="button" className="btn btn-sm btn-outline-warning" onClick={handleReschedule}>
            Reschedule
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" disabled={actioning} onClick={handleCancel}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
