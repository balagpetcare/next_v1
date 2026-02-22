"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

const API_BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const VENDOR_TYPES = [
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "IMPORTER", label: "Importer" },
  { value: "LOCAL", label: "Local" },
  { value: "MANUFACTURER", label: "Manufacturer" },
  { value: "OTHER", label: "Other" },
];

export default function NewVendorPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    district: "",
    city: "",
    country: "Bangladesh",
    vendorType: "OTHER",
    defaultPaymentTermsDays: "",
    creditLimit: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [meRes, orgsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/auth/me`, { credentials: "include" }).then((r) => r.json()),
          ownerGet("/api/v1/owner/organizations").catch(() => null),
        ]);
        const list = Array.isArray(orgsRes) ? orgsRes : orgsRes?.data ?? orgsRes ?? [];
        const arr = Array.isArray(list) ? list : (list?.items ? list.items : []);
        setOrgs(arr);
        const defaultOrgId = meRes?.defaultContext?.branch?.orgId;
        if (defaultOrgId != null && arr.some((o) => o.id === defaultOrgId)) {
          setOrgId(String(defaultOrgId));
        } else if (arr.length === 1) {
          setOrgId(String(arr[0].id));
        } else {
          setOrgId("");
        }
      } catch {
        toast.error("Could not load organizations");
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.warning("Vendor name is required");
      return;
    }
    const numOrgId = parseInt(orgId, 10);
    if (!Number.isFinite(numOrgId)) {
      toast.warning("Please select an organization");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orgId: numOrgId,
        name: form.name.trim(),
        code: form.code?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        addressLine1: form.addressLine1?.trim() || undefined,
        addressLine2: form.addressLine2?.trim() || undefined,
        district: form.district?.trim() || undefined,
        city: form.city?.trim() || undefined,
        country: form.country?.trim() || undefined,
        vendorType: form.vendorType || undefined,
        defaultPaymentTermsDays: form.defaultPaymentTermsDays ? parseInt(form.defaultPaymentTermsDays, 10) : undefined,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
        notes: form.notes?.trim() || undefined,
      };
      const result = await ownerPost("/api/v1/vendors", payload);
      const id = result?.data?.id;
      toast.success("Vendor created");
      if (id) {
        router.push(`/owner/vendors?created=${id}`);
        return;
      }
      router.push("/owner/vendors");
    } catch (err) {
      toast.error(getMessageFromApiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (loadingOrg) {
    return (
      <div className="container py-4">
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  if (!orgId && orgs.length > 1) {
    return (
      <div className="container py-4">
        <div className="alert alert-info">
          Select an organization to add a vendor.
        </div>
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <label className="form-label">Organization</label>
            <select
              className="form-select"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">Select organization…</option>
              {orgs.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
        <Link className="btn btn-outline-primary" href="/owner/vendors">Back to Vendors</Link>
      </div>
    );
  }
  if (orgs.length === 0) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          You need at least one organization to add vendors.{" "}
          <Link href="/owner/organizations">Go to Organizations</Link>
        </div>
        <Link className="btn btn-outline-primary mt-2" href="/owner/vendors">Back to Vendors</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="container py-3">
        <div className="d-flex align-items-center gap-2 mb-4">
          <Link className="btn btn-outline-secondary btn-sm" href="/owner/vendors">
            ← Back
          </Link>
          <h2 className="mb-0">Add Vendor</h2>
        </div>

        <div className="card radius-12">
          <div className="card-body p-24">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Vendor name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. ABC Traders"
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Code (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. VEN-0001 (auto if blank)"
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+880..."
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address line 1</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.addressLine1}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address line 2</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.addressLine2}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.district}
                    onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Vendor type</label>
                  <select
                    className="form-select"
                    value={form.vendorType}
                    onChange={(e) => setForm((f) => ({ ...f, vendorType: e.target.value }))}
                  >
                    {VENDOR_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Payment terms (days)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.defaultPaymentTermsDays}
                    onChange={(e) => setForm((f) => ({ ...f, defaultPaymentTermsDays: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Credit limit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={form.creditLimit}
                    onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating…" : "Create Vendor"}
                </button>
                <Link className="btn btn-outline-secondary" href="/owner/vendors">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
