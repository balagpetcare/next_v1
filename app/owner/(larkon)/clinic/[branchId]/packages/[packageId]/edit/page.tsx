"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicPackageById,
  ownerClinicPackageUpdate,
  ownerClinicPackageComposition,
  ownerClinicPackageImpact,
  ownerClinicPackageAuditLog,
  ownerClinicPackageDuplicate,
  ownerClinicServices,
  ownerClinicPackageItemsList,
  ownerClinicPackageItemsBatchCreate,
  ownerClinicPackageItemUpsert,
  ownerClinicPackageItemDelete,
  ownerClinicPackagePriceRulesList,
  ownerClinicItemSearch,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const PACKAGE_TYPES = ["STANDARD", "PREMIUM", "WELFARE", "EMERGENCY", "PROMOTIONAL", "DOCTOR_SPECIFIC", "BRANCH_SPECIFIC"] as const;
const PACKAGE_STATUSES = ["DRAFT", "ACTIVE", "SCHEDULED", "EXPIRED", "ARCHIVED", "INACTIVE"] as const;
const TAB_IDS = ["overview", "pricing", "items", "rules", "availability", "preview", "history"] as const;
type TabId = (typeof TAB_IDS)[number];

const PACKAGE_ITEM_TYPES = ["INCLUDED", "INFORMATIONAL", "ADDON_ELIGIBLE"] as const;
const ITEM_SOURCE_CLINICAL = "CLINICAL_ITEM";
const ITEM_SOURCE_PRODUCT = "PRODUCT_VARIANT";

type DraftPackageItemRow = {
  _localId: string;
  source: typeof ITEM_SOURCE_CLINICAL | typeof ITEM_SOURCE_PRODUCT;
  itemType: string;
  clinicalItemId: string;
  clinicalItemVariantId: string;
  productId: string;
  variantId: string;
  estimatedQty: string;
  estimatedCost: string;
  displayLabel: string;
  sortOrder: string;
  selectedLabel?: string;
};

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
  branch?: { id: number; name: string };
  updatedAt?: string;
  updatedBy?: { id: number; name: string; email?: string };
  description?: string | null;
  publicDescription?: string | null;
  internalNotes?: string | null;
  department?: string | null;
  breedNote?: string | null;
  minSellingPrice?: number | null;
  maxDiscountPct?: number | null;
  maxDiscountAmount?: number | null;
  taxApplicable?: boolean;
  branchOverrideAllowed?: boolean;
  eligibilityRuleJson?: object | null;
  availabilityRuleJson?: object | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
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

type ImpactData = {
  activeAppointments?: number;
  upcomingBookings?: number;
  clinicalCasesCount?: number;
  procedureOrdersCount?: number;
  clinicInvoicesCount?: number;
  branchesWhereAvailable?: number;
  usedInSurgeryWorkflow?: boolean;
};

function toDateInputValue(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-BD", { dateStyle: "short" });
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "bg-secondary",
  ACTIVE: "bg-success",
  SCHEDULED: "bg-info",
  EXPIRED: "bg-warning",
  ARCHIVED: "bg-dark",
  INACTIVE: "bg-secondary",
};

