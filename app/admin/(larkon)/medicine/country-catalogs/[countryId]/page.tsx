"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicineCountryCatalogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const countryId = Number(params?.countryId);
  const [data, setData] = useState<{
    country: { code: string; name: string; isActive: boolean };
    listings: { active: number; inactive: number; archived: number };
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!countryId || Number.isNaN(countryId)) {
        router.push(`${ADMIN_MEDICINE_BASE}/country-catalogs`);
        return;
      }
      try {
        setLoading(true);
        const res = await adminMedicineWorkspaceApi.countryCatalogSummary(countryId);
        setData(res.data ?? null);
        setError("");
      } catch (e) {
        setError((e as Error)?.message || "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [countryId, router]);

  if (loading) {
    return (
      <div className="dashboard-main-body py-5 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error || "Not found"}</div>
      </div>
    );
  }

  const { country, listings } = data;

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/country-catalogs`} className="text-muted small d-inline-block mb-3">
        ← Countries
      </Link>
      <h1 className="h4 mb-1">
        Country catalog · {country.code} — {country.name}
      </h1>
      <p className="text-muted small mb-4">
        Country active: {country.isActive ? "yes" : "no"}
      </p>
      <div className="row g-3 mb-4">
        {[
          ["Active listings", listings.active],
          ["Inactive listings", listings.inactive],
          ["Archived listings", listings.archived],
        ].map(([label, val]) => (
          <div key={String(label)} className="col-md-4">
            <div className="card border-0 bg-light radius-12">
              <div className="card-body p-20">
                <div className="text-muted small">{label}</div>
                <div className="h4 mb-0 fw-semibold">{val as number}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link href={`${ADMIN_MEDICINE_BASE}/listings?countryId=${countryId}`} className="btn btn-primary radius-12 me-2">
        Browse medicines
      </Link>
      <Link href={`${ADMIN_MEDICINE_BASE}/listings/new`} className="btn btn-outline-primary radius-12">
        New medicine (select country in form)
      </Link>
    </div>
  );
}
