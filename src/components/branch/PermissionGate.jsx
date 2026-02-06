"use client";

import { useMemo } from "react";
import AccessDenied from "./AccessDenied";

/**
 * PermissionGate – auth UI for Branch Dashboard.
 * requiredPerm: single permission key (user must have it).
 * anyPerms: optional; if set, user must have at least one of these (in addition to requiredPerm when both are set).
 * requiredPerms: optional; if set, user must have ALL of these (overrides requiredPerm when set).
 * oneOfPerms: optional; if set, user must have at least one of these (overrides requiredPerm when set; use for "X or Y").
 * mode:
 *   - "hide" -> render null when lacking permission
 *   - "disable" -> render children disabled + tooltip
 *   - "deny-page" -> render AccessDenied (with optional missingPerm)
 */
export default function PermissionGate({
  children,
  requiredPerm,
  anyPerms,
  requiredPerms,
  oneOfPerms,
  permissions = [],
  mode = "hide",
  missingPerm,
  onBack,
}) {
  const hasPermission = useMemo(() => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (Array.isArray(requiredPerms) && requiredPerms.length > 0) {
      return requiredPerms.every((p) => perms.includes(p));
    }
    if (Array.isArray(oneOfPerms) && oneOfPerms.length > 0) {
      return oneOfPerms.some((p) => perms.includes(p));
    }
    if (requiredPerm && !perms.includes(requiredPerm)) return false;
    if (Array.isArray(anyPerms) && anyPerms.length > 0 && !anyPerms.some((p) => perms.includes(p)))
      return false;
    return true;
  }, [permissions, requiredPerm, anyPerms, requiredPerms, oneOfPerms]);

  const missingPermKey = useMemo(() => {
    if (missingPerm) return missingPerm;
    if (Array.isArray(requiredPerms) && requiredPerms.length > 0) {
      const perms = Array.isArray(permissions) ? permissions : [];
      const first = requiredPerms.find((p) => !perms.includes(p));
      return first ?? null;
    }
    if (Array.isArray(oneOfPerms) && oneOfPerms.length > 0) {
      const perms = Array.isArray(permissions) ? permissions : [];
      const hasOne = oneOfPerms.some((p) => perms.includes(p));
      return hasOne ? null : oneOfPerms[0];
    }
    if (requiredPerm && !(Array.isArray(permissions) && permissions.includes(requiredPerm)))
      return requiredPerm;
    return null;
  }, [missingPerm, requiredPerm, requiredPerms, oneOfPerms, permissions]);

  if (hasPermission) return <>{children}</>;

  if (mode === "hide") return null;

  if (mode === "disable") {
    return (
      <span
        className="d-inline-block"
        title={missingPermKey ? `You don't have permission: ${missingPermKey}` : "Permission required"}
      >
        <span className="opacity-50 pe-none" style={{ pointerEvents: "none" }}>
          {children}
        </span>
      </span>
    );
  }

  if (mode === "deny-page") {
    return <AccessDenied missingPerm={missingPermKey} onBack={onBack} />;
  }

  return null;
}
