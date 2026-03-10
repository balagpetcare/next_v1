"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicPackageById,
  ownerClinicPackageUpdate,
  ownerClinicPackageItemsList,
  ownerClinicPackageItemUpsert,
  ownerClinicPackageItemDelete,
  ownerClinicPackagePriceRulesList,
  ownerClinicPackagePriceRuleCreate,
  ownerClinicPackagePriceRuleDelete,
  ownerClinicPackageComposition,
  ownerClinicItemSearch,
  ownerClinicBranchItemStock,
  ownerClinicLowStockAlerts,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const PACKAGE_TYPES = ["STANDARD", "PREMIUM", "WELFARE", "EMERGENCY", "PROMOTIONAL", "DOCTOR_SPECIFIC", "BRANCH_SPECIFIC"] as const;
const PACKAGE_TYPE_BADGE: Record<string, string> = {
  STANDARD: "bg-primary-subtle text-primary-emphasis",
  PREMIUM: "bg-success-subtle text-success-emphasis",
  WELFARE: "bg-info-subtle text-info-emphasis",
  EMERGENCY: "bg-warning-subtle text-warning-emphasis",
  PROMOTIONAL: "bg-secondary-subtle text-secondary-emphasis",
  DOCTOR_SPECIFIC: "bg-primary-subtle text-primary-emphasis",
  BRANCH_SPECIFIC: "bg-info-subtle text-info-emphasis",
};
/** Supported by backend PackageItemType enum */
const PACKAGE_ITEM_TYPES = ["INCLUDED", "INFORMATIONAL", "ADDON_ELIGIBLE"] as const;
const SUCCESS_AUTO_CLEAR_MS = 4000;
const ITEM_TYPE_BADGE: Record<string, string> = {
  INCLUDED: "bg-primary-subtle text-primary-emphasis",
  INFORMATIONAL: "bg-secondary-subtle text-secondary-emphasis",
  ADDON_ELIGIBLE: "bg-info-subtle text-info-emphasis",
};
const ITEM_SOURCE_CLINICAL = "CLINICAL_ITEM";
const ITEM_SOURCE_PRODUCT = "PRODUCT_VARIANT";

