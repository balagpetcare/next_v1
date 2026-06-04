"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicVaccineInventoryMappings,
  staffClinicUpsertVaccineInventoryMapping,
  staffClinicItemSearch,
  staffClinicCatalogItemById,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const WRITE_PERMS = ["clinic.emr.write"];

function isVaccineLikeItem(item) {
  if (!item) return false;
  const text = `${item.name || ""} ${item.category?.name || ""} ${item.manufacturerName || ""}`.toLowerCase();
  const itemCode = String(item.itemCode || "").toUpperCase();
  return (
    String(item.domainType || "").toUpperCase() === "MEDICINE" &&
    item.isActive !== false &&
    item.isInventoryTracked === true &&
    (
      text.includes("vaccine") ||
      text.includes("vaccin") ||
      text.includes("rabies") ||
      text.includes("dhpp") ||
      text.includes("dhppi") ||
      text.includes("fvrcp") ||
      text.includes("felv") ||
      text.includes("leukemia") ||
      text.includes("bordetella") ||
      text.includes("kennel cough") ||
      text.includes("tricat") ||
      itemCode.startsWith("VAC")
    )
  );
}

function statusBadgeClass(status) {
  if (status === "MAPPED") return "badge bg-success-subtle text-success";
  if (status === "INVALID_ITEM") return "badge bg-danger-subtle text-danger";
  if (status === "INACTIVE") return "badge bg-secondary-subtle text-secondary";
  return "badge bg-warning-subtle text-warning";
}

function buildDraft(row) {
  return {
    clinicalItemId: row.mapping?.clinicalItemId != null ? String(row.mapping.clinicalItemId) : "",
    clinicalItemVariantId: row.mapping?.clinicalItemVariantId != null ? String(row.mapping.clinicalItemVariantId) : "",
    isActive: row.mapping?.isActive ?? true,
    notes: row.mapping?.notes ?? "",
  };
}

function normalizeMappingRows(input) {
  const response = input;
  const data = response?.data?.data ?? response?.data ?? response;
  const nestedData = data?.data ?? null;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(nestedData?.items)
      ? nestedData.items
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(data)
          ? data
          : [];

  return items
    .map((row) => {
      const vaccineType = row?.vaccineType ?? {
        id: row?.vaccineTypeId,
        name: row?.vaccineTypeName,
        defaultIntervalDays: row?.defaultIntervalDays ?? null,
        targetAnimalType: row?.targetAnimalType ?? null,
      };
      if (!vaccineType?.id || !vaccineType?.name) return null;
      return {
        ...row,
        vaccineType,
        mappingStatus: row?.mappingStatus ?? row?.status ?? "UNMAPPED",
      };
    })
    .filter(Boolean);
}

function normalizeClinicalItems(input) {
  const response = input;
  const data = response?.data?.data ?? response?.data ?? response;
  const nestedData = data?.data ?? null;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(nestedData?.items)
      ? nestedData.items
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(data)
          ? data
          : [];

  return items
    .filter((row) => row && typeof row === "object" && row.id != null)
    .map((row) => ({
      id: Number(row.id),
      itemCode: row.itemCode ?? null,
      name: row.name ?? null,
      category: row.category ?? null,
      manufacturerName: row.manufacturerName ?? null,
      domainType: row.domainType ?? undefined,
      isActive: row.isActive !== false,
      isInventoryTracked: row.isInventoryTracked === true,
    }));
}

function dedupeClinicalItems(items) {
  const seen = new Map();
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.set(item.id, item);
  }
  return Array.from(seen.values()).sort((a, b) => `${a.name || ""}`.localeCompare(`${b.name || ""}`));
}

function buildItemOptionLabel(item) {
  return `${item.itemCode || "NO-CODE"} · ${item.name || "Unnamed item"} · ${item.manufacturerName || "No manufacturer"}`;
}

