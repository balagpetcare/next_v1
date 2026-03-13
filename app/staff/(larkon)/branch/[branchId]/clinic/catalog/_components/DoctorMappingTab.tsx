"use client";

import { useCallback, useEffect, useState } from "react";
import { getServiceMatrix, getPackageMatrix } from "./catalogApi";
import { formatDoctorPackageRole } from "./catalogFormatters";
import CatalogStatusBadge from "./CatalogStatusBadge";
import { DataTableWrapper, EmptyState, ErrorState, LoadingState } from "@/src/components/dashboard";

export default function DoctorMappingTab({ branchId }: { branchId: string }) {
  const [serviceData, setServiceData] = useState<{
    doctors: { id: number; name: string }[];
    services: { id: number; name: string }[];
    matrix: { doctorId: number; serviceId: number; mappingId?: number; status: string }[];
  } | null>(null);
  const [packageData, setPackageData] = useState<{
    doctors: { id: number; name: string }[];
    packages: { id: number; packageName: string }[];
    matrix: { doctorId: number; packageId: number; mappingId?: number; roleInPackage: string; status: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<"services" | "packages">("services");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([getServiceMatrix(branchId), getPackageMatrix(branchId)])
      .then(([svc, pkg]) => {
        setServiceData(svc);
        setPackageData(pkg);
      })
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading && !serviceData && !packageData) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading doctor mapping…" />
        </div>
      </div>
    );
  }

  if (error && !serviceData && !packageData) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  const doctorName = (id: number, list: { id: number; name: string }[]) =>
    list.find((d) => d.id === id)?.name ?? `#${id}`;

  return (
    <div className="card radius-12">
      <div className="card-body">
        <ul className="nav nav-tabs nav-tabs-card mb-3">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link radius-8 me-1 ${activeView === "services" ? "active" : ""}`}
              onClick={() => setActiveView("services")}
            >
              Service mapping
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link radius-8 ${activeView === "packages" ? "active" : ""}`}
              onClick={() => setActiveView("packages")}
            >
              Package mapping
            </button>
          </li>
        </ul>
        {activeView === "services" && serviceData && (
          <DataTableWrapper
            emptyState={
              serviceData.matrix.length === 0 ? (
                <EmptyState title="No service mappings" description="Doctors can be assigned to services from the Doctors area." />
              ) : undefined
            }
          >
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Doctor</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceData.matrix.map((m, i) => (
                    <tr key={m.mappingId ?? `s-${m.doctorId}-${m.serviceId}-${i}`}>
                      <td>{doctorName(m.doctorId, serviceData.doctors)}</td>
                      <td>{serviceData.services.find((s) => s.id === m.serviceId)?.name ?? `#${m.serviceId}`}</td>
                      <td><CatalogStatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        )}
        {activeView === "packages" && packageData && (
          <DataTableWrapper
            emptyState={
              packageData.matrix.length === 0 ? (
                <EmptyState title="No package mappings" description="Doctors can be assigned to packages from the Doctors area." />
              ) : undefined
            }
          >
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Doctor</th>
                    <th>Package</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {packageData.matrix.map((m, i) => (
                    <tr key={m.mappingId ?? `p-${m.doctorId}-${m.packageId}-${i}`}>
                      <td>{doctorName(m.doctorId, packageData.doctors)}</td>
                      <td>{packageData.packages.find((p) => p.id === m.packageId)?.packageName ?? `#${m.packageId}`}</td>
                      <td>{formatDoctorPackageRole(m.roleInPackage)}</td>
                      <td><CatalogStatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        )}
      </div>
    </div>
  );
}
