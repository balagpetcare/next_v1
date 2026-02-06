"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet } from "@/lib/api";

export default function AdminDocsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet("/api/v1/docs/list");
        if (!cancelled && res?.success && Array.isArray(res.data)) setList(res.data);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load docs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Planning & Docs"
        subtitle="Global-Ready and BPA planning documents (from backend-api/docs)"
      />
      <SectionCard title="Documents">
        {loading && <p className="text-secondary">Loading…</p>}
        {error && <p className="text-danger">{error}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="text-secondary">No documents found. Ensure API is running and docs folder exists.</p>
        )}
        {!loading && !error && list.length > 0 && (
          <ul className="list-group list-group-flush">
            {list.map(({ slug, title }) => (
              <li key={slug} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{title}</span>
                <Link href={`/admin/docs/${slug}`} className="btn btn-sm btn-outline-primary">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
