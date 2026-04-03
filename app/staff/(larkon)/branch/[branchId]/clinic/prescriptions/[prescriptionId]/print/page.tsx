"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicPrescriptionGet } from "@/lib/api";
import { PRIMARY_NOT_FOUND } from "@/lib/clinicNotFoundHelpers";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const PERMS = ["clinic.prescription.read"];

export default function PrescriptionPrintPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const prescriptionId = useMemo(() => Number(params?.prescriptionId), [params?.prescriptionId]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!branchId || !prescriptionId) return;
    setLoading(true);
    setError("");
    staffClinicPrescriptionGet(branchId, prescriptionId)
      .then((p) => {
        const bid = Number(branchId);
        if (p?.visit?.branchId != null && p.visit.branchId !== bid) {
          setPrescription(null);
          setError(PRIMARY_NOT_FOUND.prescription);
          return;
        }
        setPrescription(p);
        setError("");
      })
      .catch(() => {
        setPrescription(null);
        setError(PRIMARY_NOT_FOUND.prescription);
      })
      .finally(() => setLoading(false));
  }, [branchId, prescriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (isLoading || (loading && !prescription)) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="clinic.prescription.read" onBack={() => window.history.back()} />;
  }
  if (error || !prescription) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-danger">
          {error || PRIMARY_NOT_FOUND.prescription}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load}>Retry</button>
            <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-sm btn-outline-secondary">← Visits</Link>
          </div>
        </div>
      </div>
    );
  }

  const visitId = prescription.visitId ?? prescription.visit?.id;
  const petName = prescription.pet?.name ?? "—";
  const ownerName = (prescription.visit?.patient as any)?.profile?.displayName ?? (prescription.patient as any)?.profile?.displayName ?? "—";
  const doctorName = (prescription.doctor as any)?.user?.profile?.displayName ?? "—";

  return (
    <div className="container py-24">
      <div className="d-print-none">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <Link href={`/staff/branch/${branchId}/clinic/visits/${visitId}`} className="btn btn-outline-secondary btn-sm">← Visit</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>Print</button>
        </div>
      </div>

      <div className="card radius-12 border p-4 print-only-content">
        <h5 className="mb-3">Prescription #{prescription.id}</h5>
        <dl className="row small mb-2">
          <dt className="col-sm-3">Pet</dt>
          <dd className="col-sm-9">{petName}</dd>
          <dt className="col-sm-3">Owner</dt>
          <dd className="col-sm-9">{ownerName}</dd>
          <dt className="col-sm-3">Doctor</dt>
          <dd className="col-sm-9">{doctorName}</dd>
          <dt className="col-sm-3">Status</dt>
          <dd className="col-sm-9">{prescription.status ?? "—"}</dd>
          {prescription.notes && (
            <>
              <dt className="col-sm-3">Notes</dt>
              <dd className="col-sm-9">{prescription.notes}</dd>
            </>
          )}
        </dl>
        <table className="table table-sm table-bordered">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {(prescription.items ?? []).map((item: any, i: number) => (
              <tr key={item.id ?? i}>
                <td>{item.medicineName ?? "—"}</td>
                <td>{item.dosage ?? "—"}</td>
                <td>{item.frequency ?? "—"}</td>
                <td>{item.duration ?? "—"}</td>
                <td>{item.quantity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          .d-print-none { display: none !important; }
          .print-only-content { box-shadow: none; border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
}
