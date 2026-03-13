/**
 * Filter state for doctor appointments page.
 * Used by page and DoctorAppointmentFilterBar.
 */

import type { DateWindowPreset } from "./dateWindow";

export interface DoctorAppointmentFilterState {
  dateWindow: DateWindowPreset;
  /** Custom range when advanced "date range" is used; overrides dateWindow for API. */
  fromDate?: string;
  toDate?: string;
  statuses: string | undefined;
  branchId: string;
  search: string;
  visitType: string | undefined;
  appointmentType: string | undefined;
  priority: string | undefined;
  /** Pagination */
  limit: number;
  offset: number;
}

export const DEFAULT_FILTER_STATE: DoctorAppointmentFilterState = {
  dateWindow: "today",
  statuses: undefined,
  branchId: "",
  search: "",
  visitType: undefined,
  appointmentType: undefined,
  priority: undefined,
  limit: 50,
  offset: 0,
};

export function getActiveFilterCount(state: DoctorAppointmentFilterState): number {
  let n = 0;
  if (state.fromDate != null && state.fromDate !== "") n++;
  if (state.toDate != null && state.toDate !== "") n++;
  if (state.statuses != null && state.statuses !== "") n++;
  if (state.visitType != null && state.visitType !== "") n++;
  if (state.appointmentType != null && state.appointmentType !== "") n++;
  if (state.priority != null && state.priority !== "") n++;
  return n;
}
