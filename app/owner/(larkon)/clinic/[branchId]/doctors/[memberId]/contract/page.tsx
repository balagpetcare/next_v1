"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicDoctorContract,
  ownerClinicDoctorContractsList,
  ownerClinicDoctorContractCreate,
  ownerClinicDoctorContractUpdate,
  ownerClinicDoctorContractRatePreview,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const CONTRACT_TYPES = ["REVENUE_SHARE", "FIXED_FEE", "VISITING_SPECIALIST", "SALARY_INCENTIVE", "WELFARE_NGO"] as const;

export default function ClinicDoctorContractPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const memberId = params?.memberId as string | undefined;
  const [activeContract, setActiveContract] = useState<Record<string, unknown> | null>(null);
  const [contractHistory, setContractHistory] = useState<unknown[]>([]);
  const [ratePreview, setRatePreview] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!branchId || !memberId) return;
    try {
      setLoading(true);
      setError("");
      const [active, history] = await Promise.all([
        ownerClinicDoctorContract(branchId, memberId),
        ownerClinicDoctorContractsList(branchId, memberId),
      ]);
      setActiveContract(active as Record<string, unknown> | null);
      setContractHistory((history.items ?? []) as unknown[]);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load contract");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId, memberId]);

  if (!branchId || !memberId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or doctor.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Doctor contract"
        subtitle={`Doctor #${memberId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Doctors", href: `/owner/clinic/${branchId}/doctors` },
          { label: "Doctor", href: `/owner/clinic/${branchId}/doctors/${memberId}` },
          { label: "Contract", href: `/owner/clinic/${branchId}/doctors/${memberId}/contract` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : (
        <>
          <div className="card radius-12 mb-4">
            <div className="card-header bg-transparent">
              <h6 className="mb-0">Active contract</h6>
            </div>
            <div className="card-body">
              {activeContract ? (
                <dl className="row mb-0">
                  <dt className="col-sm-3">Type</dt>
                  <dd className="col-sm-9"><span className="badge bg-primary radius-8">{(activeContract.contractType as string) ?? "—"}</span></dd>
                  <dt className="col-sm-3">Effective from</dt>
                  <dd className="col-sm-9">{activeContract.effectiveFrom ? new Date(activeContract.effectiveFrom as string).toLocaleDateString() : "—"}</dd>
                  <dt className="col-sm-3">Effective to</dt>
                  <dd className="col-sm-9">{activeContract.effectiveTo ? new Date(activeContract.effectiveTo as string).toLocaleDateString() : "Open"}</dd>
                  <dt className="col-sm-3">Status</dt>
                  <dd className="col-sm-9">{String(activeContract.status ?? "—")}</dd>
                </dl>
              ) : (
                <p className="text-muted mb-0">No active contract. Create one via API or add a form.</p>
              )}
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-header bg-transparent">
              <h6 className="mb-0">Contract history</h6>
            </div>
            <div className="card-body">
              {contractHistory.length === 0 ? (
                <p className="text-muted mb-0">No contracts on record.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(contractHistory as Array<{ contractType?: string; effectiveFrom?: string; effectiveTo?: string; status?: string }>).map((c, i) => (
                        <tr key={i}>
                          <td>{c.contractType ?? "—"}</td>
                          <td>{c.effectiveFrom ? new Date(c.effectiveFrom).toLocaleDateString() : "—"}</td>
                          <td>{c.effectiveTo ? new Date(c.effectiveTo).toLocaleDateString() : "Open"}</td>
                          <td>{c.status ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}/doctors/${memberId}`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to doctor
        </Link>
      </div>
    </div>
  );
}
