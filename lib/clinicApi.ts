/**
 * Clinic API layer – structured by module.
 * Uses lib/api (apiGet, apiPost, apiPatch, etc.); credentials include.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

const prefix = "/api/v1/clinic";

// Appointments
export const clinicAppointmentsApi = {
  list: (branchId: number, params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    datePreset?: string;
    doctorId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.date) sp.set("date", params.date);
    if (params?.fromDate) sp.set("fromDate", params.fromDate);
    if (params?.toDate) sp.set("toDate", params.toDate);
    if (params?.datePreset) sp.set("datePreset", params.datePreset);
    if (params?.doctorId) sp.set("doctorId", String(params.doctorId));
    if (params?.status) sp.set("status", params.status);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return apiGet<{ data: { items: any[]; total: number } }>(`${prefix}/branches/${branchId}/appointments${qs ? `?${qs}` : ""}`);
  },

  getById: (branchId: number, appointmentId: number) =>
    apiGet<{ data: any }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}`),

  getEvents: (branchId: number, appointmentId: number) =>
    apiGet<{ data: { events: any[] } }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}/events`),

  create: (branchId: number, data: {
    patientId: number;
    petId?: number;
    doctorId?: number;
    isAnyDoctor?: boolean;
    serviceId?: number;
    packageId?: number;
    scheduledStartAt: string;
    scheduledEndAt: string;
    source?: string;
    priority?: string;
    appointmentType?: string;
    notes?: string;
  }) => apiPost<{ data: any }>(`${prefix}/branches/${branchId}/appointments`, data),

  cancel: (branchId: number, appointmentId: number, reason?: string) =>
    apiPost<{ data: any }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}/cancel`, { reason }),

  reschedule: (branchId: number, appointmentId: number, data: {
    scheduledStartAt: string;
    scheduledEndAt: string;
  }) => apiPost<{ data: any }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}/reschedule`, data),

  checkIn: (branchId: number, appointmentId: number) =>
    apiPost<{ data: any }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}/check-in`, {}),

  markNoShow: (branchId: number, appointmentId: number) =>
    apiPost<{ data: any }>(`${prefix}/branches/${branchId}/appointments/${appointmentId}/no-show`, {}),
};

// Patients
export const clinicPatientsApi = {
  search: (branchId: number, query: string) => {
    const sp = new URLSearchParams();
    sp.set("q", query);
    return apiGet<{ data: { items: any[] } }>(`${prefix}/branches/${branchId}/patients/search?${sp.toString()}`);
  },
};

// Services
export const clinicServicesApi = {
  list: (branchId: number) =>
    apiGet<{ data: any[] }>(`${prefix}/branches/${branchId}/services`),
};

// Doctors
export const clinicDoctorsApi = {
  list: (branchId: number) =>
    apiGet<{ data: any[] }>(`${prefix}/branches/${branchId}/doctors`),

  eligible: (branchId: number, params?: { serviceId?: number; packageId?: number }) => {
    const sp = new URLSearchParams();
    if (params?.serviceId) sp.set("serviceId", String(params.serviceId));
    if (params?.packageId) sp.set("packageId", String(params.packageId));
    const qs = sp.toString();
    return apiGet<{ data: { doctors: any[] } }>(`${prefix}/branches/${branchId}/booking/eligible-doctors${qs ? `?${qs}` : ""}`);
  },
};

// Slots
export const clinicSlotsApi = {
  available: (branchId: number, params: {
    date: string;
    doctorId?: number;
    serviceId?: number;
    packageId?: number;
    durationMinutes?: number;
  }) => {
    const sp = new URLSearchParams();
    sp.set("date", params.date);
    if (params.doctorId) sp.set("doctorId", String(params.doctorId));
    if (params.serviceId) sp.set("serviceId", String(params.serviceId));
    if (params.packageId) sp.set("packageId", String(params.packageId));
    if (params.durationMinutes) sp.set("durationMinutes", String(params.durationMinutes));
    return apiGet<{ data: { slots: any[] } }>(`${prefix}/branches/${branchId}/booking/available-slots?${sp.toString()}`);
  },
};

// Price Preview
export const clinicPriceApi = {
  preview: (branchId: number, params: {
    serviceId?: number;
    packageId?: number;
    doctorId?: number;
    species?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params.serviceId) sp.set("serviceId", String(params.serviceId));
    if (params.packageId) sp.set("packageId", String(params.packageId));
    if (params.doctorId) sp.set("doctorId", String(params.doctorId));
    if (params.species) sp.set("species", params.species);
    return apiGet<{ data: any }>(`${prefix}/branches/${branchId}/booking/price-preview?${sp.toString()}`);
  },
};

// Queue
export const clinicQueueApi = {
  list: (branchId: number, params?: { date?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.date) sp.set("date", params.date);
    if (params?.status) sp.set("status", params.status);
    const qs = sp.toString();
    return apiGet<{ data: { tickets: any[] } }>(`${prefix}/branches/${branchId}/queue${qs ? `?${qs}` : ""}`);
  },

  issueTicket: (branchId: number, data: {
    appointmentId?: number;
    patientId?: number;
    petId?: number;
    doctorId?: number;
    serviceId?: number;
    priorityTag?: string;
  }) => apiPost<{ data: any }>(`${prefix}/branches/${branchId}/queue/issue`, data),
};
