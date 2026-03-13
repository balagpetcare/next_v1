"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicDispenseRequestsList,
  staffClinicInternalOrdersDashboard,
  staffClinicDispenseRequestApprove,
  staffClinicDispenseRequestIssue,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["medicine.dispense.request", "medicine.dispense.approve", "medicine.dispense.issue"];

export default function InternalOrdersPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = (myAccess?.permissions as string[]) || [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canApprove = permissions.includes("medicine.dispense.approve");
  const canIssue = permissions.includes("medicine.dispense.issue");

  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "ISSUED" | "">("");
  const [dashboard, setDashboard] = useState<Record<string, number>>({});
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState("");

  const loadDashboard = useCallback(() => {
    if (!branchId) return;
    staffClinicInternalOrdersDashboard(branchId, requestTypeFilter ? { requestType: requestTypeFilter } : undefined)
      .then(setDashboard)
      .catch(() => setDashboard({}));
  }, [branchId, requestTypeFilter]);

  const loadList = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    const status = tab || undefined;
    staffClinicDispenseRequestsList(branchId, {
      status,
      requestType: requestTypeFilter || undefined,
      take: 100,
    })
      .then((arr) => {
        const typed = Array.isArray(arr) ? arr : [];
        setList(typed.filter((r: any) => r.requestType && r.requestType !== "STANDARD"));
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [branchId, tab, requestTypeFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleApprove = useCallback(
    (id: number) => {
      if (!branchId) return;
      setActingId(id);
      staffClinicDispenseRequestApprove(branchId, id)
        .then(() => {
          toast.success("Approved");
          loadList();
          loadDashboard();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setActingId(null));
    },
    [branchId, loadList, loadDashboard]
  );

  const handleIssue = useCallback(
    (id: number) => {
      if (!branchId) return;
      setActingId(id);
      staffClinicDispenseRequestIssue(branchId, id)
        .then(() => {
          toast.success("Issued");
          loadList();
          loadDashboard();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setActingId(null));
    },
    [branchId, loadList, loadDashboard]
  );

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="medicine.dispense.request" onBack={() => window.history.back()} />;
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <h1 className="h4 mb-4">Internal Orders</h1>
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <span className="me-2">Summary:</span>
            <span className="badge bg-secondary">Pending: {dashboard.pending ?? 0}</span>
            <span className="badge bg-info">Approved: {dashboard.approved ?? 0}</span>
            <span className="badge bg-success">Issued: {dashboard.issued ?? 0}</span>
            <span className="badge bg-dark">Activated vials: {dashboard.activated ?? 0}</span>
            <select
              className="form-select form-select-sm w-auto"
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="OPEN_NEW_VIAL">Open new vial</option>
              <option value="ADDITIONAL_VIAL">Additional vial</option>
              <option value="REPLACEMENT_VIAL">Replacement</option>
              <option value="EXPIRED_VIAL_REPLACEMENT">Expired replacement</option>
            </select>
          </div>
        </div>
      </div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "" ? "active" : ""}`}
            onClick={() => setTab("")}
          >
            All
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "PENDING" ? "active" : ""}`}
            onClick={() => setTab("PENDING")}
          >
            Pending
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "APPROVED" ? "active" : ""}`}
            onClick={() => setTab("APPROVED")}
          >
            Approved
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === "ISSUED" ? "active" : ""}`}
            onClick={() => setTab("ISSUED")}
          >
            Issued
          </button>
        </li>
      </ul>
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted mb-0">No internal orders in this tab.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Patient / Day item</th>
                    <th>Items</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.requestType ?? "STANDARD"}</td>
                      <td>
                        <span className={`badge bg-${r.status === "PENDING" ? "warning" : r.status === "APPROVED" ? "info" : "success"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.treatmentDayItem?.medicineName && (
                          <span className="small">Day item: {r.treatmentDayItem.medicineName}</span>
                        )}
                        {!r.treatmentDayItem && r.patientId && <span className="small">Patient #{r.patientId}</span>}
                      </td>
                      <td>{(r.items?.length ?? 0)} items</td>
                      <td>
                        {r.status === "PENDING" && canApprove && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            disabled={actingId === r.id}
                            onClick={() => handleApprove(r.id)}
                          >
                            Approve
                          </button>
                        )}
                        {r.status === "APPROVED" && canIssue && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={actingId === r.id}
                            onClick={() => handleIssue(r.id)}
                          >
                            Issue
                          </button>
                        )}
                        <Link
                          href={`/staff/branch/${branchId}/clinic/medicine-control/dispense-requests`}
                          className="btn btn-sm btn-link"
                        >
                          View all
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
