"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicPrescriptionsByVisit,
  staffClinicPrescriptionCreate,
  staffClinicPrescriptionGet,
  staffClinicPrescriptionByQr,
  staffClinicPrescriptionFinalize,
  staffClinicPrescriptionDispense,
  staffClinicMedicineSearch,
} from "@/lib/api";

export default function ClinicPrescriptionsPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams?.get("branchId") || "";
  const visitIdParam = searchParams?.get("visitId");
  const visitId = visitIdParam ? Number(visitIdParam) : null;
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const [qrResult, setQrResult] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    petId: "",
    doctorId: "",
    notes: "",
    items: [{ medicineName: "", dosage: "", frequency: "", duration: "" }],
  });
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);

  useEffect(() => {
    if (!branchId || !visitId) return;
    loadPrescriptions();
  }, [branchId, visitId]);

  async function loadPrescriptions() {
    if (!branchId || !visitId) return;
    setLoading(true);
    setError("");
    try {
      const list = await staffClinicPrescriptionsByVisit(branchId, visitId);
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!branchId || !medicineSearch || medicineSearch.length < 2) {
      setMedicineSuggestions([]);
      return;
    }
    let cancelled = false;
    staffClinicMedicineSearch(branchId, medicineSearch, 10).then((items) => {
      if (!cancelled) setMedicineSuggestions(items || []);
    });
    return () => { cancelled = true; };
  }, [branchId, medicineSearch]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!branchId || !visitId) return;
    setActioning("create");
    setError("");
    try {
      const items = createForm.items
        .filter((i) => i.medicineName)
        .map((i) => ({
          medicineName: i.medicineName,
          dosage: i.dosage || "",
          frequency: i.frequency || "",
          duration: i.duration || "",
        }));
      await staffClinicPrescriptionCreate(branchId, visitId, {
        petId: Number(createForm.petId),
        doctorId: Number(createForm.doctorId),
        notes: createForm.notes || undefined,
        items,
      });
      setShowCreate(false);
      setCreateForm({
        petId: "",
        doctorId: "",
        notes: "",
        items: [{ medicineName: "", dosage: "", frequency: "", duration: "" }],
      });
      await loadPrescriptions();
    } catch (e) {
      setError((e && e.message) || "Create prescription failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleFinalize(prescriptionId) {
    if (!branchId) return;
    setActioning(prescriptionId);
    setError("");
    try {
      await staffClinicPrescriptionFinalize(branchId, prescriptionId);
      if (visitId) await loadPrescriptions();
    } catch (e) {
      setError((e && e.message) || "Finalize failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleDispense(prescriptionId) {
    if (!branchId) return;
    setActioning(prescriptionId);
    setError("");
    try {
      await staffClinicPrescriptionDispense(branchId, prescriptionId);
      if (visitId) await loadPrescriptions();
    } catch (e) {
      setError((e && e.message) || "Dispense failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleQrVerify() {
    if (!branchId || !qrToken.trim()) return;
    setActioning("qr");
    setError("");
    setQrResult(null);
    try {
      const data = await staffClinicPrescriptionByQr(branchId, qrToken.trim());
      setQrResult(data);
    } catch (e) {
      setError((e && e.message) || "Verify failed");
      setQrResult(null);
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const visitQ = visitId ? `&visitId=${visitId}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Prescriptions</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              readOnly
              style={{ width: "100px" }}
            />
            {visitId && (
              <Link href={`/clinic/visits/${visitId}?branchId=${encodeURIComponent(branchId)}`} className="btn btn-sm btn-outline-secondary radius-12">
                Visit #{visitId}
              </Link>
            )}
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
      </div>

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Open with branchId (and optionally visitId) to list prescriptions.</p>
          </div>
        </div>
      )}

      {branchId && !visitId && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-2">Verify by QR</h6>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="QR token"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                style={{ width: "200px" }}
              />
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={handleQrVerify} disabled={!!actioning}>
                {actioning === "qr" ? "..." : "Verify"}
              </button>
            </div>
            {qrResult && (
              <div className="mt-3 p-3 bg-light radius-12 small">
                <pre className="mb-0">{JSON.stringify(qrResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>
      )}

      {branchId && visitId && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0">List (Visit #{visitId})</h6>
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? "Cancel" : "Create prescription"}
              </button>
            </div>
            {showCreate && (
              <div className="card-body border-top">
                <form onSubmit={handleCreate}>
                  <div className="row g-2 mb-2">
                    <div className="col-md-3"><input type="number" className="form-control form-control-sm" placeholder="Pet ID" value={createForm.petId} onChange={(e) => setCreateForm((f) => ({ ...f, petId: e.target.value }))} required /></div>
                    <div className="col-md-3"><input type="number" className="form-control form-control-sm" placeholder="Doctor ID" value={createForm.doctorId} onChange={(e) => setCreateForm((f) => ({ ...f, doctorId: e.target.value }))} required /></div>
                    <div className="col-md-6"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  {(createForm.items || []).map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-center">
                      <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Medicine name" value={item.medicineName} onChange={(e) => setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, medicineName: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Dosage" value={item.dosage} onChange={(e) => setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Frequency" value={item.frequency} onChange={(e) => setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, frequency: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Duration" value={item.duration} onChange={(e) => setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, duration: e.target.value } : it) }))} /></div>
                    </div>
                  ))}
                  <button type="submit" className="btn btn-sm btn-success radius-12" disabled={!!actioning}>{actioning === "create" ? "..." : "Create"}</button>
                </form>
              </div>
            )}
          </div>

          <div className="card radius-12">
            <div className="card-body">
              {loading && <p className="text-muted mb-0">Loading...</p>}
              {!loading && prescriptions.length === 0 && <p className="text-muted mb-0">No prescriptions for this visit.</p>}
              {!loading && prescriptions.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td><span className={`badge ${p.status === "DISPENSED" ? "bg-success" : p.status === "FINALIZED" ? "bg-info" : "bg-secondary"} radius-12`}>{p.status || "DRAFT"}</span></td>
                          <td>{(p.items || p.lines || []).length} item(s)</td>
                          <td className="text-end">
                            {p.status === "DRAFT" && (
                              <button type="button" className="btn btn-sm btn-outline-primary me-1 radius-12" onClick={() => handleFinalize(p.id)} disabled={!!actioning}>
                                {actioning === p.id ? "..." : "Finalize"}
                              </button>
                            )}
                            {p.status === "FINALIZED" && (
                              <button type="button" className="btn btn-sm btn-success radius-12" onClick={() => handleDispense(p.id)} disabled={!!actioning}>
                                {actioning === p.id ? "..." : "Dispense"}
                              </button>
                            )}
                          </td>
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
    </div>
  );
}
