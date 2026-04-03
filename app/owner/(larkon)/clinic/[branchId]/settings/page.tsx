"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicSettings,
  ownerClinicSettingsUpdate,
  ownerClinicModuleGet,
  ownerClinicModuleUpdate,
  ownerClinicStaff,
  ownerClinicAssignTemplate,
  CLINIC_ROLE_TEMPLATE_KEYS,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type AppointmentSettings = {
  allowWalkIn?: boolean;
  allowScheduled?: boolean;
  allowAnyDoctor?: boolean;
  maxAdvanceBookingDays?: number;
  blockPastDatetime?: boolean;
  requirePaymentBeforeConsultation?: boolean;
  allowPayLater?: boolean;
  allowPartialPayment?: boolean;
  autoPrintAppointmentSlip?: boolean;
  autoPrintPaymentSlip?: boolean;
  reprintReasonRequired?: boolean;
  slotDuration?: number;
  bufferMinutes?: number;
};

type ClinicSettings = {
  specializations?: string[];
  consultationSlotMinutes?: number;
  maxDailyAppointments?: number;
  walkInsAllowed?: boolean;
  emergencyAvailable?: boolean;
  notes?: string;
  appointment?: AppointmentSettings;
};

const DEFAULT_SLOT = 30;

export default function ClinicSettingsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [settings, setSettings] = useState<ClinicSettings>({});
  const [appointment, setAppointment] = useState<AppointmentSettings>({});
  const [clinicEnabled, setClinicEnabled] = useState(false);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [staffList, setStaffList] = useState<{ branch: { id: number; name: string }; members: any[] } | null>(null);
  const [assigningMember, setAssigningMember] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (typeof branchId !== "string" || branchId === "") return;
    const id = branchId;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [settingsData, moduleData, staffData] = await Promise.all([
          ownerClinicSettings(id),
          ownerClinicModuleGet(id),
          ownerClinicStaff(id),
        ]);
        const s = (settingsData as ClinicSettings) ?? {};
        setSettings(s);
        setAppointment(s.appointment ?? {});
        setClinicEnabled(moduleData?.clinicEnabled ?? false);
        setStaffList(staffData ?? null);
      } catch (e) {
        setError((e as Error)?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId]);

  const handleClinicModuleToggle = async (enabled: boolean) => {
    if (!branchId) return;
    try {
      setModuleSaving(true);
      setError("");
      const data = await ownerClinicModuleUpdate(branchId, { enabled });
      setClinicEnabled(data?.clinicEnabled ?? enabled);
      setSuccess(enabled ? "Clinic module enabled." : "Clinic module disabled. Staff will no longer see clinic menu or access clinic APIs.");
    } catch (e) {
      setError((e as Error)?.message || "Failed to update module");
    } finally {
      setModuleSaving(false);
    }
  };

  const handleAssignTemplate = async (memberId: number, templateKey: string) => {
    if (!branchId) return;
    try {
      setAssigningMember(memberId);
      setError("");
      await ownerClinicAssignTemplate(branchId, memberId, templateKey);
      setSuccess("Role template assigned.");
      const staffData = await ownerClinicStaff(branchId);
      setStaffList(staffData ?? null);
    } catch (e) {
      setError((e as Error)?.message || "Failed to assign template");
    } finally {
      setAssigningMember(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const form = e.target as HTMLFormElement;
      const slot = form.consultationSlotMinutes?.value;
      const maxDaily = form.maxDailyAppointments?.value;
      const walkIns = form.walkInsAllowed?.checked ?? true;
      const emergency = form.emergencyAvailable?.checked ?? false;
      const notes = (form.notes?.value ?? "").trim();
      const specializationsStr = (form.specializations?.value ?? "").trim();
      const specializations = specializationsStr
        ? specializationsStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : undefined;

      await ownerClinicSettingsUpdate(branchId, {
        consultationSlotMinutes: slot ? parseInt(slot, 10) : DEFAULT_SLOT,
        maxDailyAppointments: maxDaily ? parseInt(maxDaily, 10) : undefined,
        walkInsAllowed: walkIns,
        emergencyAvailable: emergency,
        notes: notes || undefined,
        specializations: specializations?.length ? specializations : undefined,
        ...(Object.keys(appointment).length > 0 ? { appointment } : {}),
      });
      setSettings((prev) => ({
        ...prev,
        consultationSlotMinutes: slot ? parseInt(slot, 10) : DEFAULT_SLOT,
        maxDailyAppointments: maxDaily ? parseInt(maxDaily, 10) : undefined,
        walkInsAllowed: walkIns,
        emergencyAvailable: emergency,
        notes: notes || undefined,
        specializations,
        ...(Object.keys(appointment).length > 0 ? { appointment } : {}),
      }));
      setSuccess("Settings saved.");
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Clinic settings"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Settings", href: `/owner/clinic/${branchId}/settings` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-24">
          <i className="ri-check-line me-2" />
          {success}
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
          <div className="card radius-12 mb-24">
            <div className="card-body p-24">
              <h6 className="mb-16">Clinic module</h6>
              <p className="text-secondary-light text-sm mb-16">
                When enabled, staff with clinic permissions can use the Clinic area under this branch. When disabled, the clinic menu is hidden and clinic APIs return 403.
              </p>
              <div className="d-flex align-items-center gap-12">
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="clinicEnabled"
                    checked={clinicEnabled}
                    disabled={moduleSaving}
                    onChange={(e) => handleClinicModuleToggle(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="clinicEnabled">
                    Enable Clinic Module
                  </label>
                </div>
                {moduleSaving && <span className="text-secondary-light text-sm">Saving...</span>}
              </div>
            </div>
          </div>

          {staffList && staffList.members?.length > 0 && (
            <div className="card radius-12 mb-24">
              <div className="card-body p-24">
                <h6 className="mb-16">Clinic staff permissions</h6>
                <p className="text-secondary-light text-sm mb-16">
                  Assign a clinic role template to grant clinic permissions. Only clinic.* permissions are applied here.
                </p>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Clinic role template</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.members.map((m: any) => (
                        <tr key={m.id}>
                          <td>{m.user?.profile?.displayName ?? m.userId ?? m.id}</td>
                          <td>
                            <select
                              className="form-select form-select-sm radius-12"
                              style={{ maxWidth: 200 }}
                              disabled={assigningMember === m.id}
                              value={m.profileSummary?.staffType ? `CLINIC_${m.profileSummary.staffType}` : ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v) handleAssignTemplate(m.id, v);
                              }}
                            >
                              <option value="">— Select —</option>
                              {CLINIC_ROLE_TEMPLATE_KEYS.map((k) => (
                                <option key={k} value={k}>{k.replace("CLINIC_", "")}</option>
                              ))}
                            </select>
                          </td>
                          <td>{assigningMember === m.id ? <span className="text-secondary-light text-sm">Saving...</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="card radius-12 mb-24">
            <div className="card-body p-24">
              <h6 className="mb-16">Appointment & payment settings</h6>
              <p className="text-secondary-light text-sm mb-16">
                Control how staff can create appointments: walk-in, scheduled, any doctor, and payment policy.
              </p>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="allowWalkIn" checked={appointment.allowWalkIn !== false} onChange={(e) => setAppointment((a) => ({ ...a, allowWalkIn: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="allowWalkIn">Allow walk-in appointments</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="allowScheduled" checked={appointment.allowScheduled !== false} onChange={(e) => setAppointment((a) => ({ ...a, allowScheduled: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="allowScheduled">Allow scheduled appointments</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="allowAnyDoctor" checked={appointment.allowAnyDoctor !== false} onChange={(e) => setAppointment((a) => ({ ...a, allowAnyDoctor: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="allowAnyDoctor">Allow Any Doctor selection</label>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Max advance booking (days)</label>
                    <input type="number" className="form-control radius-12" min={1} max={90} value={appointment.maxAdvanceBookingDays ?? 30} onChange={(e) => setAppointment((a) => ({ ...a, maxAdvanceBookingDays: parseInt(e.target.value, 10) || 30 }))} />
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="blockPastDatetime" checked={appointment.blockPastDatetime !== false} onChange={(e) => setAppointment((a) => ({ ...a, blockPastDatetime: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="blockPastDatetime">Block past date/time</label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="requirePaymentBeforeConsultation" checked={appointment.requirePaymentBeforeConsultation === true} onChange={(e) => setAppointment((a) => ({ ...a, requirePaymentBeforeConsultation: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="requirePaymentBeforeConsultation">Require payment before consultation</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="allowPayLater" checked={appointment.allowPayLater !== false} onChange={(e) => setAppointment((a) => ({ ...a, allowPayLater: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="allowPayLater">Allow pay later</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="autoPrintAppointmentSlip" checked={appointment.autoPrintAppointmentSlip !== false} onChange={(e) => setAppointment((a) => ({ ...a, autoPrintAppointmentSlip: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="autoPrintAppointmentSlip">Auto-print appointment slip</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="autoPrintPaymentSlip" checked={appointment.autoPrintPaymentSlip !== false} onChange={(e) => setAppointment((a) => ({ ...a, autoPrintPaymentSlip: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="autoPrintPaymentSlip">Auto-print payment slip</label>
                  </div>
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="reprintReasonRequired" checked={appointment.reprintReasonRequired === true} onChange={(e) => setAppointment((a) => ({ ...a, reprintReasonRequired: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="reprintReasonRequired">Reprint reason required</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card radius-12">
          <div className="card-body p-24">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Consultation slot (minutes)</label>
                <input
                  type="number"
                  name="consultationSlotMinutes"
                  className="form-control radius-12"
                  defaultValue={settings.consultationSlotMinutes ?? DEFAULT_SLOT}
                  min={5}
                  max={120}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Max daily appointments (optional)</label>
                <input
                  type="number"
                  name="maxDailyAppointments"
                  className="form-control radius-12"
                  defaultValue={settings.maxDailyAppointments ?? ""}
                  min={1}
                  placeholder="No limit"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Specializations (comma-separated)</label>
                <input
                  type="text"
                  name="specializations"
                  className="form-control radius-12"
                  defaultValue={settings.specializations?.join(", ") ?? ""}
                  placeholder="e.g. general, dermatology, surgery"
                />
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  name="walkInsAllowed"
                  className="form-check-input"
                  id="walkInsAllowed"
                  defaultChecked={settings.walkInsAllowed !== false}
                />
                <label className="form-check-label" htmlFor="walkInsAllowed">
                  Walk-ins allowed
                </label>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  name="emergencyAvailable"
                  className="form-check-input"
                  id="emergencyAvailable"
                  defaultChecked={settings.emergencyAvailable === true}
                />
                <label className="form-check-label" htmlFor="emergencyAvailable">
                  Emergency available
                </label>
              </div>
              <div className="mb-4">
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  className="form-control radius-12"
                  rows={3}
                  defaultValue={settings.notes ?? ""}
                  placeholder="Internal notes"
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary radius-12"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>
                <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary radius-12">
                  Back
                </Link>
              </div>
            </form>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