export default function StaffVaccineMappingsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [rows, setRows] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [variantsByItemId, setVariantsByItemId] = useState({});
  const [drafts, setDrafts] = useState({});
  const [savingByVaccineTypeId, setSavingByVaccineTypeId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const canWrite = WRITE_PERMS.some((perm) => permissions.includes(perm));

  const loadPage = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const mappingData = await staffClinicVaccineInventoryMappings(branchId);
      const mappingRows = normalizeMappingRows(mappingData);
      const searchQueries = ["vaccine", "rabies", "dhpp", "fvrcp", "VAC", "immun"];
      const searchResponses = await Promise.all(
        searchQueries.map((q) => staffClinicItemSearch(branchId, { q, limit: 60 }))
      );
      const mergedRaw = searchResponses.flatMap((resp) => normalizeClinicalItems(resp));
      const searchedItems = mergedRaw;
      const mappedItems = mappingRows
        .map((row) => row.mappedClinicalItem)
        .filter(Boolean)
        .map((row) => ({
          id: Number(row.id),
          itemCode: row.itemCode ?? null,
          name: row.name ?? null,
          category: row.category ?? null,
          manufacturerName: row.manufacturerName ?? null,
          domainType: "MEDICINE",
          isActive: true,
          isInventoryTracked: true,
        }));
      const vaccineItems = dedupeClinicalItems([...searchedItems, ...mappedItems].filter(isVaccineLikeItem));
      setRows(mappingRows);
      setItemOptions(vaccineItems);
      setDrafts(Object.fromEntries(mappingRows.map((row) => [String(row.vaccineType.id), buildDraft(row)])));
    } catch (e) {
      setError(e?.message || "Failed to load vaccine mappings.");
      setRows([]);
      setItemOptions([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(""), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const ensureVariantsLoaded = useCallback(
    async (itemId) => {
      if (!branchId || !itemId || variantsByItemId[itemId]) return;
      try {
        const detail = await staffClinicCatalogItemById(branchId, itemId);
        const variants = Array.isArray(detail?.variants) ? detail.variants : [];
        setVariantsByItemId((prev) => ({ ...prev, [itemId]: variants.filter((row) => row?.isActive !== false) }));
      } catch {
        setVariantsByItemId((prev) => ({ ...prev, [itemId]: [] }));
      }
    },
    [branchId, variantsByItemId]
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.vaccineType?.name || "").localeCompare(b.vaccineType?.name || "")),
    [rows]
  );

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <div className="py-40 px-3 text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-16 text-secondary-light">Loading...</p>
        </div>
      </PageWorkspace>
    );
  }

  if (!canWrite) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <AccessDenied missingPerm="clinic.emr.write" onBack={() => window.history.back()} />
      </PageWorkspace>
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-12 mb-24">
        <div>
          <div className="d-flex align-items-center gap-12 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic/vaccinations`} className="btn btn-outline-secondary btn-sm">
              Back to Vaccination
            </Link>
            <h4 className="mb-0">Vaccine Mapping</h4>
          </div>
          <p className="text-muted small mb-0 mt-8">
            Map vaccine master types to clinic inventory items/batches so vaccination administration can deduct stock correctly.
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadPage} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      {success ? <div className="alert alert-success py-2">{success}</div> : null}

      <Card
        title="Mapping Matrix"
        subtitle="Explicit mappings are used first for stock candidate resolution. Unmapped or invalid rows continue to use fallback matching."
      >
        {!loading && sortedRows.length > 0 && itemOptions.length === 0 ? (
          <div className="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-12">
            <span>No vaccine inventory items found. Create or import vaccine items in Clinic Catalog first.</span>
            <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-primary">
              Go to Clinic Items
            </Link>
          </div>
        ) : null}

        {loading ? (
          <div className="text-center py-40">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-16 mb-0">Loading vaccine mappings...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Vaccine Type</th>
                  <th>Status</th>
                  <th>Clinical Item</th>
                  <th>Variant</th>
                  <th>Notes</th>
                  <th className="text-center">Active</th>
                  <th className="text-end">Save</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const vaccineTypeId = String(row.vaccineType.id);
                  const draft = drafts[vaccineTypeId] ?? buildDraft(row);
                  const variantOptions = draft.clinicalItemId ? variantsByItemId[draft.clinicalItemId] ?? [] : [];
                  const isSaving = savingByVaccineTypeId[vaccineTypeId] === true;

                  return (
                    <tr key={row.vaccineType.id}>
                      <td style={{ minWidth: 220 }}>
                        <div className="fw-semibold">{row.vaccineType.name}</div>
                        <div className="small text-muted">
                          {row.vaccineType.targetAnimalType?.name || "All animals"}
                          {row.vaccineType.defaultIntervalDays
                            ? ` · ${row.vaccineType.defaultIntervalDays}d default interval`
                            : ""}
                        </div>
                        {row.mappedClinicalItem ? (
                          <div className="small text-muted mt-8">
                            Current: <code>{row.mappedClinicalItem.itemCode || "—"}</code>{" "}
                            {row.mappedClinicalItem.name || "Unnamed item"}
                            {row.mappedClinicalItemVariant?.variantName
                              ? ` · ${row.mappedClinicalItemVariant.variantName}`
                              : ""}
                          </div>
                        ) : null}
                        {row.usesFallback ? (
                          <div className="small text-warning mt-8">
                            Fallback matching is currently used for this vaccine type.
                          </div>
                        ) : (
                          <div className="small text-success mt-8">
                            Explicit mapping is active for stock resolution.
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeClass(row.mappingStatus)}>{row.mappingStatus}</span>
                      </td>
                      <td style={{ minWidth: 280 }}>
                        <select
                          className="form-select form-select-sm"
                          value={draft.clinicalItemId}
                          onChange={(e) => {
                            const nextItemId = e.target.value;
                            setDrafts((prev) => ({
                              ...prev,
                              [vaccineTypeId]: {
                                ...draft,
                                clinicalItemId: nextItemId,
                                clinicalItemVariantId: "",
                              },
                            }));
                            if (nextItemId) ensureVariantsLoaded(nextItemId);
                          }}
                        >
                          <option value="">Select clinical item</option>
                          {itemOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {buildItemOptionLabel(item)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <select
                          className="form-select form-select-sm"
                          value={draft.clinicalItemVariantId}
                          onFocus={() => {
                            if (draft.clinicalItemId) ensureVariantsLoaded(draft.clinicalItemId);
                          }}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [vaccineTypeId]: {
                                ...draft,
                                clinicalItemVariantId: e.target.value,
                              },
                            }))
                          }
                          disabled={!draft.clinicalItemId}
                        >
                          <option value="">Item-level mapping</option>
                          {variantOptions.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.variantName || "Unnamed variant"}
                              {variant.sku ? ` · ${variant.sku}` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={draft.notes}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [vaccineTypeId]: {
                                ...draft,
                                notes: e.target.value,
                              },
                            }))
                          }
                          placeholder="Optional notes"
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={draft.isActive}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [vaccineTypeId]: {
                                ...draft,
                                isActive: e.target.checked,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={!draft.clinicalItemId || isSaving}
                          onClick={async () => {
                            setSavingByVaccineTypeId((prev) => ({ ...prev, [vaccineTypeId]: true }));
                            setError("");
                            try {
                              await staffClinicUpsertVaccineInventoryMapping(branchId, row.vaccineType.id, {
                                clinicalItemId: Number(draft.clinicalItemId),
                                clinicalItemVariantId: draft.clinicalItemVariantId
                                  ? Number(draft.clinicalItemVariantId)
                                  : null,
                                isActive: draft.isActive,
                                notes: draft.notes.trim() || null,
                              });
                              setSuccess(`Saved mapping for ${row.vaccineType.name}.`);
                              await loadPage();
                            } catch (e) {
                              setError(e?.message || `Failed to save mapping for ${row.vaccineType.name}.`);
                            } finally {
                              setSavingByVaccineTypeId((prev) => ({ ...prev, [vaccineTypeId]: false }));
                            }
                          }}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-24">
                      No vaccine types configured yet. Seed or create vaccine types first.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWorkspace>
  );
}
