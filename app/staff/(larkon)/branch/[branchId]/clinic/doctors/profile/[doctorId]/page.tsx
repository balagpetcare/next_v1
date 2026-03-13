"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffDoctorProfile,
  staffDoctorCredentials,
  staffDoctorServices,
  staffDoctorPackages,
  staffDoctorSchedule,
  staffDoctorFees,
  staffDoctorPerformance,
  staffDoctorLeave,
  staffDoctorApprovals,
  staffDoctorAuditLog,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, LoadingState } from "@/src/components/dashboard";
import {
  DoctorProfileHeader,
  DoctorProfileTabs,
} from "@/src/components/clinic/doctors";
import {
  OverviewTab,
  CredentialsTab,
  ServicesTab,
  PackagesTab,
  ScheduleTab,
  FeesTab,
  PerformanceTab,
  LeaveTab,
  ApprovalsTab,
  AuditTab,
} from "@/src/components/clinic/doctors/tabs";
import type { DoctorProfileTabKey } from "@/src/components/clinic/doctors";
import { profile as profileRoute, doctors } from "@/src/lib/doctorOperationsRoutes";

const DOCTORS_PERMS = ["clinic.doctors.view"];
const VALID_TABS: DoctorProfileTabKey[] = [
  "overview", "credentials", "services", "packages", "schedule",
  "fees", "performance", "leave", "approvals", "audit",
];

function parseTabFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): DoctorProfileTabKey {
  const tab = searchParams?.get("tab");
  if (tab && VALID_TABS.includes(tab as DoctorProfileTabKey)) {
    return tab as DoctorProfileTabKey;
  }
  return "overview";
}

