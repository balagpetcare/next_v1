"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicLabRequisitionCreate,
  staffClinicLabRequisitionsByVisit,
  staffClinicLabReportAdd,
} from "@/lib/api";

export default function ClinicLabPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const visitIdParam = searchParams?.get("visitId");
  const [branchId, setBranchId] = useState(branchIdParam);
  const [visitId, setVisitId] = useState(visitIdParam ? String(visitIdParam) : "");
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    visitId: "",
    petId: "",
    testsJson: "[]",
    notes: "",
  });
  const [reportForm, setReportForm] = useState({ requisitionId: "", fileUrl: "", abnormalFlags: "{}", notes: "", items: "[]" });

  useEffect(() => {
    setBranchId(branchIdParam);
    if (visitIdParam) setVisitId(String(visitIdParam));
  }, [branchIdParam, visitIdParam]);

  useEffect(() => {
    if (!branchId || !visitId) return;
    loadRequisitions();
  }, [branchId, visitId]);

  async function loadRequisitions() {
    if (!branchId || !visitId) return;
    const vid = Number(visitId);
    if (!vid) return;
    setLoading(true);
    setError("");
    try {
      const list = await staffClinicLabRequisitionsByVisit(branchId, vid);
      setRequisitions(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load requisitions");
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRequisition(e) {
    e.preventDefault();
    if (!branchId) return;
    setActioning("create");
    setError("");
    try {
      let testsJson;
      try {
        testsJson = JSON.parse(createForm.testsJson || "[]");
      } catch {
        testsJson = [];
      }
      await staffClinicLabRequisitionCreate(branchId, {
        visitId: Number(createForm.visitId),
        petId: Number(createForm.petId),
        testsJson,
        notes: createForm.notes || undefined,
      });
      setShowCreate(false);
      setCreateForm({ visitId: "", petId: "", testsJson: "[]", notes: "" });
      if (visitId) await loadRequisitions();
    } catch (e) {
      setError((e && e.message) || "Create requisition failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleAddReport(e) {
    e.preventDefault();
    if (!branchId || !reportForm.requisitionId) return;
    setActioning("report");
    setError("");
    try {
      let abnormalFlags = {};
      let items = [];
      try {
        abnormalFlags = JSON.parse(reportForm.abnormalFlags || "{}");
      } catch {}
      try {
        items = JSON.parse(reportForm.items || "[]");
      } catch {}
      await staffClinicLabReportAdd(branchId, Number(reportForm.requisitionId), {
        fileUrl: reportForm.fileUrl || undefined,
        abnormalFlags: Object.keys(abnormalFlags).length ? abnormalFlags : undefined,
        notes: reportForm.notes || undefined,
        items: items.length ? items : undefined,
      });
      setReportForm({ requisitionId: "", fileUrl: "", abnormalFlags: "{}", notes: "", items: "[]" });
      if (visitId) await loadRequisitions();
    } catch (e) {
      setError((e && e.message) || "Add report failed");
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const visitQ = branchId && visitId ? `?branchId=${encodeURIComponent(branchId)}&visitId=${visitId}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Lab & Diagnostics</h6>
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
              placeholder="Visit ID"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              style={{ width: "90px" }}
            />
            <Link href={`/clinic/visits${q}`} className="btn btn-sm btn-outline-secondary radius-12">Visits</Link>
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>
      )}

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter branch ID and Visit ID to manage lab requisitions and reports.</p>
          </div>
        </div>
      )}

      {branchId && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Create requisition</h6>
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? "Cancel" : "New requisition"}
              </button>
            </div>
            {showCreate && (
              <div className="card-body border-top">
                <form onSubmit={handleCreateRequisition} className="row g-2 align-items-end">
                  <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Visit ID" value={createForm.visitId} onChange={(e) => setCreateForm((f) => ({ ...f, visitId: e.target.value }))} required /></div>
                  <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Pet ID" value={createForm.petId} onChange={(e) => setCreateForm((f) => ({ ...f, petId: e.target.value }))} required /></div>
                  <div className="col-md-4"><input type="text" className="form-control form-control-sm" placeholder='Tests JSON e.g. ["CBC","Biochem"]' value={createForm.testsJson} onChange={(e) => setCreateForm((f) => ({ ...f, testsJson: e.target.value }))} /></div>
                  <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  <div className="col-auto"><button type="submit" className="btn btn-sm btn-success radius-12" disabled={!!actioning}>{actioning === "create" ? "..." : "Create"}</button></div>
                </form>
              </div>
            )}
          </div>

          {visitId && (
            <>
              <div className="card radius-12 mb-3">
                <div className="card-header"><h6 className="mb-0">Requisitions (Visit #{visitId})</h6></div>
                <div className="card-body">
                  {loading && <p className="text-muted mb-0">Loading...</p>}
                  {!loading && requisitions.length === 0 && <p className="text-muted mb-0">No requisitions for this visit.</p>}
                  {!loading && requisitions.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Pet ID</th>
                            <th>Tests</th>
                            <th>Notes</th>
                            <th>Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requisitions.map((r) => (
                            <tr key={r.id}>
                              <td>{r.id}</td>
                              <td>{r.petId ?? "—"}</td>
                              <td><pre className="mb-0 small">{typeof r.testsJson === "object" ? JSON.stringify(r.testsJson) : String(r.testsJson ?? "—")}</pre></td>
                              <td>{r.notes || "—"}</td>
                              <td>{r.report ? "Yes" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="card radius-12 mb-3">
                <div className="card-header"><h6 className="mb-0">Add report (abnormal flags / result items)</h6></div>
                <div className="card-body">
                  <form onSubmit={handleAddReport} className="row g-2 align-items-end">
                    <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Requisition ID" value={reportForm.requisitionId} onChange={(e) => setReportForm((f) => ({ ...f, requisitionId: e.target.value }))} required /></div>
                    <div className="col-md-2"><input type="url" className="form-control form-control-sm" placeholder="File URL" value={reportForm.fileUrl} onChange={(e) => setReportForm((f) => ({ ...f, fileUrl: e.target.value }))} /></div>
                    <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder='Abnormal flags {"key":"H"}' value={reportForm.abnormalFlags} onChange={(e) => setReportForm((f) => ({ ...f, abnormalFlags: e.target.value }))} /></div>
                    <div className="col-md-2"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={reportForm.notes} onChange={(e) => setReportForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                    <div className="col-auto"><button type="submit" className="btn btn-sm btn-primary radius-12" disabled={!!actioning}>{actioning === "report" ? "..." : "Add report"}</button></div>
                  </form>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
