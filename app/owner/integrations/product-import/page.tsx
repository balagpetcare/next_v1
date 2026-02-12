"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listImportBatches,
  uploadProductImport,
  type ProductImportBatch,
} from "../../_lib/ownerApi";

export default function OwnerProductImportPage() {
  const [batches, setBatches] = useState<ProductImportBatch[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await listImportBatches({ page: 1, limit: 20 });
      setBatches(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Select a CSV or Excel file");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const res = await uploadProductImport(file);
      const batchId = res?.data?.batchId;
      if (batchId) {
        window.location.href = `/owner/integrations/product-import/${batchId}`;
        return;
      }
      loadBatches();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Product Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload CSV or Excel to import products. Categories, subcategories, and brands must map to existing values.
        </p>
      </div>

      {/* Upload step */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Upload file</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV or Excel file</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {/* Recent batches */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-medium text-gray-800 p-4 border-b border-gray-100">Recent imports</h2>
        {loading ? (
          <p className="p-4 text-gray-500">Loading…</p>
        ) : batches.length === 0 ? (
          <p className="p-4 text-gray-500">No imports yet. Upload a file above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {batches.map((b) => {
              const t = b.totals || { total: 0, ready: 0, needsFix: 0, error: 0 };
              return (
                <li key={b.id} className="p-4 hover:bg-gray-50">
                  <Link href={`/owner/integrations/product-import/${b.id}`} className="flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-gray-900">{b.filename || `Batch #${b.id}`}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {b.status} · {t.total} rows ({t.ready} ready, {t.needsFix} need fix, {t.error} errors)
                      </span>
                    </div>
                    <span className="text-indigo-600 text-sm">Open →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
