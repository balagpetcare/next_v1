/**
 * Date-window presets for doctor appointments filter.
 * Maps UI presets to API fromDate/toDate/statuses for doctorListAppointments.
 */

export type DateWindowPreset =
  | "today"
  | "tomorrow"
  | "next7"
  | "thisWeek"
  | "nextWeek"
  | "overdue"
  | "upcoming"
  | "completed"
  | "cancelled"
  | "missed"
  | "all";

export const DATE_WINDOW_LABELS: Record<DateWindowPreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  next7: "Next 7 Days",
  thisWeek: "This Week",
  nextWeek: "Next Week",
  overdue: "Overdue / Missed",
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed / No-show",
  all: "All",
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

/** Monday = 0, Sunday = 6 (ISO weekday: Monday = 1, Sunday = 7). */
function getMondayBefore(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return startOfDay(monday);
}

export interface DateWindowRange {
  /** Single-day mode: use only date (fromDate/toDate not set). */
  date?: string;
  /** Range mode. */
  fromDate?: string;
  toDate?: string;
  /** Optional status filter for this preset. */
  statuses?: string;
}

/**
 * Resolve a date-window preset to API params.
 * baseDate defaults to today (local date at 00:00 for consistency with date picker).
 */
export function getDateWindowRange(
  preset: DateWindowPreset,
  baseDate?: string
): DateWindowRange {
  const today = baseDate ? new Date(baseDate + "T12:00:00.000Z") : new Date();
  const todayStr = toISODate(today);

  switch (preset) {
    case "today":
      return { date: todayStr };

    case "tomorrow": {
      const t = new Date(today);
      t.setUTCDate(t.getUTCDate() + 1);
      return { date: toISODate(t) };
    }

    case "next7": {
      const from = new Date(today);
      const to = new Date(today);
      to.setUTCDate(to.getUTCDate() + 6);
      return { fromDate: toISODate(from), toDate: toISODate(to) };
    }

    case "thisWeek": {
      const mon = getMondayBefore(today);
      const sun = new Date(mon);
      sun.setUTCDate(sun.getUTCDate() + 6);
      return { fromDate: toISODate(mon), toDate: toISODate(sun) };
    }

    case "nextWeek": {
      const thisMon = getMondayBefore(today);
      const nextMon = new Date(thisMon);
      nextMon.setUTCDate(nextMon.getUTCDate() + 7);
      const nextSun = new Date(nextMon);
      nextSun.setUTCDate(nextSun.getUTCDate() + 6);
      return { fromDate: toISODate(nextMon), toDate: toISODate(nextSun) };
    }

    case "overdue": {
      const past = new Date(today);
      past.setUTCDate(past.getUTCDate() - 30);
      return {
        fromDate: toISODate(past),
        toDate: todayStr,
        statuses: "BOOKED,CONFIRMED",
      };
    }

    case "upcoming": {
      const from = new Date(today);
      const to = new Date(today);
      to.setUTCDate(to.getUTCDate() + 13);
      return {
        fromDate: toISODate(from),
        toDate: toISODate(to),
        statuses: "BOOKED,CONFIRMED",
      };
    }

    case "completed":
      return { date: todayStr, statuses: "COMPLETED" };

    case "cancelled":
      return { date: todayStr, statuses: "CANCELLED" };

    case "missed":
      return { date: todayStr, statuses: "NO_SHOW" };

    case "all": {
      const from = new Date(today);
      const to = new Date(today);
      to.setUTCDate(to.getUTCDate() + 30);
      return { fromDate: toISODate(from), toDate: toISODate(to) };
    }

    default:
      return { date: todayStr };
  }
}

/**
 * Whether this preset uses a single date (for stats "today" behavior).
 */
export function isSingleDayPreset(preset: DateWindowPreset): boolean {
  return preset === "today" || preset === "tomorrow" || preset === "completed" || preset === "cancelled" || preset === "missed";
}
