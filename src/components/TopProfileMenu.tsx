"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, User, Building2 } from "lucide-react";
import { useMe, useBranchSelection } from "@/src/lib/useMe";

function useOrgSelection(me: any) {
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("bpa_org_id") : null;
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n)) setOrgId(n);
      return;
    }
    // Default: first org from memberships
    const first = Array.isArray(me?.orgMembers) ? me.orgMembers.find((x: any) => x?.org?.id)?.org?.id : null;
    if (first) setOrgId(Number(first));
  }, [me]);

  function select(id: number | null) {
    setOrgId(id);
    if (typeof window !== "undefined") {
      if (id === null) window.localStorage.removeItem("bpa_org_id");
      else window.localStorage.setItem("bpa_org_id", String(id));
      window.dispatchEvent(new CustomEvent("bpa:org-change", { detail: { orgId: id } }));
    }
  }

  return { orgId, select };
}

export default function TopProfileMenu() {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dropdownImageError, setDropdownImageError] = useState(false);
  const { me } = useMe("profile");
  const { orgId, select: selectOrg } = useOrgSelection(me);
  const { branchId, select: selectBranch } = useBranchSelection(me);
  const ref = useRef<HTMLDivElement | null>(null);

  // Extract user profile data - handle multiple data structures
  const userProfile = me?.profile || (me as any)?.data?.profile || (me as any)?.user?.profile;
  const displayName = 
    userProfile?.displayName || 
    (me as any)?.owner?.name || 
    (me as any)?.data?.owner?.name ||
    (me as any)?.user?.profile?.displayName ||
    "User";
  const avatarUrl = 
    userProfile?.avatarMedia?.url || 
    (me as any)?.user?.profile?.avatarMedia?.url || 
    null;
  const userAuth = (me as any)?.auth || (me as any)?.data?.auth || (me as any)?.user?.auth;
  const userEmail = userAuth?.email || (me as any)?.email || "";
  const userPhone = userAuth?.phone || (me as any)?.phone || "";
  const userIdentifier = userEmail || userPhone || displayName;

  // Reset image error when avatarUrl changes
  useEffect(() => {
    setImageError(false);
    setDropdownImageError(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;
    
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      const target = e.target as Node;
      if (!ref.current.contains(target)) {
        setOpen(false);
      }
    };
    
    // Use capture phase to catch clicks earlier
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open]);

  const logout = async () => {
    try {
      window.location.href = "/owner/logout";
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 1000 }}>
      <div className="d-flex align-items-center gap-2">
        <span className="badge bg-primary-focus text-primary-600 radius-12">
          {String(me?.roles?.[0] || "User")}
        </span>

        <select
          className="form-select form-select-sm radius-12"
          value={orgId ?? ""}
          onChange={(e) => selectOrg(e.target.value ? Number(e.target.value) : null)}
          style={{ width: 190 }}
          title="Select Organization"
        >
          <option value="">All Organizations</option>
          {(Array.isArray(me?.orgMembers) ? me.orgMembers : []).map((m: any) => {
            const o = m?.org;
            if (!o?.id) return null;
            return (
              <option key={o.id} value={o.id}>
                {o.name || `Org #${o.id}`}
              </option>
            );
          })}
        </select>

        <select
          className="form-select form-select-sm radius-12"
          value={branchId ?? ""}
          onChange={(e) => selectBranch(e.target.value ? Number(e.target.value) : null)}
          style={{ width: 170 }}
          title="Select Branch"
        >
          <option value="">All Branches</option>
          {(me?.branches || []).map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name || `Branch #${b.id}`}
            </option>
          ))}
          {!Array.isArray(me?.branches) || me.branches.length === 0 ? (
            branchId ? <option value={branchId}>{`Branch #${branchId}`}</option> : null
          ) : null}
        </select>
      </div>

      <button
        className="btn btn-light radius-12"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        style={{ padding: "8px 10px", position: "relative", zIndex: 1 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill" style={{ borderRadius: 999, padding: "6px 10px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </span>
          <span style={{ width: 34, height: 34, borderRadius: 999, background: avatarUrl && !imageError ? "transparent" : "rgba(255,255,255,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setImageError(true)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <User size={18} />
            )}
          </span>
        </span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            minWidth: 220,
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              {avatarUrl && !dropdownImageError ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover" }}
                  onError={() => setDropdownImageError(true)}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 999, background: "rgba(0, 0, 0, 0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={24} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userIdentifier}
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "0 0" }} />
          <Link
            href="/owner/kyc"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              color: "#111827",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <User size={16} /> KYC
          </Link>
          <Link
            href="/owner/organizations"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              color: "#111827",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Building2 size={16} /> Organizations
          </Link>
          <Link
            href="/owner/branches"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              color: "#111827",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Building2 size={16} /> Branches
          </Link>
          <Link
            href="/owner/staff"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              color: "#111827",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <User size={16} /> Staff
          </Link>
          <Link
            href="/owner/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              color: "#111827",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Settings size={16} /> Account Settings
          </Link>
          <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "0 0" }} />
          <button
            type="button"
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              textAlign: "left",
              border: "none",
              background: "transparent",
              color: "#111827",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}