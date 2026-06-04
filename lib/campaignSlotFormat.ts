/** Locale-aware campaign slot time labels (HH:mm → 09:00 AM). */

export function formatCampaignSlotTime(time: string, locale?: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const d = new Date(Date.UTC(2000, 0, 1, h % 24, m % 60));
  return d.toLocaleTimeString(locale || "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function formatCampaignSlotRange(
  startTime: string,
  endTime: string,
  locale?: string
): string {
  return `${formatCampaignSlotTime(startTime, locale)} – ${formatCampaignSlotTime(endTime, locale)}`;
}

export function slotRemainingCapacity(row: {
  capacity: number;
  bookedCount?: number;
  remainingCapacity?: number;
  availableCount?: number;
  available?: number;
}): number {
  if (row.remainingCapacity != null) return row.remainingCapacity;
  if (row.availableCount != null) return row.availableCount;
  if (row.available != null) return row.available;
  const booked = row.bookedCount ?? 0;
  return Math.max(0, row.capacity - booked);
}