export default function StaffClinicDoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const doctorId = useMemo(() => String(params?.doctorId ?? ""), [params]);
  const memberId = useMemo(() => parseInt(doctorId, 10), [doctorId]);
  const isValidDoctorId = useMemo(() => doctorId !== "" && !Number.isNaN(memberId) && memberId > 0, [doctorId, memberId]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const profileBase = useMemo(() => profileRoute(branchId, doctorId), [branchId, doctorId]);

  const tabFromUrl = useMemo(() => parseTabFromSearchParams(searchParams), [searchParams]);
  const [activeTab, setActiveTabState] = useState<DoctorProfileTabKey>(tabFromUrl);

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [credentials, setCredentials] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>({ templates: [], exceptions: [] });
  const [fees, setFees] = useState<any>({ current: {}, proposed: null });
  const [performance, setPerformance] = useState<any>(null);
  const [leave, setLeave] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [tabDataLoading, setTabDataLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));
  const refreshTabData = useCallback(() => setRefreshTrigger((t) => t + 1), []);

  const setActiveTab = useCallback((tab: DoctorProfileTabKey) => {
    setActiveTabState(tab);
    const url = `${profileBase}${tab === "overview" ? "" : `?tab=${tab}`}`;
    router.replace(url, { scroll: false });
  }, [profileBase, router]);

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

  const loadProfile = useCallback(async () => {
    if (!branchId || !isValidDoctorId || !hasAccess) return;
    setProfileLoading(true);
    try {
      const data = await staffDoctorProfile(branchId, memberId);
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [branchId, isValidDoctorId, memberId, hasAccess]);

  useEffect(() => {
    if (!isValidDoctorId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    loadProfile();
  }, [loadProfile, isValidDoctorId]);

  useEffect(() => {
    if (!branchId || !isValidDoctorId || !memberId || !hasAccess) return;
    staffDoctorSchedule(branchId, memberId).then(setSchedule).catch(() => setSchedule({ templates: [], exceptions: [] }));
  }, [branchId, isValidDoctorId, memberId, hasAccess]);

  useEffect(() => {
    if (!branchId || !isValidDoctorId || !memberId || !hasAccess) return;
    setTabDataLoading(true);
    const load = async () => {
      if (!branchId || !memberId || !hasAccess) return;
      try {
        if (activeTab === "credentials") {
          const data = await staffDoctorCredentials(branchId, memberId);
          setCredentials(data ?? null);
        } else if (activeTab === "services") {
          const data = await staffDoctorServices(branchId, memberId);
          setServices(Array.isArray(data) ? data : []);
        } else if (activeTab === "packages") {
          const data = await staffDoctorPackages(branchId, memberId);
          setPackages(Array.isArray(data) ? data : []);
        } else if (activeTab === "schedule") {
          const data = await staffDoctorSchedule(branchId, memberId);
          setSchedule(data ?? { templates: [], exceptions: [] });
        } else if (activeTab === "fees") {
          const data = await staffDoctorFees(branchId, memberId);
          setFees(data ?? { current: {}, proposed: null });
        } else if (activeTab === "performance") {
          const data = await staffDoctorPerformance(branchId, memberId);
          setPerformance(data ?? null);
        } else if (activeTab === "leave") {
          const data = await staffDoctorLeave(branchId, memberId);
          setLeave(Array.isArray(data) ? data : []);
        } else if (activeTab === "approvals") {
          const data = await staffDoctorApprovals(branchId, memberId);
          setApprovals(Array.isArray(data) ? data : []);
        } else if (activeTab === "audit") {
          const data = await staffDoctorAuditLog(branchId, memberId);
          setAuditLog(data ?? { items: [], total: 0 });
        }
      } catch {
        if (activeTab === "credentials") setCredentials(null);
        else if (activeTab === "services") setServices([]);
        else if (activeTab === "packages") setPackages([]);
        else if (activeTab === "schedule") setSchedule({ templates: [], exceptions: [] });
        else if (activeTab === "fees") setFees({ current: {}, proposed: null });
        else if (activeTab === "performance") setPerformance(null);
        else if (activeTab === "leave") setLeave([]);
        else if (activeTab === "approvals") setApprovals([]);
        else if (activeTab === "audit") setAuditLog({ items: [], total: 0 });
      } finally {
        setTabDataLoading(false);
      }
    };
    load();
  }, [branchId, isValidDoctorId, memberId, hasAccess, activeTab, refreshTrigger]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  if (!isValidDoctorId) {
    return (
      <PageWorkspace>
        <div className="row g-0">
          <div className="col-12">
            <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
            </div>
            <div className="card radius-12">
              <div className="card-body text-center py-5">
                <p className="text-muted mb-0">Doctor not found. Select a doctor from the list.</p>
                <Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm mt-3 radius-8">Back to Doctors</Link>
              </div>
            </div>
          </div>
        </div>
      </PageWorkspace>
    );
  }

  const readinessItems = [
    { key: "profile", label: "Profile completed", done: !!profile?.displayName },
    { key: "credential", label: "Credential uploaded", done: !!credentials?.documents?.length },
    { key: "service", label: "Service mapped", done: (profile?.services?.length ?? 0) > 0 },
    { key: "schedule", label: "Schedule added", done: (schedule?.templates?.length ?? 0) > 0 },
    { key: "fee", label: "Fee configured", done: profile?.defaultConsultationFee != null },
    { key: "booking", label: "Booking enabled", done: profile?.status === "ACTIVE" },
  ];

  const tabProps = { branchId, memberId, permissions };

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
          </div>
          <div className="row g-4">
            <div className="col-12 col-lg-4 col-xl-3">
              <DoctorProfileHeader
                branchId={branchId}
                profile={profile}
                loading={profileLoading}
                permissions={permissions}
                onTabChange={setActiveTab}
                onProfileRefresh={() => { loadProfile(); refreshTabData(); }}
              />
            </div>
            <div className="col-12 col-lg-8 col-xl-9">
              <DoctorProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === "overview" && (
                <OverviewTab
                  {...tabProps}
                  profile={profile}
                  credentials={credentials}
                  schedule={schedule}
                  readinessItems={readinessItems}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === "credentials" && (
                <CredentialsTab {...tabProps} credentials={credentials} loading={tabDataLoading} />
              )}
              {activeTab === "services" && (
                <ServicesTab {...tabProps} services={services} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "packages" && (
                <PackagesTab {...tabProps} packages={packages} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "schedule" && (
                <ScheduleTab {...tabProps} schedule={schedule} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "fees" && (
                <FeesTab {...tabProps} fees={fees} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "performance" && (
                <PerformanceTab {...tabProps} performance={performance} loading={tabDataLoading} />
              )}
              {activeTab === "leave" && (
                <LeaveTab {...tabProps} leave={leave} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "approvals" && (
                <ApprovalsTab {...tabProps} approvals={approvals} loading={tabDataLoading} onRefresh={refreshTabData} />
              )}
              {activeTab === "audit" && (
                <AuditTab {...tabProps} auditLog={auditLog} loading={tabDataLoading} />
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWorkspace>
  );
}
