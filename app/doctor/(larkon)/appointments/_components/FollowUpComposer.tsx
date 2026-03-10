"use client";

import { useState } from "react";

const QUICK_DAYS = [
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "1 month", days: 30 },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface FollowUpComposerProps {
  appointmentId: number | null;
  onFollowUp: (payload: { followUpDate: string; followUpNotes?: string; createAppointment?: boolean }) => void;
  onRefresh?: () => void;
  disabled?: boolean;
}

export function FollowUpComposer({
  appointmentId,
  onFollowUp,
  onRefresh,
  disabled = false,
}: FollowUpComposerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [createAppointment, setCreateAppointment] = useState(false);

  const handleSubmit = () => {
    if (!appointmentId || !followUpDate) return;
    onFollowUp({
      followUpDate,
      followUpNotes: followUpNotes || undefined,
      createAppointment,
    });
    setFollowUpDate("");
    setFollowUpNotes("");
    onRefresh?.();
  };

  return (
    <div className="mb-3">
      <h6 className="text-secondary border-bottom pb-1 mb-2">Set Follow-up</h6>
      <div className="d-flex flex-wrap gap-1 mb-2">
        {QUICK_DAYS.map(({ label, days }) => (
          <button
            key={label}
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setFollowUpDate(addDays(today, days))}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="date"
        className="form-control form-control-sm mb-1"
        value={followUpDate}
        onChange={(e) => setFollowUpDate(e.target.value)}
        min={today}
        disabled={disabled}
      />
      <input
        type="text"
        className="form-control form-control-sm mb-1"
        value={followUpNotes}
        onChange={(e) => setFollowUpNotes(e.target.value)}
        placeholder="Reason: medication review, wound check, test report..."
        disabled={disabled}
      />
      <div className="form-check form-check-inline mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="followup-create-appt"
          checked={createAppointment}
          onChange={(e) => setCreateAppointment(e.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label small" htmlFor="followup-create-appt">
          Create follow-up appointment now
        </label>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={handleSubmit}
        disabled={!followUpDate || disabled}
      >
        Set Follow-up
      </button>
    </div>
  );
}
