"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getImportBatch,
  getImportBatchRows,
  getImportBatchInsights,
  revalidateImportBatch,
  listImportMappings,
  publishImportBatch,
  fixImportRow,
  getImportBatchUnmapped,
  upsertImportMapping,
  bulkFixImportBatch,
  type ProductImportBatch,
  type ProductImportRow,
  type ProductImportBatchInsights,
  type IntegrationMapping,
} from "@/app/owner/_lib/ownerApi";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || "Request failed");
  return j;
}

/** Download file from API with auth (credentials); works across origins. */
async function downloadViaFetch(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}

export default function OwnerProductImportBatchPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = Number(params.batchId);
  const [batch, setBatch] = useState<ProductImportBatch | null>(null);
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [tab, setTab] = useState<"dashboard" | "fix" | "ready" | "mappings">("dashboard");
  const [statusFilter, setStatusFilter] = useState<string>("NEEDS_FIX");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mappings, setMappings] = useState<IntegrationMapping[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string; children?: { id: number; name: string }[] }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [mapDrawer, setMapDrawer] = useState<{
    type: "BRAND" | "CATEGORY" | "SUBCATEGORY";
    externalValue: string;
    count?: number;
    rowId?: number;
  } | null>(null);
  const [mapDrawerInternalId, setMapDrawerInternalId] = useState<number | "">("");
  const [mapDrawerApplyToAll, setMapDrawerApplyToAll] = useState(true);
  const [insights, setInsights] = useState<ProductImportBatchInsights | null>(null);

  useEffect(() => {
    if (!batchId) return;
    loadBatch();
  }, [batchId]);

  useEffect(() => {
    if (!batchId) return;
    if (tab === "dashboard") loadInsights();
    else loadRows();
  }, [batchId, statusFilter, tab]);

  const loadInsights = async () => {
    if (!batchId) return;
    try {
      const data = await getImportBatchInsights(batchId);
      setInsights(data ?? null);
    } catch {
      setInsights(null);
    }
  };

  useEffect(() => {
    loadMappings();
    fetchJson<{ data?: unknown[] }>("/api/v1/meta/categories").then((j) => setCategories(Array.isArray(j?.data) ? (j.data as any) : []));
    fetchJson<{ data?: unknown[] }>("/api/v1/meta/brands").then((j) => setBrands(Array.isArray(j?.data) ? (j.data as any) : []));
  }, []);

  const isProcessing = batch?.status === "PENDING" || batch?.status === "PROCESSING";
  useEffect(() => {
    if (!batchId || !isProcessing) return;
    const t = setInterval(() => loadBatch(), 3000);
    return () => clearInterval(t);
  }, [batchId, isProcessing]);

  const loadBatch = async () => {
    try {
      setLoading(true);
      const b = await getImportBatch(batchId);
      setBatch(b ?? null);
      if (!b) router.push("/owner/integrations/product-import");
    } catch {
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async () => {
    if (!batchId) return;
    try {
      const data = await getImportBatchRows(batchId, {
        status: tab === "fix" ? "NEEDS_FIX" : tab === "ready" ? "READY" : undefined,
        page: 1,
        limit: 50,
      });
      setRows(data.items);
      setPagination(data.pagination);
    } catch {
      setRows([]);
    }
  };

  const loadMappings = async () => {
    try {
      const list = await listImportMappings({ provider: "csv" });
      setMappings(list);
    } catch {
      setMappings([]);
    }
  };

  const handleRevalidate = async () => {
    try {
      setActionLoading(true);
      await revalidateImportBatch(batchId);
      await loadBatch();
      await loadRows();
    } catch (e: any) {
      alert(e?.message || "Revalidate failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async (allowWarnings?: boolean) => {
    try {
      setActionLoading(true);
      const res = await publishImportBatch(batchId, { allowWarnings });
      await loadBatch();
      await loadRows();
      if (tab === "dashboard") loadInsights();
      const d = res?.data;
      const msg =
        d?.publishWarningCount && d.publishWarningCount > 0
          ? `Published ${d.published} product(s). ${d.publishWarningCount} had warnings.`
          : "Published successfully.";
      alert(msg);
    } catch (e: any) {
      alert(e?.message || "Publish failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveMapping = async (type: "CATEGORY" | "SUBCATEGORY" | "BRAND" | "UNIT", externalValue: string, internalId: number) => {
    try {
      await upsertImportMapping("csv", type, externalValue, internalId);
      await loadMappings();
      await loadRows();
    } catch (e: any) {
      alert(e?.message || "Save mapping failed");
    }
  };

  const handleFixRow = async (rowId: number, mapping?: { type: string; externalValue: string; internalId: number }) => {
    try {
      await fixImportRow(rowId, mapping ? { mapping } : {});
      await loadBatch();
      await loadRows();
    } catch (e: any) {
      alert(e?.message || "Fix failed");
    }
  };

  const openMapDrawer = (type: "BRAND" | "CATEGORY" | "SUBCATEGORY", externalValue: string, count?: number, rowId?: number) => {
    setMapDrawer({ type, externalValue, count, rowId });
    setMapDrawerInternalId("");
    setMapDrawerApplyToAll(count !== undefined ? count > 1 : true);
  };

  const handleMapDrawerSubmit = async () => {
    if (!mapDrawer || !mapDrawerInternalId) return;
    try {
      setActionLoading(true);
      await upsertImportMapping("csv", mapDrawer.type, mapDrawer.externalValue, mapDrawerInternalId);
      await bulkFixImportBatch(batchId, {
        mappingUpdates: [{ type: mapDrawer.type, externalValue: mapDrawer.externalValue, internalId: mapDrawerInternalId }],
        ...(mapDrawerApplyToAll
          ? { byExternalValue: { type: mapDrawer.type, externalValue: mapDrawer.externalValue } }
          : mapDrawer.rowId != null
            ? { rowIds: [mapDrawer.rowId] }
            : {}),
      });
      await revalidateImportBatch(batchId);
      await loadBatch();
      await loadRows();
      await loadMappings();
      await loadInsights();
      setMapDrawer(null);
    } catch (e: any) {
      alert(e?.message || "Map failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadViaFetch(`${API_BASE}/api/v1/products/master-catalog/csv-template`, "product_import_template.csv").catch((e) =>
      alert((e as Error)?.message || "Download failed")
    );
  };

  if (loading && !batch) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!batch) return null;

  const t = batch.totals || { total: 0, ready: 0, needsFix: 0, error: 0 };
  const progress = batch.progress || { processedRows: 0, totalRows: 0, progressPercent: null, startedAt: null, finishedAt: null, errorMessage: null };

  const handleDownloadUnmapped = async (type: "BRAND" | "CATEGORY" | "SUBCATEGORY") => {
    try {
      const data = await getImportBatchUnmapped(batchId, type);
      const csv = ["externalValue,count", ...data.items.map((i) => `${JSON.stringify(i.externalValue)},${i.count}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unmapped-${type.toLowerCase()}-batch-${batchId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error)?.message || "Download failed");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/owner/integrations/product-import" className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
            ← Product Import
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{batch.filename || `Batch #${batchId}`}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total: {t.total} · Ready: {t.ready} · Need fix: {t.needsFix} · Errors: {t.error}
          </p>
          {(batch.status === "PENDING" || batch.status === "PROCESSING") && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progress.processedRows} / {progress.totalRows || t.total} ({progress.progressPercent ?? 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div className="bg-indigo-600 h-2 rounded" style={{ width: `${progress.progressPercent ?? 0}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRevalidate}
            disabled={actionLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Revalidate
          </button>
          <button
            onClick={() => handlePublish()}
            disabled={actionLoading || t.ready === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish {t.ready} ready
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab("dashboard")}
          className={`px-4 py-2 text-sm font-medium ${tab === "dashboard" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => { setTab("fix"); setStatusFilter("NEEDS_FIX"); }}
          className={`px-4 py-2 text-sm font-medium ${tab === "fix" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}
        >
          Fix Center ({t.needsFix})
        </button>
        <button
          onClick={() => { setTab("ready"); setStatusFilter("READY"); }}
          className={`px-4 py-2 text-sm font-medium ${tab === "ready" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}
        >
          Ready to publish ({t.ready})
        </button>
        <button
          onClick={() => setTab("mappings")}
          className={`px-4 py-2 text-sm font-medium ${tab === "mappings" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}
        >
          Saved mappings
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">Download unmapped:</span>
        <button type="button" onClick={() => handleDownloadUnmapped("BRAND")} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">BRAND</button>
        <button type="button" onClick={() => handleDownloadUnmapped("CATEGORY")} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">CATEGORY</button>
        <button type="button" onClick={() => handleDownloadUnmapped("SUBCATEGORY")} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">SUBCATEGORY</button>
        <button type="button" onClick={handleDownloadTemplate} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">Template CSV</button>
      </div>

      {tab === "dashboard" && (
        <section className="space-y-6">
          {!insights ? (
            <p className="text-gray-500">Loading insights…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Publishable</p>
                  <p className="text-2xl font-semibold text-green-700">{insights.publishableCount}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Needs fix</p>
                  <p className="text-2xl font-semibold text-amber-700">{insights.needsFixCount}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Errors</p>
                  <p className="text-2xl font-semibold text-red-700">{insights.errorCount}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-900">{insights.publishableCount + insights.needsFixCount + insights.errorCount}</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Top Unmapped Values – map and apply to all in one action</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">External value</th>
                        <th className="pb-2 pr-4">Count</th>
                        <th className="pb-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...insights.topUnmappedValues.BRAND.map((u) => ({ ...u, type: "BRAND" as const })),
                        ...insights.topUnmappedValues.CATEGORY.map((u) => ({ ...u, type: "CATEGORY" as const })),
                        ...insights.topUnmappedValues.SUBCATEGORY.map((u) => ({ ...u, type: "SUBCATEGORY" as const })),
                      ]
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 20)
                        .map((u, idx) => (
                          <tr key={`${u.type}-${u.externalValue}-${idx}`} className="border-b border-gray-100">
                            <td className="py-2 pr-4">{u.type}</td>
                            <td className="py-2 pr-4">{u.externalValue}</td>
                            <td className="py-2 pr-4">{u.count}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                className="text-indigo-600 hover:underline text-sm"
                                onClick={() => openMapDrawer(u.type, u.externalValue, u.count)}
                              >
                                Map & apply to all
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {[
                  ...insights.topUnmappedValues.BRAND,
                  ...insights.topUnmappedValues.CATEGORY,
                  ...insights.topUnmappedValues.SUBCATEGORY,
                ].length === 0 && <p className="text-gray-500 py-2">No unmapped values.</p>}
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Top Issue Codes</h3>
                {insights.issueCodeCounts.length === 0 ? (
                  <p className="text-gray-500">No issues.</p>
                ) : (
                  <div className="space-y-2">
                    {insights.issueCodeCounts.slice(0, 10).map(({ code, count }) => {
                      const max = Math.max(...insights.issueCodeCounts.map((x) => x.count), 1);
                      const pct = (count / max) * 100;
                      return (
                        <div key={code} className="flex items-center gap-2">
                          <span className="w-32 text-sm text-gray-700 truncate" title={code}>{code}</span>
                          <div className="flex-1 bg-gray-200 rounded h-5 min-w-[80px]" style={{ maxWidth: 300 }}>
                            <div className="bg-indigo-500 h-5 rounded" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-gray-600 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {insights.timeStats && (insights.timeStats.createdAt || insights.timeStats.finishedAt) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Time: </span>
                  Created {insights.timeStats.createdAt ? new Date(insights.timeStats.createdAt).toLocaleString() : "—"}
                  {insights.timeStats.finishedAt && ` · Finished ${new Date(insights.timeStats.finishedAt).toLocaleString()}`}
                  {insights.timeStats.publishAt && ` · Published ${new Date(insights.timeStats.publishAt).toLocaleString()}`}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {mapDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMapDrawer(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Map {mapDrawer.type.toLowerCase()}</h3>
            <p className="text-sm text-gray-600 mb-2">
              External value: <strong>{mapDrawer.externalValue}</strong>
              {mapDrawer.count != null && (
                <span className="ml-1">({mapDrawer.count} row{mapDrawer.count !== 1 ? "s" : ""} affected)</span>
              )}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal {mapDrawer.type}</label>
              {mapDrawer.type === "BRAND" && (
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={mapDrawerInternalId}
                  onChange={(e) => setMapDrawerInternalId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select brand…</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
              {(mapDrawer.type === "CATEGORY" || mapDrawer.type === "SUBCATEGORY") && (
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={mapDrawerInternalId}
                  onChange={(e) => setMapDrawerInternalId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select {mapDrawer.type.toLowerCase()}…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mapDrawerApplyToAll}
                onChange={(e) => setMapDrawerApplyToAll(e.target.checked)}
              />
              Apply to all rows with same external value in this batch
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setMapDrawer(null)} className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleMapDrawerSubmit} disabled={!mapDrawerInternalId || actionLoading} className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}

      {tab === "mappings" && (
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-4">
            Saved mappings apply to future imports. Add mappings from Fix Center when you pick an internal value for an external one.
          </p>
          {mappings.length === 0 ? (
            <p className="text-gray-500">No saved mappings yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">External value</th>
                  <th className="pb-2">Internal ID</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2">{m.type}</td>
                    <td className="py-2">{m.externalValue}</td>
                    <td className="py-2">{m.internalId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {(tab === "fix" || tab === "ready") && (
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-4 text-gray-500">
              {tab === "fix" ? "No rows need fixing." : "No rows ready to publish yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 bg-gray-50 border-b">
                    <th className="p-3">Key / Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Issues</th>
                    {tab === "fix" && <th className="p-3">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="p-3">
                        {(r.normalizedData as any)?.name || r.externalProductKey}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          r.status === "READY" ? "bg-green-100 text-green-800" :
                          r.status === "NEEDS_FIX" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.issues?.length ? (
                          <ul className="list-disc list-inside text-gray-600">
                            {(r.issues as any[]).slice(0, 3).map((i, idx) => (
                              <li key={idx}>{i.code}: {i.message || ""}</li>
                            ))}
                          </ul>
                        ) : "—"}
                      </td>
                      {tab === "fix" && (
                        <td className="p-3">
                          {r.issues?.some((i: any) => i.code === "UNMAPPED_BRAND") && brands.length > 0 && (
                            <button
                              type="button"
                              className="text-sm px-2 py-1 border rounded hover:bg-gray-50 text-indigo-600"
                              onClick={() => openMapDrawer("BRAND", (r.normalizedData as any)?.brand ?? "", undefined, r.id)}
                            >
                              Map brand
                            </button>
                          )}
                          {r.issues?.some((i: any) => i.code === "UNMAPPED_CATEGORY") && categories.length > 0 && (
                            <button
                              type="button"
                              className="text-sm px-2 py-1 border rounded hover:bg-gray-50 text-indigo-600 ml-1"
                              onClick={() => openMapDrawer("CATEGORY", (r.normalizedData as any)?.category ?? "", undefined, r.id)}
                            >
                              Map category
                            </button>
                          )}
                          {r.issues?.some((i: any) => i.code === "UNMAPPED_SUBCATEGORY") && categories.length > 0 && (
                            <button
                              type="button"
                              className="text-sm px-2 py-1 border rounded hover:bg-gray-50 text-indigo-600 ml-1"
                              onClick={() => openMapDrawer("SUBCATEGORY", (r.normalizedData as any)?.subcategory ?? "", undefined, r.id)}
                            >
                              Map subcategory
                            </button>
                          )}
                          {!r.issues?.some((i: any) => i.code === "UNMAPPED_BRAND" || i.code === "UNMAPPED_CATEGORY" || i.code === "UNMAPPED_SUBCATEGORY") && (
                            <button
                              onClick={() => handleFixRow(r.id)}
                              className="text-indigo-600 hover:underline text-sm"
                            >
                              Revalidate row
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
