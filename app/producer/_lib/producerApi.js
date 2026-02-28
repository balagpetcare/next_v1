import { apiFetch, getApiBase } from "@/src/lib/apiFetch";
import { getCountryCode } from "@/lib/countryContext";

function unwrap(res) {
  if (!res) return res;
  if (typeof res === "object" && "data" in res) return res.data;
  return res;
}

/**
 * Download CSV from producer API (credentials: include). Triggers browser download.
 * @param {string} path - e.g. /api/v1/producer/batches/export/summary
 * @param {string} defaultFilename - fallback if no Content-Disposition
 * @throws on non-2xx (use getProducerErrorMessage)
 */
export async function producerDownloadCsv(path, defaultFilename = "export.csv") {
  const url = path.startsWith("http") ? path : `${getApiBase()}${path}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "text/csv, application/json",
      "X-Country-Code": getCountryCode(),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: res.statusText };
    }
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const blob = await res.blob();
  let filename = defaultFilename;
  const disp = res.headers.get("Content-Disposition");
  if (disp) {
    const m = disp.match(/filename="([^"]+)"/);
    if (m) filename = m[1];
  }
  const objectUrl = URL.createObjectURL(new Blob([blob], { type: "text/csv; charset=utf-8" }));
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Thrown errors from apiFetch have: message, status, data (with optional code, message).
 * For 403 use err.status === 403 and err.data?.message or err.message for user-facing text.
 * Backend codes: PRODUCER_PERMISSION_DENIED, PRODUCER_ORG_ACCESS.
 */
export function getProducerErrorMessage(err) {
  if (!err) return "Request failed";
  if (Number(err.status) === 403) {
    const code = err.data?.code;
    if (code === "PRODUCER_PERMISSION_DENIED") {
      return err.data?.message || "You don't have permission to perform this action. Ask the owner to grant Staff permissions.";
    }
    if (code === "PRODUCER_ORG_ACCESS") {
      return err.data?.message || "You don't have access to this producer organization.";
    }
    return err.data?.message || err.message || "You don't have permission to perform this action.";
  }
  if (Number(err.status) === 400 && err.data?.code === "BATCH_NOT_PRINTABLE") {
    return err.data?.message || "Batch is not in a printable state. Approve the batch or generate codes first.";
  }
  if (Number(err.status) === 401) return err.message || "Please sign in again.";
  return err.message || err.data?.message || "Request failed";
}

/** Permission keys used for Staff & Access Control page (RBAC). Checked via canProducerStaff(me, key). */
export const PRODUCER_STAFF_PERMISSIONS = {
  READ: "producer.staff.read",
  INVITE: "producer.staff.invite",
  INVITE_RESEND: "producer.staff.invite.resend",
  UPDATE_ROLE: "producer.staff.update_role",
  UPDATE_STATUS: "producer.staff.update_status",
};

/**
 * Whether the current user (from producerMe) can perform a staff action.
 * Uses cached /me: permissions array + isProducerOwner. Owner is treated as having all staff permissions.
 * @param {Object} me - Result of producerMe() (user, org, permissions?, isProducerOwner?).
 * @param {string} permissionKey - One of PRODUCER_STAFF_PERMISSIONS or any string.
 * @returns {boolean}
 */
export function canProducerStaff(me, permissionKey) {
  if (!me) return false;
  if (me.isProducerOwner === true) return true;
  const perms = Array.isArray(me.permissions) ? me.permissions : [];
  if (permissionKey === PRODUCER_STAFF_PERMISSIONS.READ) {
    return perms.includes("producer.staff.read") || perms.includes("producer.org.read");
  }
  return perms.includes(permissionKey);
}

/** Cached /me result (in-memory, cleared on next full page load). Backend returns { success, data: { user, org } }; unwrap gives { user, org }; org has id. */
let _producerMeCache = null;

/**
 * GET /api/v1/producer/me. Returns { user, org } (unwrap of response.data).
 * org.id is the current producer org id (use for producerOrgId in create product).
 */
export async function producerMe(useCache = true) {
  if (useCache && _producerMeCache != null) return _producerMeCache;
  const data = unwrap(await apiFetch("/api/v1/producer/me"));
  if (useCache) _producerMeCache = data;
  return data;
}

/** Clear cached /me (e.g. after logout or org switch). */
export function clearProducerMeCache() {
  _producerMeCache = null;
}

export async function producerKycStatus() {
  return unwrap(await apiFetch("/api/v1/producer/kyc/status"));
}

export async function producerKycUploadDocument({ docType, file }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  return unwrap(
    await apiFetch("/api/v1/producer/kyc/documents", {
      method: "POST",
      body: formData,
      headers: {},
    })
  );
}

export async function producerKycSubmit() {
  return unwrap(
    await apiFetch("/api/v1/producer/kyc/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
  );
}

/**
 * List producer products. Backend currently returns all for org (no query params).
 * Pass opts for future backend support (search, status, page, limit, sort, etc.).
 */
export async function producerProductsList(opts = {}) {
  const q = new URLSearchParams();
  if (opts.search != null && String(opts.search).trim()) q.set("q", String(opts.search).trim());
  if (opts.status != null && opts.status !== "" && opts.status !== "ALL") q.set("status", opts.status);
  if (opts.page != null) q.set("page", String(Number(opts.page) || 1));
  if (opts.limit != null) q.set("limit", String(Number(opts.limit) || 50));
  if (opts.sort != null) q.set("sort", opts.sort);
  if (opts.category != null && opts.category !== "") q.set("category", opts.category);
  if (opts.brand != null && opts.brand !== "") q.set("brand", opts.brand);
  if (opts.factoryId != null && opts.factoryId !== "") q.set("factoryId", opts.factoryId);
  const query = q.toString();
  const url = query ? `/api/v1/producer/products?${query}` : "/api/v1/producer/products";
  return unwrap(await apiFetch(url));
}

export async function producerProductGet(id) {
  return unwrap(await apiFetch(`/api/v1/producer/products/${id}`));
}

export async function producerProductCreate(body) {
  const payload = { ...(body ?? {}) };
  if (payload.producerOrgId == null) {
    const me = await producerMe(true);
    const orgId = me?.org?.id ?? me?.defaultProducerOrgId ?? me?.orgId;
    if (orgId != null) payload.producerOrgId = Number(orgId);
  }
  return unwrap(
    await apiFetch("/api/v1/producer/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function producerProductUpdate(id, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerProductSubmit(id, body = {}) {
  return unwrap(
    await apiFetch(`/api/v1/producer/products/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function producerProductGetStatus(id) {
  return unwrap(await apiFetch(`/api/v1/producer/products/${id}/status`));
}

export async function producerProductAddProof(productId, { file, proofType, metadataJson }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("proofType", proofType != null && proofType !== "" ? String(proofType) : "OTHER");
  if (metadataJson) formData.append("metadataJson", JSON.stringify(metadataJson));
  return unwrap(
    await apiFetch(`/api/v1/producer/products/${productId}/proofs`, {
      method: "POST",
      body: formData,
      headers: {},
    })
  );
}

export async function producerProductCreateBatch(productId, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/products/${productId}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

/**
 * List batches. Backend returns { items, pagination: { page, limit, total } }.
 * Items have: id, batchNo, status, qtyPlanned, qtyGenerated, authProductId, mfgDate, expDate, createdAt, updatedAt.
 */
export async function producerBatchesList(opts = {}) {
  const q = new URLSearchParams();
  const limit = Math.min(Number(opts.limit) || 50, 100);
  const page = Math.max(1, Number(opts.page) || 1);
  q.set("limit", String(limit));
  q.set("page", String(page));
  return unwrap(await apiFetch(`/api/v1/producer/batches?${q.toString()}`));
}

// Producer print API. See backend-api docs/producer/PRINT_SYSTEM_STATUS.md for endpoints and error handling.
// Uses proxy /api/proxy/producer-print so requests hit backend via Next.js when rewrite is used.
const PRINT_API = "/api/proxy/producer-print";

/** GET print batches list — (id, productName, batchNo, totalCodes, allocatedCount, remainingCount, nextAvailableSerial). Server is single source of truth; no fallback — on failure throw so UI shows error. */
export async function producerPrintBatchesList() {
  const raw = await apiFetch(`${PRINT_API}/batches`);
  const res = unwrap(raw);
  const list = Array.isArray(res) ? res : (res?.items ?? []);
  return list;
}

/** GET print batch detail (totals, serial state, allocation logs). Falls back to regular batch when print API returns 404. */
export async function producerPrintBatchDetail(batchId) {
  try {
    const res = unwrap(await apiFetch(`${PRINT_API}/batches/${batchId}`));
    if (res && (res.batch || res.totalCodes != null)) return res;
  } catch (e) {
    if (e?.status !== 404) throw e;
  }
  try {
    const data = await producerBatchGet(batchId, { codesPage: 1, codesLimit: 1 });
    const b = data?.batch;
    if (!b) return null;
    const total = b.qtyGenerated ?? 0;
    return {
      batch: {
        id: b.id,
        batchNo: b.batchNo,
        status: b.status,
        qtyPlanned: b.qtyPlanned,
        qtyGenerated: b.qtyGenerated,
        createdAt: b.createdAt,
        product: b.authProduct ?? { productName: null, sku: null },
      },
      totalCodes: total,
      allocatedCount: 0,
      remainingCount: total,
      nextAvailableSerial: total > 0 ? 1 : null,
      allocationLogs: [],
      lastIssuedLog: null,
    };
  } catch {
    return null;
  }
}

/**
 * POST print batch allocate
 * Body: { mode: "AUTO"|"RANGE", quantity?, startSerial?, endSerial?, actionType: "PRINT"|"DOWNLOAD_EXPORT"|"EMAIL_EXPORT", fileType?: "CSV"|"XLSX", targetEmail? }
 * On DOWNLOAD_EXPORT returns { download: { blob, filename } }; otherwise returns { startSerial, endSerial, quantity, nextAvailableSerial, emailSent?, targetEmail? }.
 */
export async function producerPrintBatchAllocate(batchId, payload) {
  const url = `${typeof window !== "undefined" ? "" : getApiBase()}${PRINT_API}/batches/${batchId}/allocate`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/csv" },
    body: JSON.stringify(payload ?? {}),
  });
  const ct = res.headers.get("Content-Type") || "";
  if (!res.ok) {
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: res.statusText };
    }
    const err = new Error(data?.message || "Allocation failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (ct.includes("text/csv") || ct.includes("application/octet-stream")) {
    const blob = await res.blob();
    const disp = res.headers.get("Content-Disposition") || "";
    const m = disp.match(/filename="([^"]+)"/);
    const filename = m ? m[1] : `batch_${batchId}_codes.csv`;
    return { download: { blob, filename } };
  }
  const data = await res.json();
  return data?.data ?? data;
}

