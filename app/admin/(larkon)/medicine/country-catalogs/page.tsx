"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { MedicineTableEmptyState, MedicineTableSlTd, MedicineTableSlTh } from "../_components/MedicineUiHelpers";
import { medicineTableSl } from "../_lib/medicineTableDisplay";
import { ADMIN_MEDICINE_BASE } from "../_lib/paths";

export default function AdminMedicineCountryCatalogsPage() {
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminMedicineWorkspaceApi
      .countries()
      .then((r) => {
        setCountries(r.data ?? []);
        setError("");
      })
      .catch((e) => setError((e as Error)?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-main-body">
      <h1 className="h4 mb-1">Country Catalogs</h1>
      <p className="text-muted small mb-4">
        Operational view per country: open overview counts, then browse <strong>Medicines</strong> filtered by country. Distinct from import batches
        and global master entities.
      </p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : !error && countries.length === 0 ? (
            <MedicineTableEmptyState title="No active countries" hint="Verify platform countries are seeded and your account can read /admin/medicine/countries." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <MedicineTableSlTh />
                    <th>Code</th>
                    <th>Country</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {countries.map((c, idx) => (
                    <tr key={c.id}>
                      <MedicineTableSlTd>{medicineTableSl(1, Math.max(countries.length, 1), idx)}</MedicineTableSlTd>
                      <td>
                        <span className="badge bg-light text-dark">{c.code}</span>
                      </td>
                      <td>{c.name}</td>
                      <td className="text-end">
                        <Link href={`${ADMIN_MEDICINE_BASE}/country-catalogs/${c.id}`} className="btn btn-sm btn-outline-primary radius-8">
                          Overview
                        </Link>
                        <Link
                          href={`${ADMIN_MEDICINE_BASE}/listings?countryId=${c.id}`}
                          className="btn btn-sm btn-outline-secondary radius-8 ms-1"
                        >
                          Medicines
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
