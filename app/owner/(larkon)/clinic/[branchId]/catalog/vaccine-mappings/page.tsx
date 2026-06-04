"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ownerClinicItemById,
  ownerClinicItemSearch,
  ownerClinicItemsList,
  ownerClinicUpsertVaccineInventoryMapping,
  ownerClinicVaccineInventoryMappings,
} from "@/app/owner/_lib/ownerApi";

type MappingRow = {
  vaccineTypeId?: number;
  vaccineTypeName?: string;
  targetAnimalType?: { id: number; name: string } | null;
  defaultIntervalDays?: number | null;
  status?: "MAPPED" | "UNMAPPED" | "INVALID_ITEM" | "INACTIVE";
  vaccineType: {
    id: number;
    name: string;
    description?: string | null;
    defaultIntervalDays?: number | null;
    targetAnimalType?: { id: number; name: string } | null;
  };
  mapping: {
    id: number;
    clinicalItemId: number;
    clinicalItemVariantId: number | null;
    isActive: boolean;
    mappingSource?: string | null;
    notes?: string | null;
  } | null;
  mappedClinicalItem?: {
    id: number;
    itemCode?: string | null;
    name?: string | null;
    category?: { id: number; name: string } | null;
    manufacturerName?: string | null;
  } | null;
  mappedClinicalItemVariant?: {
    id: number;
    variantName?: string | null;
    sku?: string | null;
  } | null;
  mappingStatus: "MAPPED" | "UNMAPPED" | "INVALID_ITEM" | "INACTIVE";
  usesFallback?: boolean;
};

type ClinicalItemOption = {
  id: number;
  itemCode?: string | null;
  name?: string | null;
  category?: { id: number; name: string } | null;
  manufacturerName?: string | null;
  domainType?: string;
  isActive?: boolean;
  isInventoryTracked?: boolean;
};

type VariantOption = {
  id: number;
  variantName?: string | null;
  sku?: string | null;
  isActive?: boolean;
};

type DraftRow = {
  clinicalItemId: string;
  clinicalItemVariantId: string;
  isActive: boolean;
  notes: string;
};

function isVaccineLikeItem(item: ClinicalItemOption): boolean {
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

function statusBadgeClass(status: MappingRow["mappingStatus"]): string {
  if (status === "MAPPED") return "bg-success-subtle text-success";
  if (status === "INVALID_ITEM") return "bg-danger-subtle text-danger";
  if (status === "INACTIVE") return "bg-secondary-subtle text-secondary";
  return "bg-warning-subtle text-warning";
}

function buildDraft(row: MappingRow): DraftRow {
  return {
    clinicalItemId: row.mapping?.clinicalItemId != null ? String(row.mapping.clinicalItemId) : "",
    clinicalItemVariantId: row.mapping?.clinicalItemVariantId != null ? String(row.mapping.clinicalItemVariantId) : "",
    isActive: row.mapping?.isActive ?? true,
    notes: row.mapping?.notes ?? "",
  };
}

function normalizeMappingRows(input: unknown): MappingRow[] {
  const response = input as any;
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
    .map((row: any) => {
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
      } as MappingRow;
    })
    .filter(Boolean) as MappingRow[];
}