/**
 * GET issuance serial re-download. Triggers browser file download.
 * Permission: producer.batches.read. Audit: ISSUANCE_SERIAL_REDOWNLOADED.
 * @param {string|number} issuanceId - BatchSerialAllocationLog id
 */
export async function producerPrintIssuanceDownload(issuanceId) {
  const url = `${typeof window !== "undefined" ? "" : getApiBase()}${PRINT_API}/issuances/${encodeURIComponent(issuanceId)}/download`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "text/csv, application/json", "X-Country-Code": getCountryCode() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: res.statusText };
    }
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const blob = await res.blob();
  let filename = `issuance-${issuanceId}-serials.csv`;
  const disp = res.headers.get("Content-Disposition");
  if (disp) {
    const m = disp.match(/filename="([^"]+)"/);
    if (m) filename = m[1];
  }
  const objectUrl = URL.createObjectURL(new Blob([blob], { type: "text/csv; charset=utf-8" }));
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/** POST revoke an ISSUED allocation (owner + producer.codes.revoke). */
export async function producerPrintAllocationRevoke(batchId, allocationId, payload = {}) {
  const res = await apiFetch(
    `${PRINT_API}/batches/${batchId}/allocations/${allocationId}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    }
  );
  return unwrap(res);
}

/** GET print email recipients — returns [{ id, email, label }] for the producer org.
 * Safely handles { success, data: [...] } or { success, data: { recipients: [...] } }.
 * On unexpected shape returns [] (does not throw). */
export async function producerPrintEmailRecipientsList() {
  const res = await apiFetch(`${PRINT_API}/email-recipients`);
  try {
    const data = unwrap(res);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.recipients)) return data.recipients;
    return [];
  } catch (_) {
    return [];
  }
}

/** POST print email recipient — body: { email, label? }. Returns { id, email, label }. Upserts; returns existing if (org, email) exists. */
export async function producerPrintEmailRecipientCreate(payload) {
  const res = await apiFetch(`${PRINT_API}/email-recipients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  return unwrap(res);
}

export async function producerCodeSearch(code) {
  const qp = new URLSearchParams();
  qp.set("code", String(code ?? ""));
  return unwrap(await apiFetch(`/api/v1/producer/codes/search?${qp.toString()}`));
}

export async function producerBatchGet(id, { codesPage = 1, codesLimit = 50 } = {}) {
  const qp = new URLSearchParams();
  qp.set("codesPage", String(codesPage));
  qp.set("codesLimit", String(codesLimit));
  return unwrap(await apiFetch(`/api/v1/producer/batches/${id}?${qp.toString()}`));
}

export async function producerBatchSubmit(id, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/batches/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

/** POST /api/v1/producer/batches/:id/print — mark batch as printed (requires producer.batches.print). Returns { printedAt, printedByUserId, printCount }. */
export async function producerBatchMarkPrinted(batchId) {
  return unwrap(
    await apiFetch(`/api/v1/producer/batches/${batchId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
  );
}

export async function producerBatchGenerateCodes(id, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/batches/${id}/codes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerBatchExportCodes(id) {
  return unwrap(await apiFetch(`/api/v1/producer/batches/${id}/codes/export`));
}

/**
 * Download batches summary CSV. Pass current UI filters to match list view (same as Batches UI filters).
 * @param {Object} [filters] - { search, status, productId, factoryId, createdFrom, createdTo } (all optional)
 */
export async function producerBatchExportSummaryCsv(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search != null && String(filters.search).trim()) params.set("search", String(filters.search).trim());
  if (filters.status != null && String(filters.status).trim()) params.set("status", String(filters.status).trim());
  if (filters.productId != null && String(filters.productId).trim()) params.set("productId", String(filters.productId).trim());
  if (filters.factoryId != null && String(filters.factoryId).trim()) params.set("factoryId", String(filters.factoryId).trim());
  if (filters.createdFrom != null && String(filters.createdFrom).trim()) params.set("createdFrom", String(filters.createdFrom).trim());
  if (filters.createdTo != null && String(filters.createdTo).trim()) params.set("createdTo", String(filters.createdTo).trim());
  const query = params.toString();
  const path = query ? `/api/v1/producer/batches/export/summary?${query}` : "/api/v1/producer/batches/export/summary";
  await producerDownloadCsv(path, "batches_summary.csv");
}

/** Download batch codes CSV for one batch (marks codes as exported). */
export async function producerBatchExportCodesCsv(batchId) {
  await producerDownloadCsv(
    `/api/v1/producer/batches/${batchId}/export/codes`,
    `batch_codes_${batchId}.csv`
  );
}

/** Download batch timeline/events CSV for one batch. */
export async function producerBatchExportEventsCsv(batchId) {
  await producerDownloadCsv(
    `/api/v1/producer/batches/${batchId}/export/events`,
    `batch_events_${batchId}.csv`
  );
}

export async function producerApprovalsList(opts = {}) {
  const q = new URLSearchParams();
  if (opts.status) q.set("status", String(opts.status));
  if (opts.type) q.set("type", String(opts.type));
  if (opts.page) q.set("page", String(opts.page));
  if (opts.limit) q.set("limit", String(opts.limit));
  const query = q.toString();
  const url = query ? `/api/v1/producer/approvals?${query}` : "/api/v1/producer/approvals";
  return unwrap(await apiFetch(url));
}

export async function producerApprovalApprove(id, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/approvals/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerApprovalReject(id, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/approvals/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerStaffList(opts = {}) {
  const q = new URLSearchParams();
  if (opts.includeRemoved === true) q.set("includeRemoved", "true");
  const query = q.toString();
  const url = query ? `/api/v1/producer/staff?${query}` : "/api/v1/producer/staff";
  return unwrap(await apiFetch(url));
}

export async function producerStaffInvite(body) {
  return unwrap(
    await apiFetch("/api/v1/producer/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

/** New invite workflow: supports both registered (notification) and unregistered (invite link). Returns { mode, inviteId, inviteLink? }. */
export async function producerStaffInviteCreate(body) {
  const res = await apiFetch("/api/v1/producer/staff/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (res?.data) return res.data;
  return res;
}

export async function producerStaffInvitesList(opts = {}) {
  const q = new URLSearchParams();
  if (opts.status) q.set("status", opts.status);
  if (opts.search) q.set("search", opts.search);
  const query = q.toString();
  const url = query ? `/api/v1/producer/staff/invites?${query}` : "/api/v1/producer/staff/invites";
  return unwrap(await apiFetch(url));
}

export async function producerStaffInviteCancel(inviteId) {
  await apiFetch(`/api/v1/producer/staff/invites/${inviteId}/cancel`, { method: "POST" });
}

export async function producerStaffInviteResend(inviteId) {
  const res = await apiFetch(`/api/v1/producer/staff/invites/${inviteId}/resend`, { method: "POST" });
  if (res?.data) return res.data;
  return res;
}

/** Public: GET invite preview by token (orgName, roleLabel, expiresAt). */
export async function producerStaffInvitePreview(token) {
  const url = `${getApiBase()}/api/v1/producer/staff/invites/preview?token=${encodeURIComponent(String(token || ""))}`;
  const res = await fetch(url, { method: "GET", credentials: "omit", cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Invalid or expired invite");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data?.data ?? data;
}

export async function producerStaffInvitesAccept(payload) {
  return unwrap(
    await apiFetch("/api/v1/producer/staff/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    })
  );
}

export async function producerStaffInvitesAcceptPublic(payload) {
  return unwrap(
    await apiFetch("/api/v1/producer/staff/invites/accept-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    })
  );
}

export async function producerStaffInvitesDecline(payload) {
  await apiFetch("/api/v1/producer/staff/invites/decline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function producerPendingInvites() {
  return unwrap(await apiFetch("/api/v1/producer/me/pending-invites"));
}

export async function producerAuditLogsList(opts = {}) {
  const q = new URLSearchParams();
  if (opts.actorId) q.set("actorId", String(opts.actorId));
  if (opts.action) q.set("action", String(opts.action));
  if (opts.from) q.set("from", String(opts.from));
  if (opts.to) q.set("to", String(opts.to));
  if (opts.page) q.set("page", String(opts.page));
  if (opts.limit) q.set("limit", String(opts.limit));
  const query = q.toString();
  const url = query ? `/api/v1/producer/audit-logs?${query}` : "/api/v1/producer/audit-logs";
  return unwrap(await apiFetch(url));
}

export async function producerStaffUpdateRole(staffId, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/staff/${staffId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerStaffUpdateStatus(staffId, body) {
  return unwrap(
    await apiFetch(`/api/v1/producer/staff/${staffId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerStaffRemove(staffId) {
  return unwrap(
    await apiFetch(`/api/v1/producer/staff/${staffId}`, {
      method: "DELETE",
    })
  );
}

export async function producerFactoriesList() {
  return unwrap(await apiFetch("/api/v1/producer/factories"));
}

export async function producerFactoryGet(id) {
  const list = await producerFactoriesList();
  if (!Array.isArray(list)) return null;
  return list.find((f) => Number(f.id) === Number(id)) ?? null;
}

export async function producerFactoryCreate(body) {
  return unwrap(
    await apiFetch("/api/v1/producer/factories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    })
  );
}

export async function producerFactoryUpdate(id, body) {
  throw new Error("Factory update not yet available");
}
