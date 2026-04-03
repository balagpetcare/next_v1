"use client";

import { useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";

export default function AdminMedicineSettingsPage() {
  const [data, setData] = useState<{
    medicineImportMaxRows: number;
    medicineImportMaxFileBytes: number;
    permissions: string[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminMedicineWorkspaceApi
      .settingsMeta()
      .then((r) => setData(r.data ?? null))
      .catch((e) => setError((e as Error)?.message || "Failed"));
  }, []);

  return (
    <div className="dashboard-main-body">
      <h1 className="h4 mb-1">Governance</h1>
      <p className="text-muted small mb-4">
        Reference limits for CSV import size/volume and the permission keys enforced on <code className="small">/api/v1/admin/medicine/*</code> and
        import routes. Runtime policy remains server-side.
      </p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {data && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-transparent fw-semibold">Import limits</div>
          <div className="card-body small">
            <div>
              <strong>Max rows per file:</strong> {data.medicineImportMaxRows}
            </div>
            <div>
              <strong>Max file size (bytes):</strong> {data.medicineImportMaxFileBytes}
            </div>
          </div>
        </div>
      )}
      {data && (
        <div className="card radius-12">
          <div className="card-header bg-transparent fw-semibold">Permission keys</div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush small">
              {data.permissions.map((p) => (
                <li key={p} className="list-group-item small text-break">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