function normalizeClinicalItems(input: unknown): ClinicalItemOption[] {
  const response = input as any;
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
    .filter((row: any) => row && typeof row === "object" && row.id != null)
    .map((row: any) => ({
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

function dedupeClinicalItems(items: ClinicalItemOption[]): ClinicalItemOption[] {
  const seen = new Map<number, ClinicalItemOption>();
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.set(item.id, item);
  }
  return Array.from(seen.values()).sort((a, b) => `${a.name || ""}`.localeCompare(`${b.name || ""}`));
}

function buildItemOptionLabel(item: ClinicalItemOption): string {
  return `${item.itemCode || "NO-CODE"} · ${item.name || "Unnamed item"} · ${item.manufacturerName || "No manufacturer"}`;
}

export default function OwnerClinicVaccineMappingsPage() {
  const params = useParams();
  const branchId = params?.branchId != null ? String(params.branchId) : "";

  const [rows, setRows] = useState<MappingRow[]>([]);
  const [itemOptions, setItemOptions] = useState<ClinicalItemOption[]>([]);
  const [variantsByItemId, setVariantsByItemId] = useState<Record<string, VariantOption[]>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [savingByVaccineTypeId, setSavingByVaccineTypeId] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPage = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const [mappingData, itemData, searchedItemData] = await Promise.all([
        ownerClinicVaccineInventoryMappings(branchId),
        ownerClinicItemsList(branchId, { domainType: "MEDICINE", limit: 500, page: 1, isActive: true }),
        ownerClinicItemSearch(branchId, { q: "vaccine", domainType: "MEDICINE", limit: 100 }),
      ]);
      const mappingRows = normalizeMappingRows(mappingData);
      const medicineItems = normalizeClinicalItems(itemData);
      const searchedItems = normalizeClinicalItems(searchedItemData);
      const mappedItems = mappingRows
        .map((row) => row.mappedClinicalItem)
        .filter((row): row is NonNullable<MappingRow["mappedClinicalItem"]> => !!row)
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
      const vaccineItems = dedupeClinicalItems([...medicineItems, ...searchedItems, ...mappedItems].filter(isVaccineLikeItem));
      setRows(mappingRows);
      setItemOptions(vaccineItems);
      setDrafts(
        Object.fromEntries(
          mappingRows.map((row) => [String(row.vaccineType.id), buildDraft(row)])
        )
      );
    } catch (e) {
      setError((e as Error)?.message || "Failed to load vaccine mappings.");
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
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const ensureVariantsLoaded = useCallback(
    async (itemId: string) => {
      if (!branchId || !itemId || variantsByItemId[itemId]) return;
      try {
        const detail = await ownerClinicItemById(branchId, itemId);
        const variants = Array.isArray((detail as any)?.variants) ? ((detail as any).variants as VariantOption[]) : [];
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

  if (!branchId) {
    return <div className="dashboard-main-body"><div className="alert alert-warning radius-12">Invalid branch.</div></div>;
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item"><Link href="/owner">Home</Link></li>
              <li className="breadcrumb-item"><Link href={`/owner/clinic/${branchId}/catalog`}>Clinic Catalog</Link></li>
              <li className="breadcrumb-item active">Vaccine Mappings</li>
            </ol>
          </nav>
          <h1 className="h4 mb-1">Vaccine Inventory Mappings</h1>
          <p className="text-muted mb-0">Map each vaccine type to the clinical inventory item used for stock deduction.</p>
        </div>
        <Link href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-secondary radius-12">
          Back to Catalog
        </Link>
      </div>

      {error ? <div className="alert alert-danger radius-12">{error}</div> : null}
      {success ? <div className="alert alert-success radius-12">{success}</div> : null}

      <div className="card radius-12">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h6 className="mb-1">Mapping Matrix</h6>
              <p className="text-muted small mb-0">
                Explicit mappings are used first for stock candidate resolution. Unmapped or invalid rows continue to use fallback matching during this phase.
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={loadPage} disabled={loading}>
              Refresh
            </button>
          </div>

          {!loading && sortedRows.length > 0 && itemOptions.length === 0 ? (
            <div className="alert alert-warning radius-12 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>No vaccine inventory items found. Create or import vaccine items in Clinic Catalog first.</span>
              <Link href={`/owner/clinic/${branchId}/catalog`} className="btn btn-sm btn-primary radius-8">
                Go to Clinic Catalog
              </Link>
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-2 mb-0">Loading vaccine mappings...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
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
                    const variantOptions = draft.clinicalItemId ? (variantsByItemId[draft.clinicalItemId] ?? []) : [];
                    const isSaving = savingByVaccineTypeId[vaccineTypeId] === true;

                    return (
                      <tr key={row.vaccineType.id}>
                        <td style={{ minWidth: 220 }}>
                          <div className="fw-semibold">{row.vaccineType.name}</div>
                          <div className="small text-muted">
                            {row.vaccineType.targetAnimalType?.name || "All animals"}
                            {row.vaccineType.defaultIntervalDays ? ` · ${row.vaccineType.defaultIntervalDays}d default interval` : ""}
                          </div>
                          {row.mappedClinicalItem ? (
                            <div className="small text-muted mt-1">
                              Current: <code>{row.mappedClinicalItem.itemCode || "—"}</code> {row.mappedClinicalItem.name || "Unnamed item"}
                              {row.mappedClinicalItemVariant?.variantName ? ` · ${row.mappedClinicalItemVariant.variantName}` : ""}
                              {row.mappedClinicalItemVariant?.sku ? ` · SKU ${row.mappedClinicalItemVariant.sku}` : ""}
                            </div>
                          ) : null}
                          {row.usesFallback ? (
                            <div className="small text-warning mt-1">Fallback matching is currently used for this vaccine type.</div>
                          ) : (
                            <div className="small text-success mt-1">Explicit mapping is active for stock resolution.</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge rounded-pill ${statusBadgeClass(row.mappingStatus)}`}>{row.mappingStatus}</span>
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
                                {variant.variantName || "Unnamed variant"}{variant.sku ? ` · ${variant.sku}` : ""}
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
                            className="btn btn-sm btn-primary radius-8"
                            disabled={!draft.clinicalItemId || isSaving}
                            onClick={async () => {
                              setSavingByVaccineTypeId((prev) => ({ ...prev, [vaccineTypeId]: true }));
                              setError("");
                              try {
                                await ownerClinicUpsertVaccineInventoryMapping(branchId, row.vaccineType.id, {
                                  clinicalItemId: Number(draft.clinicalItemId),
                                  clinicalItemVariantId: draft.clinicalItemVariantId ? Number(draft.clinicalItemVariantId) : null,
                                  isActive: draft.isActive,
                                  notes: draft.notes.trim() || null,
                                });
                                setSuccess(`Saved mapping for ${row.vaccineType.name}.`);
                                await loadPage();
                              } catch (e) {
                                setError((e as Error)?.message || `Failed to save mapping for ${row.vaccineType.name}.`);
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
                      <td colSpan={7} className="text-center text-muted py-4">
                        No vaccine types configured yet. Seed or create vaccine types first.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
