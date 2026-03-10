"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicVaccinationsList,
  staffClinicVaccinationsNextDue,
  staffClinicVaccinationRecord,
  staffClinicVaccinationCertificate,
  staffClinicDewormingList,
  staffClinicDewormingRecord,
} from "@/lib/api";

export default function ClinicVaccinationsPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const petIdParam = searchParams?.get("petId");
  const [branchId, setBranchId] = useState(branchIdParam);
  const [petId, setPetId] = useState(petIdParam ? String(petIdParam) : "");
  const [vaccinations, setVaccinations] = useState([]);
  const [nextDue, setNextDue] = useState([]);
  const [deworming, setDeworming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);
  const [certToken, setCertToken] = useState("");
  const [certResult, setCertResult] = useState(null);
  const [vacForm, setVacForm] = useState({
    vaccineTypeId: "",
    administeredAt: new Date().toISOString().slice(0, 16),
    nextDueDate: "",
    batchNumber: "",
    manufacturer: "",
    notes: "",
  });
  const [dewForm, setDewForm] = useState({
    medicationName: "",
    dosage: "",
    weightAtTime: "",
    nextDueDate: "",
    notes: "",
  });

  useEffect(() => {
    setBranchId(branchIdParam);
    if (petIdParam) setPetId(String(petIdParam));
  }, [branchIdParam, petIdParam]);

  useEffect(() => {
    if (!branchId || !petId) return;
    loadData();
  }, [branchId, petId]);

  async function loadData() {
    if (!branchId || !petId) return;
    const pid = Number(petId);
    if (!pid) return;
    setLoading(true);
    setError("");
    try {
      const [vacList, dueList, dewList] = await Promise.all([
        staffClinicVaccinationsList(branchId, pid),
        staffClinicVaccinationsNextDue(branchId, pid),
        staffClinicDewormingList(branchId, pid),
      ]);
      setVaccinations(Array.isArray(vacList) ? vacList : []);
      setNextDue(Array.isArray(dueList) ? dueList : []);
      setDeworming(Array.isArray(dewList) ? dewList : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load");
      setVaccinations([]);
      setNextDue([]);
      setDeworming([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordVaccination(e) {
    e.preventDefault();
    if (!branchId || !petId) return;
    setActioning("vac");
    setError("");
    try {
      await staffClinicVaccinationRecord(branchId, {
        petId: Number(petId),
        vaccineTypeId: Number(vacForm.vaccineTypeId),
        administeredAt: vacForm.administeredAt || undefined,
        nextDueDate: vacForm.nextDueDate || undefined,
        batchNumber: vacForm.batchNumber || undefined,
        manufacturer: vacForm.manufacturer || undefined,
        notes: vacForm.notes || undefined,
      });
      setVacForm({
        vaccineTypeId: "",
        administeredAt: new Date().toISOString().slice(0, 16),
        nextDueDate: "",
        batchNumber: "",
        manufacturer: "",
        notes: "",
      });
      await loadData();
    } catch (e) {
      setError((e && e.message) || "Record vaccination failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleRecordDeworming(e) {
    e.preventDefault();
    if (!branchId || !petId) return;
    setActioning("dew");
    setError("");
    try {
      await staffClinicDewormingRecord(branchId, {
        petId: Number(petId),
        medicationName: dewForm.medicationName,
        dosage: dewForm.dosage || undefined,
        weightAtTime: dewForm.weightAtTime ? Number(dewForm.weightAtTime) : undefined,
        nextDueDate: dewForm.nextDueDate || undefined,
        notes: dewForm.notes || undefined,
      });
      setDewForm({ medicationName: "", dosage: "", weightAtTime: "", nextDueDate: "", notes: "" });
      await loadData();
    } catch (e) {
      setError((e && e.message) || "Record deworming failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleCertificateLookup() {
    if (!branchId || !certToken.trim()) return;
    setActioning("cert");
    setError("");
    setCertResult(null);
    try {
      const data = await staffClinicVaccinationCertificate(branchId, certToken.trim());
      setCertResult(data);
    } catch (e) {
      setError((e && e.message) || "Certificate lookup failed");
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const petQ = branchId && petId ? `?branchId=${encodeURIComponent(branchId)}&petId=${petId}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Vaccinations & Deworming</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "100px" }}
            />
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="Pet ID"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              style={{ width: "90px" }}
            />
            <Link href={`/clinic/patients${q}`} className="btn btn-sm btn-outline-secondary radius-12">Patients</Link>
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>
      )}

      {/* Certificate by token (no petId required) */}
      <div className="card radius-12 mb-3">
        <div className="card-header"><h6 className="mb-0">Vaccination certificate (by token)</h6></div>
        <div className="card-body">
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Certificate token"
              value={certToken}
              onChange={(e) => setCertToken(e.target.value)}
              style={{ width: "220px" }}
            />
            <button type="button" className="btn btn-sm btn-primary radius-12" onClick={handleCertificateLookup} disabled={!!actioning}>
              {actioning === "cert" ? "..." : "Lookup"}
            </button>
          </div>
          {certResult && (
            <div className="mt-3 p-3 bg-light radius-12 small">
              <pre className="mb-0">{JSON.stringify(certResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter branch ID and Pet ID to view history and record vaccinations/deworming.</p>
          </div>
        </div>
      )}

      {branchId && petId && (
        <>
          {loading && <p className="text-muted mb-2">Loading...</p>}

          {/* Next due */}
          {!loading && nextDue.length > 0 && (
            <div className="card radius-12 mb-3">
              <div className="card-header"><h6 className="mb-0">Next due</h6></div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  {nextDue.map((d, i) => (
                    <li key={i} className="mb-1">{typeof d === "object" ? JSON.stringify(d) : String(d)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Vaccination history */}
          <div className="card radius-12 mb-3">
            <div className="card-header"><h6 className="mb-0">Vaccination history</h6></div>
            <div className="card-body">
              {!loading && vaccinations.length === 0 && <p className="text-muted mb-0">No vaccinations recorded.</p>}
              {!loading && vaccinations.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type / Batch</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaccinations.map((v) => (
                        <tr key={v.id}>
                          <td>{v.administeredAt ? new Date(v.administeredAt).toLocaleDateString() : "—"}</td>
                          <td>{v.vaccineTypeId ?? v.vaccineType?.name ?? "—"} {v.batchNumber ? ` · ${v.batchNumber}` : ""}</td>
                          <td>{v.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Record vaccination */}
          <div className="card radius-12 mb-3">
            <div className="card-header"><h6 className="mb-0">Record vaccination</h6></div>
            <div className="card-body">
              <form onSubmit={handleRecordVaccination} className="row g-2 align-items-end">
                <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Vaccine type ID" value={vacForm.vaccineTypeId} onChange={(e) => setVacForm((f) => ({ ...f, vaccineTypeId: e.target.value }))} required /></div>
                <div className="col-md-2"><input type="datetime-local" className="form-control form-control-sm" value={vacForm.administeredAt} onChange={(e) => setVacForm((f) => ({ ...f, administeredAt: e.target.value }))} /></div>
                <div className="col-md-2"><input type="date" className="form-control form-control-sm" placeholder="Next due" value={vacForm.nextDueDate} onChange={(e) => setVacForm((f) => ({ ...f, nextDueDate: e.target.value }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Batch" value={vacForm.batchNumber} onChange={(e) => setVacForm((f) => ({ ...f, batchNumber: e.target.value }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Manufacturer" value={vacForm.manufacturer} onChange={(e) => setVacForm((f) => ({ ...f, manufacturer: e.target.value }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={vacForm.notes} onChange={(e) => setVacForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                <div className="col-auto"><button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "vac" ? "..." : "Record"}</button></div>
              </form>
            </div>
          </div>

          {/* Deworming */}
          <div className="card radius-12 mb-3">
            <div className="card-header"><h6 className="mb-0">Deworming</h6></div>
            <div className="card-body">
              {!loading && deworming.length > 0 && (
                <div className="table-responsive mb-3">
                  <table className="table table-bordered table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Next due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deworming.map((r) => (
                        <tr key={r.id}>
                          <td>{r.administeredAt ? new Date(r.administeredAt).toLocaleDateString() : r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                          <td>{r.medicationName ?? "—"}</td>
                          <td>{r.dosage ?? "—"}</td>
                          <td>{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={handleRecordDeworming} className="row g-2 align-items-end">
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Medication name" value={dewForm.medicationName} onChange={(e) => setDewForm((f) => ({ ...f, medicationName: e.target.value }))} required /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Dosage" value={dewForm.dosage} onChange={(e) => setDewForm((f) => ({ ...f, dosage: e.target.value }))} /></div>
                <div className="col-md-2"><input type="number" step="0.1" className="form-control form-control-sm" placeholder="Weight (kg)" value={dewForm.weightAtTime} onChange={(e) => setDewForm((f) => ({ ...f, weightAtTime: e.target.value }))} /></div>
                <div className="col-md-2"><input type="date" className="form-control form-control-sm" placeholder="Next due" value={dewForm.nextDueDate} onChange={(e) => setDewForm((f) => ({ ...f, nextDueDate: e.target.value }))} /></div>
                <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={dewForm.notes} onChange={(e) => setDewForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                <div className="col-auto"><button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "dew" ? "..." : "Record deworming"}</button></div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
