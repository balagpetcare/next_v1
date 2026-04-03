"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminVerificationsApi } from "@/lib/adminApi";
import { vetReferenceBodiesByCountry } from "@/lib/api";
import AdminPageShell from "@/src/bpa/admin/components/AdminPageShell";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import {
  VERIFICATION_ENTITY_CONFIG,
  VERIFICATION_STATUS_OPTIONS,
  VerificationEntityKey,
  getVerificationDetailHref,
} from "./config";
import { PaginationBar } from "@/src/components/common/PaginationBar";

type RowItem = Record<string, unknown>;

type TableRow = {
  id: number;
  name: string;
  meta: string;
  submittedAt: string | null;
  status: string;
};

function toDateText(value: unknown) {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function getTableRows(entityKey: VerificationEntityKey, rows: RowItem[]): TableRow[] {
  if (entityKey === "owners") {
    return rows.map((row) => {
      const user = row.user as Record<string, unknown> | undefined;
      const auth = user?.auth as Record<string, unknown> | undefined;
      return {
        id: Number(row.id),
        name: String(row.fullName || "Owner"),
        meta: `${String(row.mobile || auth?.phone || "—")} • ${String(row.email || auth?.email || "—")}`,
        submittedAt: row.submittedAt ? String(row.submittedAt) : null,
        status: String(row.verificationStatus || row.status || "UNSUBMITTED"),
      };
    });
  }
  if (entityKey === "organizations") {
    return rows.map((row) => {
      const organization = row.organization as Record<string, unknown> | undefined;
      return {
        id: Number(row.id),
        name: String(row.organizationName || organization?.name || `Organization #${row.id}`),
        meta: `License: ${String(row.tradeLicenseNumber || "—")} • Owner #${String(
          organization?.ownerUserId || "—"
        )}`,
        submittedAt: row.submittedAt ? String(row.submittedAt) : null,
        status: String(row.verificationStatus || "UNSUBMITTED"),
      };
    });
  }
  if (entityKey === "branches") {
    return rows.map((row) => {
      const branch = row.branch as Record<string, unknown> | undefined;
      return {
        id: Number(row.id),
        name: String(branch?.name || `Branch #${row.branchId || row.id}`),
        meta: `Org #${String(branch?.orgId || "—")} • Manager: ${String(row.managerName || "—")}`,
        submittedAt: row.submittedAt ? String(row.submittedAt) : null,
        status: String(row.verificationStatus || "UNSUBMITTED"),
      };
    });
  }
  if (entityKey === "staff") {
    return rows.map((row) => {
      const user = row.user as Record<string, unknown> | undefined;
      const auth = user?.auth as Record<string, unknown> | undefined;
      const branch = row.branch as Record<string, unknown> | undefined;
      return {
        id: Number(row.id),
        name: String(row.fullName || "Staff"),
        meta: `${String(auth?.phone || row.phone || "—")} • ${String(auth?.email || "—")} • ${String(
          branch?.name || "No branch"
        )}`,
        submittedAt: row.createdAt ? String(row.createdAt) : null,
        status: String(row.status || "INVITED"),
      };
    });
  }
  if (entityKey === "producer_orgs") {
    return rows.map((row) => {
      const owner = row.owner as Record<string, unknown> | undefined;
      const auth = owner?.auth as Record<string, unknown> | undefined;
      return {
        id: Number(row.id),
        name: String(row.name || `Producer #${row.id}`),
        meta: `${String(auth?.email || auth?.phone || "—")} • Country: ${String(
          row.countryCode || "—"
        )}`,
        submittedAt: row.createdAt ? String(row.createdAt) : null,
        status: String(row.status || "PENDING"),
      };
    });
  }
  return rows.map((row) => {
    const user = row.user as Record<string, unknown> | undefined;
    const auth = user?.auth as Record<string, unknown> | undefined;
    const licenses = (row.licenses || []) as Array<{ regulatoryBody?: { abbreviation?: string | null; name?: string | null } }>;
    const firstLicense = licenses[0]?.regulatoryBody;
    return {
      id: Number(row.id),
      name: `Doctor verification #${row.id}`,
      meta: `${String(row.primaryCountryCode || "—")} • ${String(
        firstLicense?.abbreviation || firstLicense?.name || "No body"
      )} • ${String(auth?.email || auth?.phone || "—")}`,
      submittedAt: row.submittedAt ? String(row.submittedAt) : null,
      status: String(row.verificationStatus || "UNSUBMITTED"),
    };
  });
}

export default function VerificationListPage({ entityKey }: { entityKey: VerificationEntityKey }) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doctorCountry, setDoctorCountry] = useState("");
  const [doctorBodyId, setDoctorBodyId] = useState<number | "">("");
  const [doctorBodyOptions, setDoctorBodyOptions] = useState<
    { id: number; name: string; abbreviation?: string | null }[]
  >([]);

  const config = VERIFICATION_ENTITY_CONFIG[entityKey];
  const offset = (page - 1) * limit;

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search") || searchParams.get("q");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const countryParam = searchParams.get("country");
    const bodyIdParam = searchParams.get("bodyId");
    setStatus(statusParam || "");
    setSearch(searchParam || "");
    setDateFrom(dateFromParam || "");
    setDateTo(dateToParam || "");
    if (entityKey === "doctors") {
      setDoctorCountry(countryParam || "");
      if (bodyIdParam && Number.isFinite(Number(bodyIdParam))) {
        setDoctorBodyId(Number(bodyIdParam));
      } else {
        setDoctorBodyId("");
      }
    }
    setPage(1);
  }, [searchParams, entityKey]);

  useEffect(() => {
    if (entityKey !== "doctors" || !doctorCountry.trim()) {
      setDoctorBodyOptions([]);
      setDoctorBodyId("");
      return;
    }
    vetReferenceBodiesByCountry(doctorCountry.trim())
      .then((list) => setDoctorBodyOptions(list))
      .catch(() => setDoctorBodyOptions([]));
  }, [entityKey, doctorCountry]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const baseParams = {
        status: status || undefined,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit,
        offset,
      };
      let response: { data?: unknown[]; total?: number } = { data: [] };
      if (entityKey === "owners") response = await adminVerificationsApi.owners(baseParams);
      else if (entityKey === "organizations")
        response = await adminVerificationsApi.organizations(baseParams);
      else if (entityKey === "branches")
        response = await adminVerificationsApi.branches(baseParams);
      else if (entityKey === "staff") response = await adminVerificationsApi.staff(baseParams);
      else if (entityKey === "producer_orgs")
        response = await adminVerificationsApi.producerOrgs(baseParams);
      else {
        response = await adminVerificationsApi.doctors({
          ...baseParams,
          country: doctorCountry.trim() || undefined,
          bodyId:
            doctorBodyId !== "" && Number.isFinite(Number(doctorBodyId))
              ? Number(doctorBodyId)
              : undefined,
        });
      }
      const dataRows = Array.isArray(response?.data)
        ? (response.data as RowItem[])
        : [];
      setRows(dataRows);
      setTotal(
        Number.isFinite(Number(response?.total))
          ? Number(response?.total)
          : offset + dataRows.length
      );
    } catch (e) {
      setError((e as Error)?.message || "Failed to load verification list");
    } finally {
      setLoading(false);
    }
  }, [
    status,
    search,
    dateFrom,
    dateTo,
    limit,
    offset,
    entityKey,
    doctorCountry,
    doctorBodyId,
  ]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const tableRows = useMemo(
    () => getTableRows(entityKey, rows),
    [entityKey, rows]
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const resetPagination = () => setPage(1);

  return (
    <AdminPageShell
      title={`${config.label} Verification Queue`}
      breadcrumbs={[
        { label: "Governance" },
        { label: "Verification Center" },
        { label: config.label },
      ]}
      actions={
        <>
          <Link href="/admin/verifications" className="btn btn-sm btn-outline-primary">
            Overview
          </Link>
          <Link href="/admin/verification-metrics" className="btn btn-sm btn-outline-secondary">
            Metrics
          </Link>
        </>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <FilterPanel title="Filters" defaultCollapsed={false}>
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Status</label>
              <select
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  resetPagination();
                }}
              >
                {VERIFICATION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt || "all"} value={opt}>
                    {opt || "All"}
                  </option>
                ))}
              </select>

              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, email, phone, ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPagination();
                }}
              />

              <label className="small text-secondary mt-2">Date From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  resetPagination();
                }}
              />
              <label className="small text-secondary mt-2">Date To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  resetPagination();
                }}
              />

              {entityKey === "doctors" ? (
                <>
                  <label className="small text-secondary mt-2">Country (code)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="BD, IN, US..."
                    value={doctorCountry}
                    onChange={(e) => {
                      setDoctorCountry(e.target.value.toUpperCase());
                      setDoctorBodyId("");
                      resetPagination();
                    }}
                  />
                  {doctorBodyOptions.length > 0 ? (
                    <>
                      <label className="small text-secondary mt-2">Regulatory Body</label>
                      <select
                        className="form-select form-select-sm"
                        value={doctorBodyId === "" ? "" : doctorBodyId}
                        onChange={(e) => {
                          setDoctorBodyId(
                            e.target.value === "" ? "" : Number(e.target.value)
                          );
                          resetPagination();
                        }}
                      >
                        <option value="">All</option>
                        {doctorBodyOptions.map((body) => (
                          <option key={body.id} value={body.id}>
                            {body.abbreviation || body.name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </FilterPanel>
        </div>

        <div className="col-12 col-lg-9">
          <SectionCard
            title={`${config.label} queue`}
            right={<span className="text-secondary small">{total} total</span>}
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Meta</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={`${entityKey}-${row.id}`}>
                      <td>
                        <div className="fw-semibold">{row.name}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          #{row.id}
                        </div>
                      </td>
                      <td className="text-secondary" style={{ fontSize: 13 }}>
                        {row.meta}
                      </td>
                      <td style={{ fontSize: 13 }}>{toDateText(row.submittedAt)}</td>
                      <td>
                        <StatusChip status={row.status} />
                      </td>
                      <td className="text-end">
                        <Link
                          href={getVerificationDetailHref(entityKey, row.id)}
                          className="btn btn-sm btn-primary"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!tableRows.length && !loading ? (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4">
                        No items found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {loading ? <div className="text-center text-secondary py-3">Loading...</div> : null}

            <PaginationBar
              page={page}
              pageSize={limit}
              total={total}
              totalPages={totalPages}
              disabled={loading}
              onPageChange={setPage}
              className="mt-3 pt-3 border-top"
              ariaLabel={`${config.label} verification pages`}
            />
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  );
}
