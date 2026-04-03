"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { doctorGetMe, doctorGetMyServices, doctorPostMyServicesAcknowledge } from "@/lib/api";
import { PageWorkspace, PageHeader, SectionCard, LoadingState } from "@/src/components/dashboard";
import { Form, Button, Badge } from "react-bootstrap";

export default function DoctorServiceFeesPage() {
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  useEffect(() => {
    setBranchesLoading(true);
    setBranchesError("");
    doctorGetMe()
      .then((me: any) => {
        const b = me?.branches ?? [];
        setBranches(b);
        if (b.length === 1) setBranchId(b[0].branchId);
      })
      .catch((e) => {
        setBranches([]);
        setBranchesError((e as Error)?.message || "Could not load your clinics.");
      })
      .finally(() => setBranchesLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (branchId === "") return;
    setLoading(true);
    try {
      const data = await doctorGetMyServices(Number(branchId));
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const ack = async (serviceId: number, species: string | null) => {
    if (branchId === "") return;
    try {
      await doctorPostMyServicesAcknowledge(Number(branchId), { serviceId, species });
      toast.success("Acknowledged");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Acknowledge failed");
    }
  };

  return (
    <PageWorkspace>
      <PageHeader
        title="My service fees"
        subtitle="Branch list price, your fee model, and pending manager changes — acknowledge here when required"
      />

      {branchesLoading ? (
        <SectionCard title="Branch">
          <LoadingState message="Loading your clinics…" />
        </SectionCard>
      ) : branchesError ? (
        <div className="alert alert-danger radius-12" role="alert">
          {branchesError}
        </div>
      ) : branches.length === 0 ? (
        <SectionCard title="Branch">
          <p className="text-muted small mb-0">
            You are not linked to any clinic branch yet. After your clinic assigns you, refresh this page and choose your branch.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title="Branch">
          <Form.Select
            value={branchId === "" ? "" : String(branchId)}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
            className="max-w-400"
            aria-label="Clinic branch"
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>
                {b.branchName ?? `Branch ${b.branchId}`}
              </option>
            ))}
          </Form.Select>
        </SectionCard>
      )}

      {branchId === "" && !branchesLoading && branches.length > 0 ? (
        <div className="text-muted small mt-3">Choose a branch to load fees and acknowledgments.</div>
      ) : null}

      {branchId !== "" && loading ? (
        <LoadingState message="Loading fees…" />
      ) : branchId !== "" ? (
        <SectionCard title="Assigned services" className="mt-3">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Service</th>
                  <th>Assigned</th>
                  <th className="text-end">List ৳</th>
                  <th>Model</th>
                  <th className="text-end">Your fee ৳</th>
                  <th>Pending</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-medium">{r.service?.name ?? `#${r.serviceId}`}</div>
                      <div className="text-muted small">{r.service?.category ?? ""}</div>
                    </td>
                    <td>{r.assigned ? <Badge bg="success">Yes</Badge> : <Badge bg="light" text="dark">No</Badge>}</td>
                    <td className="text-end">{r.listPrice != null ? Number(r.listPrice).toLocaleString() : "—"}</td>
                    <td className="small">{r.feeModel ?? "FIXED"}</td>
                    <td className="text-end fw-semibold">
                      {r.resolvedFeeAmount != null ? Number(r.resolvedFeeAmount).toLocaleString() : "—"}
                    </td>
                    <td>
                      {r.pendingAck ? <Badge bg="warning" text="dark">Ack required</Badge> : "—"}
                      {r.feeLockedByClinic ? <div className="small text-muted mt-1">Clinic locked</div> : null}
                    </td>
                    <td className="text-end">
                      {r.pendingAck && (
                        <Button size="sm" variant="outline-primary" className="radius-8" onClick={() => ack(r.serviceId, r.species ?? null)}>
                          Acknowledge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && !loading && (
            <p className="text-muted small mb-0 mt-3">No fee rows for this branch. If you expect assignments, ask clinic staff to enable services for your profile.</p>
          )}
        </SectionCard>
      ) : null}
    </PageWorkspace>
  );
}
