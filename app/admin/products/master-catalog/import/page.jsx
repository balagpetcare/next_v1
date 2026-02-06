"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

const apiBase =
  String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

export default function MasterCatalogImportPage() {
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function downloadCsv(endpoint, filename) {
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text || `Failed (${res.status})`;
      try {
        const d = JSON.parse(text);
        if (d?.message) msg = d.message;
      } catch (_) {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleDownloadTemplate() {
    try {
      setError("");
      await downloadCsv("/api/v1/products/master-catalog/csv-template", "master_product_catalog_template.csv");
    } catch (e) {
      setError(e?.message || "Failed to download template");
    }
  }

  async function handleDownloadBdSample() {
    try {
      setError("");
      await downloadCsv("/api/v1/products/master-catalog/bd-sample", "bd_pet_products_master_catalog.csv");
    } catch (e) {
      setError(e?.message || "Failed to download Bangladesh sample");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a CSV file first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(
        `${apiBase}/api/v1/products/master-catalog/import-csv?dryRun=${dryRun ? "true" : "false"}`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        },
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Import failed (${res.status})`);
      }

      setResult(data.data || data);
    } catch (e) {
      setError(e?.message || "Failed to import CSV");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title="Master Catalog CSV Import"
        subtitle="Bulk add or update master products from CSV"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:download-linear" />
              Download Template
            </button>
            <button
              type="button"
              onClick={handleDownloadBdSample}
              className="btn btn-outline-success d-flex align-items-center gap-2"
            >
              <Icon icon="solar:document-bold" />
              Bangladesh Sample
            </button>
            <a href="/admin/products/master-catalog" className="btn btn-light">
              Back to Master Catalog
            </a>
          </div>
        }
      />

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <SectionCard title="Upload CSV">
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label fw-semibold">CSV File</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="form-control"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <small className="text-secondary d-block">
              Use the template columns. One row per product variant.
            </small>
            <small className="text-secondary d-block mt-1">
              <strong>Bangladesh sample</strong> has 26 products from Mew Mew Shop, Pet Zone BD, Daraz, Miki Pet Store (cat dry/wet, treats, dog food). Use it to bulk-add then edit as needed.
            </small>
            <small className="text-secondary d-block mt-1">
              Fields that contain commas must be wrapped in double quotes (e.g. <code>{"\"Store in a cool, dry place\""}</code>).
            </small>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="dryRun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="dryRun">
              Dry run only (validate without saving)
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Processing..." : dryRun ? "Validate CSV" : "Import CSV"}
          </button>
        </form>
      </SectionCard>

      {result && (
        <SectionCard title="Import Summary">
          <pre className="small bg-light p-3 rounded-3">
            {JSON.stringify(result, null, 2)}
          </pre>
        </SectionCard>
      )}
    </div>
  );
}

