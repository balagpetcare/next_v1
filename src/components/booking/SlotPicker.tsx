"use client";

import type { DoctorSlotGroup } from "@/src/types/appointment";
import LoadingState from "@/src/components/dashboard/LoadingState";
import EmptyState from "@/src/components/dashboard/EmptyState";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export interface SlotPickerProps {
  slotGroups: DoctorSlotGroup[];
  selectedSlot?: { start: string; end: string; doctorId: number } | null;
  onSelectSlot: (slot: { start: string; end: string; doctorId: number; doctorName: string }) => void;
  loading?: boolean;
  error?: string | null;
}

export default function SlotPicker({
  slotGroups,
  selectedSlot,
  onSelectSlot,
  loading,
  error,
}: SlotPickerProps) {
  if (loading) return <LoadingState message="Loading slots…" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!slotGroups?.length) return <EmptyState title="No slots" description="No available slots for this date." />;

  return (
    <div className="slot-picker">
      {slotGroups.map((group) => (
        <div key={group.doctorId} className="mb-3">
          <div className="small fw-semibold text-muted mb-2">{group.doctorName}</div>
          <div className="d-flex flex-wrap gap-2">
            {group.slots.map((slot) => {
              const isSelected =
                selectedSlot?.doctorId === group.doctorId &&
                selectedSlot?.start === slot.start &&
                selectedSlot?.end === slot.end;
              return (
                <button
                  key={`${slot.start}-${slot.end}`}
                  type="button"
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => onSelectSlot({ ...slot, doctorId: group.doctorId, doctorName: group.doctorName })}
                >
                  {formatTime(slot.start)} – {formatTime(slot.end)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
