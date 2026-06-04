"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicLowStockAlerts,
  staffClinicPatientGet,
  staffClinicPatientsList,
  staffClinicVaccinationDashboard,
  staffClinicVaccinationReminders,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const VIEW_PERMS = ["clinic.patients.read", "clinic.patients.manage", "clinic.emr.read", "clinic.emr.write"];
const VACCINE_STOCK_TERMS = ["vaccine", "vaccination", "immun", "rabies", "dhpp", "dhlpp", "deworm"];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getOwner(pet) {
  if (!pet) return null;
  if (pet.owner) return pet.owner;
  const user = pet.user;
  if (!user) return null;
  return {
    userId: user.id,
    displayName: user.profile?.displayName ?? null,
    username: user.profile?.username ?? null,
    email: user.auth?.email ?? null,
    phone: user.auth?.phone ?? null,
  };
}

function ownerLabel(owner) {
  if (!owner) return "No owner linked";
  return owner.displayName || owner.username || owner.email || owner.phone || `Owner #${owner.userId}`;
}

function vaccineName(record) {
  return record?.vaccineType?.name || record?.vaccineName || "Unknown vaccine";
}

function reminderOwnerLabel(owner) {
  if (!owner) return "-";
  return owner.displayName || owner.username || owner.phone || owner.email || `Owner #${owner.userId || "?"}`;
}

function isVaccineLikeStock(row) {
  const text = [row?.item?.name, row?.item?.itemCode, row?.variant?.variantName, row?.variant?.sku]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return VACCINE_STOCK_TERMS.some((term) => text.includes(term));
}

