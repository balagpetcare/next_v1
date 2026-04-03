"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  staffDoctorsApplyServiceAssignmentTemplate,
  staffDoctorsAuditLogs,
  staffDoctorsPatchServiceAssignmentBulk,
  staffDoctorsServiceAssignmentDetail,
  staffDoctorsServiceAssignmentSummary,
  staffDoctorsServiceAssignmentTemplates,
  staffDoctorFees,
} from "@/lib/api";
import type { DoctorServiceAssignmentPayload } from "@/src/types/doctorServiceAssignment";
import { SectionCard, EmptyState, LoadingState } from "@/src/components/dashboard";
import { doctors as doctorsRoute } from "@/src/lib/doctorOperationsRoutes";
import DoctorDirectoryPanel from "./DoctorDirectoryPanel";
import ServiceCategorySection from "./ServiceCategorySection";
import BulkActionBar from "./BulkActionBar";
import TemplatePickerModal from "./TemplatePickerModal";
import AssignmentAuditDrawer from "./AssignmentAuditDrawer";
import FeeInfoPanel from "./FeeInfoPanel";

type Props = {
  branchId: string;
  branch: { name?: string };
  myAccess: { permissions?: string[] } | null | undefined;
  onOpenDoctor360?: (memberId: number) => void;
};

function hasPerm(permissions: string[], p: string) {
  return permissions.includes(p);
}

