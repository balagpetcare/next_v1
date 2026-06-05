/**
 * Admin SMS Center API client
 */
import { apiGet, apiPost } from "./api";

const admin = "/api/v1/admin/sms";

export type SmsLogRow = {
  id: number;
  phone: string;
  message: string;
  provider: string;
  status: string;
  response: string | null;
  template: string | null;
  externalId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
  sentAt: string | null;
};

export type SmsDashboard = {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  last24h: number;
  queue: { waiting: number; active: number; failed: number; delayed: number } | null;
  providerConfigured: boolean;
  smsEnabled: boolean;
};

export type SmsBalance = {
  success: boolean;
  balance?: number | string;
  error?: string;
};

export async function adminSmsDashboard(): Promise<SmsDashboard> {
  const r = await apiGet<{ success: boolean; data: SmsDashboard }>(`${admin}/dashboard`);
  return r.data;
}

export async function adminSmsBalance(): Promise<SmsBalance> {
  const r = await apiGet<{ success: boolean; data: SmsBalance }>(`${admin}/balance`);
  return r.data;
}

export async function adminSmsLogs(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  phone?: string;
}): Promise<{ items: SmsLogRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.status) sp.set("status", params.status);
  if (params?.phone) sp.set("phone", params.phone);
  const qs = sp.toString();
  const r = await apiGet<{
    success: boolean;
    data: { items: SmsLogRow[]; total: number; page: number; pageSize: number; totalPages: number };
  }>(`${admin}/logs${qs ? `?${qs}` : ""}`);
  return r.data;
}

export async function adminSmsSend(body: { phone: string; message: string }) {
  return apiPost<{ success: boolean; data: unknown }>(`${admin}/send`, body);
}

export async function adminSmsBulk(body: { phones: string[]; message: string }) {
  return apiPost<{ success: boolean; data: { recipientCount: number; queued: number; failed: number } }>(
    `${admin}/bulk`,
    body
  );
}

export async function adminSmsRetry(logId: number) {
  return apiPost<{ success: boolean; data: unknown }>(`${admin}/retry/${logId}`, {});
}
