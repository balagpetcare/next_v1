"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet } from "@/lib/api";

export default function AdminDocViewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(`/api/v1/docs/${encodeURIComponent(slug)}`);
        if (!cancelled && res?.success && res.data) setDoc(res.data);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load doc");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!slug) {
    router.replace("/admin/docs");
    return null;
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title={doc?.title || slug}
        subtitle={
          <Link href="/admin/docs" className="text-decoration-none">
            ← Back to Planning & Docs
          </Link>
        }
      />
      <SectionCard title="">
        {loading && <p className="text-secondary">Loading…</p>}
        {error && (
          <>
            <p className="text-danger">{error}</p>
            <Link href="/admin/docs" className="btn btn-outline-primary">Back to list</Link>
          </>
        )}
        {!loading && !error && doc?.content && (
          <div
            className="bg-light rounded p-3"
            style={{ overflow: "auto", maxHeight: "75vh" }}
          >
            <pre className="mb-0 small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--bs-font-sans-serif)" }}>
              {doc.content}
            </pre>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
