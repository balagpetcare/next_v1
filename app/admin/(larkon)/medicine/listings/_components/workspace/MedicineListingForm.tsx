"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_LISTINGS } from "../../../_lib/paths";
import type { MedicineReviewStatus, MedicineWorkspaceProfile } from "../../_lib/medicineWorkspaceProfile.types";
import { parseWorkspaceProfile } from "../../_lib/medicineWorkspaceProfile.types";
import type { RelationOption } from "./RelationSearchPicker";
import type { PresentationOption } from "./PresentationRelationPicker";
import MedicineFormShell from "./MedicineFormShell";
import MedicineSummarySidebar from "./MedicineSummarySidebar";
import DuplicateConflictPreview from "./DuplicateConflictPreview";
import InlineCreateMasterModal, { type InlineMasterKind } from "./InlineCreateMasterModal";
import {
  MedicineCoreSection,
  MedicineCompositionSection,
  MedicineBrandManufacturerSection,
  MedicinePackagingSection,
  MedicineRegulatorySection,
  MedicineClinicalSection,
  MedicineCommercialSection,
  MedicineFilesSection,
  MedicineGovernanceSection,
} from "./MedicineWorkspaceSectionCards";

type Props = { mode: "create" | "edit"; listingId?: number };

const REVIEW_OPTIONS: { value: MedicineReviewStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

export default function MedicineListingForm({ mode, listingId }: Props) {
  const router = useRouter();
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [generic, setGeneric] = useState<RelationOption | null>(null);
  const [dosageForm, setDosageForm] = useState<RelationOption | null>(null);
  const [manufacturer, setManufacturer] = useState<RelationOption | null>(null);
  const [brand, setBrand] = useState<RelationOption | null>(null);
  const [presentation, setPresentation] = useState<PresentationOption | null>(null);
  const [packageMark, setPackageMark] = useState("");
  const [profile, setProfile] = useState<MedicineWorkspaceProfile>({});
  const [reviewStatus, setReviewStatus] = useState<MedicineReviewStatus | "">("");
  const [isActive, setIsActive] = useState(false);

  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [normalizedPreview, setNormalizedPreview] = useState<Record<string, unknown> | null>(null);
  const [duplicateListing, setDuplicateListing] = useState<Record<string, unknown> | null>(null);
  const [busyPreview, setBusyPreview] = useState(false);

  const [modalKind, setModalKind] = useState<InlineMasterKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [error, setError] = useState("");

  const readonlyIdentity = mode === "edit";

  const onField = useCallback((k: keyof MedicineWorkspaceProfile, v: string) => {
    setProfile((p) => ({ ...p, [k]: v }));
  }, []);

  useEffect(() => {
    adminMedicineWorkspaceApi.countries().then((r) => setCountries(r.data ?? [])).catch(() => {});
  }, []);

  const hydrateFromListing = useCallback((d: Record<string, unknown>) => {
    const c = d.country as { id?: number } | undefined;
    if (c?.id != null) setCountryId(c.id);
    setPackageMark(String(d.packageMarkDisplay ?? ""));
    const b = d.brand as { id?: number; displayName?: string; manufacturer?: { id?: number; displayName?: string } } | undefined;
    if (b?.id != null) setBrand({ id: b.id, label: b.displayName ?? `Brand #${b.id}` });
    if (b?.manufacturer?.id != null) {
      setManufacturer({ id: b.manufacturer.id, label: b.manufacturer.displayName ?? `Mfr #${b.manufacturer.id}` });
    }
    const pres = d.presentation as
      | {
          id?: number;
          strengthDisplay?: string;
          generic?: { id?: number; displayName?: string };
          dosageForm?: { id?: number; displayName?: string };
        }
      | undefined;
    if (pres?.id != null) {
      setPresentation({
        id: pres.id,
        label: `${pres.strengthDisplay ?? ""} · ${pres.generic?.displayName ?? ""} / ${pres.dosageForm?.displayName ?? ""}`.trim(),
      });
      if (pres.generic?.id != null) setGeneric({ id: pres.generic.id, label: pres.generic.displayName ?? `Generic #${pres.generic.id}` });
      if (pres.dosageForm?.id != null) {
        setDosageForm({ id: pres.dosageForm.id, label: pres.dosageForm.displayName ?? `Form #${pres.dosageForm.id}` });
      }
    }
    setProfile(parseWorkspaceProfile(d.workspaceProfileJson));
    const rs = d.reviewStatus != null ? String(d.reviewStatus) : "";
    if (rs === "DRAFT" || rs === "IN_REVIEW" || rs === "PUBLISHED" || rs === "REJECTED") setReviewStatus(rs);
    else setReviewStatus("");
    setIsActive(d.isActive === true);
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !listingId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadErr("");
        const res = await adminMedicineWorkspaceApi.listingsGet(listingId);
        const d = res.data as Record<string, unknown>;
        if (!cancelled) hydrateFromListing(d);
      } catch (e) {
        if (!cancelled) setLoadErr((e as Error)?.message || "Failed to load listing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, listingId, hydrateFromListing]);

  const runPreview = async () => {
    if (countryId === "" || !brand?.id || !presentation?.id) {
      setError("Country, brand, and presentation are required for preview.");
      return;
    }
    setBusyPreview(true);
    setError("");
    try {
      const res = await adminMedicineWorkspaceApi.listingsPreview({
        countryId: Number(countryId),
        presentationId: presentation.id,
        brandId: brand.id,
        packageMarkDisplay: packageMark.trim() || undefined,
      });
      setFingerprint(res.data.fingerprint);
      setNormalizedPreview(res.data.normalizedPreview as Record<string, unknown>);
      setDuplicateListing((res.data.duplicateListing as Record<string, unknown> | null) ?? null);
    } catch (e) {
      setError((e as Error)?.message || "Preview failed");
    } finally {
      setBusyPreview(false);
    }
  };

  const buildPayload = () => ({
    workspaceProfileJson: { ...profile },
    reviewStatus: reviewStatus || null,
  });

  const patchListing = async (opts: { isActive: boolean; review: MedicineReviewStatus | ""; navigate: boolean }) => {
    if (!listingId) return;
    setBusy(true);
    setError("");
    try {
      await adminMedicineWorkspaceApi.listingsPatch(listingId, {
        packageMarkDisplay: packageMark.trim() || undefined,
        workspaceProfileJson: { ...profile },
        reviewStatus: opts.review || null,
        isActive: opts.isActive,
      });
      setReviewStatus(opts.review);
      setIsActive(opts.isActive);
      if (opts.navigate) router.push(`${ADMIN_MEDICINE_LISTINGS}/${listingId}`);
    } catch (e) {
      setError((e as Error)?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!listingId) return;
    setBusy(true);
    setError("");
    try {
      await adminMedicineWorkspaceApi.listingsPatch(listingId, {
        packageMarkDisplay: packageMark.trim() || undefined,
        ...buildPayload(),
        isActive,
      });
      router.push(`${ADMIN_MEDICINE_LISTINGS}/${listingId}`);
    } catch (e) {
      setError((e as Error)?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const createListing = async (opts: { isActive: boolean; review: MedicineReviewStatus | "" }) => {
    if (countryId === "" || !brand?.id || !presentation?.id) {
      setError("Country, brand, and presentation are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const prev = await adminMedicineWorkspaceApi.listingsPreview({
        countryId: Number(countryId),
        presentationId: presentation.id,
        brandId: brand.id,
        packageMarkDisplay: packageMark.trim() || undefined,
      });
      const dup = prev.data.duplicateListing as Record<string, unknown> | null;
      setFingerprint(prev.data.fingerprint);
      setNormalizedPreview(prev.data.normalizedPreview as Record<string, unknown>);
      setDuplicateListing(dup ?? null);
      if (dup) {
        setError("Duplicate fingerprint for this country — change package mark or identity before creating.");
        setBusy(false);
        return;
      }
      const res = await adminMedicineWorkspaceApi.listingsCreate({
        countryId: Number(countryId),
        presentationId: presentation.id,
        brandId: brand.id,
        packageMarkDisplay: packageMark.trim() || undefined,
        isActive: opts.isActive,
        reviewStatus: opts.review || null,
        workspaceProfileJson: { ...profile },
      });
      const row = res.data as { id?: number };
      if (row?.id) router.push(`${ADMIN_MEDICINE_LISTINGS}/${row.id}`);
      else setError("Created but no id returned");
    } catch (e) {
      const msg = (e as Error)?.message || "Create failed";
      setError(msg);
      if (msg.toLowerCase().includes("fingerprint")) void runPreview();
    } finally {
      setBusy(false);
    }
  };

  const onInlineCreated = (kind: InlineMasterKind, opt: { id: number; label: string }) => {
    if (kind === "generic") setGeneric(opt);
    else if (kind === "dosageForm") setDosageForm(opt);
    else if (kind === "manufacturer") setManufacturer(opt);
    else if (kind === "brand") setBrand(opt);
    else if (kind === "presentation") setPresentation(opt);
    setModalKind(null);
  };

  const intro =
    mode === "create" ? (
      <>
        Create a country catalog listing using searchable masters (no manual numeric refs). Identity uses the same{" "}
        <strong>fingerprint</strong> rules as CSV import. Extended fields are stored in <code className="small">workspaceProfileJson</code>{" "}
        and do not change deduplication keys.
      </>
    ) : (
      <>Listing identity (country, presentation, brand) is fixed; update package mark, workspace profile, and governance.</>
    );

  return (
    <>
      <MedicineFormShell
        title={mode === "create" ? "New medicine listing" : `Edit listing #${listingId}`}
        backHref={ADMIN_MEDICINE_LISTINGS}
        backLabel="Medicine listings"
        intro={intro}
        error={loadErr || error}
        actions={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" disabled={busy || busyPreview} onClick={() => runPreview()}>
              {busyPreview ? "Preview…" : "Preview fingerprint"}
            </button>
            {mode === "create" ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => createListing({ isActive: false, review: "DRAFT" })}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => createListing({ isActive: false, review: "IN_REVIEW" })}
                >
                  Submit for review
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => createListing({ isActive: true, review: "PUBLISHED" })}
                >
                  Publish
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" disabled={busy} onClick={() => saveEdit()}>
                  Save changes
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => patchListing({ isActive: false, review: "DRAFT", navigate: true })}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => patchListing({ isActive: false, review: "IN_REVIEW", navigate: true })}
                >
                  Submit for review
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm radius-8"
                  disabled={busy}
                  onClick={() => patchListing({ isActive: true, review: "PUBLISHED", navigate: true })}
                >
                  Publish
                </button>
              </>
            )}
          </>
        }
        sidebar={
          <MedicineSummarySidebar
            countryId={countryId}
            brandSelected={brand != null}
            presentationSelected={presentation != null}
            packageMark={packageMark}
            profile={profile}
            reviewStatus={reviewStatus}
            fingerprint={fingerprint}
            busyPreview={busyPreview}
          />
        }
      >
        {mode === "edit" ? (
          <div className="card radius-12 mb-3">
            <div className="card-body row g-2 small">
              <div className="col-md-4">
                <span className="text-muted">Active in catalog</span>
                <div className="form-check form-switch mt-1">
                  <input className="form-check-input" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                </div>
              </div>
              <div className="col-md-8">
                <label className="form-label small">Review status</label>
                <select
                  className="form-select form-select-sm"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus((e.target.value || "") as MedicineReviewStatus | "")}
                >
                  <option value="">—</option>
                  {REVIEW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        <DuplicateConflictPreview
          fingerprint={fingerprint}
          normalizedPreview={normalizedPreview}
          duplicateListing={duplicateListing}
        />

        <MedicineCoreSection
          countries={countries}
          countryId={countryId}
          setCountryId={setCountryId}
          generic={generic}
          setGeneric={setGeneric}
          dosageForm={dosageForm}
          setDosageForm={setDosageForm}
          manufacturer={manufacturer}
          setManufacturer={setManufacturer}
          brand={brand}
          setBrand={setBrand}
          presentation={presentation}
          setPresentation={setPresentation}
          packageMark={packageMark}
          setPackageMark={setPackageMark}
          readonlyIdentity={readonlyIdentity}
          profile={profile}
          onField={onField}
          onOpenCreate={(k) => setModalKind(k)}
        />
        <MedicineCompositionSection profile={profile} onField={onField} />
        <MedicineBrandManufacturerSection profile={profile} onField={onField} />
        <MedicinePackagingSection profile={profile} onField={onField} />
        <MedicineRegulatorySection profile={profile} onField={onField} />
        <MedicineClinicalSection profile={profile} onField={onField} />
        <MedicineCommercialSection profile={profile} onField={onField} />
        <MedicineFilesSection profile={profile} onField={onField} />
        <MedicineGovernanceSection profile={profile} onField={onField} />
      </MedicineFormShell>

      <InlineCreateMasterModal
        show={modalKind != null}
        kind={modalKind ?? "generic"}
        onClose={() => setModalKind(null)}
        onCreated={(opt) => modalKind && onInlineCreated(modalKind, opt)}
        manufacturerId={manufacturer?.id ?? null}
        genericId={generic?.id ?? null}
        dosageFormId={dosageForm?.id ?? null}
      />
    </>
  );
}