export default function ServiceAssignmentEnterpriseView({ branchId, branch, myAccess, onOpenDoctor360 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const canEdit = hasPerm(permissions, "clinic.doctors.manage_services");
  const canViewFees =
    hasPerm(permissions, "clinic.doctors.view") &&
    (hasPerm(permissions, "clinic.services.manage") || hasPerm(permissions, "manager.pricing.view"));

  const [summary, setSummary] = useState<{ doctors: any[]; totalActiveServices: number }>({
    doctors: [],
    totalActiveServices: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [detail, setDetail] = useState<DoctorServiceAssignmentPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [savingServiceId, setSavingServiceId] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(() => new Set());
  const [tab, setTab] = useState<"assignments" | "fees">("assignments");
  const [feesPayload, setFeesPayload] = useState<any>(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateApplying, setTemplateApplying] = useState(false);

  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return null;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? null : n;
  }, [searchParams]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await staffDoctorsServiceAssignmentSummary(branchId);
      setSummary({
        doctors: Array.isArray(data?.doctors) ? data.doctors : [],
        totalActiveServices: Number(data?.totalActiveServices ?? 0),
      });
    } catch (e) {
      setSummary({ doctors: [], totalActiveServices: 0 });
      setSummaryError((e as Error)?.message ?? "Failed to load doctor list");
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId]);

  const loadDetail = useCallback(
    async (memberId: number) => {
      setDetailLoading(true);
      setDetailError("");
      try {
        const data = await staffDoctorsServiceAssignmentDetail(branchId, memberId);
        setDetail(data as DoctorServiceAssignmentPayload);
      } catch (e) {
        setDetail(null);
        setDetailError((e as Error)?.message ?? "Failed to load doctor assignments");
      } finally {
        setDetailLoading(false);
      }
    },
    [branchId]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (memberIdFromUrl != null && summary.doctors.some((d: any) => d.memberId === memberIdFromUrl)) {
      setSelectedMemberId(memberIdFromUrl);
    }
  }, [memberIdFromUrl, summary.doctors]);

  useEffect(() => {
    if (selectedMemberId == null) return;
    loadDetail(selectedMemberId);
  }, [selectedMemberId, loadDetail]);

  useEffect(() => {
    if (selectedMemberId == null || !pathname) return;
    const cur = searchParams?.get("memberId");
    if (cur === String(selectedMemberId)) return;
    const q = new URLSearchParams(searchParams?.toString() ?? "");
    q.set("memberId", String(selectedMemberId));
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [selectedMemberId, router, searchParams, pathname]);

  useEffect(() => {
    if (tab !== "fees" || selectedMemberId == null || !canViewFees) return;
    let cancelled = false;
    setFeesLoading(true);
    staffDoctorFees(branchId, selectedMemberId)
      .then((data) => {
        if (!cancelled) setFeesPayload(data);
      })
      .catch(() => {
        if (!cancelled) setFeesPayload(null);
      })
      .finally(() => {
        if (!cancelled) setFeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, selectedMemberId, branchId, canViewFees]);

  const openAudit = useCallback(async () => {
    if (selectedMemberId == null) return;
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await staffDoctorsAuditLogs(branchId, {
        memberId: selectedMemberId,
        actionPrefix: "SERVICE_MAPPING",
        limit: 50,
      });
      setAuditItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setAuditItems([]);
      setAuditError((e as Error)?.message ?? "Failed to load audit log");
    } finally {
      setAuditLoading(false);
    }
  }, [branchId, selectedMemberId]);

  const openTemplates = useCallback(async () => {
    setTemplateOpen(true);
    setTemplatesLoading(true);
    try {
      const list = await staffDoctorsServiceAssignmentTemplates(branchId, {
        memberId: selectedMemberId ?? undefined,
      });
      setTemplates(Array.isArray(list) ? list : []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [branchId, selectedMemberId]);

  const runPatch = useCallback(
    async (ops: Array<{ op: "upsert" | "delete"; serviceId: number; role?: string; isAllowed?: boolean }>) => {
      if (selectedMemberId == null || !canEdit) return;
      setDetailError("");
      try {
        const data: any = await staffDoctorsPatchServiceAssignmentBulk(branchId, selectedMemberId, { ops });
        if (data?.assignment) setDetail(data.assignment as DoctorServiceAssignmentPayload);
        else await loadDetail(selectedMemberId);
        await loadSummary();
      } catch (e: any) {
        const parts = Array.isArray(e?.errors) ? e.errors.map((x: any) => x.message).filter(Boolean) : [];
        setDetailError(parts.length ? parts.join("; ") : e?.message ?? "Update failed");
      }
    },
    [branchId, selectedMemberId, canEdit, loadDetail, loadSummary]
  );

  const handleAssignChange = useCallback(
    async (serviceId: number, nextAssigned: boolean, role?: string) => {
      setSavingServiceId(serviceId);
      try {
        if (nextAssigned) {
          await runPatch([{ op: "upsert", serviceId, role: role ?? "CONSULTANT", isAllowed: true }]);
        } else {
          await runPatch([{ op: "delete", serviceId }]);
        }
      } finally {
        setSavingServiceId(null);
      }
    },
    [runPatch]
  );

  const handleRoleChange = useCallback(
    async (serviceId: number, role: string) => {
      setSavingServiceId(serviceId);
      try {
        await runPatch([{ op: "upsert", serviceId, role, isAllowed: true }]);
      } finally {
        setSavingServiceId(null);
      }
    },
    [runPatch]
  );

  const handleUnassignSelected = useCallback(async () => {
    if (bulkSelected.size === 0) return;
    const ops = [...bulkSelected].map((serviceId) => ({ op: "delete" as const, serviceId }));
    setSavingServiceId(-1);
    try {
      await runPatch(ops);
      setBulkSelected(new Set());
      setBulkMode(false);
    } finally {
      setSavingServiceId(null);
    }
  }, [bulkSelected, runPatch]);

  const handleApplyTemplate = useCallback(
    async (templateId: number, mode: "merge" | "replace") => {
      if (selectedMemberId == null) return;
      setTemplateApplying(true);
      setDetailError("");
      try {
        const data: any = await staffDoctorsApplyServiceAssignmentTemplate(branchId, templateId, {
          memberId: selectedMemberId,
          mode,
        });
        if (data?.assignment) setDetail(data.assignment as DoctorServiceAssignmentPayload);
        else await loadDetail(selectedMemberId);
        await loadSummary();
        setTemplateOpen(false);
      } catch (e: any) {
        const parts = Array.isArray(e?.errors) ? e.errors.map((x: any) => x.message).filter(Boolean) : [];
        setDetailError(parts.length ? parts.join("; ") : e?.message ?? "Template apply failed");
      } finally {
        setTemplateApplying(false);
      }
    },
    [branchId, selectedMemberId, loadDetail, loadSummary]
  );

  const doctorName =
    detail?.doctor?.displayName ??
    summary.doctors.find((d: any) => d.memberId === selectedMemberId)?.displayName ??
    "Doctor";

  const filteredCategories = useMemo(() => {
    if (!detail?.categories) return [];
    return detail.categories
      .map((c) => ({
        ...c,
        services: assignedOnly ? c.services.filter((s) => s.mapping?.effectiveAssigned) : c.services,
      }))
      .filter((c) => c.services.length > 0);
  }, [detail?.categories, assignedOnly]);

  if (summaryLoading) {
    return (
      <SectionCard>
        <LoadingState message="Loading doctors…" />
      </SectionCard>
    );
  }

  if (summaryError) {
    return (
      <SectionCard title="Could not load assignments">
        <div className="alert alert-danger radius-12 mb-3">{summaryError}</div>
        <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => loadSummary()}>
          Retry
        </button>
      </SectionCard>
    );
  }

  if (summary.doctors.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          title="No doctors assigned to this branch yet"
          description="Assign doctors to this branch from the Doctors page, then map them to services here."
          icon="ri:list-check-2"
          action={<Link href={doctorsRoute(branchId)} className="btn btn-outline-primary btn-sm radius-8">Doctors</Link>}
        />
      </SectionCard>
    );
  }

  return (
    <>
      <p className="text-muted small mb-3">
        {summary.doctors.length} doctors · {summary.totalActiveServices} active services
        {branch?.name ? ` · ${branch.name}` : ""}
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctorsRoute(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
          ← Doctors
        </Link>
        {selectedMemberId != null && (
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={openAudit}>
              Assignment audit
            </button>
            {onOpenDoctor360 && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm radius-8"
                onClick={() => onOpenDoctor360(selectedMemberId)}
              >
                Doctor quick view
              </button>
            )}
          </>
        )}
      </div>

      {detailError && <div className="alert alert-danger radius-12 mb-3">{detailError}</div>}

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <DoctorDirectoryPanel
            doctors={summary.doctors}
            selectedId={selectedMemberId}
            search={doctorSearch}
            onSearchChange={setDoctorSearch}
            onSelect={(id) => {
              setSelectedMemberId(id);
              setBulkMode(false);
              setBulkSelected(new Set());
            }}
          />
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          {selectedMemberId == null ? (
            <SectionCard title="Select a doctor">
              <p className="text-muted mb-0">Choose a doctor on the left to manage service assignments.</p>
            </SectionCard>
          ) : (
            <SectionCard
              title={doctorName}
              subtitle={canEdit ? "Toggle assignments and roles; changes save immediately." : "Read-only."}
            >
              <ul className="nav nav-pills gap-2 mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link radius-8 ${tab === "assignments" ? "active" : ""}`}
                    onClick={() => setTab("assignments")}
                  >
                    Assignments
                  </button>
                </li>
                {canViewFees && (
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link radius-8 ${tab === "fees" ? "active" : ""}`}
                      onClick={() => setTab("fees")}
                    >
                      Fees
                    </button>
                  </li>
                )}
              </ul>

              {tab === "fees" ? (
                <FeeInfoPanel fees={feesPayload ?? {}} loading={feesLoading} />
              ) : (
                <>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <input
                      type="search"
                      className="form-control form-control-sm radius-8"
                      style={{ maxWidth: 260 }}
                      placeholder="Filter services…"
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      aria-label="Filter services"
                    />
                    <div className="form-check m-0">
                      <input
                        id="assignedOnly"
                        type="checkbox"
                        className="form-check-input"
                        checked={assignedOnly}
                        onChange={(e) => setAssignedOnly(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="assignedOnly">
                        Assigned only
                      </label>
                    </div>
                  </div>

                  <BulkActionBar
                    selectedCount={bulkSelected.size}
                    bulkMode={bulkMode}
                    onToggleBulkMode={() => {
                      setBulkMode((m) => !m);
                      setBulkSelected(new Set());
                    }}
                    onClearSelection={() => setBulkSelected(new Set())}
                    onUnassignSelected={handleUnassignSelected}
                    onOpenTemplates={openTemplates}
                    disabled={!canEdit || detailLoading}
                  />

                  {detailLoading ? (
                    <LoadingState message="Loading services…" />
                  ) : !detail ? (
                    <p className="text-muted mb-0">Could not load assignments.</p>
                  ) : filteredCategories.length === 0 ? (
                    <p className="text-muted mb-0">No services match the current filters.</p>
                  ) : (
                    filteredCategories.map((group) => (
                      <ServiceCategorySection
                        key={group.category}
                        group={group}
                        allowedRolesByCategory={detail.allowedRolesByCategory}
                        serviceFilter={serviceFilter}
                        canEdit={canEdit}
                        bulkMode={bulkMode}
                        selectedIds={bulkSelected}
                        onToggleBulk={(serviceId, on) => {
                          setBulkSelected((prev) => {
                            const next = new Set(prev);
                            if (on) next.add(serviceId);
                            else next.delete(serviceId);
                            return next;
                          });
                        }}
                        onAssignChange={handleAssignChange}
                        onRoleChange={handleRoleChange}
                        savingServiceId={savingServiceId}
                        showFees={canViewFees}
                      />
                    ))
                  )}
                </>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      <AssignmentAuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        doctorName={doctorName}
        items={auditItems}
        loading={auditLoading}
        error={auditError}
      />

      <TemplatePickerModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        templates={templates}
        loading={templatesLoading}
        onApply={handleApplyTemplate}
        applying={templateApplying}
      />
    </>
  );
}
