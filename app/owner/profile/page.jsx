"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LocationField from "@/src/components/location/LocationField";
import { normalizeLocation, withLegacyLocationFields } from "@/src/lib/location/normalizeLocation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) {
    throw new Error(j?.message || `Request failed (${res.status})`);
  }
  return j.data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.success) {
    throw new Error(j?.message || `Request failed (${res.status})`);
  }
  return j.data;
}

function Card({ title, subtitle, children }) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header bg-white">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h5 className="mb-0">{title}</h5>
            {subtitle ? (
              <div className="text-muted" style={{ fontSize: 13 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function OwnerProfilePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    nid: "",
    supportPhone: "",
    supportEmail: "",
    location: null,
  });

  const normalizeLoc = useCallback((loc) => {
    const n = normalizeLocation(loc, "BD");
    return n ? withLegacyLocationFields(n, loc || {}) : loc || { countryCode: "BD" };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const p = await apiGet("/api/v1/owner/profile");
        if (!mounted) return;
        if (p) {
          const addr = p.addressJson || {};
          const loc = {
            countryCode: addr.countryCode || p.countryCode || "BD",
            state: addr.stateName || addr.state,
            city: addr.cityName || addr.city,
            postalCode: addr.postalCode,
            addressLine: addr.addressLine,
            formattedAddress: addr.formattedAddress,
            lat: addr.latitude ?? addr.lat,
            lng: addr.longitude ?? addr.lng,
            fullPathText: addr.fullPathText || addr.formattedAddress,
            divisionId: p.divisionId,
            districtId: p.districtId,
            upazilaId: p.upazilaId,
            bdAreaId: p.areaId,
          };
          setForm((prev) => ({
            ...prev,
            name: p.name || "",
            nid: p.nid || "",
            supportPhone: p.supportPhone || "",
            supportEmail: p.supportEmail || "",
            location: normalizeLoc(loc),
          }));
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [normalizeLoc]);

  const locationValue = useMemo(() => {
    return form.location || normalizeLoc({ countryCode: "BD" });
  }, [form.location, normalizeLoc]);

  const handleLocationChange = useCallback(
    (next) => {
      setForm((p) => ({ ...p, location: normalizeLoc(next) }));
    },
    [normalizeLoc]
  );

  async function onSave() {
    try {
      setLoading(true);
      setError("");
      setSavedMsg("");
      const loc = form.location || {};
      const n = normalizeLoc(loc);
      const addressJson = {
        countryCode: n.countryCode || "BD",
        stateName: n.state || n.stateName,
        cityName: n.city || n.cityName,
        postalCode: n.postalCode,
        addressLine: n.addressLine,
        formattedAddress: n.formattedAddress || n.fullPathText || n.text,
        latitude: n.lat ?? n.latitude,
        longitude: n.lng ?? n.longitude,
      };
      const payload = {
        name: form.name,
        nid: form.nid || null,
        supportPhone: form.supportPhone || null,
        supportEmail: form.supportEmail || null,
        addressJson,
      };
      await apiPut("/api/v1/owner/profile", payload);
      setSavedMsg("Saved successfully");
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 1100 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h3 className="mb-0">Owner Profile</h3>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Basic onboarding info (KYC details will be submitted separately).
          </div>
        </div>
        <button className="btn btn-primary" onClick={onSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {savedMsg ? <div className="alert alert-success">{savedMsg}</div> : null}

      <Card title="Basic Info" subtitle="This will be used in owner onboarding and support contact.">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Name *</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">NID (optional)</label>
            <input
              className="form-control"
              value={form.nid}
              onChange={(e) => setForm((p) => ({ ...p, nid: e.target.value }))}
              placeholder="National ID"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Support Phone</label>
            <input
              className="form-control"
              value={form.supportPhone}
              onChange={(e) => setForm((p) => ({ ...p, supportPhone: e.target.value }))}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Support Email</label>
            <input
              className="form-control"
              value={form.supportEmail}
              onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))}
              placeholder="name@example.com"
            />
          </div>
        </div>
      </Card>

      <Card title="Location" subtitle="Bangladesh / Dhaka City">
        <LocationField
          value={locationValue}
          onChange={handleLocationChange}
          label="Location"
          defaultCountryCode="BD"
          enableRecent
          enableGPS
          enableMap
        />
      </Card>
    </div>
  );
}
