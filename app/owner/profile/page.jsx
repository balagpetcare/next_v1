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
    divisionId: null,
    districtId: null,
    upazilaId: null,
    areaId: null,
    fullPathText: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const p = await apiGet("/api/v1/owner/profile");
        if (!mounted) return;
        if (p) {
          setForm((prev) => ({
            ...prev,
            name: p.name || "",
            nid: p.nid || "",
            supportPhone: p.supportPhone || "",
            supportEmail: p.supportEmail || "",
            divisionId: p.divisionId || null,
            districtId: p.districtId || null,
            upazilaId: p.upazilaId || null,
            areaId: p.areaId || null,
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
  }, []);

  const normalizeLoc = useCallback((loc) => {
    const n = normalizeLocation(loc, "BD");
    return n ? withLegacyLocationFields(n, loc || {}) : loc || { countryCode: "BD" };
  }, []);

  const locationValue = useMemo(() => {
    return normalizeLoc({
      countryCode: "BD",
      divisionId: form.divisionId,
      districtId: form.districtId,
      upazilaId: form.upazilaId,
      areaId: form.areaId,
      bdAreaId: form.areaId,
      dhakaAreaId: null,
      fullPathText: form.fullPathText,
    });
  }, [form.divisionId, form.districtId, form.upazilaId, form.areaId, form.fullPathText, normalizeLoc]);

  const handleLocationChange = useCallback(
    (next) => {
      const n = normalizeLoc(next);
      setForm((p) => ({
        ...p,
        divisionId: n.divisionId ?? p.divisionId,
        districtId: n.districtId ?? p.districtId,
        upazilaId: n.upazilaId ?? p.upazilaId,
        areaId: n.areaId ?? n.bdAreaId ?? n.dhakaAreaId ?? p.areaId,
        fullPathText: n.fullPathText || n.text || "",
      }));
    },
    [normalizeLoc]
  );

  async function onSave() {
    try {
      setLoading(true);
      setError("");
      setSavedMsg("");
      const payload = {
        name: form.name,
        nid: form.nid || null,
        supportPhone: form.supportPhone || null,
        supportEmail: form.supportEmail || null,
        divisionId: form.divisionId,
        districtId: form.districtId,
        upazilaId: form.upazilaId,
        areaId: form.areaId,
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
          enableBdHierarchy
        />
      </Card>
    </div>
  );
}
