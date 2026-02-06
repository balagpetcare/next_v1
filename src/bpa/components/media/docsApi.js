import { apiPost, apiDelete } from "@/lib/api";

export async function uploadEntityDocument({ entityType, entityId, docType, file }) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", docType);

  const urls = [
    `/api/v1/${entityType}/${entityId}/documents`,
    `/api/v1/${entityType}/${entityId}/add-document`,
  ];

  for (const url of urls) {
    try {
      return await apiPost(url, form);
    } catch (e) {}
  }
  throw new Error("Upload failed");
}

export async function deleteEntityDocument({ entityType, entityId, docId }) {
  return apiDelete(`/api/v1/${entityType}/${entityId}/documents/${docId}`);
}