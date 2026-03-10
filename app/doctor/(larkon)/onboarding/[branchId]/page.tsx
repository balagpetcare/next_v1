"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doctorGetOnboarding,
  doctorCompleteOnboarding,
  doctorPutMyServices,
  doctorPutMySchedule,
} from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof doctorGetOnboarding>>>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const r = await doctorGetOnboarding(Number(branchId));
      setData(r ?? null);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const [selectedServices, setSelectedServices] = useState<Record<number, { fee: number; durationMin?: number }>>({});
  const [templates, setTemplates] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number }>>([]);

  if (!branchId) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">Invalid branch.</div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const branch = data.branch as { id: number; name: string } | undefined;
  const services = (data.services as { id: number; name: string; category: string; price: number; duration?: number; department?: string }[]) ?? [];

  const handleSaveServices = async () => {
    const list = Object.entries(selectedServices).map(([serviceId, v]) => ({
      serviceId: Number(serviceId),
      fee: v.fee,
      durationMin: v.durationMin ?? null,
      isActive: true,
    }));
    if (list.length === 0) {
      setError("Select at least one service and set a fee.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await doctorPutMyServices(Number(branchId), { services: list });
      setStep(3);
    } catch (e) {
      setError((e as Error)?.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (templates.length === 0) {
      setError("Add at least one schedule block (day + time range).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await doctorPutMySchedule(Number(branchId), {
        templates: templates.map((t) => ({
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          slotMinutes: t.slotMinutes ?? 15,
        })),
      });
      setStep(4);
    } catch (e) {
      setError((e as Error)?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError("");
    try {
      await doctorCompleteOnboarding(Number(branchId));
      router.replace("/doctor/dashboard");
    } catch (e) {
      setError((e as Error)?.message || "Complete failed. Add at least one service and one schedule block.");
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    setTemplates((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotMinutes: 15 }]);
  };

  const removeTemplate = (idx: number) => {
    setTemplates((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="container py-5">
      <div className="card radius-12 shadow-sm">
        <div className="card-body p-24">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-secondary radius-12">
              <i className="ri-arrow-left-line" />
            </Link>
            <h4 className="mb-0">Setup: {branch?.name ?? `Branch #${branchId}`}</h4>
          </div>

          <ul className="nav nav-pills mb-4">
            {[1, 2, 3, 4].map((s) => (
              <li key={s} className="nav-item">
                <button
                  type="button"
                  className={`nav-link radius-12 ${step === s ? "active" : ""}`}
                  onClick={() => setStep(s)}
                  disabled={s > step}
                >
                  Step {s}
                </button>
              </li>
            ))}
          </ul>

          {error && (
            <div className="alert alert-danger radius-12 mb-3">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <h5 className="mb-3">Clinic overview</h5>
              <p className="text-muted">You have been invited to practice at this clinic. Complete the steps below to set your services and availability.</p>
              <div className="mb-3">
                <strong>Branch:</strong> {branch?.name}
              </div>
              <button type="button" className="btn btn-primary radius-12" onClick={() => setStep(2)}>
                Next: Services & pricing
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h5 className="mb-3">Services & pricing</h5>
              <p className="text-muted mb-3">Select the services you provide and set your fee for each.</p>
              <div className="table-responsive mb-3">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Base price</th>
                      <th>Your fee</th>
                      <th>Duration (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <label className="d-flex align-items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedServices[s.id] != null}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices((prev) => ({ ...prev, [s.id]: { fee: s.price, durationMin: s.duration ?? 15 } }));
                                } else {
                                  setSelectedServices((prev) => {
                                    const next = { ...prev };
                                    delete next[s.id];
                                    return next;
                                  });
                                }
                              }}
                            />
                            {s.name}
                          </label>
                        </td>
                        <td>{s.category}</td>
                        <td>{s.price}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-100"
                            style={{ maxWidth: 100 }}
                            value={selectedServices[s.id]?.fee ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (selectedServices[s.id]) {
                                setSelectedServices((prev) => ({ ...prev, [s.id]: { ...prev[s.id], fee: Number.isNaN(v) ? 0 : v } }));
                              }
                            }}
                            disabled={selectedServices[s.id] == null}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-100"
                            style={{ maxWidth: 80 }}
                            value={selectedServices[s.id]?.durationMin ?? ""}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (selectedServices[s.id]) {
                                setSelectedServices((prev) => ({ ...prev, [s.id]: { ...prev[s.id], durationMin: Number.isNaN(v) ? undefined : v } }));
                              }
                            }}
                            disabled={selectedServices[s.id] == null}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-primary radius-12" onClick={handleSaveServices} disabled={saving}>
                  {saving ? "Saving…" : "Save & Next: Schedule"}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h5 className="mb-3">Weekly schedule</h5>
              <p className="text-muted mb-3">Add your available time blocks (e.g. Mon 09:00–17:00).</p>
              {templates.length === 0 && (
                <p className="text-warning mb-2">Add at least one block.</p>
              )}
              {templates.map((t, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 100 }}
                    value={t.dayOfWeek}
                    onChange={(e) => setTemplates((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], dayOfWeek: parseInt(e.target.value, 10) };
                      return next;
                    })}
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    style={{ width: 100 }}
                    value={t.startTime}
                    onChange={(e) => setTemplates((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], startTime: e.target.value };
                      return next;
                    })}
                  />
                  <span>–</span>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    style={{ width: 100 }}
                    value={t.endTime}
                    onChange={(e) => setTemplates((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], endTime: e.target.value };
                      return next;
                    })}
                  />
                  <input
                    type="number"
                    placeholder="Slot min"
                    className="form-control form-control-sm"
                    style={{ width: 80 }}
                    value={t.slotMinutes}
                    onChange={(e) => setTemplates((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], slotMinutes: parseInt(e.target.value, 10) || 15 };
                      return next;
                    })}
                  />
                  <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={() => removeTemplate(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline-primary btn-sm radius-12 mb-3" onClick={addTemplate}>
                + Add block
              </button>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="btn btn-primary radius-12" onClick={handleSaveSchedule} disabled={saving}>
                  {saving ? "Saving…" : "Save & Next: Review"}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h5 className="mb-3">Review & complete</h5>
              <p className="text-muted mb-3">You have set your services and schedule. Click Complete to finish setup.</p>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setStep(3)}>Back</button>
                <button type="button" className="btn btn-success radius-12" onClick={handleComplete} disabled={saving}>
                  {saving ? "Completing…" : "Complete setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
