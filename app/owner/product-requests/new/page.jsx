"use client";

import { useEffect, useMemo, useState } from "react";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

function Card({ title, children }) {
  return (
    <div className="card radius-12 mb-24">
      <div className="card-header">
        <h6 className="mb-0">{title}</h6>
      </div>
      <div className="card-body p-24">{children}</div>
    </div>
  );
}

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export default function ProductRequestNewPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  const [success, setSuccess] = useState(null);

  const [branchId, setBranchId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [variantTitle, setVariantTitle] = useState("");

  const branches = useMemo(() => me?.data?.branchMemberships || [], [me]);

  useEffect(() => {
    (async () => {
      try {
        const j = await ownerGet("/api/v1/me");
        setMe(j);
        const first = j?.data?.branchMemberships?.[0];
        if (first?.branchId) {
          setBranchId(String(first.branchId));
          setOrgId(String(first.orgId || ""));
        }
      } catch (e) {
        setError(e?.message || "Failed to load /me");
      }
    })();
  }, []);

  useEffect(() => {
    if (!slug && name) setSlug(slugify(name));
  }, [name, slug]);

  function onSelectBranch(bid) {
    setBranchId(String(bid));
    const b = branches.find((x) => String(x.branchId) === String(bid));
    if (b?.orgId) setOrgId(String(b.orgId));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      if (!branchId) throw new Error("Select a branch");
      if (!orgId) throw new Error("orgId missing (from /me)");
      if (!name.trim()) throw new Error("Product name is required");
      if (!slug.trim()) throw new Error("Slug is required");
      if (!sku.trim()) throw new Error("At least one SKU is required");

      const payload = {
        orgId: Number(orgId),
        name: name.trim(),
        slug: slug.trim(),
        variants: [
          {
            sku: sku.trim(),
            title: (variantTitle || sku).trim(),
            attributes: {},
          },
        ],
      };

      const j = await ownerPost(`/api/v1/owner/product-requests`, {
        type: "CREATE_PRODUCT",
        branchId: Number(branchId),
        orgId: Number(orgId),
        payload,
      });

      setSuccess(j?.data || true);
      setName("");
      setSlug("");
      setSku("");
      setVariantTitle("");
    } catch (e2) {
      setError(e2?.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="mb-16">
        <h4 className="mb-4">Create Product Request</h4>
        <div className="text-muted">
          Branch/Delivery manager creates a request. Owner must approve it.
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="alert alert-success" role="alert">
          Request submitted successfully. It will appear in Owner → Product Requests.
        </div>
      ) : null}

      <Card title="Request Form">
        <form onSubmit={submit} className="row g-16">
          <div className="col-12 col-md-6">
            <label className="form-label">Branch</label>
            <select className="form-select" value={branchId} onChange={(e) => onSelectBranch(e.target.value)}>
              <option value="">Select</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b?.branch?.name || `Branch #${b.branchId}`} ({b.role})
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Org ID (auto)</label>
            <input className="form-control" value={orgId} readOnly />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Product Name</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Slug</label>
            <input className="form-control" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <div className="text-muted small mt-4">Example: royal-canin-kitten</div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Variant SKU</label>
            <input className="form-control" placeholder="RC-KIT-1KG" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Variant Title</label>
            <input className="form-control" placeholder="1kg" value={variantTitle} onChange={(e) => setVariantTitle(e.target.value)} />
          </div>

          <div className="col-12 d-flex gap-12">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Submit Request
            </button>
            <a className="btn btn-light" href="/owner/product-approvals">
              Owner Approvals Queue
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