function uniquePatients(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function statCard(label, value, helper) {
  return (
    <div className="col-sm-6 col-xl-4 col-xxl-2">
      <div className="border rounded-3 p-16 h-100 bg-white shadow-sm">
        <p className="text-muted small mb-8">{label}</p>
        <h3 className="mb-4">{value ?? 0}</h3>
        {helper ? <p className="text-muted small mb-0">{helper}</p> : null}
      </div>
    </div>
  );
}

export default function StaffBranchVaccinationsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [dashboard, setDashboard] = useState({ summary: {}, recentRecords: [] });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [lowStockVaccines, setLowStockVaccines] = useState([]);
  const [reminderFilter, setReminderFilter] = useState("PENDING");
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersError, setRemindersError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [queryNotice, setQueryNotice] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VIEW_PERMS.some((perm) => permissions.includes(perm));
  const canConfigureVaccineMapping = permissions.includes("clinic.services.manage");
  const summary = dashboard?.summary || {};
  const recentRecords = Array.isArray(dashboard?.recentRecords) ? dashboard.recentRecords : [];
  const trimmedSearch = searchInput.trim();
  const searchReady = trimmedSearch.length >= 2 || /^\d+$/.test(trimmedSearch);

  const workspaceHref = useCallback(
    (patientId) => `/staff/branch/${branchId}/clinic/patients/${patientId}/vaccination`,
    [branchId]
  );

  const loadDashboard = useCallback(async () => {
    if (!branchId) return;
    setDashboardLoading(true);
    setDashboardError("");
    const [dashboardResult, stockResult] = await Promise.all([
      staffClinicVaccinationDashboard(branchId).catch((error) => ({ error })),
      staffClinicLowStockAlerts(branchId).catch(() => []),
    ]);
    if (dashboardResult?.error) {
      setDashboard({ summary: {}, recentRecords: [] });
      setDashboardError(dashboardResult.error?.message || "Failed to load vaccination dashboard.");
    } else {
      setDashboard(dashboardResult || { summary: {}, recentRecords: [] });
    }
    const stockRows = Array.isArray(stockResult) ? stockResult : [];
    setLowStockVaccines(stockRows.filter(isVaccineLikeStock).slice(0, 6));
    setDashboardLoading(false);
  }, [branchId]);

  const loadReminders = useCallback(async () => {
    if (!branchId) return;
    setRemindersLoading(true);
    setRemindersError("");
    try {
      let reminderParams = {};
      if (reminderFilter === "PENDING") reminderParams = { status: "PENDING" };
      if (reminderFilter === "OVERDUE") reminderParams = { overdueOnly: true };
      const data = await staffClinicVaccinationReminders(branchId, reminderParams);
      setReminders(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setReminders([]);
      setRemindersError(error?.message || "Failed to load vaccination reminders.");
    } finally {
      setRemindersLoading(false);
    }
  }, [branchId, reminderFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (!branchId) return;
    const id = searchParams?.get("patientId") || searchParams?.get("petId");
    if (!id) return;
    if (/^\d+$/.test(id)) {
      router.replace(workspaceHref(id));
    } else {
      setQueryNotice("The patient id in the query string is not numeric. Search below to open the workspace.");
    }
  }, [branchId, router, searchParams, workspaceHref]);

  useEffect(() => {
    if (!branchId) return;
    const q = searchInput.trim();
    const isNumericId = /^\d+$/.test(q);
    if (q.length < 2 && !isNumericId) {
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError("");
    const timer = setTimeout(async () => {
      try {
        const list = await staffClinicPatientsList(branchId, { search: q, limit: 12 });
        let items = Array.isArray(list?.patients) ? list.patients : [];
        if (isNumericId) {
          try {
            const byId = await staffClinicPatientGet(branchId, Number(q));
            if (byId) items = [byId, ...items];
          } catch {
            // Numeric Pet.id lookup is best-effort; normal branch search remains primary.
          }
        }
        if (!cancelled) setSearchResults(uniquePatients(items));
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(error?.message || "Patient search failed.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [branchId, searchInput]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied missingPerm="clinic.patients.read" onBack={() => router.push(`/staff/branch/${branchId}/clinic`)} />;
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-12 mb-24">
        <div>
          <div className="d-flex align-items-center gap-12 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
              Back to Clinic
            </Link>
            <h4 className="mb-0">Vaccination</h4>
          </div>
          <p className="text-muted small mb-0 mt-8">Find a patient, then open a focused vaccination workspace.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-sm btn-outline-primary">
            Patients
          </Link>
          <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-primary">
            Receive vaccine stock
          </Link>
        </div>
      </div>

      {queryNotice ? <div className="alert alert-warning py-2">{queryNotice}</div> : null}

      <div className="row gy-3 mb-24">
        {statCard("Today due", summary.todayDue, "Due today")}
        {statCard("Upcoming", summary.upcoming, "Next 30 days")}
        {statCard("Overdue", summary.overdue, "Past due")}
        {statCard("Given today", summary.administeredToday, "Administered")}
        {statCard("Recent records", summary.recentRecords, "Latest branch-visible")}
        {statCard("Low stock", lowStockVaccines.length, "Vaccine-like items")}
      </div>

      {dashboardError ? <div className="alert alert-warning py-2">{dashboardError}</div> : null}

      <div className="row justify-content-center mb-24">
        <div className="col-12 col-xl-8">
          <Card title="Find patient" subtitle="Search by pet name, owner, phone, email, unique pet ID, or numeric ID.">
            <div className="row g-3 align-items-end">
              <div className="col-md-9">
                <label className="form-label small text-muted mb-4">Patient search</label>
                <input
                  type="search"
                  className="form-control form-control-lg"
                  placeholder="Pet name, owner, phone, email, PET ID, or numeric ID"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <div className="col-md-3 d-grid">
                <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-outline-primary btn-lg">
                  Patients
                </Link>
              </div>
            </div>

            {searchError ? <div className="alert alert-danger py-2 mt-12 mb-0">{searchError}</div> : null}
            {searching ? <div className="py-24 text-center text-muted small">Searching...</div> : null}
            {!searching && searchReady && searchResults.length === 0 ? (
              <div className="border rounded-3 p-24 mt-16 text-center bg-light-subtle">
                <p className="text-muted mb-16">No branch-visible patients found.</p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <Link href={`/staff/branch/${branchId}/clinic/patients`} className="btn btn-sm btn-outline-primary">
                    Go to Patients
                  </Link>
                  <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-outline-secondary">
                    Receive vaccine stock
                  </Link>
                </div>
              </div>
            ) : null}

            {searchResults.length > 0 ? (
              <div className="row g-3 mt-8">
                {searchResults.map((pet) => {
                  const petOwner = getOwner(pet);
                  return (
                    <div className="col-md-6" key={pet.id}>
                      <div
                        className="border rounded-3 p-16 h-100 bg-white shadow-sm"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(workspaceHref(pet.id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") router.push(workspaceHref(pet.id));
                        }}
                      >
                        <div className="d-flex justify-content-between gap-2 mb-8">
                          <div>
                            <h6 className="mb-2">{pet.name || `Pet #${pet.id}`}</h6>
                            <div className="small text-muted">{pet.uniquePetId || `#${pet.id}`}</div>
                          </div>
                          <span className="badge bg-light text-dark border align-self-start">{pet.animalType?.name || "Patient"}</span>
                        </div>
                        <div className="small text-muted mb-12">
                          <div>Owner: {ownerLabel(petOwner)}</div>
                          <div>Phone: {petOwner?.phone || "-"}</div>
                        </div>
                        <Link href={workspaceHref(pet.id)} className="btn btn-sm btn-primary" onClick={(event) => event.stopPropagation()}>
                          Open vaccination workspace
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="row gy-4">
        <div className="col-xl-8">
          <Card title="Recent vaccination records" subtitle="Branch-visible records">
            {dashboardLoading ? (
              <div className="py-32 text-center text-muted">Loading dashboard...</div>
            ) : recentRecords.length === 0 ? (
              <div className="py-32 text-center text-muted">No recent vaccination records found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Pet</th>
                      <th>Vaccine</th>
                      <th>Administered</th>
                      <th>Next due</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div className="fw-semibold">{record.pet?.name || `Pet #${record.petId}`}</div>
                          <div className="small text-muted">{record.pet?.uniquePetId || `#${record.petId}`}</div>
                        </td>
                        <td>{vaccineName(record)}</td>
                        <td>{formatDate(record.administeredAt)}</td>
                        <td>{formatDate(record.nextDueDate)}</td>
                        <td className="text-end">
                          <Link
                            className="btn btn-sm btn-outline-primary"
                            href={workspaceHref(record.pet?.id || record.petId)}
                            aria-disabled={!record.pet?.id && !record.petId}
                          >
                            Open workspace
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="mt-24">
            <Card title="Vaccination reminders" subtitle="Compact due and overdue queue">
              <div className="d-flex flex-wrap gap-8 mb-12">
                {["PENDING", "OVERDUE", "ALL"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`btn btn-sm ${reminderFilter === filter ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setReminderFilter(filter)}
                  >
                    {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {remindersError ? <div className="alert alert-danger py-2">{remindersError}</div> : null}
              {remindersLoading ? (
                <div className="py-24 text-center text-muted">Loading reminders...</div>
              ) : reminders.length === 0 ? (
                <div className="py-24 text-center text-muted">No reminders found for this filter.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Pet</th>
                        <th>Owner</th>
                        <th>Vaccine</th>
                        <th>Due date</th>
                        <th>Status</th>
                        <th>Scheduled for</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reminders.slice(0, 8).map((item) => (
                        <tr key={item.id}>
                          <td>{item.pet?.name || "-"}</td>
                          <td>{reminderOwnerLabel(item.owner)}</td>
                          <td>{item.vaccineName || "-"}</td>
                          <td>{formatDate(item.dueDate)}</td>
                          <td>{item.status || "-"}</td>
                          <td>{formatDateTime(item.scheduledFor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="col-xl-4">
          <Card title="Vaccine stock setup" subtitle="Use these when a vaccine cannot find stock.">
            <div className="d-flex flex-column gap-2">
              <div className="alert alert-info py-2 mb-2">
                If no batch is available or mapping is unclear, ask owner/admin to configure Vaccine Mapping.
              </div>
              {canConfigureVaccineMapping ? (
                <Link href={`/owner/clinic/${branchId}/catalog/vaccine-mappings`} className="btn btn-sm btn-outline-primary">
                  Configure Mapping
                </Link>
              ) : (
                <div>
                  <span className="btn btn-sm btn-outline-primary disabled w-100" aria-disabled="true">
                    Configure Mapping
                  </span>
                  <p className="text-muted small mb-0 mt-2">Ask owner/admin to configure Vaccine Mapping.</p>
                </div>
              )}
              <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-primary">
                Receive Stock
              </Link>
              <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-outline-secondary">
                View Stock
              </Link>
            </div>
          </Card>

          <div className="mt-24">
          <Card title="Low stock vaccine items" subtitle="Read-only stock alert view">
            {lowStockVaccines.length === 0 ? (
              <div>
                <p className="text-muted small mb-3">No vaccine-like low stock alerts found.</p>
                <div className="d-flex flex-wrap gap-2">
                  <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-outline-primary">
                    View Stock
                  </Link>
                  <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-primary">
                    Receive Stock
                  </Link>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Available</th>
                      <th>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockVaccines.map((row) => (
                      <tr key={`${row.itemId || row.item?.id}-${row.variantId || row.variant?.id}`}>
                        <td>
                          <div className="fw-semibold">{row.item?.name || "Unnamed item"}</div>
                          <div className="small text-muted">{row.variant?.variantName || row.item?.itemCode || "-"}</div>
                        </td>
                        <td>{row.availableQty ?? row.currentQty ?? "-"}</td>
                        <td>{row.reorderLevel ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>
        </div>
      </div>
    </PageWorkspace>
  );
}