function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function toDateInputValue(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type PackageDetail = {
  id: number;
  packageCode: string;
  packageName: string;
  packageType?: string;
  baseSellingPrice?: number | string;
  status?: string;
  validFrom?: string | null;
  validTo?: string | null;
  doctorFeeAmount?: number | null;
  clinicFeeAmount?: number | null;
  consumableBlockAmount?: number | null;
  medicationBlockAmount?: number | null;
  supportFeeAmount?: number | null;
  estimatedCost?: number | null;
  addOnAllowed?: boolean;
  discountable?: boolean;
  speciesCondition?: string[] | object | null;
  service?: { id: number; name: string; category?: string };
};

type PackageItemRow = {
  id: number;
  itemType: string;
  productId?: number | null;
  variantId?: number | null;
  clinicalItemId?: number | null;
  clinicalItemVariantId?: number | null;
  estimatedQty?: number | null;
  estimatedCost?: number | null;
  sortOrder?: number | null;
  displayLabel?: string | null;
  product?: { name: string };
  variant?: { sku: string; title: string };
  clinicalItem?: { id: number; name: string; itemCode?: string };
  clinicalItemVariant?: { id: number; variantName: string; sku?: string };
};

type PriceRuleRow = {
  id: number;
  species?: string | null;
  weightMin?: number | null;
  weightMax?: number | null;
  weightBandJson?: { minKg?: number; maxKg?: number } | null;
  isEmergency?: boolean;
  price?: number | string;
  priceOverride?: number | string;
  validFrom?: string | null;
  validTo?: string | null;
};

type CompositionData = {
  package?: { id: number; code: string; name: string; type: string; basePrice: number };
  doctorFee?: number;
  clinicFee?: number;
  consumableBlock?: number;
  medicationBlock?: number;
  supportFee?: number;
  estimatedCost?: number;
  items?: Array<{ type: string; label: string; qty: number | null; cost: number | null }>;
};

export default function ClinicPackageDetailPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const packageId = params?.packageId as string | undefined;
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [items, setItems] = useState<PackageItemRow[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRuleRow[]>([]);
  const [composition, setComposition] = useState<CompositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({
    packageName: "",
    packageType: "STANDARD",
    baseSellingPrice: "",
    status: "ACTIVE",
    validFrom: "",
    validTo: "",
    doctorFeeAmount: "",
    clinicFeeAmount: "",
    consumableBlockAmount: "",
    medicationBlockAmount: "",
    supportFeeAmount: "",
    estimatedCost: "",
    addOnAllowed: true,
    discountable: true,
  });

  const [activeTab, setActiveTab] = useState<"items" | "rules" | "composition">("items");
  const [branchStockRows, setBranchStockRows] = useState<Array<{ variantId: number; availableQty: number; reorderLevel?: number | null; item?: { name: string }; variant?: { variantName: string } }>>([]);
  const [lowStockVariantIds, setLowStockVariantIds] = useState<Set<number>>(new Set());
  const [itemForm, setItemForm] = useState({
    id: null as number | null,
    itemType: "INCLUDED",
    productId: "",
    variantId: "",
    clinicalItemId: "",
    clinicalItemVariantId: "",
    estimatedQty: "",
    estimatedCost: "",
    displayLabel: "",
    sortOrder: "0",
  });
  const [itemSource, setItemSource] = useState<"CLINICAL_ITEM" | "PRODUCT_VARIANT">(ITEM_SOURCE_CLINICAL);
  const [clinicalItemSearchQ, setClinicalItemSearchQ] = useState("");
  const [clinicalItemResults, setClinicalItemResults] = useState<Array<{ id: number; name: string; itemCode?: string; variants?: Array<{ id: number; variantName: string; sku?: string; defaultCost?: number | null }> }>>([]);
  const [clinicalSearchLoading, setClinicalSearchLoading] = useState(false);
  const [clinicalSearchOpen, setClinicalSearchOpen] = useState(false);
  const clinicalSearchRef = useRef<HTMLDivElement>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemFormError, setItemFormError] = useState("");
  const [ruleForm, setRuleForm] = useState({
    species: "",
    weightMin: "",
    weightMax: "",
    isEmergency: false,
    price: "",
    validFrom: "",
    validTo: "",
  });
  const [savingRule, setSavingRule] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || !packageId) return;
    try {
      setLoading(true);
      setError("");
      const [detailRes, itemsRes, rulesRes, compRes, stockRes, alertsRes] = await Promise.all([
        ownerClinicPackageById(branchId, packageId),
        ownerClinicPackageItemsList(branchId, packageId),
        ownerClinicPackagePriceRulesList(branchId, packageId),
        ownerClinicPackageComposition(branchId, packageId),
        ownerClinicBranchItemStock(branchId),
        ownerClinicLowStockAlerts(branchId),
      ]);
      setPkg((detailRes ?? null) as PackageDetail | null);
      setItems(Array.isArray(itemsRes) ? (itemsRes as PackageItemRow[]) : []);
      setPriceRules(Array.isArray(rulesRes) ? (rulesRes as PriceRuleRow[]) : []);
      setComposition((compRes ?? null) as CompositionData | null);
      const stockList = Array.isArray(stockRes) ? (stockRes as Array<{ variantId: number; availableQty: number | string; reorderLevel?: number | null; item?: { name: string }; variant?: { variantName: string } }>) : [];
      setBranchStockRows(stockList.map((r) => ({ ...r, availableQty: Number(r.availableQty) })));
      const alertsList = Array.isArray(alertsRes) ? (alertsRes as Array<{ variant?: { id: number } }>) : [];
      setLowStockVariantIds(new Set(alertsList.map((a) => a.variant?.id).filter((id): id is number => typeof id === "number")));
      const d = detailRes as PackageDetail | null;
      if (d) {
        setEditForm({
          packageName: d.packageName ?? "",
          packageType: d.packageType ?? "STANDARD",
          baseSellingPrice: d.baseSellingPrice != null ? String(d.baseSellingPrice) : "",
          status: d.status ?? "ACTIVE",
          validFrom: toDateInputValue(d.validFrom),
          validTo: toDateInputValue(d.validTo),
          doctorFeeAmount: d.doctorFeeAmount != null ? String(d.doctorFeeAmount) : "",
          clinicFeeAmount: d.clinicFeeAmount != null ? String(d.clinicFeeAmount) : "",
          consumableBlockAmount: d.consumableBlockAmount != null ? String(d.consumableBlockAmount) : "",
          medicationBlockAmount: d.medicationBlockAmount != null ? String(d.medicationBlockAmount) : "",
          supportFeeAmount: d.supportFeeAmount != null ? String(d.supportFeeAmount) : "",
          estimatedCost: d.estimatedCost != null ? String(d.estimatedCost) : "",
          addOnAllowed: d.addOnAllowed ?? true,
          discountable: d.discountable ?? true,
        });
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load package");
    } finally {
      setLoading(false);
    }
  }, [branchId, packageId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), SUCCESS_AUTO_CLEAR_MS);
    return () => clearTimeout(t);
  }, [success]);

  // Clinical item search (debounced)
  useEffect(() => {
    if (!branchId || clinicalItemSearchQ.trim().length < 2) {
      setClinicalItemResults([]);
      setClinicalSearchLoading(false);
      return;
    }
    let cancelled = false;
    setClinicalSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const list = await ownerClinicItemSearch(branchId, { q: clinicalItemSearchQ.trim(), limit: 15 });
        if (!cancelled && Array.isArray(list)) setClinicalItemResults(list as Array<{ id: number; name: string; itemCode?: string; variants?: Array<{ id: number; variantName: string; sku?: string; defaultCost?: number | null }> }>);
        else if (!cancelled) setClinicalItemResults([]);
      } catch {
        if (!cancelled) setClinicalItemResults([]);
      } finally {
        if (!cancelled) setClinicalSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [branchId, clinicalItemSearchQ]);

  // Click outside to close clinical search dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (clinicalSearchRef.current && !clinicalSearchRef.current.contains(e.target as Node)) setClinicalSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSaveInfo = async () => {
    if (!branchId || !packageId || !pkg) return;
    const baseNum = parseFloat(editForm.baseSellingPrice);
    if (Number.isNaN(baseNum) || baseNum < 0) {
      setError("Base selling price must be a non-negative number.");
      return;
    }
    const updates: Record<string, unknown> = {
      packageName: editForm.packageName.trim(),
      packageType: editForm.packageType,
      baseSellingPrice: baseNum,
      status: editForm.status,
      addOnAllowed: editForm.addOnAllowed,
      discountable: editForm.discountable,
    };
    if (editForm.validFrom.trim()) updates.validFrom = editForm.validFrom.trim();
    else updates.validFrom = null;
    if (editForm.validTo.trim()) updates.validTo = editForm.validTo.trim();
    else updates.validTo = null;
    const docFee = editForm.doctorFeeAmount.trim() === "" ? null : parseFloat(editForm.doctorFeeAmount);
    updates.doctorFeeAmount = docFee != null && !Number.isNaN(docFee) ? docFee : null;
    const clinicFee = editForm.clinicFeeAmount.trim() === "" ? null : parseFloat(editForm.clinicFeeAmount);
    updates.clinicFeeAmount = clinicFee != null && !Number.isNaN(clinicFee) ? clinicFee : null;
    const consumable = editForm.consumableBlockAmount.trim() === "" ? null : parseFloat(editForm.consumableBlockAmount);
    updates.consumableBlockAmount = consumable != null && !Number.isNaN(consumable) ? consumable : null;
    const medication = editForm.medicationBlockAmount.trim() === "" ? null : parseFloat(editForm.medicationBlockAmount);
    updates.medicationBlockAmount = medication != null && !Number.isNaN(medication) ? medication : null;
    const support = editForm.supportFeeAmount.trim() === "" ? null : parseFloat(editForm.supportFeeAmount);
    updates.supportFeeAmount = support != null && !Number.isNaN(support) ? support : null;
    const est = editForm.estimatedCost.trim() === "" ? null : parseFloat(editForm.estimatedCost);
    updates.estimatedCost = est != null && !Number.isNaN(est) ? est : null;
    try {
      setSaving(true);
      setError("");
      await ownerClinicPackageUpdate(branchId, packageId, updates);
      setPkg((prev) => (prev ? { ...prev, ...updates } : null));
      setEditingInfo(false);
      setSuccess("Package updated.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const startEditItem = (item: PackageItemRow) => {
    const hasClinical = item.clinicalItemId != null && Number(item.clinicalItemId) > 0;
    setItemSource(hasClinical ? ITEM_SOURCE_CLINICAL : ITEM_SOURCE_PRODUCT);
    const safeItemType = (item.itemType && PACKAGE_ITEM_TYPES.includes(item.itemType as (typeof PACKAGE_ITEM_TYPES)[number])) ? item.itemType : "INCLUDED";
    setItemForm({
      id: item.id,
      itemType: safeItemType,
      productId: item.productId != null ? String(item.productId) : "",
      variantId: item.variantId != null ? String(item.variantId) : "",
      clinicalItemId: item.clinicalItemId != null ? String(item.clinicalItemId) : "",
      clinicalItemVariantId: item.clinicalItemVariantId != null ? String(item.clinicalItemVariantId) : "",
      estimatedQty: item.estimatedQty != null ? String(item.estimatedQty) : "",
      estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "",
      displayLabel: item.displayLabel ?? "",
      sortOrder: item.sortOrder != null ? String(item.sortOrder) : "0",
    });
    setClinicalItemSearchQ("");
    setClinicalItemResults([]);
    setClinicalSearchOpen(false);
    setItemFormError("");
  };

  const clearItemForm = () => {
    setItemForm({
      id: null,
      itemType: "INCLUDED",
      productId: "",
      variantId: "",
      clinicalItemId: "",
      clinicalItemVariantId: "",
      estimatedQty: "",
      estimatedCost: "",
      displayLabel: "",
      sortOrder: "0",
    });
    setItemSource(ITEM_SOURCE_CLINICAL);
    setClinicalItemSearchQ("");
    setClinicalItemResults([]);
    setClinicalSearchOpen(false);
    setItemFormError("");
  };

  const handleSaveItem = async () => {
    if (!branchId || !packageId) return;
    setItemFormError("");
    const hasClinical = itemForm.clinicalItemId.trim() !== "" && parseInt(itemForm.clinicalItemId, 10) > 0;
    const hasProduct = itemForm.productId.trim() !== "" && parseInt(itemForm.productId, 10) > 0;
    const isUpdate = itemForm.id != null;
    if (!isUpdate && !hasClinical && !hasProduct) {
      setItemFormError("Select an item from the clinical search or enter Product ID and Variant ID.");
      return;
    }
    const itemType = PACKAGE_ITEM_TYPES.includes(itemForm.itemType as (typeof PACKAGE_ITEM_TYPES)[number]) ? itemForm.itemType : "INCLUDED";
    const body: Record<string, unknown> = {
      itemType,
      sortOrder: parseInt(itemForm.sortOrder, 10) || 0,
    };
    if (itemForm.id != null) body.id = itemForm.id;
    if (itemForm.productId.trim()) body.productId = parseInt(itemForm.productId, 10);
    if (itemForm.variantId.trim()) body.variantId = parseInt(itemForm.variantId, 10);
    if (itemForm.clinicalItemId.trim()) body.clinicalItemId = parseInt(itemForm.clinicalItemId, 10);
    if (itemForm.clinicalItemVariantId.trim()) body.clinicalItemVariantId = parseInt(itemForm.clinicalItemVariantId, 10);
    const qty = itemForm.estimatedQty.trim();
    const cost = itemForm.estimatedCost.trim();
    if (qty) {
      const qtyNum = parseFloat(qty);
      if (Number.isNaN(qtyNum) || qtyNum <= 0) {
        setItemFormError("Qty must be a positive number.");
        return;
      }
      body.estimatedQty = qtyNum;
    }
    if (cost) {
      const costNum = parseFloat(cost);
      if (Number.isNaN(costNum) || costNum < 0) {
        setItemFormError("Estimated cost must be 0 or a positive number.");
        return;
      }
      body.estimatedCost = costNum;
    }
    if (itemForm.displayLabel.trim()) body.displayLabel = itemForm.displayLabel.trim();
    try {
      setSavingItem(true);
      setError("");
      await ownerClinicPackageItemUpsert(branchId, packageId, body);
      setSuccess(itemForm.id != null ? "Item updated." : "Item added.");
      clearItemForm();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  };

  const getItemDisplayName = (item: PackageItemRow) => {
    if (item.displayLabel?.trim()) return item.displayLabel.trim();
    if (item.clinicalItemVariant?.variantName || item.clinicalItem?.name)
      return [item.clinicalItem?.name, item.clinicalItemVariant?.variantName].filter(Boolean).join(" — ");
    return item.product?.name ?? item.variant?.title ?? item.variant?.sku ?? "—";
  };

  const getItemSourceLabel = (item: PackageItemRow) =>
    item.clinicalItemId != null && Number(item.clinicalItemId) > 0 ? "Clinical" : "Product";

  const handleDeleteItem = async (itemId: number) => {
    if (!branchId || !packageId || !confirm("Remove this item from the package?")) return;
    try {
      setError("");
      await ownerClinicPackageItemDelete(branchId, packageId, itemId);
      setSuccess("Item removed.");
      if (itemForm.id === itemId) clearItemForm();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete item");
    }
  };

  const handleSaveRule = async () => {
    if (!branchId || !packageId) return;
    const priceNum = parseFloat(ruleForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Price must be a non-negative number.");
      return;
    }
    const body: Record<string, unknown> = {
      species: ruleForm.species.trim() || undefined,
      weightMin: ruleForm.weightMin.trim() ? parseFloat(ruleForm.weightMin) : undefined,
      weightMax: ruleForm.weightMax.trim() ? parseFloat(ruleForm.weightMax) : undefined,
      isEmergency: ruleForm.isEmergency,
      price: priceNum,
    };
    if (ruleForm.validFrom.trim()) body.validFrom = ruleForm.validFrom.trim();
    if (ruleForm.validTo.trim()) body.validTo = ruleForm.validTo.trim();
    try {
      setSavingRule(true);
      setError("");
      await ownerClinicPackagePriceRuleCreate(branchId, packageId, body);
      setSuccess("Price rule added.");
      setRuleForm({ species: "", weightMin: "", weightMax: "", isEmergency: false, price: "", validFrom: "", validTo: "" });
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to add price rule");
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!branchId || !packageId || !confirm("Remove this price rule?")) return;
    try {
      setError("");
      await ownerClinicPackagePriceRuleDelete(branchId, packageId, ruleId);
      setSuccess("Price rule removed.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete rule");
    }
  };

  const rulePrice = (r: PriceRuleRow) => r.priceOverride != null ? r.priceOverride : r.price;

  if (!branchId || !packageId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or package.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading package…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">
          <strong>Package not found.</strong> There is no package with this ID for this branch. It may have been deleted, or the link may be wrong. Use the package list to open an existing package or create a new one.
          {error && (
            <p className="mb-0 mt-2 small text-dark">
              {error}
            </p>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => load()}>
            Retry
          </button>
          <Link href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-primary radius-12">
            View package list
          </Link>
          <Link href={`/owner/clinic/${branchId}/packages/new`} className="btn btn-primary radius-12">
            Create new package
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={pkg.packageName || pkg.packageCode}
        subtitle={`Package ${pkg.packageCode}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
          { label: pkg.packageName || pkg.packageCode, href: `/owner/clinic/${branchId}/packages/${packageId}` },
        ]}
        actions={[
          <Link key="workspace" href={`/owner/clinic/${branchId}/packages/${packageId}/edit`} className="btn btn-primary radius-12">
            <i className="ri-settings-3-line me-1" />
            Open in Package Workspace
          </Link>,
          <Link key="back" href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            Back to packages
          </Link>,
        ]}
      />

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3 p-3 bg-light radius-12">
        <span className="fw-semibold">{formatMoney(pkg.baseSellingPrice)}</span>
        <span className="text-muted">Base price</span>
        <span className="vr" />
        <span className={`badge radius-8 ${pkg.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{pkg.status ?? "ACTIVE"}</span>
        <span className={`badge radius-8 ${PACKAGE_TYPE_BADGE[pkg.packageType ?? "STANDARD"] ?? "bg-secondary"}`}>{pkg.packageType ?? "STANDARD"}</span>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-3">
          <i className="ri-check-line me-2" />
          {success}
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="card radius-12">
            <div className="card-body p-24">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="ri-information-line me-2 text-primary" />
                  Package info
                </h6>
                {!editingInfo ? (
                  <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => setEditingInfo(true)}>
                    Edit
                  </button>
                ) : (
                  <div className="d-flex gap-1">
                    <button type="button" className="btn btn-sm btn-primary radius-8" onClick={handleSaveInfo} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => setEditingInfo(false)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {!editingInfo ? (
                <>
                  <p className="mb-1"><strong>Code</strong> <code className="small">{pkg.packageCode}</code></p>
                  <p className="mb-1"><strong>Name</strong> {pkg.packageName ?? "—"}</p>
                  <p className="mb-1"><strong>Service</strong> {pkg.service?.name ?? "—"}</p>
                  <p className="mb-1"><strong>Type</strong> <span className={`badge radius-8 ${PACKAGE_TYPE_BADGE[pkg.packageType ?? "STANDARD"] ?? "bg-secondary"}`}>{pkg.packageType ?? "STANDARD"}</span></p>
                  <p className="mb-1"><strong>Base price</strong> {formatMoney(pkg.baseSellingPrice)}</p>
                  <p className="mb-1"><strong>Status</strong> <span className={`badge radius-8 ${pkg.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{pkg.status ?? "ACTIVE"}</span></p>
                  <p className="mb-0"><strong>Add-on allowed</strong> {pkg.addOnAllowed ? "Yes" : "No"} · <strong>Discountable</strong> {pkg.discountable ? "Yes" : "No"}</p>
                </>
              ) : (
                <div className="small">
                  <div className="mb-2">
                    <label className="form-label mb-0">Name</label>
                    <input type="text" className="form-control form-control-sm radius-8" value={editForm.packageName} onChange={(e) => setEditForm((f) => ({ ...f, packageName: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-0">Type</label>
                    <select className="form-select form-select-sm radius-8" value={editForm.packageType} onChange={(e) => setEditForm((f) => ({ ...f, packageType: e.target.value }))}>
                      {PACKAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-0">Base price</label>
                    <input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.baseSellingPrice} onChange={(e) => setEditForm((f) => ({ ...f, baseSellingPrice: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-0">Status</label>
                    <select className="form-select form-select-sm radius-8" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div className="row g-1 mb-2">
                    <div className="col-6"><label className="form-label mb-0">Valid from</label><input type="date" className="form-control form-control-sm radius-8" value={editForm.validFrom} onChange={(e) => setEditForm((f) => ({ ...f, validFrom: e.target.value }))} /></div>
                    <div className="col-6"><label className="form-label mb-0">Valid to</label><input type="date" className="form-control form-control-sm radius-8" value={editForm.validTo} onChange={(e) => setEditForm((f) => ({ ...f, validTo: e.target.value }))} /></div>
                  </div>
                  <div className="mb-2"><label className="form-label mb-0">Doctor fee</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.doctorFeeAmount} onChange={(e) => setEditForm((f) => ({ ...f, doctorFeeAmount: e.target.value }))} /></div>
                  <div className="mb-2"><label className="form-label mb-0">Clinic fee</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.clinicFeeAmount} onChange={(e) => setEditForm((f) => ({ ...f, clinicFeeAmount: e.target.value }))} /></div>
                  <div className="mb-2"><label className="form-label mb-0">Consumable block</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.consumableBlockAmount} onChange={(e) => setEditForm((f) => ({ ...f, consumableBlockAmount: e.target.value }))} /></div>
                  <div className="mb-2"><label className="form-label mb-0">Medication block</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.medicationBlockAmount} onChange={(e) => setEditForm((f) => ({ ...f, medicationBlockAmount: e.target.value }))} /></div>
                  <div className="mb-2"><label className="form-label mb-0">Support fee</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.supportFeeAmount} onChange={(e) => setEditForm((f) => ({ ...f, supportFeeAmount: e.target.value }))} /></div>
                  <div className="mb-2"><label className="form-label mb-0">Estimated cost</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={editForm.estimatedCost} onChange={(e) => setEditForm((f) => ({ ...f, estimatedCost: e.target.value }))} /></div>
                  <div className="form-check form-switch mb-2"><input className="form-check-input" type="checkbox" checked={editForm.addOnAllowed} onChange={(e) => setEditForm((f) => ({ ...f, addOnAllowed: e.target.checked }))} /><label className="form-check-label">Add-on allowed</label></div>
                  <div className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" checked={editForm.discountable} onChange={(e) => setEditForm((f) => ({ ...f, discountable: e.target.checked }))} /><label className="form-check-label">Discountable</label></div>
                </div>
              )}
            </div>
          </div>

          {composition && (composition.doctorFee != null || composition.clinicFee != null || composition.consumableBlock != null || composition.medicationBlock != null || composition.supportFee != null || composition.estimatedCost != null || (composition.items && composition.items.length > 0)) && (
            <div className="card radius-12 mt-4">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-pie-chart-2-line me-2 text-primary" />
                  Composition
                </h6>
                <div className="d-flex flex-column gap-2 small">
                  {composition.doctorFee != null && <div className="d-flex justify-content-between"><span>Doctor fee</span><span>{formatMoney(composition.doctorFee)}</span></div>}
                  {composition.clinicFee != null && <div className="d-flex justify-content-between"><span>Clinic fee</span><span>{formatMoney(composition.clinicFee)}</span></div>}
                  {composition.consumableBlock != null && <div className="d-flex justify-content-between"><span>Consumable block</span><span>{formatMoney(composition.consumableBlock)}</span></div>}
                  {composition.medicationBlock != null && <div className="d-flex justify-content-between"><span>Medication block</span><span>{formatMoney(composition.medicationBlock)}</span></div>}
                  {composition.supportFee != null && <div className="d-flex justify-content-between"><span>Support fee</span><span>{formatMoney(composition.supportFee)}</span></div>}
                  {composition.estimatedCost != null && <div className="d-flex justify-content-between"><span>Estimated cost</span><span>{formatMoney(composition.estimatedCost)}</span></div>}
                </div>
                {composition.items && composition.items.length > 0 && (
                  <div className="mt-2 pt-2 border-top">
                    <span className="text-muted d-block mb-1">Items</span>
                    <div className="d-flex flex-wrap gap-1">
                      {composition.items.map((it, idx) => (
                        <span key={idx} className="badge bg-light text-dark radius-8">{it.label}{it.qty != null ? ` × ${it.qty}` : ""}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {items.some((i) => i.clinicalItemVariantId != null) && (
            <div className="card radius-12 mt-4">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-stack-line me-2 text-primary" />
                  Inventory insight
                </h6>
                <p className="text-muted small mb-2">Stock status for clinical items in this package.</p>
                <ul className="list-unstyled mb-0 small">
                  {items
                    .filter((i) => i.clinicalItemVariantId != null)
                    .map((item) => {
                      const vid = item.clinicalItemVariantId!;
                      const stock = branchStockRows.find((r) => r.variantId === vid);
                      const avail = stock ? stock.availableQty : 0;
                      const reorder = stock?.reorderLevel != null ? Number(stock.reorderLevel) : null;
                      const isLow = lowStockVariantIds.has(vid) || (reorder != null && avail <= reorder);
                      const status = avail <= 0 ? "Unavailable" : isLow ? "Low stock" : "In stock";
                      const statusClass = avail <= 0 ? "text-danger" : isLow ? "text-warning" : "text-success";
                      return (
                        <li key={item.id} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                          <span>{getItemDisplayName(item)}</span>
                          <span>
                            <span className={statusClass}>{status}</span>
                            {stock != null && (
                              <span className="text-muted ms-1">
                                ({avail}
                                {reorder != null ? ` / reorder ${reorder}` : ""})
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-8">
          <div className="card radius-12">
            <ul className="nav nav-tabs card-header-tabs px-24 pt-2 border-0" role="tablist">
              <li className="nav-item">
                <button type="button" className={`nav-link radius-8 ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}>
                  <i className="ri-box-3-line me-1" /> Items {items.length > 0 && <span className="badge bg-primary-subtle text-primary-emphasis ms-1">{items.length}</span>}
                </button>
              </li>
              <li className="nav-item">
                <button type="button" className={`nav-link radius-8 ${activeTab === "rules" ? "active" : ""}`} onClick={() => setActiveTab("rules")}>
                  <i className="ri-price-tag-3-line me-1" /> Price rules {priceRules.length > 0 && <span className="badge bg-primary-subtle text-primary-emphasis ms-1">{priceRules.length}</span>}
                </button>
              </li>
              <li className="nav-item">
                <button type="button" className={`nav-link radius-8 ${activeTab === "composition" ? "active" : ""}`} onClick={() => setActiveTab("composition")}>
                  <i className="ri-pie-chart-2-line me-1" /> Composition
                </button>
              </li>
            </ul>
            <div className="card-body p-24">
              {activeTab === "items" && (
                <>
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>Source</th>
                          <th>Item / Product</th>
                          <th>Qty</th>
                          <th>Est. cost</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4">
                              <i className="ri-inbox-line fs-4 text-muted d-block mb-2" />
                              <span className="text-muted small">No items in this package. Select item source and use search or IDs below to add items.</span>
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.id}>
                              <td><span className={`badge radius-8 ${ITEM_TYPE_BADGE[item.itemType] ?? "bg-secondary"}`}>{item.itemType}</span></td>
                              <td><span className="badge bg-light text-dark radius-8">{getItemSourceLabel(item)}</span></td>
                              <td>{getItemDisplayName(item)}</td>
                              <td>{item.estimatedQty ?? "—"}</td>
                              <td>{formatMoney(item.estimatedCost)}</td>
                              <td className="text-end">
                                <button type="button" className="btn btn-sm btn-outline-primary radius-8 me-1" onClick={() => startEditItem(item)}>Edit</button>
                                <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => handleDeleteItem(item.id)}>Remove</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-3 border-top">
                    <h6 className="small fw-semibold mb-2">{itemForm.id != null ? "Edit item" : "Add item"}</h6>
                    {itemFormError && (
                      <div className="alert alert-warning py-2 px-3 radius-8 small mb-2">
                        <i className="ri-error-warning-line me-1" />
                        {itemFormError}
                      </div>
                    )}
                    <div className="row g-2 align-items-end flex-wrap">
                      <div className="col-12 col-md-2">
                        <label className="form-label small mb-0">Item source</label>
                        <select className="form-select form-select-sm radius-8" value={itemSource} onChange={(e) => { setItemSource(e.target.value as "CLINICAL_ITEM" | "PRODUCT_VARIANT"); setItemFormError(""); }}>
                          <option value={ITEM_SOURCE_CLINICAL}>Clinical item</option>
                          <option value={ITEM_SOURCE_PRODUCT}>Product variant</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-2">
                        <label className="form-label small mb-0">Type</label>
                        <select className="form-select form-select-sm radius-8" value={itemForm.itemType} onChange={(e) => setItemForm((f) => ({ ...f, itemType: e.target.value }))}>
                          {PACKAGE_ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {itemSource === ITEM_SOURCE_CLINICAL && (
                        <div className="col-12 col-md-4 position-relative" ref={clinicalSearchRef}>
                          <label className="form-label small mb-0">Search clinical item *</label>
                          <input type="text" className="form-control form-control-sm radius-8" placeholder="Type 2+ chars to search…" value={clinicalItemSearchQ} onChange={(e) => { setClinicalItemSearchQ(e.target.value); setClinicalSearchOpen(true); }} onFocus={() => setClinicalSearchOpen(true)} autoComplete="off" />
                          {clinicalSearchOpen && (
                            <div className="position-absolute border bg-white shadow-sm rounded mt-1 p-1 list-unstyled mb-0" style={{ zIndex: 1050, maxHeight: 220, overflowY: "auto", minWidth: 280 }}>
                              {clinicalSearchLoading ? (
                                <li className="px-2 py-2 small text-muted"><span className="spinner-border spinner-border-sm me-1" /> Searching…</li>
                              ) : clinicalItemSearchQ.trim().length < 2 ? (
                                <li className="px-2 py-2 small text-muted">Type at least 2 characters</li>
                              ) : clinicalItemResults.length === 0 ? (
                                <li className="px-2 py-2 small text-muted">No items found. Try another search or add as product variant.</li>
                              ) : (
                                clinicalItemResults.map((it) => (
                                  <li key={it.id} className="px-2 py-1 small">
                                    <span className="fw-medium">{it.name}</span> {it.itemCode && <code className="ms-1 small">{it.itemCode}</code>}
                                    {(it.variants?.length ?? 0) > 0 ? (
                                      it.variants!.map((v) => (
                                        <div key={v.id} className="ms-2 mt-1">
                                          <button type="button" className="btn btn-link btn-sm p-0 text-start text-decoration-none" onClick={() => {
                                            const label = [it.name, v.variantName].filter(Boolean).join(" — ");
                                            const cost = v.defaultCost != null ? String(v.defaultCost) : "";
                                            setItemForm((f) => ({ ...f, clinicalItemId: String(it.id), clinicalItemVariantId: String(v.id), productId: "", variantId: "", displayLabel: f.displayLabel || label, estimatedCost: f.estimatedCost || cost }));
                                            setClinicalItemSearchQ(label);
                                            setClinicalItemResults([]);
                                            setClinicalSearchOpen(false);
                                          }}>
                                            {v.variantName} {v.sku && <code className="small">{v.sku}</code>} {v.defaultCost != null && <span className="text-muted">(৳{v.defaultCost})</span>}
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="ms-2 mt-1">
                                        <button type="button" className="btn btn-link btn-sm p-0 text-start text-decoration-none" onClick={() => {
                                          setItemForm((f) => ({ ...f, clinicalItemId: String(it.id), clinicalItemVariantId: "", productId: "", variantId: "", displayLabel: f.displayLabel || it.name }));
                                          setClinicalItemSearchQ(it.name);
                                          setClinicalItemResults([]);
                                          setClinicalSearchOpen(false);
                                        }}>
                                          Use item (no variant)
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {itemSource === ITEM_SOURCE_PRODUCT && (
                        <>
                          <div className="col-6 col-md-2">
                            <label className="form-label small mb-0">Product ID *</label>
                            <input type="number" className="form-control form-control-sm radius-8" placeholder="ID" value={itemForm.productId} onChange={(e) => setItemForm((f) => ({ ...f, productId: e.target.value }))} />
                          </div>
                          <div className="col-6 col-md-2">
                            <label className="form-label small mb-0">Variant ID</label>
                            <input type="number" className="form-control form-control-sm radius-8" placeholder="Optional" value={itemForm.variantId} onChange={(e) => setItemForm((f) => ({ ...f, variantId: e.target.value }))} />
                          </div>
                        </>
                      )}
                      <div className="col-6 col-md-1">
                        <label className="form-label small mb-0">Qty</label>
                        <input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" placeholder="1" value={itemForm.estimatedQty} onChange={(e) => setItemForm((f) => ({ ...f, estimatedQty: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-1">
                        <label className="form-label small mb-0">Est. cost</label>
                        <input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" placeholder="0" value={itemForm.estimatedCost} onChange={(e) => setItemForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
                      </div>
                      <div className="col-12 col-md-2">
                        <label className="form-label small mb-0">Display label</label>
                        <input type="text" className="form-control form-control-sm radius-8" placeholder="Optional override" value={itemForm.displayLabel} onChange={(e) => setItemForm((f) => ({ ...f, displayLabel: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-1">
                        <label className="form-label small mb-0">Order</label>
                        <input type="number" className="form-control form-control-sm radius-8" value={itemForm.sortOrder} onChange={(e) => setItemForm((f) => ({ ...f, sortOrder: e.target.value }))} />
                      </div>
                      <div className="col-12 col-md-2 d-flex gap-1">
                        <button type="button" className="btn btn-sm btn-primary radius-8" onClick={handleSaveItem} disabled={savingItem}>{savingItem ? "Saving…" : "Save"}</button>
                        {itemForm.id != null && <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={clearItemForm}>Cancel</button>}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === "rules" && (
                <>
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Species</th>
                          <th>Weight</th>
                          <th>Emergency</th>
                          <th>Price</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceRules.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4">
                              <i className="ri-coupon-line fs-4 text-muted d-block mb-2" />
                              <span className="text-muted small">No price rules. Base price applies to all. Add rules for species or weight-based pricing below.</span>
                            </td>
                          </tr>
                        ) : (
                          priceRules.map((rule) => (
                            <tr key={rule.id}>
                              <td>{rule.species ?? "—"}</td>
                              <td>{rule.weightMin != null || rule.weightMax != null ? `${rule.weightMin ?? "?"}–${rule.weightMax ?? "?"}` : (rule.weightBandJson ? `${(rule.weightBandJson as { minKg?: number }).minKg ?? "?"}–${(rule.weightBandJson as { maxKg?: number }).maxKg ?? "?"}` : "—")}</td>
                              <td>{rule.isEmergency ? "Yes" : "—"}</td>
                              <td>{formatMoney(rulePrice(rule))}</td>
                              <td className="text-end">
                                <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => handleDeleteRule(rule.id)}>Remove</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 pt-3 border-top">
                    <h6 className="small fw-semibold mb-2">Add price rule</h6>
                    <div className="row g-2 align-items-end flex-wrap">
                      <div className="col-6 col-md-2">
                        <label className="form-label small mb-0">Species</label>
                        <input type="text" className="form-control form-control-sm radius-8" placeholder="e.g. Dog" value={ruleForm.species} onChange={(e) => setRuleForm((f) => ({ ...f, species: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-1">
                        <label className="form-label small mb-0">Weight min</label>
                        <input type="number" step="0.01" className="form-control form-control-sm radius-8" value={ruleForm.weightMin} onChange={(e) => setRuleForm((f) => ({ ...f, weightMin: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-1">
                        <label className="form-label small mb-0">Weight max</label>
                        <input type="number" step="0.01" className="form-control form-control-sm radius-8" value={ruleForm.weightMax} onChange={(e) => setRuleForm((f) => ({ ...f, weightMax: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label small mb-0">Price *</label>
                        <input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={ruleForm.price} onChange={(e) => setRuleForm((f) => ({ ...f, price: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label small mb-0">Valid from</label>
                        <input type="date" className="form-control form-control-sm radius-8" value={ruleForm.validFrom} onChange={(e) => setRuleForm((f) => ({ ...f, validFrom: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label small mb-0">Valid to</label>
                        <input type="date" className="form-control form-control-sm radius-8" value={ruleForm.validTo} onChange={(e) => setRuleForm((f) => ({ ...f, validTo: e.target.value }))} />
                      </div>
                      <div className="col-6 col-md-1 d-flex align-items-center pb-1">
                        <div className="form-check form-switch mb-0">
                          <input className="form-check-input" type="checkbox" checked={ruleForm.isEmergency} onChange={(e) => setRuleForm((f) => ({ ...f, isEmergency: e.target.checked }))} />
                          <label className="form-check-label small">Emergency</label>
                        </div>
                      </div>
                      <div className="col-12 col-md-1">
                        <button type="button" className="btn btn-sm btn-primary radius-8" onClick={handleSaveRule} disabled={savingRule || ruleForm.price.trim() === ""}>{savingRule ? "Saving…" : "Add"}</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === "composition" && (
                <div className="small">
                  {!composition ? (
                    <p className="text-muted mb-0">Load composition from package data.</p>
                  ) : (
                    <>
                      <div className="d-flex flex-wrap gap-3 mb-3 p-3 bg-light radius-12">
                        <span><strong>Base price</strong> {formatMoney(composition.package?.basePrice)}</span>
                        <span><strong>Est. cost</strong> {formatMoney(composition.estimatedCost)}</span>
                        {composition.estimatedCost != null && composition.package?.basePrice != null && (
                          <span><strong>Margin</strong> {formatMoney(Number(composition.package.basePrice) - Number(composition.estimatedCost))}</span>
                        )}
                      </div>
                      <div className="row g-2 mb-3">
                        {composition.doctorFee != null && composition.doctorFee > 0 && <div className="col-6 col-md-4"><div className="card border radius-8 p-2"><span className="text-muted d-block">Doctor fee</span><span className="fw-semibold">{formatMoney(composition.doctorFee)}</span></div></div>}
                        {composition.clinicFee != null && composition.clinicFee > 0 && <div className="col-6 col-md-4"><div className="card border radius-8 p-2"><span className="text-muted d-block">Clinic fee</span><span className="fw-semibold">{formatMoney(composition.clinicFee)}</span></div></div>}
                        {composition.consumableBlock != null && composition.consumableBlock > 0 && <div className="col-6 col-md-4"><div className="card border radius-8 p-2"><span className="text-muted d-block">Consumable</span><span className="fw-semibold">{formatMoney(composition.consumableBlock)}</span></div></div>}
                        {composition.medicationBlock != null && composition.medicationBlock > 0 && <div className="col-6 col-md-4"><div className="card border radius-8 p-2"><span className="text-muted d-block">Medication</span><span className="fw-semibold">{formatMoney(composition.medicationBlock)}</span></div></div>}
                        {composition.supportFee != null && composition.supportFee > 0 && <div className="col-6 col-md-4"><div className="card border radius-8 p-2"><span className="text-muted d-block">Support</span><span className="fw-semibold">{formatMoney(composition.supportFee)}</span></div></div>}
                      </div>
                      {composition.items && composition.items.length > 0 && (
                        <div>
                          <h6 className="fw-semibold mb-2">Items in composition</h6>
                          <div className="d-flex flex-wrap gap-1">
                            {composition.items.map((it, idx) => (
                              <span key={idx} className="badge bg-light text-dark border radius-8">{it.label}{it.qty != null ? ` × ${it.qty}` : ""}{it.cost != null ? ` ${formatMoney(it.cost)}` : ""}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}/packages`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to packages
        </Link>
      </div>
    </div>
  );
}
