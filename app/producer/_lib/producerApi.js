import { apiFetch } from "@/src/lib/apiFetch";

function unwrap(res) {
  if (!res) return res;
  if (typeof res === "object" && "data" in res) return res.data;
  return res;
}

export async function producerMe() {
  return unwrap(await apiFetch("/api/v1/producer/me"));
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
  return unwrap(
    await apiFetch("/api/v1/producer/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
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
  formData.append("proofType", proofType);
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

export async function producerBatchesList(limit = 50) {
  return unwrap(await apiFetch(`/api/v1/producer/batches?limit=${encodeURIComponent(String(limit))}`));
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

export async function producerStaffList() {
  return unwrap(await apiFetch("/api/v1/producer/staff"));
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

export async function producerStaffInvitesAccept(payload) {
  return unwrap(
    await apiFetch("/api/v1/producer/staff/invites/accept", {
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
