"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import OrganizationWizardForm from "@/app/owner/organizations/_components/OrganizationWizardForm";
import { postLocationManual, locationToPlace } from "@/lib/locationPlace";
import { getMeLocation } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function placeToLocation(place) {
  if (!place) return {};
  const text = place.formattedAddress || [place.city, place.admin1, place.countryCode].filter(Boolean).join(", ");
  return {
    countryCode: place.countryCode || "BD",
    admin1: place.admin1,
    admin2: place.admin2,
    city: place.city,
    postalCode: place.postalCode,
    formattedAddress: place.formattedAddress,
    fullPathText: text,
    text,
    lat: place.lat,
    lng: place.lng,
    latitude: place.lat,
    longitude: place.lng,
    bdDivision: place.bdDivision,
    bdDistrict: place.bdDistrict,
    bdUpazila: place.bdUpazila,
    bdWard: place.bdWard,
  };
}

async function uploadMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Upload failed (${res.status})`);
  return j.data?.id;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) throw new Error(j?.message || `Request failed (${res.status})`);
  return j.data;
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState(null);
  const [hydrateToken, setHydrateToken] = useState(1);
  const [initialState, setInitialState] = useState(null);
  const [loadedFromLastLocation, setLoadedFromLastLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMeLocation()
      .then((data) => {
        if (cancelled) return;
        const place = data?.manualOverridePlace ?? data?.currentPlace;
        if (place) {
          setLoadedFromLastLocation(true);
          setInitialState((prev) => ({
            ...(prev || {}),
            location: placeToLocation(place),
          }));
          setHydrateToken((t) => t + 1);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function ensureOrgCreated(state) {
    if (orgId) return orgId;
    const place = locationToPlace(state?.location);
    if (place?.countryCode) {
      try {
        await postLocationManual(place);
      } catch {
      }
    }
    const loc = state?.location || {};
    const created = await apiPost("/api/v1/owner/organizations", {
      name: state?.basic?.name,
      supportPhone: state?.basic?.supportPhone,
      cityCorporationId: loc.cityCorporationId || null,
      dhakaAreaId: loc.dhakaAreaId || null,
      bdAreaId: loc.bdAreaId || null,
      fullPathText: loc.fullPathText || loc.formattedAddress || loc.text || null,
      addressJson: {
        text: state?.basic?.addressText || "",
        orgTypeCode: state?.basic?.orgTypeCode,
        locationKind: loc.kind || null,
        countryCode: loc.countryCode || null,
        countryName: loc.countryName || null,
        stateName: loc.stateName || loc.state || null,
        cityName: loc.cityName || loc.city || null,
        postalCode: loc.postalCode || null,
        addressLine: loc.addressLine || loc.address || null,
        formattedAddress: loc.formattedAddress || null,
        provider: loc.provider || null,
        providerPlaceId: loc.providerPlaceId || null,
        cityCorporationId: loc.cityCorporationId || null,
        cityCorporationCode: loc.cityCorporationCode || null,
        dhakaAreaId: loc.dhakaAreaId || null,
        bdAreaId: loc.bdAreaId || null,
        fullPathText: loc.fullPathText || loc.formattedAddress || loc.text || null,
        latitude: loc.latitude ?? loc.lat ?? null,
        longitude: loc.longitude ?? loc.lng ?? null,
        whatsappNumber: state?.basic?.whatsappNumber || null,
        alternatePhone: state?.basic?.alternatePhone || null,
        typeSpecific: state?.typeSpecific || {},
      },
      location: {
        lat: loc.lat ?? loc.latitude ?? null,
        lng: loc.lng ?? loc.longitude ?? null,
        address: loc.addressLine || loc.formattedAddress || "",
        city: loc.city || loc.cityName || "",
        state: loc.state || loc.stateName || "",
        country: loc.countryName || "Bangladesh",
        postalCode: loc.postalCode || "",
      },
      supportEmail: state?.basic?.supportEmail || null,
    });
    setOrgId(created.id);
    return created.id;
  }

  async function saveDraftInternal(state) {
    const id = await ensureOrgCreated(state);
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-draft`, {
      organizationName: state?.basic?.name,
      registrationType: state?.legal?.registrationType,
      tradeLicenseNumber: state?.legal?.tradeLicenseNumber,
      tradeLicenseIssueDate: state?.legal?.tradeLicenseIssueDate || null,
      tradeLicenseExpiryDate: state?.legal?.tradeLicenseExpiryDate || null,
      issuingAuthority: state?.legal?.issuingAuthority,
      tinNumber: state?.legal?.tinNumber,
      binNumber: state?.legal?.binNumber,
      officialEmail: state?.legal?.officialEmail,
      officialPhone: state?.legal?.officialPhone || state?.basic?.supportPhone,
      website: state?.legal?.website,
      facebookPage: state?.legal?.facebookPage,
    });
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/save-directors`, {
      directors: state?.directors || [],
    });
    return id;
  }

  async function onSaveDraft(state) {
    await saveDraftInternal(state);
    return "Draft saved.";
  }

  async function onUploadTradeLicense(file, state) {
    const id = await ensureOrgCreated(state);
    const fileId = await uploadMedia(file);
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/add-document`, {
      type: "TRADE_LICENSE",
      fileId,
      mediaId: fileId,
    });
    return { fileName: file.name, fileId };
  }

  async function onSubmit(state) {
    const id = await saveDraftInternal(state);
    await apiPost(`/api/v1/owner/organizations/${id}/legal-profile/submit`, {});
    router.push("/owner/organizations");
  }

  return (
    <OrganizationWizardForm
      title="Organization Registration"
      subtitle="Trade license verification is required before publishing branches."
      badge={orgId ? `Draft ID: ${orgId}` : null}
      hydrateToken={hydrateToken}
      initialState={initialState}
      locationHelperText={loadedFromLastLocation ? "Loaded from last saved location" : null}
      onSaveDraft={onSaveDraft}
      onSubmit={onSubmit}
      onUploadTradeLicense={onUploadTradeLicense}
    />
  );
}