export default function PackageWorkspaceEditPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const packageId = params?.packageId as string | undefined;

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [composition, setComposition] = useState<CompositionData | null>(null);
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [items, setItems] = useState<unknown[]>([]);
  const [priceRules, setPriceRules] = useState<unknown[]>([]);
  const [services, setServices] = useState<Array<{ id: number; name: string; category?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Form state (Overview + Pricing)
  const [packageName, setPackageName] = useState("");
  const [packageType, setPackageType] = useState<string>(PACKAGE_TYPES[0]);
  const [status, setStatus] = useState("ACTIVE");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [speciesCondition, setSpeciesCondition] = useState("");
  const [addOnAllowed, setAddOnAllowed] = useState(true);
  const [discountable, setDiscountable] = useState(true);
  const [baseSellingPrice, setBaseSellingPrice] = useState("");
  const [doctorFeeAmount, setDoctorFeeAmount] = useState("");
  const [clinicFeeAmount, setClinicFeeAmount] = useState("");
  const [consumableBlockAmount, setConsumableBlockAmount] = useState("");
  const [medicationBlockAmount, setMedicationBlockAmount] = useState("");
  const [supportFeeAmount, setSupportFeeAmount] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [department, setDepartment] = useState("");
  const [breedNote, setBreedNote] = useState("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [minSellingPrice, setMinSellingPrice] = useState("");
  const [maxDiscountPct, setMaxDiscountPct] = useState("");
  const [taxApplicable, setTaxApplicable] = useState(false);
  const [branchOverrideAllowed, setBranchOverrideAllowed] = useState(false);
  const [eligibilityRule, setEligibilityRule] = useState({ weightMin: "", weightMax: "", emergencyUsable: true, repeatableAfterDays: "", consentRequired: false, fastingRequired: false, preCheckupRequired: false });
  const [availabilityRule, setAvailabilityRule] = useState({ onlineVisible: true, internalOnly: false, staffQuickBooking: true, doctorRecommendation: true, posDirectSale: false });

  // Batch item composer (Items tab)
  const [newItemRows, setNewItemRows] = useState<DraftPackageItemRow[]>([]);
  const [savingBatchItems, setSavingBatchItems] = useState(false);
  const [batchItemsSuccess, setBatchItemsSuccess] = useState("");
  const [clinicalSearchRowId, setClinicalSearchRowId] = useState<string | null>(null);
  const [clinicalSearchQ, setClinicalSearchQ] = useState("");
  const [clinicalSearchResults, setClinicalSearchResults] = useState<Array<{ id: number; name: string; itemCode?: string; variants?: Array<{ id: number; variantName: string; sku?: string; defaultCost?: number | null }> }>>([]);
  const [clinicalSearchLoading, setClinicalSearchLoading] = useState(false);
  const [clinicalSearchOpen, setClinicalSearchOpen] = useState(false);
  const clinicalSearchRef = useRef<HTMLDivElement>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemForm, setEditItemForm] = useState<{ estimatedQty: string; estimatedCost: string; displayLabel: string; sortOrder: string } | null>(null);
  const [savingItemEdit, setSavingItemEdit] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || !packageId) return;
    try {
      setLoading(true);
      setError("");
      const [detailRes, compRes, impactRes, itemsRes, rulesRes, servicesRes] = await Promise.all([
        ownerClinicPackageById(branchId, packageId),
        ownerClinicPackageComposition(branchId, packageId),
        ownerClinicPackageImpact(branchId, packageId).catch(() => null),
        ownerClinicPackageItemsList(branchId, packageId),
        ownerClinicPackagePriceRulesList(branchId, packageId),
        ownerClinicServices(branchId).then((r: { items?: Array<{ id: number; name: string; category?: string }> }) => r?.items ?? []),
      ]);
      const data = detailRes as PackageDetail | null;
      setPkg(data);
      setComposition((compRes ?? null) as CompositionData | null);
      setImpact((impactRes ?? null) as ImpactData | null);
      setItems(Array.isArray(itemsRes) ? itemsRes : []);
      setPriceRules(Array.isArray(rulesRes) ? rulesRes : []);
      setServices(Array.isArray(servicesRes) ? servicesRes : []);

      if (data) {
        setPackageName(data.packageName ?? "");
        setPackageType(data.packageType ?? "STANDARD");
        setStatus(data.status ?? "ACTIVE");
        setValidFrom(toDateInputValue(data.validFrom));
        setValidTo(toDateInputValue(data.validTo));
        setSpeciesCondition(Array.isArray(data.speciesCondition) ? (data.speciesCondition as string[]).join(", ") : "");
        setAddOnAllowed(data.addOnAllowed !== false);
        setDiscountable(data.discountable !== false);
        setBaseSellingPrice(data.baseSellingPrice != null ? String(data.baseSellingPrice) : "");
        setDoctorFeeAmount(data.doctorFeeAmount != null ? String(data.doctorFeeAmount) : "");
        setClinicFeeAmount(data.clinicFeeAmount != null ? String(data.clinicFeeAmount) : "");
        setConsumableBlockAmount(data.consumableBlockAmount != null ? String(data.consumableBlockAmount) : "");
        setMedicationBlockAmount(data.medicationBlockAmount != null ? String(data.medicationBlockAmount) : "");
        setSupportFeeAmount(data.supportFeeAmount != null ? String(data.supportFeeAmount) : "");
        setEstimatedCost(data.estimatedCost != null ? String(data.estimatedCost) : "");
        setDescription(data.description ?? "");
        setInternalNotes(data.internalNotes ?? "");
        setDepartment(data.department ?? "");
        setBreedNote(data.breedNote ?? "");
        setServiceId(data.service?.id ?? "");
        setMinSellingPrice(data.minSellingPrice != null ? String(data.minSellingPrice) : "");
        setMaxDiscountPct(data.maxDiscountPct != null ? String(data.maxDiscountPct) : "");
        setTaxApplicable(data.taxApplicable === true);
        setBranchOverrideAllowed(data.branchOverrideAllowed === true);
        const elig = data.eligibilityRuleJson as { weightMin?: number; weightMax?: number; emergencyUsable?: boolean; repeatableAfterDays?: number; consentRequired?: boolean; fastingRequired?: boolean; preCheckupRequired?: boolean } | null | undefined;
        if (elig && typeof elig === "object") {
          setEligibilityRule({
            weightMin: elig.weightMin != null ? String(elig.weightMin) : "",
            weightMax: elig.weightMax != null ? String(elig.weightMax) : "",
            emergencyUsable: elig.emergencyUsable !== false,
            repeatableAfterDays: elig.repeatableAfterDays != null ? String(elig.repeatableAfterDays) : "",
            consentRequired: elig.consentRequired === true,
            fastingRequired: elig.fastingRequired === true,
            preCheckupRequired: elig.preCheckupRequired === true,
          });
        }
        const avail = data.availabilityRuleJson as { onlineVisible?: boolean; internalOnly?: boolean; staffQuickBooking?: boolean; doctorRecommendation?: boolean; posDirectSale?: boolean } | null | undefined;
        if (avail && typeof avail === "object") {
          setAvailabilityRule({
            onlineVisible: avail.onlineVisible !== false,
            internalOnly: avail.internalOnly === true,
            staffQuickBooking: avail.staffQuickBooking !== false,
            doctorRecommendation: avail.doctorRecommendation !== false,
            posDirectSale: avail.posDirectSale === true,
          });
        }
      }
    } catch (e) {
      const msg = (e as Error)?.message || "Failed to load package";
      setError(
        msg.includes("500")
          ? "The API server may be unavailable. Ensure the backend is running on port 3000 and try again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, packageId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!batchItemsSuccess) return;
    const t = setTimeout(() => setBatchItemsSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [batchItemsSuccess]);

  function newDraftRow(): DraftPackageItemRow {
    return {
      _localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      source: ITEM_SOURCE_CLINICAL,
      itemType: "INCLUDED",
      clinicalItemId: "",
      clinicalItemVariantId: "",
      productId: "",
      variantId: "",
      estimatedQty: "1",
      estimatedCost: "",
      displayLabel: "",
      sortOrder: String((items as { sortOrder?: number }[]).length + newItemRows.length),
    };
  }

  const addNewItemRow = () => setNewItemRows((prev) => [...prev, newDraftRow()]);
  const removeNewItemRow = (localId: string) => setNewItemRows((prev) => prev.filter((r) => r._localId !== localId));
  const updateNewItemRow = (localId: string, patch: Partial<DraftPackageItemRow>) => {
    setNewItemRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, ...patch } : r)));
  };

  // Clinical item search (debounced) for batch composer
  useEffect(() => {
    if (!branchId || clinicalSearchQ.trim().length < 2) {
      setClinicalSearchResults([]);
      setClinicalSearchLoading(false);
      return;
    }
    let cancelled = false;
    setClinicalSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const list = await ownerClinicItemSearch(branchId, { q: clinicalSearchQ.trim(), limit: 15 });
        if (!cancelled && Array.isArray(list)) setClinicalSearchResults(list as Array<{ id: number; name: string; itemCode?: string; variants?: Array<{ id: number; variantName: string; sku?: string; defaultCost?: number | null }> }>);
        else if (!cancelled) setClinicalSearchResults([]);
      } catch {
        if (!cancelled) setClinicalSearchResults([]);
      } finally {
        if (!cancelled) setClinicalSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [branchId, clinicalSearchQ]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (clinicalSearchRef.current && !clinicalSearchRef.current.contains(e.target as Node)) setClinicalSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleBatchItemsSubmit = async () => {
    if (!branchId || !packageId) return;
    const valid = newItemRows.filter((r) => {
      const hasClinical = r.clinicalItemId.trim() !== "" && parseInt(r.clinicalItemId, 10) > 0;
      const hasProduct = r.productId.trim() !== "" && parseInt(r.productId, 10) > 0;
      if (!hasClinical && !hasProduct) return false;
      const qty = r.estimatedQty.trim();
      if (qty) {
        const n = parseFloat(qty);
        if (Number.isNaN(n) || n <= 0) return false;
      }
      const cost = r.estimatedCost.trim();
      if (cost) {
        const n = parseFloat(cost);
        if (Number.isNaN(n) || n < 0) return false;
      }
      return true;
    });
    if (valid.length === 0) {
      setError("Add at least one valid item (select clinical item or product, and valid qty/cost).");
      return;
    }
    const payload = valid.map((r, i) => ({
      itemType: PACKAGE_ITEM_TYPES.includes(r.itemType as (typeof PACKAGE_ITEM_TYPES)[number]) ? r.itemType : "INCLUDED",
      clinicalItemId: r.clinicalItemId.trim() ? parseInt(r.clinicalItemId, 10) : null,
      clinicalItemVariantId: r.clinicalItemVariantId.trim() ? parseInt(r.clinicalItemVariantId, 10) : null,
      productId: r.productId.trim() ? parseInt(r.productId, 10) : null,
      variantId: r.variantId.trim() ? parseInt(r.variantId, 10) : null,
      estimatedQty: r.estimatedQty.trim() ? parseFloat(r.estimatedQty) : null,
      estimatedCost: r.estimatedCost.trim() ? parseFloat(r.estimatedCost) : null,
      displayLabel: r.displayLabel.trim() || null,
      sortOrder: r.sortOrder.trim() ? parseInt(r.sortOrder, 10) : (items as unknown[]).length + i,
    }));
    try {
      setSavingBatchItems(true);
      setError("");
      const result = await ownerClinicPackageItemsBatchCreate(branchId, packageId, { items: payload });
      setNewItemRows([]);
      setBatchItemsSuccess(result.created > 0 ? `${result.created} item(s) added.` : "No new items to add.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save items");
    } finally {
      setSavingBatchItems(false);
    }
  };

  const handleSaveEditItem = async () => {
    if (!branchId || !packageId || editingItemId == null || !editItemForm) return;
    const existing = (items as Array<{ id: number; itemType?: string; productId?: number | null; variantId?: number | null; clinicalItemId?: number | null; clinicalItemVariantId?: number | null }>).find((i) => i.id === editingItemId);
    const itemType = existing?.itemType && PACKAGE_ITEM_TYPES.includes(existing.itemType as (typeof PACKAGE_ITEM_TYPES)[number]) ? existing.itemType : "INCLUDED";
    const body: Record<string, unknown> = {
      id: editingItemId,
      itemType,
      sortOrder: parseInt(editItemForm.sortOrder, 10) || 0,
      estimatedQty: editItemForm.estimatedQty.trim() ? parseFloat(editItemForm.estimatedQty) : null,
      estimatedCost: editItemForm.estimatedCost.trim() ? parseFloat(editItemForm.estimatedCost) : null,
      displayLabel: editItemForm.displayLabel.trim() || null,
    };
    if (existing) {
      if (existing.clinicalItemId != null) body.clinicalItemId = existing.clinicalItemId;
      if (existing.clinicalItemVariantId != null) body.clinicalItemVariantId = existing.clinicalItemVariantId;
      if (existing.productId != null) body.productId = existing.productId;
      if (existing.variantId != null) body.variantId = existing.variantId;
    }
    try {
      setSavingItemEdit(true);
      setError("");
      await ownerClinicPackageItemUpsert(branchId, packageId, body);
      setEditingItemId(null);
      setEditItemForm(null);
      setSuccess("Item updated.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to update item");
    } finally {
      setSavingItemEdit(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!branchId || !packageId || !confirm("Remove this item from the package?")) return;
    try {
      setError("");
      await ownerClinicPackageItemDelete(branchId, packageId, itemId);
      setSuccess("Item removed.");
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setEditItemForm(null);
      }
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to delete item");
    }
  };

  const parseNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = parseFloat(s);
    return Number.isNaN(n) ? undefined : n;
  };

  const buildUpdateBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      packageName: packageName.trim(),
      packageType,
      status,
      addOnAllowed,
      discountable,
    };
    if (validFrom.trim()) body.validFrom = validFrom.trim();
    if (validTo.trim()) body.validTo = validTo.trim();
    const species = speciesCondition.trim().split(",").map((x) => x.trim()).filter(Boolean);
    if (species.length > 0) body.speciesCondition = species;
    const priceNum = parseNum(baseSellingPrice);
    if (priceNum != null && priceNum >= 0) body.baseSellingPrice = priceNum;
    const docFee = parseNum(doctorFeeAmount);
    if (docFee != null && docFee >= 0) body.doctorFeeAmount = docFee;
    const clinicFee = parseNum(clinicFeeAmount);
    if (clinicFee != null && clinicFee >= 0) body.clinicFeeAmount = clinicFee;
    const consumable = parseNum(consumableBlockAmount);
    if (consumable != null && consumable >= 0) body.consumableBlockAmount = consumable;
    const medication = parseNum(medicationBlockAmount);
    if (medication != null && medication >= 0) body.medicationBlockAmount = medication;
    const support = parseNum(supportFeeAmount);
    if (support != null && support >= 0) body.supportFeeAmount = support;
    const est = parseNum(estimatedCost);
    if (est != null && est >= 0) body.estimatedCost = est;
    if (description.trim()) body.description = description.trim();
    if (internalNotes.trim()) body.internalNotes = internalNotes.trim();
    if (department.trim()) body.department = department.trim();
    if (breedNote.trim()) body.breedNote = breedNote.trim();
    if (typeof serviceId === "number") body.serviceId = serviceId;
    if (minSellingPrice.trim() === "") body.minSellingPrice = null;
    else {
      const minP = parseNum(minSellingPrice);
      if (minP != null && minP >= 0) body.minSellingPrice = minP;
    }
    if (maxDiscountPct.trim() === "") body.maxDiscountPct = null;
    else {
      const maxPct = parseNum(maxDiscountPct);
      if (maxPct != null && maxPct >= 0) body.maxDiscountPct = maxPct;
    }
    body.taxApplicable = taxApplicable;
    body.branchOverrideAllowed = branchOverrideAllowed;
    const weightMinNum = parseNum(eligibilityRule.weightMin);
    const weightMaxNum = parseNum(eligibilityRule.weightMax);
    const repeatNum = parseNum(eligibilityRule.repeatableAfterDays);
    body.eligibilityRuleJson = {
      weightMin: weightMinNum,
      weightMax: weightMaxNum,
      emergencyUsable: eligibilityRule.emergencyUsable,
      repeatableAfterDays: repeatNum,
      consentRequired: eligibilityRule.consentRequired,
      fastingRequired: eligibilityRule.fastingRequired,
      preCheckupRequired: eligibilityRule.preCheckupRequired,
    };
    body.availabilityRuleJson = {
      onlineVisible: availabilityRule.onlineVisible,
      internalOnly: availabilityRule.internalOnly,
      staffQuickBooking: availabilityRule.staffQuickBooking,
      doctorRecommendation: availabilityRule.doctorRecommendation,
      posDirectSale: availabilityRule.posDirectSale,
    };
    return body;
  };

  const handleSaveDraft = async () => {
    if (!branchId || !packageId) return;
    const body = buildUpdateBody();
    body.status = "DRAFT";
    try {
      setSaving(true);
      setError("");
      const updated = await ownerClinicPackageUpdate(branchId, packageId, body) as PackageDetail | null;
      if (updated) setPkg((prev) => (prev ? { ...prev, ...updated } : null));
      setSuccess("Saved as draft.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!branchId || !packageId) return;
    const priceNum = parseNum(baseSellingPrice);
    if (priceNum == null || priceNum < 0) {
      setError("Enter a valid base selling price before publishing.");
      return;
    }
    if (impact?.upcomingBookings && impact.upcomingBookings > 0) {
      const ok = window.confirm(
        `This package is used in ${impact.upcomingBookings} upcoming booking(s). Publishing changes will apply only to future bookings. Continue?`
      );
      if (!ok) return;
    }
    const body = buildUpdateBody();
    body.status = "ACTIVE";
    try {
      setSaving(true);
      setError("");
      const updated = await ownerClinicPackageUpdate(branchId, packageId, body) as PackageDetail | null;
      if (updated) setPkg((prev) => (prev ? { ...prev, ...updated } : null));
      setSuccess("Package published.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!branchId || !packageId || !pkg) return;
    const newCode = window.prompt("New package code (unique):", `${pkg.packageCode}-COPY`);
    if (!newCode?.trim()) return;
    try {
      setSaving(true);
      setError("");
      const created = await ownerClinicPackageDuplicate(branchId, packageId, { packageCode: newCode.trim() }) as { id?: number };
      if (created?.id) {
        router.push(`/owner/clinic/${branchId}/packages/${created.id}/edit`);
      } else {
        setSuccess("Package duplicated.");
        await load();
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to duplicate");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!branchId || !packageId || !confirm("Archive this package? It will no longer be available for selection.")) return;
    try {
      setSaving(true);
      setError("");
      await ownerClinicPackageUpdate(branchId, packageId, { status: "ARCHIVED" });
      setPkg((prev) => (prev ? { ...prev, status: "ARCHIVED" } : null));
      setSuccess("Package archived.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to archive");
    } finally {
      setSaving(false);
    }
  };

  const basePriceNum = composition?.package?.basePrice != null ? Number(composition.package.basePrice) : parseNum(baseSellingPrice) ?? 0;
  const estCost = composition?.estimatedCost ?? parseNum(estimatedCost) ?? 0;
  const margin = basePriceNum - estCost;
  const marginPct = basePriceNum > 0 ? (margin / basePriceNum) * 100 : 0;

  const warnings: string[] = [];
  const docFeeNum = parseNum(doctorFeeAmount) ?? Number(pkg?.doctorFeeAmount) ?? 0;
  if (basePriceNum > 0 && docFeeNum > basePriceNum) warnings.push("Doctor fee is higher than base price.");
  if (impact?.upcomingBookings && impact.upcomingBookings > 0) {
    warnings.push(`This package is used in ${impact.upcomingBookings} upcoming booking(s). Publishing applies only to future bookings.`);
  }

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
            <p className="text-muted mt-2 mb-0">Loading Package Workspace…</p>
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
        title="Package Workspace"
        subtitle={`${pkg.packageName || pkg.packageCode} · ${pkg.packageCode}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Packages", href: `/owner/clinic/${branchId}/packages` },
          { label: pkg.packageName || pkg.packageCode, href: `/owner/clinic/${branchId}/packages/${packageId}` },
          { label: "Edit", href: `/owner/clinic/${branchId}/packages/${packageId}/edit` },
        ]}
        actions={[
          <Link key="back" href={`/owner/clinic/${branchId}/packages/${packageId}`} className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            View package
          </Link>,
        ]}
      />

      {/* Workspace header bar (sticky) */}
      <div className="card radius-12 mb-3 sticky-top bg-white" style={{ top: "0.5rem", zIndex: 10 }}>
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="fw-semibold">{pkg.packageName || pkg.packageCode}</span>
              <code className="small bg-light px-2 py-1 rounded">{pkg.packageCode}</code>
              <span className={`badge radius-8 ${STATUS_BADGE_CLASS[pkg.status ?? "ACTIVE"] ?? "bg-secondary"}`}>
                {pkg.status ?? "ACTIVE"}
              </span>
              {pkg.branch?.name && <span className="text-muted small">{pkg.branch.name}</span>}
              {pkg.updatedAt && (
                <span className="text-muted small">
                  Updated {formatDate(pkg.updatedAt)}
                  {pkg.updatedBy?.name && ` by ${pkg.updatedBy.name}`}
                </span>
              )}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={handleSaveDraft} disabled={saving}>
                Save Draft
              </button>
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={handlePublish} disabled={saving}>
                Publish
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={handleDuplicate} disabled={saving}>
                Duplicate
              </button>
              <button type="button" className="btn btn-outline-warning btn-sm radius-8" onClick={handleArchive} disabled={saving}>
                Archive
              </button>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm radius-8"
                onClick={() => setActiveTab("history")}
              >
                View Audit Log
              </button>
            </div>
          </div>
        </div>
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
        {/* Main tabs */}
        <div className="col-12 col-lg-8">
          <div className="card radius-12">
            <ul className="nav nav-tabs card-header-tabs px-24 pt-2 border-0 flex-nowrap overflow-auto" role="tablist">
              {(["overview", "pricing", "items", "rules", "availability", "preview", "history"] as const).map((tab) => (
                <li key={tab} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link radius-8 ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="card-body p-24">
              {activeTab === "overview" && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Package code</label>
                    <input type="text" className="form-control radius-12 bg-light" value={pkg.packageCode} readOnly disabled />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Package name *</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. Standard Spay Package"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Primary service</label>
                    <select
                      className="form-select radius-12"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <option value="">Select service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.category ? `(${s.category})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Package type</label>
                    <select className="form-select radius-12" value={packageType} onChange={(e) => setPackageType(e.target.value)}>
                      {PACKAGE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Status</label>
                    <select className="form-select radius-12" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {PACKAGE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Species (comma-separated)</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={speciesCondition}
                      onChange={(e) => setSpeciesCondition(e.target.value)}
                      placeholder="e.g. Dog, Cat"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Valid from</label>
                    <input type="date" className="form-control radius-12" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Valid to</label>
                    <input type="date" className="form-control radius-12" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control radius-12" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal description" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Department</label>
                    <input type="text" className="form-control radius-12" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Surgery" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Breed note</label>
                    <input type="text" className="form-control radius-12" value={breedNote} onChange={(e) => setBreedNote(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Internal notes</label>
                    <textarea className="form-control radius-12" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                  </div>
                  <div className="col-12 d-flex gap-3">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="addOnAllowed" checked={addOnAllowed} onChange={(e) => setAddOnAllowed(e.target.checked)} />
                      <label className="form-check-label" htmlFor="addOnAllowed">Add-on allowed</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="discountable" checked={discountable} onChange={(e) => setDiscountable(e.target.checked)} />
                      <label className="form-check-label" htmlFor="discountable">Discountable</label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Base selling price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control radius-12"
                      value={baseSellingPrice}
                      onChange={(e) => setBaseSellingPrice(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Minimum selling price</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={minSellingPrice} onChange={(e) => setMinSellingPrice(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Max discount %</label>
                    <input type="number" step="0.01" min="0" max="100" className="form-control radius-12" value={maxDiscountPct} onChange={(e) => setMaxDiscountPct(e.target.value)} />
                  </div>
                  <div className="col-12 d-flex gap-3 mb-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="taxApplicable" checked={taxApplicable} onChange={(e) => setTaxApplicable(e.target.checked)} />
                      <label className="form-check-label" htmlFor="taxApplicable">Tax applicable</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="branchOverrideAllowed" checked={branchOverrideAllowed} onChange={(e) => setBranchOverrideAllowed(e.target.checked)} />
                      <label className="form-check-label" htmlFor="branchOverrideAllowed">Branch override allowed</label>
                    </div>
                  </div>
                  <hr className="my-2" />
                  <h6 className="fw-semibold">Fee breakdown</h6>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Doctor fee</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={doctorFeeAmount} onChange={(e) => setDoctorFeeAmount(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Clinic fee</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={clinicFeeAmount} onChange={(e) => setClinicFeeAmount(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Consumable block</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={consumableBlockAmount} onChange={(e) => setConsumableBlockAmount(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Medication block</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={medicationBlockAmount} onChange={(e) => setMedicationBlockAmount(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Support fee</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={supportFeeAmount} onChange={(e) => setSupportFeeAmount(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Estimated cost</label>
                    <input type="number" step="0.01" min="0" className="form-control radius-12" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTab === "items" && (
                <div>
                  <h6 className="fw-semibold mb-2">Package composition</h6>
                  <p className="text-muted small mb-3">Saved items and batch add new items below. Edit qty, cost, label, or order on saved rows; add multiple new rows and save once.</p>

                  {items.length > 0 && (
                    <div className="mb-4">
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Type</th>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Est. cost</th>
                              <th>Order</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(items as Array<{ id: number; itemType?: string; displayLabel?: string | null; estimatedQty?: number | string | null; estimatedCost?: number | string | null; sortOrder?: number | null; product?: { name: string }; variant?: { title: string; sku?: string }; clinicalItem?: { name: string }; clinicalItemVariant?: { variantName: string } }>)
                              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                              .map((item) => {
                                const label = item.displayLabel?.trim() || (item.clinicalItemVariant?.variantName ?? item.clinicalItem?.name) || item.variant?.title || item.product?.name || `Item #${item.id}`;
                                const isEditing = editingItemId === item.id;
                                return (
                                  <tr key={item.id}>
                                    <td><span className="badge bg-primary-subtle text-primary-emphasis radius-8">{item.itemType ?? "INCLUDED"}</span></td>
                                    <td>{label}</td>
                                    {!isEditing ? (
                                      <>
                                        <td>{item.estimatedQty ?? "—"}</td>
                                        <td>{formatMoney(item.estimatedCost)}</td>
                                        <td>{item.sortOrder ?? 0}</td>
                                        <td className="text-end">
                                          <button type="button" className="btn btn-sm btn-outline-primary radius-8 me-1" onClick={() => { setEditingItemId(item.id); setEditItemForm({ estimatedQty: item.estimatedQty != null ? String(item.estimatedQty) : "", estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "", displayLabel: item.displayLabel ?? "", sortOrder: item.sortOrder != null ? String(item.sortOrder) : "0" }); }}>Edit</button>
                                          <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => handleDeleteItem(item.id)}>Remove</button>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" style={{ width: 80 }} value={editItemForm!.estimatedQty} onChange={(e) => setEditItemForm((f) => f ? { ...f, estimatedQty: e.target.value } : null)} /></td>
                                        <td><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" style={{ width: 90 }} value={editItemForm!.estimatedCost} onChange={(e) => setEditItemForm((f) => f ? { ...f, estimatedCost: e.target.value } : null)} /></td>
                                        <td><input type="number" className="form-control form-control-sm radius-8" style={{ width: 60 }} value={editItemForm!.sortOrder} onChange={(e) => setEditItemForm((f) => f ? { ...f, sortOrder: e.target.value } : null)} /></td>
                                        <td colSpan={2} className="text-end">
                                          <input type="text" className="form-control form-control-sm radius-8 d-inline-block me-1" style={{ width: 140 }} placeholder="Display label" value={editItemForm!.displayLabel} onChange={(e) => setEditItemForm((f) => f ? { ...f, displayLabel: e.target.value } : null)} />
                                          <button type="button" className="btn btn-sm btn-primary radius-8 me-1" onClick={handleSaveEditItem} disabled={savingItemEdit}>{savingItemEdit ? "Saving…" : "Save"}</button>
                                          <button type="button" className="btn btn-sm btn-outline-secondary radius-8" onClick={() => { setEditingItemId(null); setEditItemForm(null); }}>Cancel</button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {items.length === 0 && newItemRows.length === 0 && (
                    <p className="mb-3 text-muted small"><strong>No items</strong> in this package yet. Click &quot;Add item row&quot; below to add one or more items, then save.</p>
                  )}

                  <div className="pt-3 border-top">
                    <h6 className="small fw-semibold mb-2">Add items (batch)</h6>
                    <p className="small text-muted mb-2">Add multiple rows; fill source (clinical search or product/variant IDs), qty, cost, label, order. Save once to persist all.</p>
                    <button type="button" className="btn btn-sm btn-outline-primary radius-8 mb-3" onClick={addNewItemRow}>
                      <i className="ri-add-line me-1" /> Add item row
                    </button>

                    {newItemRows.length > 0 && (
                      <div className="mb-3">
                        {newItemRows.map((row) => (
                          <div key={row._localId} className="card radius-8 mb-2 border">
                            <div className="card-body py-2 px-3">
                              <div className="row g-2 align-items-end flex-wrap">
                                <div className="col-6 col-md-1">
                                  <label className="form-label small mb-0">Source</label>
                                  <select className="form-select form-select-sm radius-8" value={row.source} onChange={(e) => updateNewItemRow(row._localId, { source: e.target.value as typeof ITEM_SOURCE_CLINICAL | typeof ITEM_SOURCE_PRODUCT })}>
                                    <option value={ITEM_SOURCE_CLINICAL}>Clinical</option>
                                    <option value={ITEM_SOURCE_PRODUCT}>Product</option>
                                  </select>
                                </div>
                                <div className="col-6 col-md-1">
                                  <label className="form-label small mb-0">Type</label>
                                  <select className="form-select form-select-sm radius-8" value={row.itemType} onChange={(e) => updateNewItemRow(row._localId, { itemType: e.target.value })}>
                                    {PACKAGE_ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                {row.source === ITEM_SOURCE_CLINICAL && (
                                  <div className="col-12 col-md-3 position-relative" ref={clinicalSearchRowId === row._localId ? clinicalSearchRef : undefined}>
                                    <label className="form-label small mb-0">Search clinical item *</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm radius-8"
                                      placeholder="2+ chars…"
                                      value={clinicalSearchRowId === row._localId ? clinicalSearchQ : (row.selectedLabel || "")}
                                      onChange={(e) => {
                                        if (clinicalSearchRowId !== row._localId) setClinicalSearchRowId(row._localId);
                                        setClinicalSearchQ(e.target.value);
                                        setClinicalSearchOpen(true);
                                        if (clinicalSearchRowId !== row._localId) updateNewItemRow(row._localId, { selectedLabel: e.target.value });
                                      }}
                                      onFocus={() => { setClinicalSearchRowId(row._localId); setClinicalSearchQ(row.selectedLabel || ""); setClinicalSearchOpen(true); }}
                                      autoComplete="off"
                                    />
                                    {clinicalSearchRowId === row._localId && clinicalSearchOpen && (
                                      <div className="position-absolute border bg-white shadow-sm rounded mt-1 p-1 list-unstyled mb-0" style={{ zIndex: 1050, maxHeight: 200, overflowY: "auto", minWidth: 260 }}>
                                        {clinicalSearchLoading ? (
                                          <li className="px-2 py-2 small text-muted">Searching…</li>
                                        ) : clinicalSearchQ.trim().length < 2 ? (
                                          <li className="px-2 py-2 small text-muted">Type at least 2 characters</li>
                                        ) : clinicalSearchResults.length === 0 ? (
                                          <li className="px-2 py-2 small text-muted">No items found.</li>
                                        ) : (
                                          clinicalSearchResults.map((it) => (
                                            <li key={it.id} className="px-2 py-1 small">
                                              <span className="fw-medium">{it.name}</span> {it.itemCode && <code className="ms-1 small">{it.itemCode}</code>}
                                              {(it.variants?.length ?? 0) > 0 ? (
                                                it.variants!.map((v) => (
                                                  <div key={v.id} className="ms-2 mt-1">
                                                    <button type="button" className="btn btn-link btn-sm p-0 text-start text-decoration-none" onClick={() => {
                                                      const label = [it.name, v.variantName].filter(Boolean).join(" — ");
                                                      updateNewItemRow(row._localId, { clinicalItemId: String(it.id), clinicalItemVariantId: String(v.id), productId: "", variantId: "", selectedLabel: label, displayLabel: row.displayLabel || label, estimatedCost: row.estimatedCost || (v.defaultCost != null ? String(v.defaultCost) : "") });
                                                      setClinicalSearchQ("");
                                                      setClinicalSearchResults([]);
                                                      setClinicalSearchOpen(false);
                                                    }}>
                                                      {v.variantName} {v.sku && <code className="small">{v.sku}</code>} {v.defaultCost != null && <span className="text-muted">(৳{v.defaultCost})</span>}
                                                    </button>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="ms-2 mt-1">
                                                  <button type="button" className="btn btn-link btn-sm p-0 text-start text-decoration-none" onClick={() => {
                                                    updateNewItemRow(row._localId, { clinicalItemId: String(it.id), clinicalItemVariantId: "", productId: "", variantId: "", selectedLabel: it.name, displayLabel: row.displayLabel || it.name });
                                                    setClinicalSearchQ("");
                                                    setClinicalSearchResults([]);
                                                    setClinicalSearchOpen(false);
                                                  }}>Use item (no variant)</button>
                                                </div>
                                              )}
                                            </li>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {row.source === ITEM_SOURCE_PRODUCT && (
                                  <>
                                    <div className="col-4 col-md-1"><label className="form-label small mb-0">Product ID</label><input type="number" className="form-control form-control-sm radius-8" placeholder="ID" value={row.productId} onChange={(e) => updateNewItemRow(row._localId, { productId: e.target.value })} /></div>
                                    <div className="col-4 col-md-1"><label className="form-label small mb-0">Variant ID</label><input type="number" className="form-control form-control-sm radius-8" placeholder="Opt" value={row.variantId} onChange={(e) => updateNewItemRow(row._localId, { variantId: e.target.value })} /></div>
                                  </>
                                )}
                                <div className="col-4 col-md-1"><label className="form-label small mb-0">Qty</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={row.estimatedQty} onChange={(e) => updateNewItemRow(row._localId, { estimatedQty: e.target.value })} /></div>
                                <div className="col-4 col-md-1"><label className="form-label small mb-0">Est. cost</label><input type="number" step="0.01" min={0} className="form-control form-control-sm radius-8" value={row.estimatedCost} onChange={(e) => updateNewItemRow(row._localId, { estimatedCost: e.target.value })} /></div>
                                <div className="col-6 col-md-2"><label className="form-label small mb-0">Label</label><input type="text" className="form-control form-control-sm radius-8" placeholder="Optional" value={row.displayLabel} onChange={(e) => updateNewItemRow(row._localId, { displayLabel: e.target.value })} /></div>
                                <div className="col-4 col-md-1"><label className="form-label small mb-0">Order</label><input type="number" className="form-control form-control-sm radius-8" value={row.sortOrder} onChange={(e) => updateNewItemRow(row._localId, { sortOrder: e.target.value })} /></div>
                                <div className="col-4 col-md-1">
                                  <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => removeNewItemRow(row._localId)} title="Remove row"><i className="ri-close-line" /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-primary radius-8" onClick={handleBatchItemsSubmit} disabled={savingBatchItems}>
                          {savingBatchItems ? "Saving…" : "Save all new items"}
                        </button>
                      </div>
                    )}

                    {batchItemsSuccess && (
                      <div className="alert alert-success radius-12 py-2 small mb-0 mt-2">
                        <i className="ri-check-line me-2" />
                        {batchItemsSuccess}
                      </div>
                    )}

                    <div className="mt-3">
                      <Link href={`/owner/clinic/${branchId}/packages/${packageId}`} className="btn btn-sm btn-outline-secondary radius-8">
                        Open package detail (full item management)
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "rules" && (
                <div className="row g-3">
                  <h6 className="fw-semibold">Eligibility rules</h6>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Weight min (kg)</label>
                    <input type="number" step="0.01" className="form-control radius-12" value={eligibilityRule.weightMin} onChange={(e) => setEligibilityRule((r) => ({ ...r, weightMin: e.target.value }))} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Weight max (kg)</label>
                    <input type="number" step="0.01" className="form-control radius-12" value={eligibilityRule.weightMax} onChange={(e) => setEligibilityRule((r) => ({ ...r, weightMax: e.target.value }))} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Repeatable after (days)</label>
                    <input type="number" min="0" className="form-control radius-12" value={eligibilityRule.repeatableAfterDays} onChange={(e) => setEligibilityRule((r) => ({ ...r, repeatableAfterDays: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div className="col-12 d-flex flex-wrap gap-3">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="emergencyUsable" checked={eligibilityRule.emergencyUsable} onChange={(e) => setEligibilityRule((r) => ({ ...r, emergencyUsable: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="emergencyUsable">Emergency usable</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="consentRequired" checked={eligibilityRule.consentRequired} onChange={(e) => setEligibilityRule((r) => ({ ...r, consentRequired: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="consentRequired">Consent required</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="fastingRequired" checked={eligibilityRule.fastingRequired} onChange={(e) => setEligibilityRule((r) => ({ ...r, fastingRequired: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="fastingRequired">Fasting required</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="preCheckupRequired" checked={eligibilityRule.preCheckupRequired} onChange={(e) => setEligibilityRule((r) => ({ ...r, preCheckupRequired: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="preCheckupRequired">Pre-checkup required</label>
                    </div>
                  </div>
                  <p className="small text-muted mb-0">Species is set in Overview. Save Draft or Publish to persist these rules.</p>
                </div>
              )}

              {activeTab === "availability" && (
                <div>
                  <h6 className="fw-semibold mb-2">Visibility &amp; channels</h6>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="onlineVisible" checked={availabilityRule.onlineVisible} onChange={(e) => setAvailabilityRule((r) => ({ ...r, onlineVisible: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="onlineVisible">Online visible</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="internalOnly" checked={availabilityRule.internalOnly} onChange={(e) => setAvailabilityRule((r) => ({ ...r, internalOnly: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="internalOnly">Internal only</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="staffQuickBooking" checked={availabilityRule.staffQuickBooking} onChange={(e) => setAvailabilityRule((r) => ({ ...r, staffQuickBooking: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="staffQuickBooking">Staff quick-booking</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="doctorRecommendation" checked={availabilityRule.doctorRecommendation} onChange={(e) => setAvailabilityRule((r) => ({ ...r, doctorRecommendation: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="doctorRecommendation">Doctor recommendation</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="posDirectSale" checked={availabilityRule.posDirectSale} onChange={(e) => setAvailabilityRule((r) => ({ ...r, posDirectSale: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="posDirectSale">POS direct sale</label>
                    </div>
                  </div>
                  <p className="small text-muted mt-2 mb-0">Validity period (valid from / valid to) is in Overview. Save Draft or Publish to persist.</p>
                </div>
              )}

              {activeTab === "preview" && (
                <div>
                  <h6 className="fw-semibold mb-2">Customer invoice preview</h6>
                  <div className="p-3 bg-light radius-12 mb-3">
                    <div className="fw-semibold">{pkg.packageName || pkg.packageCode}</div>
                    <div className="small text-muted">Code: {pkg.packageCode}</div>
                    <div className="mt-2">{formatMoney(baseSellingPrice || composition?.package?.basePrice)} total</div>
                    {discountable && <span className="badge bg-info-subtle text-info-emphasis radius-8 mt-1">Discountable</span>}
                  </div>
                  <h6 className="fw-semibold mb-2">Internal cost preview</h6>
                  <div className="d-flex flex-wrap gap-2 small">
                    <span>Doctor fee: {formatMoney(composition?.doctorFee ?? doctorFeeAmount)}</span>
                    <span>Clinic fee: {formatMoney(composition?.clinicFee ?? clinicFeeAmount)}</span>
                    <span>Consumable: {formatMoney(composition?.consumableBlock ?? consumableBlockAmount)}</span>
                    <span>Medication: {formatMoney(composition?.medicationBlock ?? medicationBlockAmount)}</span>
                    <span>Support: {formatMoney(composition?.supportFee ?? supportFeeAmount)}</span>
                    <span className="fw-semibold">Est. cost: {formatMoney(composition?.estimatedCost ?? estimatedCost)}</span>
                    <span className="fw-semibold">Margin: {formatMoney(margin)} ({marginPct.toFixed(1)}%)</span>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <PackageHistoryTab branchId={branchId} packageId={packageId} />
              )}
            </div>
          </div>
        </div>

        {/* Sticky summary panel */}
        <div className="col-12 col-lg-4">
          <div className="card radius-12 sticky-top" style={{ top: "1rem" }}>
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Summary</h6>
              {pkg.updatedAt && (
                <p className="small text-muted mb-2">Last saved {formatDate(pkg.updatedAt)}{pkg.updatedBy?.name ? ` by ${pkg.updatedBy.name}` : ""}</p>
              )}
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between"><span>Base price</span><span>{formatMoney(baseSellingPrice || composition?.package?.basePrice)}</span></div>
                <div className="d-flex justify-content-between"><span>Doctor fee</span><span>{formatMoney(composition?.doctorFee ?? doctorFeeAmount)}</span></div>
                <div className="d-flex justify-content-between"><span>Consumables</span><span>{formatMoney(composition?.consumableBlock ?? consumableBlockAmount)}</span></div>
                <div className="d-flex justify-content-between"><span>Medicines</span><span>{formatMoney(composition?.medicationBlock ?? medicationBlockAmount)}</span></div>
                <div className="d-flex justify-content-between"><span>Est. margin</span><span>{formatMoney(margin)} ({marginPct.toFixed(1)}%)</span></div>
                <hr className="my-1" />
                <div className="d-flex justify-content-between"><span>Active branches</span><span>{impact?.branchesWhereAvailable ?? 1}</span></div>
                <div className="d-flex justify-content-between"><span>Validity</span><span>{validFrom || "—"} to {validTo || "—"}</span></div>
              </div>
              {warnings.length > 0 && (
                <div className="mt-3 pt-2 border-top">
                  <div className="small fw-semibold text-warning mb-1">Warnings</div>
                  <ul className="list-unstyled small mb-0">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-warning">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageHistoryTab({ branchId, packageId }: { branchId: string; packageId: string }) {
  const [entries, setEntries] = useState<Array<{ id: string; type: string; action: string; user?: { name?: string }; meta?: { oldPrice?: number; newPrice?: number }; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    ownerClinicPackageAuditLog(branchId, packageId, { limit: 30 })
      .then((data) => {
        if (!cancelled) setEntries((data ?? []) as Array<{ id: string; type: string; action: string; user?: { name?: string }; meta?: { oldPrice?: number; newPrice?: number }; createdAt: string }>);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, packageId]);

  if (loading) return <p className="text-muted mb-0">Loading history…</p>;
  if (entries.length === 0) return <p className="text-muted mb-0">No audit entries yet.</p>;
  return (
    <div className="small">
      <ul className="list-unstyled mb-0">
        {entries.map((e) => (
          <li key={e.id} className="py-2 border-bottom border-light">
            <span className="fw-medium">{e.action}</span>
            {e.meta?.oldPrice != null && e.meta?.newPrice != null && (
              <span className="text-muted ms-1"> — {e.meta.oldPrice} → {e.meta.newPrice}</span>
            )}
            {e.user?.name && <span className="text-muted ms-1"> by {e.user.name}</span>}
            <div className="text-muted">{formatDate(e.createdAt)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
