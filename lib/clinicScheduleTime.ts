/**
 * Clinic schedule timezone helpers for frontend.
 * Backend stores appointment times in UTC; branch schedule is in local wall-clock (e.g. Asia/Dhaka).
 * When sending reschedule/slot times, convert "date + time in branch TZ" to UTC ISO.
 */

export const DEFAULT_CLINIC_TIMEZONE = "Asia/Dhaka";

/** IANA timezone -> offset in minutes ahead of UTC (e.g. Asia/Dhaka = 360). */
const TZ_OFFSET_MINUTES: Record<string, number> = {
  "Asia/Dhaka": 360,
  "Asia/Kolkata": 330,
  UTC: 0,
};

export function getTimezoneOffsetMinutes(tz: string): number {
  return TZ_OFFSET_MINUTES[tz] ?? 0;
}

/**
 * Convert a local date (YYYY-MM-DD) and time (HH:mm) in branch timezone to UTC ISO string.
 * Use when sending scheduledStartAt/scheduledEndAt so backend gets correct UTC.
 */
export function branchLocalToUTCISO(
  dateStr: string,
  timeStr: string,
  timezone: string = DEFAULT_CLINIC_TIMEZONE
): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d) || Number.isNaN(h) || Number.isNaN(m)) {
    return new Date(NaN).toISOString();
  }
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const utcMs = Date.UTC(y, mo - 1, d, h, m ?? 0, 0, 0) - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
}
