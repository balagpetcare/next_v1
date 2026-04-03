"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  doctorGetSurgery,
  doctorUpdateSurgeryNotes,
  doctorSurgeryStart,
  doctorSurgeryComplete,
} from "@/lib/api";

const ALLOWED_START = ["READY_FOR_OT"];
const ALLOWED_COMPLETE = ["IN_PROGRESS"];

export default function DoctorSurgeryDetailPage() {
  const params = useParams();
  const id = useMemo(() => (params?.id ? Number(params.id) : null), [params?.id]);
  const [surgery, setSurgery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notesForm, setNotesForm] = useState({ operativeNotes: "", postopNotes: "", complicationNotes: "" });
  const [notesSaving, setNotesSaving] = useState(false);
  const [actioning, setActioning] = useState(false);

  const loadSurgery = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    doctorGetSurgery(id)
      .then((data) => {
        setSurgery(data ?? null);
        setNotesForm({
          operativeNotes: data?.operativeNotes ?? "",
          postopNotes: data?.postopNotes ?? "",
          complicationNotes: data?.complicationNotes ?? "",
        });
      })
      .catch(() => {
        setSurgery(null);
        setError("Surgery not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadSurgery();
  }, [loadSurgery]);

  const handleSaveNotes = useCallback(() => {
    if (!id) return;
    setNotesSaving(true);
    doctorUpdateSurgeryNotes(id, notesForm)
      .then((updated) => {
        setSurgery(updated ?? surgery);
        setError("");
      })
      .catch((e) => setError(e?.message ?? "Failed to save notes"))
      .finally(() => setNotesSaving(false));
  }, [id, notesForm, surgery]);

  const handleStart = useCallback(() => {
    if (!id) return;
    setActioning(true);
    doctorSurgeryStart(id)
      .then((updated) => setSurgery(updated ?? surgery))
      .catch((e) => setError(e?.message ?? "Failed to start"))
      .finally(() => setActioning(false));
  }, [id, surgery]);

  const handleComplete = useCallback(() => {
    if (!id) return;
    setActioning(true);
    doctorSurgeryComplete(id)
      .then((updated) => setSurgery(updated ?? surgery))
      .catch((e) => setError(e?.message ?? "Failed to complete"))
      .finally(() => setActioning(false));
  }, [id, surgery]);

  if (id == null) {
    return (
      <div className="container-fluid py-24">
        <p className="text-muted">Invalid surgery ID.</p>
        <Link href="/doctor/surgeries" className="btn btn-outline-secondary btn-sm">← Surgeries</Link>
      </div>
    );
  }

  if (loading && !surgery) {
    return (
      <div className="container-fluid py-24 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error && !surgery) {
    return (
      <div className="container-fluid py-24">
        <div className="alert alert-danger">{error}</div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadSurgery}>Retry</button>
        <Link href="/doctor/surgeries" className="btn btn-outline-secondary btn-sm ms-2">← Surgeries</Link>
      </div>
    );
  }

  const s = surgery!;
  const canStart = ALLOWED_START.includes(s.status);
  const canComplete = ALLOWED_COMPLETE.includes(s.status);

  return (
    <div className="container-fluid py-24">
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href="/doctor/surgeries" className="btn btn-outline-secondary btn-sm">← Surgeries</Link>
        <h5 className="mb-0">{s.caseNumber ?? `Surgery #${id}`}</h5>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Case details</strong></div>
            <div className="card-body small">
              <dl className="row mb-0">
                <dt className="col-4">Status</dt>
                <dd className="col-8"><span className={`badge ${s.status === "COMPLETED" ? "bg-success" : "bg-light text-dark"}`}>{s.status}</span></dd>
                <dt className="col-4">Pet</dt>
                <dd className="col-8">{s.pet?.name ?? "—"}</dd>
                <dt className="col-4">Owner</dt>
                <dd className="col-8">{s.patient?.profile?.displayName ?? "—"}</dd>
                <dt className="col-4">Service</dt>
                <dd className="col-8">{s.service?.name ?? "—"}</dd>
                <dt className="col-4">Scheduled</dt>
                <dd className="col-8">{s.scheduledStartAt ? new Date(s.scheduledStartAt).toLocaleString() : "—"}</dd>
                <dt className="col-4">OT room</dt>
                <dd className="col-8">{s.room?.name ?? s.room?.code ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Actions</strong></div>
            <div className="card-body">
              {canStart && (
                <button type="button" className="btn btn-primary btn-sm me-2" disabled={actioning} onClick={handleStart}>
                  {actioning ? "…" : "Start surgery"}
                </button>
              )}
              {canComplete && (
                <button type="button" className="btn btn-success btn-sm" disabled={actioning} onClick={handleComplete}>
                  {actioning ? "…" : "Complete surgery"}
                </button>
              )}
              {!canStart && !canComplete && <p className="text-muted small mb-0">No status action available from {s.status}.</p>}
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card">
            <div className="card-header"><strong>Clinical notes</strong></div>
            <div className="card-body">
              <div className="row g-2 mb-2">
                <div className="col-12">
                  <label className="form-label small">Operative notes</label>
                  <textarea className="form-control form-control-sm" rows={3} value={notesForm.operativeNotes} onChange={(e) => setNotesForm((f) => ({ ...f, operativeNotes: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label small">Post-op notes</label>
                  <textarea className="form-control form-control-sm" rows={2} value={notesForm.postopNotes} onChange={(e) => setNotesForm((f) => ({ ...f, postopNotes: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label small">Complication notes</label>
                  <textarea className="form-control form-control-sm" rows={2} value={notesForm.complicationNotes} onChange={(e) => setNotesForm((f) => ({ ...f, complicationNotes: e.target.value }))} />
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" disabled={notesSaving} onClick={handleSaveNotes}>{notesSaving ? "Saving…" : "Save notes"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
