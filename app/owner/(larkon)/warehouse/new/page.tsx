"use client";

// PHASE 2 FINAL CLEANUP: Warehouse creation now creates ONLY Branch records
// No duplicate Warehouse records are created - Branch is the single source of truth
// This form maintains existing UX but creates branch-backed warehouses exclusively

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { warehouseCreate } from "@/lib/api";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

const TYPE_OPTIONS = [
  { value: "CENTRAL", label: "Central Warehouse" },
  { value: "REGIONAL", label: "Regional Warehouse" },
  { value: "TRANSIT", label: "Transit Hub" },
];

interface FormErrors {
  name?: string;
  code?: string;
  type?: string;
  general?: string;
}

interface WarehouseResponse {
  id: number;
  orgId: number;
  name: string;
  code?: string | null;
  type: string;
  isActive: boolean;
  createdAt: string;
}

/** Normalize list responses (owner/organizations may be data, items, or array). */
function pickArray(resp: unknown): unknown[] {
  if (!resp) return [];
  const r = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  const d = r.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.items)) return d.items as unknown[];
  return [];
}

export default function OwnerWarehouseNewPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("CENTRAL");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // owner/me does not include organizations — same as other owner inventory (see stock-requests page).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgsRes = await ownerGet("/api/v1/owner/organizations").catch(() => ({ data: [] }));
        if (cancelled) return;
        const orgRows = pickArray(orgsRes) as { id?: number }[];
        const oid = orgRows[0]?.id != null ? Number(orgRows[0].id) : null;
        setOrgId(Number.isFinite(oid) && oid > 0 ? oid : null);
      } catch {
        if (!cancelled) setOrgId(null);
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Validate individual field
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Warehouse name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.trim().length > 100) return "Name must be less than 100 characters";
        return undefined;
      case "code":
        if (value.trim() && value.trim().length < 2) return "Code must be at least 2 characters";
        if (value.trim() && value.trim().length > 20) return "Code must be less than 20 characters";
        return undefined;
      default:
        return undefined;
    }
  };

  // Handle field change with validation
  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case "name":
        setName(value);
        break;
      case "code":
        setCode(value);
        break;
      case "type":
        setType(value);
        break;
    }
    
    // Validate on change if field was already touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Handle field blur (mark as touched and validate)
  const handleFieldBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateField("name", name);
    if (nameError) newErrors.name = nameError;
    
    const codeError = validateField("code", code);
    if (codeError) newErrors.code = codeError;
    
    setErrors(newErrors);
    setTouched({ name: true, code: true, type: true });
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!orgId) {
      setErrors({ general: "Organization not found. Please refresh and try again." });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setErrors({});
    setSuccessMessage(null);
    
    try {
      const payload = {
        orgId,
        name: name.trim(),
        code: code.trim() || undefined,
        type,
      };
      
      const wh = await warehouseCreate(payload) as WarehouseResponse;
      
      if (wh?.id) {
        setSuccessMessage(`Warehouse "${wh.name}" created successfully!`);
        // Short delay to show success message before redirecting
        setTimeout(() => {
          router.push(`/owner/warehouse/${wh.id}`);
        }, 1000);
      } else {
        setErrors({ general: "Warehouse created but response was incomplete. Please refresh the list." });
        setSaving(false);
      }
    } catch (e: any) {
      console.error("Warehouse creation failed:", e);
      
      // Handle specific error cases
      const errorMessage = e?.message || "";
      
      if (errorMessage.includes("already exists")) {
        setErrors({ name: "A warehouse with this name already exists for your organization" });
      } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("Not authorized")) {
        setErrors({ general: "You don't have permission to create warehouses. Please contact your administrator." });
      } else if (errorMessage.includes("orgId")) {
        setErrors({ general: "Organization error. Please refresh and try again." });
      } else {
        setErrors({ general: errorMessage || "Failed to create warehouse. Please try again." });
      }
      
      setSaving(false);
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return name.trim().length >= 2 && !errors.name && !errors.code;
  };

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 720 }}>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/warehouse" className="text-decoration-none">
              Warehouses
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Create New
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-4">
        <h4 className="mb-2">Create New Warehouse</h4>
        <p className="text-muted mb-0">
          Set up a warehouse to manage inventory, fulfillment, and distribution operations.
        </p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="ti ti-check-circle me-2"></i>
          {successMessage}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {!orgLoading && !orgId && (
        <div className="alert alert-warning" role="alert">
          <i className="ti ti-alert-triangle me-2"></i>
          No organization found. Create or complete organization setup first, then refresh this page.
        </div>
      )}

      {/* Error Alert */}
      {errors.general && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="ti ti-alert-circle me-2"></i>
          {errors.general}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setErrors(prev => ({ ...prev, general: undefined }))}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="card border shadow-sm">
          <div className="card-header bg-light">
            <h6 className="mb-0">Warehouse Details</h6>
          </div>
          
          <div className="card-body">
            {/* Name Field */}
            <div className="mb-4">
              <label htmlFor="warehouseName" className="form-label fw-medium">
                Warehouse Name <span className="text-danger">*</span>
              </label>
              <input
                id="warehouseName"
                type="text"
                className={`form-control ${errors.name ? "is-invalid" : touched.name && name.trim() ? "is-valid" : ""}`}
                placeholder="e.g., Central Warehouse Dhaka"
                value={name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                onBlur={(e) => handleFieldBlur("name", e.target.value)}
                disabled={saving || orgLoading}
                required
                autoFocus
              />
              {errors.name ? (
                <div className="invalid-feedback">{errors.name}</div>
              ) : (
                <div className="form-text">
                  Choose a descriptive name to identify this warehouse (2-100 characters)
                </div>
              )}
            </div>

            {/* Code and Type Row */}
            <div className="row">
              <div className="col-md-6 mb-4">
                <label htmlFor="warehouseCode" className="form-label fw-medium">
                  Warehouse Code
                </label>
                <input
                  id="warehouseCode"
                  type="text"
                  className={`form-control ${errors.code ? "is-invalid" : touched.code && code.trim() ? "is-valid" : ""}`}
                  placeholder="e.g., CW-DHK"
                  value={code}
                  onChange={(e) => handleFieldChange("code", e.target.value)}
                  onBlur={(e) => handleFieldBlur("code", e.target.value)}
                  disabled={saving || orgLoading}
                />
                {errors.code ? (
                  <div className="invalid-feedback">{errors.code}</div>
                ) : (
                  <div className="form-text">
                    Optional short code for internal reference (2-20 characters)
                  </div>
                )}
              </div>

              <div className="col-md-6 mb-4">
                <label htmlFor="warehouseType" className="form-label fw-medium">
                  Warehouse Type <span className="text-danger">*</span>
                </label>
                <select
                  id="warehouseType"
                  className="form-select"
                  value={type}
                  onChange={(e) => handleFieldChange("type", e.target.value)}
                  disabled={saving || orgLoading}
                  required
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="form-text">
                  Determines the warehouse's role in your supply chain
                </div>
              </div>
            </div>

            {/* Type descriptions */}
            <div className="bg-light rounded p-3 mb-0">
              <small className="text-muted">
                <strong>{TYPE_OPTIONS.find(t => t.value === type)?.label}:</strong>{" "}
                {type === "CENTRAL" && "Main distribution hub serving multiple branches and locations."}
                {type === "REGIONAL" && "Serves a specific geographic region with localized inventory."}
                {type === "TRANSIT" && "Temporary storage facility for goods in transit between locations."}
              </small>
            </div>
          </div>

          <div className="card-footer bg-light d-flex justify-content-between align-items-center">
            <Link 
              href="/owner/warehouse" 
              className="btn btn-outline-secondary"
              tabIndex={saving ? -1 : 0}
            >
              <i className="ti ti-arrow-left me-1"></i>
              Cancel
            </Link>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || orgLoading || !orgId || !isFormValid()}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="ti ti-plus me-1"></i>
                  Create Warehouse
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading overlay when saving */}
      {saving && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ 
            backgroundColor: "rgba(255,255,255,0.7)", 
            zIndex: 1050,
            backdropFilter: "blur(2px)"
          }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-2" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Creating warehouse...</span>
            </div>
            <p className="text-muted mb-0">Creating your warehouse...</p>
          </div>
        </div>
      )}
    </div>
  );
}
